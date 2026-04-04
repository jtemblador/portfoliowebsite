/**
 * render-objects.js — Sky object render layers for the star viewer.
 *
 * Stars, DSOs (nebulae, galaxies, clusters), Sun, Moon, and planets.
 * Each function returns screen-position data used for hit testing.
 *
 * All functions take a render context: { ctx, cx, cy, scale, vf, fov }.
 */

import { D2R, BELOW_HORIZON_DIM, MAG_FADE_BAND, reducedMotion } from './config.js';
import { bvToColor, magToRadius, magToAlpha, edgeFade, fovMagLimit } from './visual.js';
import { projectStar } from './camera.js';

// --- Glow sprite cache ---
// Pre-rendered radial glow textures keyed by "R,G,B" string.
// Eliminates ~20 createRadialGradient() calls per frame for bright stars.

const _glowCache = new Map();
const GLOW_SIZE = 64; // sprite diameter in px

function getGlowSprite(rgb) {
  let sprite = _glowCache.get(rgb);
  if (sprite) return sprite;
  const c = document.createElement('canvas');
  c.width = GLOW_SIZE; c.height = GLOW_SIZE;
  const g = c.getContext('2d');
  const half = GLOW_SIZE / 2;
  const grad = g.createRadialGradient(half, half, half * 0.1, half, half, half);
  grad.addColorStop(0, `rgba(${rgb},0.35)`);
  grad.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, GLOW_SIZE, GLOW_SIZE);
  _glowCache.set(rgb, c);
  return c;
}

// --- Stars ---

/**
 * Render visible stars and fill the screen buffer for hit testing.
 * @returns {number} starScreenCount — number of entries written to screenBuf
 */
export function renderStars(rc, stars, screenBuf, portfolioMode) {
  const { ctx, cx, cy, scale, vf, fov } = rc;
  const cullCos = Math.cos((fov / 2 + 25) * D2R);
  const magLimit = portfolioMode ? Math.min(fovMagLimit(fov), 4.8) : fovMagLimit(fov);
  const t = performance.now() * 0.001;
  let count = 0;

  for (let i = 0; i < stars.length; i++) {
    const s = stars[i];
    const ra = s[0], dec = s[1], mag = s[2], ci = s[3];
    if (mag > magLimit) break;

    const p = projectStar(ra, dec, vf);
    if (!p || p.cosAngle < cullCos) continue;

    const px = cx + p.x * scale;
    const py = cy - p.y * scale;
    const r = magToRadius(mag);
    let a = magToAlpha(mag) * (p.belowHorizon ? BELOW_HORIZON_DIM : 1.0);

    if (mag > magLimit - MAG_FADE_BAND) a *= (magLimit - mag) / MAG_FADE_BAND;

    if (mag < 4.0 && !p.belowHorizon && !reducedMotion) {
      const phase = ((i * 2654435761) >>> 0) & 0xFFFF;
      a *= 0.85 + 0.15 * (
        0.6 * Math.sin(t * 3.7 + phase * 0.001) +
        0.4 * Math.sin(t * 7.1 + phase * 0.0017)
      );
    }

    // Canvas rgba() accepts raw floats — avoids ~5k toFixed() string allocs/frame
    const rgb = bvToColor(ci);
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${rgb},${a})`;
    ctx.fill();

    if (mag < 2.0 && !p.belowHorizon) {
      const glowR = r * 5;
      const sprite = getGlowSprite(rgb);
      ctx.globalAlpha = a;
      ctx.drawImage(sprite, px - glowR, py - glowR, glowR * 2, glowR * 2);
      ctx.globalAlpha = 1;
    }

    const bi = count * 3;
    screenBuf[bi] = px; screenBuf[bi+1] = py;
    screenBuf[bi+2] = i;
    count++;
  }

  return count;
}

// --- DSOs ---

/**
 * Render deep sky objects and return screen positions for hit testing.
 * @returns {Array} dsoScreenBuf — [{name, type, px, py, ra, dec, screenR}]
 */
export function renderDSOs(rc, dsos, selectedObject) {
  const { ctx, cx, cy, scale, vf, fov } = rc;
  const cullCos = Math.cos((fov / 2 + 25) * D2R);
  const buf = [];

  for (let di = 0; di < dsos.length; di++) {
    const d = dsos[di];
    const p = projectStar(d.ra, d.dec, vf);
    if (!p || p.cosAngle < cullCos) continue;

    const px = cx + p.x * scale, py = cy - p.y * scale;
    const screenR = Math.max(6, d.size * D2R * scale);
    const b = d.brightness;

    if (d.type === 'nebula') {
      ctx.fillStyle = `rgba(255,180,200,${b * 0.25})`;
      ctx.beginPath(); ctx.arc(px, py, screenR * 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(200,150,180,${b * 0.10})`;
      ctx.beginPath(); ctx.arc(px, py, screenR, 0, Math.PI * 2); ctx.fill();
    } else if (d.type === 'galaxy') {
      const angle = (di * 137.508) * D2R;
      ctx.save(); ctx.translate(px, py); ctx.rotate(angle);
      ctx.fillStyle = `rgba(255,240,200,${b * 0.20})`;
      ctx.beginPath(); ctx.ellipse(0, 0, screenR * 0.6, screenR * 0.25, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(255,230,180,${b * 0.08})`;
      ctx.beginPath(); ctx.ellipse(0, 0, screenR, screenR * 0.45, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } else if (d.type === 'open_cluster') {
      ctx.fillStyle = `rgba(200,220,255,${b * 0.35})`;
      for (let j = 0; j < 7; j++) {
        const a2 = (j * 137.508 + di * 50) * D2R;
        const r2 = screenR * 0.4 * (0.3 + (j % 3) * 0.35);
        ctx.beginPath(); ctx.arc(px + Math.cos(a2) * r2, py + Math.sin(a2) * r2, 1.5, 0, Math.PI * 2); ctx.fill();
      }
    } else if (d.type === 'globular_cluster') {
      ctx.fillStyle = `rgba(255,240,210,${b * 0.35})`;
      ctx.beginPath(); ctx.arc(px, py, screenR * 0.25, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(255,230,200,${b * 0.12})`;
      ctx.beginPath(); ctx.arc(px, py, screenR * 0.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(240,220,190,${b * 0.05})`;
      ctx.beginPath(); ctx.arc(px, py, screenR, 0, Math.PI * 2); ctx.fill();
    }

    if (selectedObject && selectedObject.type === 'dso' && selectedObject.name === d.name) {
      const pulse = reducedMotion ? 1.0 : 0.7 + 0.3 * Math.sin(performance.now() * 0.003);
      ctx.strokeStyle = `rgba(180,180,255,${pulse})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(px, py, screenR + 4, 0, Math.PI * 2); ctx.stroke();
    }

    buf.push({ name: d.name, type: d.type, px, py, ra: d.ra, dec: d.dec, screenR });
  }

  return buf;
}

