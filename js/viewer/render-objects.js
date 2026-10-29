/**
 * render-objects.js — Sky object render layers for the star viewer.
 *
 * Stars, DSOs (nebulae, galaxies, clusters), Sun, Moon, and planets.
 * Each function returns screen-position data used for hit testing.
 *
 * All functions take a render context: { ctx, cx, cy, scale, vf, fov, atmo, skyline }.
 * `atmo` turns on atmospheric extinction (exploration mode); with `skyline`,
 * objects behind the terrain outline are dimmed like those below the horizon.
 */

import { D2R, R2D, BELOW_HORIZON_DIM, MAG_FADE_BAND, reducedMotion } from './config.js';
import { edgeFade, fovMagLimit, magToRadius, magToAlpha } from './visual.js';
import { projectStar, projectStarPre } from './camera.js';
import { EXT_ALPHA, extIndex, extTint, reddenBand, reddenRgb, twinkleAmp } from './atmosphere.js';
import { isBelowSkyline } from './render-skyline.js';

// --- Star sprites ---
// Point sources render as soft point-spread sprites — a white-hot center
// fading through the star's tint — instead of hard-edged disks. Bright
// objects add a wide glare halo. Both are pre-rendered per color, keyed by
// "R,G,B" string, and drawn additively so neighboring glows blend.

const _coreCache = new Map();
const _haloCache = new Map();
const SPRITE_SIZE = 32;

function makeSprite(cache, rgb, stops) {
  const c = document.createElement('canvas');
  c.width = c.height = SPRITE_SIZE;
  const g = c.getContext('2d');
  const half = SPRITE_SIZE / 2;
  const grad = g.createRadialGradient(half, half, 0, half, half, half);
  for (const [t, color] of stops) grad.addColorStop(t, color);
  g.fillStyle = grad;
  g.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
  cache.set(rgb, c);
  return c;
}

// Solid disk out to ~0.3 of the sprite radius (≈ the star's radius r, as
// drawn at 4r), then a soft edge — round and crisp but as bright as a dot.
function getCoreSprite(rgb) {
  return _coreCache.get(rgb) || makeSprite(_coreCache, rgb, [
    [0, 'rgba(255,255,255,1)'], [0.15, `rgba(${rgb},1)`], [0.35, `rgba(${rgb},0.95)`],
    [0.45, `rgba(${rgb},0.6)`], [0.55, `rgba(${rgb},0.25)`], [0.7, `rgba(${rgb},0.06)`],
    [1, `rgba(${rgb},0)`],
  ]);
}

// Steep-then-long falloff, like glare around a bright light
function getHaloSprite(rgb) {
  return _haloCache.get(rgb) || makeSprite(_haloCache, rgb, [
    [0, `rgba(${rgb},0.4)`], [0.1, `rgba(${rgb},0.22)`], [0.25, `rgba(${rgb},0.08)`],
    [0.5, `rgba(${rgb},0.025)`], [1, `rgba(${rgb},0)`],
  ]);
}

const HALO_MAG = 2.5;    // objects brighter than this get a glare halo

/**
 * Largest radius (CSS px) still drawn as a plain square: below ~1.3 device
 * pixels a square is indistinguishable from a dot, but on 2–3× screens the
 * same CSS size would show visible corners.
 */
function squareMaxR(dpr) { return 1.3 / (dpr || 1); }

/**
 * Draw one point source (star or planet) at radius r with alpha a.
 * Caller sets globalCompositeOperation = 'lighter'.
 */
function drawPoint(ctx, px, py, r, a, rgb, fillStyle, mag, haloOn, maxSquareR) {
  ctx.globalAlpha = a;
  if (r < maxSquareR) {
    ctx.fillStyle = fillStyle;
    ctx.fillRect(px - r, py - r, r + r, r + r);
  } else {
    const d = r * 4;
    ctx.drawImage(getCoreSprite(rgb), px - d / 2, py - d / 2, d, d);
  }
  if (haloOn && mag < HALO_MAG) {
    const haloR = Math.min(48, 6 + 8 * (HALO_MAG - mag));
    ctx.drawImage(getHaloSprite(rgb), px - haloR, py - haloR, haloR * 2, haloR * 2);
  }
}

