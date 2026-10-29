/**
 * render-background.js — Background render layers for the star viewer.
 *
 * Milky Way, twilight glow, coordinate grids (alt/az, equatorial, ecliptic),
 * zodiac band, and horizon line. These are drawn first, behind all sky objects.
 *
 * All functions take a render context: { ctx, cx, cy, scale, vf, fov }.
 */

import { D2R, R2D, LAT_LA, SIN_LAT, COS_LAT, OBLIQUITY, BELOW_HORIZON_DIM, MW_INTENSITY } from './config.js';
import { projectStar, projectStarPre, projectHzPoint, precomputeEq } from './camera.js';
import { eqToHz } from '../sky/time.js';
import { EXT_ALPHA, extIndex } from './atmosphere.js';

// --- Milky Way ---
// A real photographic glow map (ESO/S. Brunier panorama, stars removed —
// see scripts/build_milkyway.py) stored as an equirectangular texture in
// galactic coordinates. Each frame, every pixel of a low-res buffer is
// inverse-projected to a galactic direction with one 3×3 matrix and
// bilinearly sampled; the buffer is then upscaled onto the sky. The glow is
// diffuse, so the low resolution is invisible after smoothing.

let _mwTex = null;              // { data: Uint8ClampedArray RGBA, w, h }
// Low-res buffer budgets (pixels): full quality at rest, a third while the
// view is moving — motion hides the softer glow and it halves drag cost.
const MW_TARGET_PX = 45000, MW_FAST_PX = 15000;
const _mwBuffers = new Map();   // budget → { canvas, ctx, img, lw, lh, scale, dirs }

// J2000 equatorial → galactic rotation (rows)
const EQ_TO_GAL = [
  [-0.0548755604, -0.8734370902, -0.4838350155],
  [ 0.4941094279, -0.4448296300,  0.7469822445],
  [-0.8676661490, -0.1980763734,  0.4559837762],
];

/** Load the glow texture. Failure just leaves the Milky Way off. */
export async function initMilkyWay(url) {
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    _mwTex = { data: g.getImageData(0, 0, c.width, c.height).data, w: c.width, h: c.height };
  } catch (err) {
    console.warn('Milky Way texture failed to load:', err);
  }
}

function mul3(A, B) {
  const C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      C[i][j] = A[i][0] * B[0][j] + A[i][1] * B[1][j] + A[i][2] * B[2][j];
  return C;
}

/**
 * Per-pixel camera-frame directions (camX, camY, cosA) via inverse
 * stereographic projection. Depends only on buffer size and scale.
 */
function buildMwDirs(lw, lh, W, H, cx, cy, scale) {
  const dirs = new Float32Array(lw * lh * 3);
  let k = 0;
  for (let j = 0; j < lh; j++) {
    const y = (cy - (j + 0.5) * H / lh) / scale;
    for (let i = 0; i < lw; i++) {
      const x = ((i + 0.5) * W / lw - cx) / scale;
      const r2 = x * x + y * y;
      const cosA = (1 - r2) / (1 + r2), D = 1 + cosA;
      dirs[k++] = x * D; dirs[k++] = y * D; dirs[k++] = cosA;
    }
  }
  return dirs;
}