// --- Sun ---

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

  const grad = ctx.createRadialGradient(px, py, sunR, px, py, sunR * 4);
  grad.addColorStop(0, `rgba(255,200,50,${alpha * 0.3})`);
  grad.addColorStop(1, 'rgba(255,180,30,0)');
  ctx.beginPath();
  ctx.arc(px, py, sunR * 4, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.font = '11px sans-serif';
  ctx.fillStyle = `rgba(255,220,100,${alpha * 0.85})`;
  ctx.fillText('Sun', px, py + sunR + 4);
  ctx.restore();
}

// --- Moon ---

/**
 * Render the Moon and return screen position for hit testing.
 * @returns {Object|null} moonScreenPos — {name, px, py, ra, dec, elongation, illumination, screenR}
 */
export function renderMoon(rc, moon, sun) {
  const { ctx, cx, cy, scale, vf, fov } = rc;
  const p = projectStar(moon.ra, moon.dec, vf);
  if (!p) return null;

  const alpha = edgeFade(p.cosAngle, fov);
  if (alpha <= 0) return null;

  const px = cx + p.x * scale, py = cy - p.y * scale;
  const moonR = 5;

  const k = (1 + Math.cos(moon.elongation * D2R)) / 2;
  const eastOfSun = ((sun.ra - moon.ra) * 15 + 360) % 360 > 180;
  const shadowSign = eastOfSun ? 1 : -1;

  ctx.beginPath(); ctx.arc(px, py, moonR, 0, Math.PI*2);
  ctx.fillStyle = `rgba(230,230,220,${alpha * 0.9})`;
  ctx.fill();

  if (k < 0.98) {
    ctx.save();
    ctx.beginPath(); ctx.arc(px, py, moonR, 0, Math.PI*2); ctx.clip();
    const shadowX = px + moonR * (2 * k - 1) * shadowSign;
    ctx.fillStyle = `rgba(5,5,16,${alpha * 0.85})`;
    ctx.beginPath(); ctx.arc(shadowX, py, moonR, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  ctx.beginPath(); ctx.arc(px, py, moonR * 3, 0, Math.PI*2);
  const grad = ctx.createRadialGradient(px, py, moonR, px, py, moonR*3);
  grad.addColorStop(0, `rgba(200,200,190,${alpha*0.15})`);
  grad.addColorStop(1, 'rgba(200,200,190,0)');
  ctx.fillStyle = grad; ctx.fill();

  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.font = '11px sans-serif';
  ctx.fillStyle = `rgba(220,220,210,${alpha*0.8})`;
  ctx.fillText('Moon', px, py + moonR + 4);
  ctx.restore();

  return { name: 'Moon', px, py, ra: moon.ra, dec: moon.dec,
           elongation: moon.elongation, illumination: k, screenR: moonR };
}

// --- Planets ---

/**
 * Render planets and return screen positions for hit testing.
 * @returns {Array} planetScreenBuf — [{name, px, py, ra, dec, screenR}]
 */
export function renderPlanets(rc, planets) {
  const { ctx, cx, cy, scale, vf, fov } = rc;
  const cullCos = Math.cos((fov / 2 + 25) * D2R);
  const buf = [];

  for (const planet of planets) {
    const p = projectStar(planet.ra, planet.dec, vf);
    if (!p || p.cosAngle < cullCos) continue;
    const alpha = edgeFade(p.cosAngle, fov);
    if (alpha <= 0) continue;

    const a = alpha * (p.belowHorizon ? BELOW_HORIZON_DIM : 1.0);
    const px = cx + p.x * scale, py = cy - p.y * scale;
    const r = planet.screenR;

    const grad = ctx.createRadialGradient(px, py, 0, px, py, r*2.5);
    grad.addColorStop(0, `rgba(255,165,0,${a*0.9})`);
    grad.addColorStop(0.5, `rgba(255,140,0,${a*0.4})`);
    grad.addColorStop(1, 'rgba(255,120,0,0)');
    ctx.beginPath(); ctx.arc(px, py, r*2.5, 0, Math.PI*2); ctx.fillStyle = grad; ctx.fill();
    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI*2);
    ctx.fillStyle = `rgba(255,180,60,${a})`; ctx.fill();

    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.font = '11px sans-serif';
    ctx.fillStyle = `rgba(255,200,100,${a*0.85})`;
    ctx.fillText(planet.name, px, py + r + 4);
    ctx.restore();

    buf.push({ name: planet.name, px, py, ra: planet.ra, dec: planet.dec, screenR: r });
  }

  return buf;
}