// Pre-rendered glow sprites for Sun / Moon / planets — replaces per-frame
// createRadialGradient calls. Baked at relative alpha; drawn via globalAlpha.
function makeRadialSprite(size, innerRatio, stops) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const half = size / 2;
  const grad = g.createRadialGradient(half, half, half * innerRatio, half, half, half);
  for (const [t, color] of stops) grad.addColorStop(t, color);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}
let _sunGlow = null, _moonGlow = null;

const _fillCache = new Map();
function fillFor(rgb) {
  let f = _fillCache.get(rgb);
  if (!f) { f = `rgb(${rgb})`; _fillCache.set(rgb, f); }
  return f;
}

/** Below the horizon — or behind the skyline outline when it's on. */
function isHidden(p, skyline) {
  return p.belowHorizon || (skyline && isBelowSkyline(p.hx, p.hy, p.hz));
}

// --- Stars ---

/**
 * Render visible stars and fill the screen buffer for hit testing.
 * @returns {number} starScreenCount — number of entries written to screenBuf
 */
export function renderStars(rc, stars, screenBuf, portfolioMode) {
  const { ctx, cx, cy, scale, vf, fov, atmo, skyline } = rc;
  const cullCos = Math.cos((fov / 2 + 25) * D2R);
  const magLimit = portfolioMode ? Math.min(fovMagLimit(fov), 4.8) : fovMagLimit(fov);
  const maxSq = squareMaxR(rc.dpr);
  const t = performance.now() * 0.001;
  let count = 0;
  ctx.globalCompositeOperation = 'lighter';

  for (let i = 0; i < stars.length; i++) {
    const s = stars[i];
    const mag = s[2];
    if (mag > magLimit) break;

    // Zero-trig projection from precomputed terms; culls before dividing
    const p = projectStarPre(s[12], s[13], s[14], vf, cullCos);
    if (!p) continue;
    const hidden = isHidden(p, skyline);

    const px = cx + p.x * scale;
    const py = cy - p.y * scale;
    const r = s[9];                                   // precomputed radius
    let a = s[10] * (hidden ? BELOW_HORIZON_DIM : 1.0); // precomputed base alpha
    let rgb = s[8], fill = s[11];                     // precomputed color strings

    if (mag > magLimit - MAG_FADE_BAND) a *= (magLimit - mag) / MAG_FADE_BAND;

    // Atmosphere: dimmer and redder through the thicker air near the horizon
    // (dimming mirrored below it, so there's no bright seam at the horizon)
    if (atmo) {
      a *= EXT_ALPHA[extIndex(p.hz < 0 ? -p.hz : p.hz)];
      const band = p.belowHorizon ? 0 : reddenBand(p.hz);
      if (band) { rgb = reddenRgb(rgb, band); fill = fillFor(rgb); }
    }

    if (mag < 4.5 && !hidden && !reducedMotion) {
      const phase = ((i * 2654435761) >>> 0) & 0xFFFF;
      const amp = atmo ? twinkleAmp(p.hz) : 0.15;
      a *= 1 - amp + amp * (
        0.6 * Math.sin(t * 3.7 + phase * 0.001) +
        0.4 * Math.sin(t * 7.1 + phase * 0.0017)
      );
    }

    drawPoint(ctx, px, py, r, a, rgb, fill, mag, !hidden, maxSq);

    const bi = count * 3;
    screenBuf[bi] = px; screenBuf[bi+1] = py;
    screenBuf[bi+2] = i;
    count++;
  }

  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  return count;
}

// --- DSOs ---