export function renderMilkyWay(rc) {
  if (!_mwTex) return;
  const { ctx, cx, cy, scale, vf, moving } = rc;
  const W = cx * 2, H = cy * 2;
  const budget = moving ? MW_FAST_PX : MW_TARGET_PX;
  const f = Math.max(2, Math.sqrt(W * H / budget));
  const lw = Math.ceil(W / f), lh = Math.ceil(H / f);

  let _mw = _mwBuffers.get(budget);
  if (!_mw) {
    const canvas = document.createElement('canvas');
    _mw = { canvas, ctx: canvas.getContext('2d'), img: null, lw: 0, lh: 0, scale: 0, dirs: null };
    _mwBuffers.set(budget, _mw);
  }
  if (_mw.lw !== lw || _mw.lh !== lh) {
    _mw.canvas.width = lw; _mw.canvas.height = lh;
    _mw.img = _mw.ctx.createImageData(lw, lh);
    _mw.lw = lw; _mw.lh = lh; _mw.scale = 0;
  }
  if (_mw.scale !== scale) {
    _mw.dirs = buildMwDirs(lw, lh, W, H, cx, cy, scale);
    _mw.scale = scale;
  }

  // camera (R,U,F) → horizontal (E,N,Up) → hour-angle frame → RA frame → galactic
  const camToHz = [[vf.rX, vf.uX, vf.fX], [vf.rY, vf.uY, vf.fY], [0, vf.uZ, vf.fZ]];
  const hzToHa = [[0, -SIN_LAT, COS_LAT], [-1, 0, 0], [0, COS_LAT, SIN_LAT]];
  const haToEq = [[vf.cosLst, vf.sinLst, 0], [vf.sinLst, -vf.cosLst, 0], [0, 0, 1]];
  const M = mul3(EQ_TO_GAL, mul3(haToEq, mul3(hzToHa, camToHz)));
  const [m00, m01, m02] = M[0], [m10, m11, m12] = M[1], [m20, m21, m22] = M[2];
  const uZ = vf.uZ, fZ = vf.fZ;

  const { data: tex, w: tw, h: th } = _mwTex;
  const out = _mw.img.data, dirs = _mw.dirs;
  const uScale = tw / (2 * Math.PI), vScale = th / Math.PI;
  const n = lw * lh;

  for (let i = 0, k = 0; i < n; i++, k += 3) {
    const a = dirs[k], b = dirs[k + 1], c = dirs[k + 2];
    const o = i * 4;
    // Directions behind the viewer (cosA ≈ -1 at the buffer corners) skip
    if (c < -0.999) { out[o + 3] = 0; continue; }
    const gx = m00 * a + m01 * b + m02 * c;
    const gy = m10 * a + m11 * b + m12 * c;
    const gz = m20 * a + m21 * b + m22 * c;

    // Texture: l = 0 at center increasing leftward, b = +90° at top
    let tx = (Math.PI - Math.atan2(gy, gx)) * uScale - 0.5;
    const ty = (Math.PI / 2 - Math.asin(gz > 1 ? 1 : gz < -1 ? -1 : gz)) * vScale - 0.5;
    if (tx < 0) tx += tw;
    const x0 = tx | 0, y0 = ty < 0 ? 0 : ty | 0;
    const fx = tx - x0, fy = ty < 0 ? 0 : ty - y0;
    const x1 = x0 + 1 >= tw ? 0 : x0 + 1, y1 = y0 + 1 >= th ? th - 1 : y0 + 1;
    const i00 = (y0 * tw + x0) * 4, i10 = (y0 * tw + x1) * 4;
    const i01 = (y1 * tw + x0) * 4, i11 = (y1 * tw + x1) * 4;
    const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy;
    const r = tex[i00] * w00 + tex[i10] * w10 + tex[i01] * w01 + tex[i11] * w11;
    const g = tex[i00 + 1] * w00 + tex[i10 + 1] * w10 + tex[i01 + 1] * w01 + tex[i11 + 1] * w11;
    const bl = tex[i00 + 2] * w00 + tex[i10 + 2] * w10 + tex[i01 + 2] * w01 + tex[i11 + 2] * w11;

    // Encode brightness as alpha over a normalized color, so source-over
    // compositing onto the dark sky behaves additively — and identically
    // whether drawn direct or via the transparent layer cache.
    const lum = Math.max(r, g, bl);
    if (lum < 1) { out[o + 3] = 0; continue; }
    const s = 255 / lum;
    out[o] = r * s; out[o + 1] = g * s; out[o + 2] = bl * s;
    // Fades through the thicker air near the horizon (mirrored below it, so
    // the dimmed below-horizon view meets the horizon without a seam)
    const alt = uZ * b + fZ * c; // sin(altitude) of this direction
    out[o + 3] = lum * MW_INTENSITY * EXT_ALPHA[extIndex(alt < 0 ? -alt : alt)] *
                 (alt < 0 ? BELOW_HORIZON_DIM : 1);
  }

  _mw.ctx.putImageData(_mw.img, 0, 0);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'low'; // bilinear — 'high' costs ~3× for no visible gain on diffuse light
  ctx.drawImage(_mw.canvas, 0, 0, W, H);
  ctx.restore();
}

// --- Twilight glow ---

export function renderTwilight(rc, lstDeg, cachedSun) {
  if (!cachedSun) return;
  const { ctx, cx, cy, scale, vf } = rc;
  const sunHz = eqToHz(cachedSun.ra, cachedSun.dec, lstDeg, LAT_LA);

  if (sunHz.alt > 0 || sunHz.alt < -18) return;

  const horizonP = projectHzPoint(0, sunHz.az, vf);
  if (!horizonP) return;

  const px = cx + horizonP.x * scale, py = cy - horizonP.y * scale;
  const depth = -sunHz.alt;
  const intensity = Math.max(0, 1 - depth / 18);
  const radius = 200 * intensity + 50;

  const r = depth < 6 ? 255 : Math.round(255 * Math.max(0, 1 - (depth-6)/12));
  const g = depth < 6 ? Math.round(180 - depth * 15) : Math.round(100 * Math.max(0, 1 - (depth-6)/12));
  const b = depth < 6 ? Math.round(100 + depth * 10) : Math.round(160 * Math.max(0, 1 - (depth-6)/12));

  const grad = ctx.createRadialGradient(px, py, 0, px, py, radius);
  grad.addColorStop(0, `rgba(${r},${g},${b},${intensity * 0.3})`);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(px, py, radius, 0, Math.PI*2); ctx.fill();
}

