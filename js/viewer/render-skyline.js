/**
 * render-skyline.js — The observer's real skyline as a horizon outline.
 *
 * data/horizon.json holds the terrain horizon altitude every 0.5° of
 * azimuth (built by scripts/build_horizon.py from elevation data). It is
 * drawn as a faint outline above the flat horizon line; points along it are
 * precomputed as horizontal-frame vectors, so a frame costs only dot products.
 *
 * Render functions take a render context: { ctx, cx, cy, scale, vf }.
 */

import { D2R } from './config.js';

let _step = 0;          // azimuth step (degrees)
let _sinAlt = null;     // Float32Array: sin(horizon altitude) per step
let _maxSin = -1;
let _verts = null;      // Float32Array: x, y, z per outline point (closed ring)

/** Load the horizon profile. Failure leaves the flat horizon line in use. */
export async function initSkyline(url) {
  let alts;
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();
    _step = json.az_step;
    alts = json.alt;
  } catch (err) {
    console.warn('Horizon profile failed to load:', err);
    return;
  }

  const n = alts.length;
  _sinAlt = new Float32Array(alts.map(a => Math.sin(a * D2R)));
  _maxSin = Math.max(..._sinAlt);
  _verts = new Float32Array((n + 1) * 3);
  for (let i = 0; i <= n; i++) {
    const a = alts[i % n] * D2R, z = (i % n) * _step * D2R;
    _verts[i * 3] = Math.cos(a) * Math.sin(z);
    _verts[i * 3 + 1] = Math.cos(a) * Math.cos(z);
    _verts[i * 3 + 2] = Math.sin(a);
  }
}

export function hasSkyline() { return !!_sinAlt; }

/** sin(horizon altitude) at an azimuth, linearly interpolated. */
function sinHorizonAt(azDeg) {
  const n = _sinAlt.length, f = (((azDeg % 360) + 360) % 360) / _step;
  const i = f | 0, t = f - i;
  return _sinAlt[i % n] * (1 - t) + _sinAlt[(i + 1) % n] * t;
}

/** Horizon altitude (degrees) at an azimuth. */
export function horizonAltAt(azDeg) {
  return _sinAlt ? Math.asin(sinHorizonAt(azDeg)) / D2R : 0;
}

/** True when a horizontal-frame direction lies behind the terrain. */
export function isBelowSkyline(hx, hy, hz) {
  if (!_sinAlt || hz >= _maxSin) return false;
  return hz < sinHorizonAt(Math.atan2(hx, hy) / D2R);
}

export function renderSkyline(rc) {
  if (!_verts) return;
  const { ctx, cx, cy, scale, vf } = rc;
  ctx.beginPath();
  let pen = false;
  for (let k = 0; k < _verts.length; k += 3) {
    const x = _verts[k], y = _verts[k + 1], z = _verts[k + 2];
    const cosA = x * vf.fX + y * vf.fY + z * vf.fZ;
    if (cosA < 0.01) { pen = false; continue; } // behind the viewer
    const D = 1 + cosA;
    const px = cx + (x * vf.rX + y * vf.rY) / D * scale;
    const py = cy - (x * vf.uX + y * vf.uY + z * vf.uZ) / D * scale;
    if (pen) ctx.lineTo(px, py); else { ctx.moveTo(px, py); pen = true; }
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1; ctx.stroke();
}