/**
 * Render deep sky objects and return screen positions for hit testing.
 * @returns {Array} dsoScreenBuf — [{name, type, px, py, ra, dec, screenR}]
 */
// Marker tints by object type
const DSO_RGB = {
  nebula: '255,170,200', galaxy: '255,220,170',
  open_cluster: '190,210,255', globular_cluster: '255,230,200',
};

/**
 * Deep sky objects as thin outline markers at their true angular size —
 * the real glow of the bright ones (M31, M42, the Pleiades…) is already in
 * the Milky Way photo, so painted blobs would double them.
 * @returns {Array} dsoScreenBuf — [{name, type, px, py, ra, dec, screenR}]
 */
export function renderDSOs(rc, dsos, selectedObject) {
  const { ctx, cx, cy, scale, vf, fov } = rc;
  const cullCos = Math.cos((fov / 2 + 25) * D2R);
  const buf = [];

  ctx.lineWidth = 1;
  for (let di = 0; di < dsos.length; di++) {
    const d = dsos[di];
    const p = projectStar(d.ra, d.dec, vf);
    if (!p || p.cosAngle < cullCos) continue;

    const px = cx + p.x * scale, py = cy - p.y * scale;
    const trueR = (d.size / 2) * D2R * pxPerRadAt(p, scale); // size = diameter (°)
    const markR = Math.max(4, trueR);
    const screenR = Math.max(6, trueR);                       // hit radius

    ctx.strokeStyle = `rgba(${DSO_RGB[d.type] || '200,200,255'},${p.belowHorizon ? 0.15 : 0.4})`;
    ctx.setLineDash(d.type === 'open_cluster' ? [2, 3] : []);
    ctx.beginPath(); ctx.arc(px, py, markR, 0, Math.PI * 2); ctx.stroke();

    if (selectedObject && selectedObject.type === 'dso' && selectedObject.name === d.name) {
      const pulse = reducedMotion ? 1.0 : 0.7 + 0.3 * Math.sin(performance.now() * 0.003);
      ctx.setLineDash([]);
      ctx.strokeStyle = `rgba(180,180,255,${pulse})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(px, py, screenR + 4, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 1;
    }

    buf.push({ name: d.name, type: d.type, px, py, ra: d.ra, dec: d.dec, screenR });
  }
  ctx.setLineDash([]);

  return buf;
}

// --- Sun ---

/** Local stereographic scale at a projected point: (scale / 2)·(1 + ρ²) px per radian. */
function pxPerRadAt(p, scale) {
  return (scale / 2) * (1 + p.x * p.x + p.y * p.y);
}

export function renderSun(rc, sun) {
  const { ctx, cx, cy, scale, vf, fov } = rc;
  if (!sun) return;
  const p = projectStar(sun.ra, sun.dec, vf);
  if (!p) return;
  const alpha = edgeFade(p.cosAngle, fov);
  if (alpha <= 0) return;

  const px = cx + p.x * scale, py = cy - p.y * scale;
  const sunR = 10;

  ctx.beginPath();
  ctx.arc(px, py, sunR, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255,220,50,${alpha * 0.95})`;
  ctx.fill();

  if (!_sunGlow) _sunGlow = makeRadialSprite(96, 0.25,
    [[0, 'rgba(255,200,50,0.3)'], [1, 'rgba(255,180,30,0)']]);
  const sunGlowR = sunR * 4;
  ctx.globalAlpha = alpha;
  ctx.drawImage(_sunGlow, px - sunGlowR, py - sunGlowR, sunGlowR * 2, sunGlowR * 2);
  ctx.globalAlpha = 1;

  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.font = '11px sans-serif';
  ctx.fillStyle = `rgba(255,220,100,${alpha * 0.85})`;
  ctx.fillText('Sun', px, py + sunR + 4);
  ctx.restore();
}

// --- Moon ---

const MOON_RADIUS_KM = 1737.4;
const MOON_MIN_R = 5; // CSS px — true size is ~2px at the default FOV

// Procedural Moon face, north up as seen from the northern hemisphere.
// Maria as soft dark ellipses: [x, y, rx, ry, darkness] in Moon radii.
const MARIA = [
  [-0.58,  0.12, 0.30, 0.45, 0.50], // Oceanus Procellarum
  [-0.28,  0.50, 0.30, 0.24, 0.60], // Imbrium
  [ 0.25,  0.45, 0.17, 0.16, 0.60], // Serenitatis
  [ 0.40,  0.12, 0.22, 0.18, 0.60], // Tranquillitatis
  [ 0.74,  0.30, 0.12, 0.10, 0.65], // Crisium
  [ 0.62, -0.15, 0.13, 0.20, 0.50], // Fecunditatis
  [ 0.40, -0.30, 0.10, 0.10, 0.50], // Nectaris
  [-0.18, -0.38, 0.20, 0.16, 0.45], // Nubium
  [-0.55, -0.40, 0.10, 0.10, 0.50], // Humorum
  [ 0.00,  0.80, 0.42, 0.07, 0.45], // Frigoris
  [ 0.05,  0.28, 0.08, 0.07, 0.45], // Vaporum
  [-0.32, -0.08, 0.15, 0.12, 0.35], // Cognitum / Insularum
];
const MOON_TEX_SIZE = 128;
let _moonTex = null;

function getMoonTexture() {
  if (_moonTex) return _moonTex;
  const c = document.createElement('canvas');
  c.width = c.height = MOON_TEX_SIZE;
  const g = c.getContext('2d');
  const h = MOON_TEX_SIZE / 2;
  g.beginPath(); g.arc(h, h, h, 0, Math.PI * 2); g.clip();

  const base = g.createRadialGradient(h, h, 0, h, h, h);
  base.addColorStop(0, 'rgb(236,234,226)');
  base.addColorStop(0.85, 'rgb(218,216,208)');
  base.addColorStop(1, 'rgb(186,184,176)');
  g.fillStyle = base;
  g.fillRect(0, 0, MOON_TEX_SIZE, MOON_TEX_SIZE);

  for (const [x, y, rx, ry, d] of MARIA) {
    g.save();
    g.translate(h + x * h, h - y * h);
    g.scale(rx, ry);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, h);
    gr.addColorStop(0, `rgba(100,100,106,${d * 0.75})`);
    gr.addColorStop(0.5, `rgba(100,100,106,${d * 0.5})`);
    gr.addColorStop(1, 'rgba(100,100,106,0)');
    g.fillStyle = gr;
    g.beginPath(); g.arc(0, 0, h, 0, Math.PI * 2); g.fill();
    g.restore();
  }

  // Bright ray craters: Tycho, Copernicus
  for (const [x, y, rr] of [[-0.12, -0.70, 0.16], [-0.32, 0.17, 0.10]]) {
    const gr = g.createRadialGradient(h + x * h, h - y * h, 0, h + x * h, h - y * h, rr * h);
    gr.addColorStop(0, 'rgba(255,255,250,0.9)');
    gr.addColorStop(0.2, 'rgba(255,255,250,0.35)');
    gr.addColorStop(1, 'rgba(255,255,250,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, MOON_TEX_SIZE, MOON_TEX_SIZE);
  }

  _moonTex = c;
  return c;
}

/** Unit vector for an RA (hours) / Dec (degrees) direction. */
function eqVec(ra, dec) {
  const a = ra * 15 * D2R, d = dec * D2R;
  return [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)];
}

/**
 * Canvas-space angle at (px, py) pointing along the great circle from
 * `from` toward `to` (unit vectors). Stereographic projection is conformal,
 * so a short step along the sphere gives the true on-screen direction.
 */
function screenBearing(rc, from, to, px, py) {
  const { cx, cy, scale, vf } = rc;
  const k = from[0] * to[0] + from[1] * to[1] + from[2] * to[2];
  let tx = to[0] - k * from[0], ty = to[1] - k * from[1], tz = to[2] - k * from[2];
  const len = Math.hypot(tx, ty, tz);
  if (len < 1e-9) return 0;
  const e = 0.5 * D2R, ce = Math.cos(e), se = Math.sin(e) / len;
  const qx = from[0] * ce + tx * se, qy = from[1] * ce + ty * se, qz = from[2] * ce + tz * se;
  const ra = ((Math.atan2(qy, qx) * R2D + 360) % 360) / 15;
  const dec = Math.asin(Math.max(-1, Math.min(1, qz))) * R2D;
  const q = projectStar(ra, dec, vf);
  if (!q) return 0;
  return Math.atan2((cy - q.y * scale) - py, (cx + q.x * scale) - px);
}

/**
 * Lit region in a frame where +x points at the Sun: the sunward half of the
 * limb, closed by the terminator — a half-ellipse whose semi-axis is
 * R·cos(phase angle), bulging into the dark side once past quarter.
 */
function litPath(ctx, R, illumination) {
  const cosI = 2 * illumination - 1; // k = (1 + cos i) / 2
  ctx.beginPath();
  ctx.arc(0, 0, R, -Math.PI / 2, Math.PI / 2);
  for (let j = 1; j < 24; j++) {
    const y = R - (2 * R * j) / 24;
    ctx.lineTo(-R * cosI * Math.sqrt(1 - (y / R) * (y / R)), y);
  }
  ctx.closePath();
}

/**
 * Render the Moon and return screen position for hit testing.
 * Drawn at true angular size (with a minimum), textured, phase-correct and
 * oriented toward the Sun; it occludes the stars behind it.
 * @returns {Object|null} moonScreenPos — {name, px, py, ra, dec, elongation, illumination, screenR}
 */
export function renderMoon(rc, moon, sun) {
  const { ctx, cx, cy, scale, vf, fov, atmo } = rc;
  const p = projectStar(moon.ra, moon.dec, vf);
  if (!p) return null;

  const alpha = edgeFade(p.cosAngle, fov);
  if (alpha <= 0) return null;

  const px = cx + p.x * scale, py = cy - p.y * scale;
  const angR = Math.asin(MOON_RADIUS_KM / (moon.distAU * 149597870.7));
  const R = Math.max(MOON_MIN_R, angR * pxPerRadAt(p, scale));
  const k = moon.illumination;

  // Atmosphere: a low Moon rises orange
  let tint = null;
  if (atmo && !p.belowHorizon && p.hz < 0.35) {
    const t = extTint(p.hz);
    tint = `rgb(${Math.round(255 * t[0])},${Math.round(255 * t[1])},${Math.round(255 * t[2])})`;
  }

  const moonVec = eqVec(moon.ra, moon.dec);
  const sunAngle = screenBearing(rc, moonVec, eqVec(sun.ra, sun.dec), px, py);
  const northAngle = screenBearing(rc, moonVec, [0, 0, 1], px, py);
  const tex = getMoonTexture();

  // Glare, scaled with phase — a full Moon floods its surroundings
  if (!_moonGlow) _moonGlow = makeRadialSprite(64, 0,
    [[0, 'rgba(210,210,200,0.35)'], [0.3, 'rgba(200,200,190,0.12)'], [1, 'rgba(200,200,190,0)']]);
  const glowR = Math.min(R * (2.5 + 3 * k), R + 140);
  ctx.globalAlpha = alpha * (0.3 + 0.7 * k);
  ctx.drawImage(_moonGlow, px - glowR, py - glowR, glowR * 2, glowR * 2);

  ctx.save();
  ctx.translate(px, py);

  // Dark side: occludes stars, with faint earthshine on the unlit face
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgb(5,5,16)';
  ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.rotate(northAngle + Math.PI / 2);
  ctx.globalAlpha = alpha * 0.07;
  ctx.drawImage(tex, -R, -R, R * 2, R * 2);
  ctx.restore();

  // Sunlit side
  if (k > 0.005) {
    ctx.rotate(sunAngle);
    litPath(ctx, R, k);
    ctx.clip();
    ctx.rotate(northAngle + Math.PI / 2 - sunAngle);
    ctx.globalAlpha = alpha;
    ctx.drawImage(tex, -R, -R, R * 2, R * 2);
    if (tint) {
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = tint;
      ctx.fillRect(-R, -R, R * 2, R * 2);
      ctx.globalCompositeOperation = 'source-over';
    }
  }
  ctx.restore();
  ctx.globalAlpha = 1;

  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.font = '11px sans-serif';
  ctx.fillStyle = `rgba(220,220,210,${alpha*0.8})`;
  ctx.fillText('Moon', px, py + R + 4);
  ctx.restore();

  return { name: 'Moon', px, py, ra: moon.ra, dec: moon.dec,
           elongation: moon.elongation, illumination: k, screenR: R };
}

// --- Planets ---

// Naked-eye tints
const PLANET_RGB = {
  Mercury: '235,225,210', Venus: '255,252,238', Mars: '255,165,115',
  Jupiter: '255,245,228', Saturn: '255,236,190', Uranus: '205,240,240',
  Neptune: '175,195,255', Pluto: '220,210,200',
};

/**
 * Render planets as point sources sized and lit by their apparent magnitude
 * (no twinkle — planets hold steady). Planets below the magnitude limit stay
 * as faint labeled dots in exploration mode so search can still find them.
 * @returns {Array} planetScreenBuf — [{name, px, py, ra, dec, screenR}]
 */
export function renderPlanets(rc, planets, portfolioMode) {
  const { ctx, cx, cy, scale, vf, fov, atmo, skyline } = rc;
  const cullCos = Math.cos((fov / 2 + 25) * D2R);
  const magLimit = portfolioMode ? Math.min(fovMagLimit(fov), 4.8) : fovMagLimit(fov);
  const buf = [];

  for (const planet of planets) {
    const visible = planet.magnitude <= magLimit;
    if (!visible && portfolioMode) continue;
    const p = projectStar(planet.ra, planet.dec, vf);
    if (!p || p.cosAngle < cullCos) continue;
    const alpha = edgeFade(p.cosAngle, fov);
    if (alpha <= 0) continue;
    const hidden = isHidden(p, skyline);

    const la = alpha * (hidden ? BELOW_HORIZON_DIM : 1.0); // label alpha
    let a = la;
    const px = cx + p.x * scale, py = cy - p.y * scale;
    let rgb = PLANET_RGB[planet.name];
    const r = visible ? magToRadius(planet.magnitude) : 1.0;
    const pa = visible ? magToAlpha(planet.magnitude) : 0.35;
    if (atmo) {
      a *= EXT_ALPHA[extIndex(p.hz < 0 ? -p.hz : p.hz)];
      if (!p.belowHorizon) rgb = reddenRgb(rgb, reddenBand(p.hz));
    }

    ctx.globalCompositeOperation = 'lighter';
    drawPoint(ctx, px, py, r, a * pa, rgb, fillFor(rgb), planet.magnitude, !hidden, squareMaxR(rc.dpr));
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    // Exploration mode places planet labels with the others (renderLabels)
    // so they can't collide; the portfolio background has no other labels.
    if (portfolioMode) {
      ctx.save();
      ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.font = '11px sans-serif';
      ctx.fillStyle = `rgba(255,215,150,${la * (visible ? 0.85 : 0.45)})`;
      ctx.fillText(planet.name, px, py + Math.max(r, 3) + 5);
      ctx.restore();
    }

    buf.push({ name: planet.name, px, py, ra: planet.ra, dec: planet.dec, screenR: Math.max(r, 3) });
  }

  return buf;
}