// --- Grid helper ---

function drawGridLine(ctx, cx, cy, count, getPoint, scale) {
  let penDown = false;
  for (let i = 0; i < count; i++) {
    const p = getPoint(i);
    if (!p || p.cosAngle < 0.01) { penDown = false; continue; }
    const px = cx + p.x * scale, py = cy - p.y * scale;
    if (!penDown) { ctx.moveTo(px, py); penDown = true; }
    else ctx.lineTo(px, py);
  }
}

// --- Coordinate grids ---

export function renderAltAzGrid(rc) {
  const { ctx, cx, cy, scale, vf } = rc;
  ctx.strokeStyle = 'rgba(100,150,200,0.25)'; ctx.lineWidth = 0.5;
  for (let alt = -80; alt <= 80; alt += 10) {
    if (alt === 0) continue;
    ctx.beginPath(); drawGridLine(ctx, cx, cy, 181, i => projectHzPoint(alt, i*2, vf), scale); ctx.stroke();
  }
  for (let az = 0; az < 360; az += 15) {
    ctx.beginPath(); drawGridLine(ctx, cx, cy, 91, i => projectHzPoint(-90+i*2, az, vf), scale); ctx.stroke();
  }
}

export function renderEqGrid(rc) {
  const { ctx, cx, cy, scale, vf } = rc;
  for (let dec = -80; dec <= 80; dec += 10) {
    ctx.strokeStyle = dec === 0 ? 'rgba(100,200,150,0.5)' : 'rgba(100,200,150,0.25)';
    ctx.lineWidth = dec === 0 ? 1.0 : 0.5;
    ctx.beginPath(); drawGridLine(ctx, cx, cy, 181, i => projectStar(i*24/180, dec, vf), scale); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(100,200,150,0.25)'; ctx.lineWidth = 0.5;
  for (let raH = 0; raH < 24; raH++) {
    ctx.beginPath(); drawGridLine(ctx, cx, cy, 91, i => projectStar(raH, -90+i*2, vf), scale); ctx.stroke();
  }
}

// The ecliptic and zodiac-band rings are fixed curves in RA/Dec — precompute
// their projection terms once instead of doing atan2/asin×1083 every frame.
function buildEclRing(eclLatDeg) {
  const oblR = OBLIQUITY * D2R, eclLat = eclLatDeg * D2R;
  const sinB = Math.sin(eclLat), cosB = Math.cos(eclLat);
  const ring = [];
  for (let i = 0; i <= 360; i++) {
    const lamR = i * D2R;
    const sinLam = Math.sin(lamR), cosLam = Math.cos(lamR);
    const x = cosB * cosLam;
    const y = cosB * sinLam * Math.cos(oblR) - sinB * Math.sin(oblR);
    const z = cosB * sinLam * Math.sin(oblR) + sinB * Math.cos(oblR);
    const ra = ((Math.atan2(y, x) * R2D + 360) % 360) / 15;
    const dec = Math.asin(Math.max(-1, Math.min(1, z))) * R2D;
    ring.push(precomputeEq(ra, dec));
  }
  return ring;
}
let _eclRing = null, _zodiacRings = null;
const NO_CULL = -2; // drawGridLine culls on cosAngle itself

export function renderEcliptic(rc) {
  const { ctx, cx, cy, scale, vf } = rc;
  if (!_eclRing) _eclRing = buildEclRing(0);
  ctx.strokeStyle = 'rgba(200,200,100,0.35)'; ctx.lineWidth = 1.0;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  drawGridLine(ctx, cx, cy, 361,
    i => { const t = _eclRing[i]; return projectStarPre(t[0], t[1], t[2], vf, NO_CULL); }, scale);
  ctx.stroke(); ctx.setLineDash([]);
}

export function renderZodiacBand(rc) {
  const { ctx, cx, cy, scale, vf } = rc;
  if (!_zodiacRings) _zodiacRings = [buildEclRing(9), buildEclRing(-9)];
  for (const ring of _zodiacRings) {
    ctx.strokeStyle = 'rgba(40,120,200,0.18)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    drawGridLine(ctx, cx, cy, 361,
      i => { const t = ring[i]; return projectStarPre(t[0], t[1], t[2], vf, NO_CULL); }, scale);
    ctx.stroke();
  }
}

// --- Horizon ---

export function renderHorizon(rc) {
  const { ctx, cx, cy, scale, vf } = rc;
  ctx.beginPath(); let penDown = false;
  for (let i = 0; i <= 360; i++) {
    const p = projectHzPoint(0, i%360, vf);
    if (!p || p.cosAngle < 0.01) { penDown = false; continue; }
    const px = cx+p.x*scale, py = cy-p.y*scale;
    if (!penDown) { ctx.moveTo(px, py); penDown = true; } else ctx.lineTo(px, py);
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.5; ctx.stroke();
}
