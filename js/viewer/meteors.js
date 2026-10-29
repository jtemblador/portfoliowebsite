/**
 * meteors.js — Occasional shooting stars, with the real annual showers.
 *
 * Meteors spawn on wall-clock time at a rate that climbs near the peaks of
 * the major showers, and shower meteors fly away from their radiant. Rates
 * are exaggerated (~10× what you'd see outside) so a short visit catches
 * some. Meteors burn up ~100 km overhead, so they're fixed to the ground
 * frame (alt/az), not the turning sky.
 *
 * Render functions take a render context: { ctx, cx, cy, scale, vf }.
 */

import { D2R, LAT_LA, reducedMotion } from './config.js';
import { eqToHz } from '../sky/time.js';
import { unprojectScreen } from './camera.js';

// [name, peak month, peak day, ZHR, radiant RA (h), radiant Dec (°), half-width (days)]
const SHOWERS = [
  ['Quadrantids',   1,  3, 110, 15.3,  49, 1],
  ['Lyrids',        4, 22,  18, 18.1,  34, 2],
  ['Eta Aquariids', 5,  6,  50, 22.5,  -1, 4],
  ['Perseids',      8, 12, 100,  3.2,  58, 4],
  ['Orionids',     10, 21,  20,  6.3,  16, 4],
  ['Leonids',      11, 17,  15, 10.2,  22, 2],
  ['Geminids',     12, 14, 150,  7.5,  33, 2],
];
const SPORADIC_PER_MIN = 1.2;   // shown rate on an ordinary night
const SHOWER_PER_MIN = 6;       // shown rate at the peak of a ZHR-150 shower
const MAX_ACTIVE = 3;

const _active = []; // { s: [x,y,z], e: [x,y,z], t0, dur, alpha }
let _lastT = 0;

function hzVec(alt, az) {
  const a = alt * D2R, z = az * D2R;
  return [Math.cos(a) * Math.sin(z), Math.cos(a) * Math.cos(z), Math.sin(a)];
}
function norm(v) { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }

/** Shower activity (0–1 of peak) on a date, by day-of-year distance from the peak. */
function activity(date, month, day, halfWidth) {
  const y = date.getUTCFullYear();
  let best = Infinity;
  for (const yy of [y - 1, y, y + 1]) {
    best = Math.min(best, Math.abs(date - Date.UTC(yy, month - 1, day)) / 86400000);
  }
  return Math.exp(-(best * best) / (2 * halfWidth * halfWidth));
}

/**
 * Advance the meteor simulation: retire finished meteors, maybe spawn one.
 * @param {Object} env - { simDate, lstDeg, sun, rc, enabled }
 */
export function updateMeteors(env) {
  const now = performance.now();
  const dt = _lastT ? Math.min((now - _lastT) / 1000, 0.25) : 0;
  _lastT = now;
  for (let i = _active.length - 1; i >= 0; i--) {
    if (now - _active[i].t0 > _active[i].dur) _active.splice(i, 1);
  }
  if (!env.enabled || reducedMotion || !env.sun || _active.length >= MAX_ACTIVE) return;
  if (eqToHz(env.sun.ra, env.sun.dec, env.lstDeg, LAT_LA).alt > -10) return; // too bright

  // Showers whose radiant is up contribute in proportion to their activity
  let rate = SPORADIC_PER_MIN;
  const live = [];
  for (const [, m, d, zhr, ra, dec, hw] of SHOWERS) {
    const act = activity(env.simDate, m, d, hw);
    if (act < 0.02) continue;
    const r = eqToHz(ra, dec, env.lstDeg, LAT_LA);
    if (r.alt <= 0) continue;
    const showerRate = SHOWER_PER_MIN * (zhr / 150) * act * Math.sin(r.alt * D2R);
    rate += showerRate;
    live.push([showerRate, hzVec(r.alt, r.az)]);
  }
  if (Math.random() > rate / 60 * dt) return;

  // Mostly within the current view so they're actually seen
  const { cx, cy, scale, vf } = env.rc;
  const pt = unprojectScreen(Math.random() * cx * 2, Math.random() * cy * 1.6, cx, cy, scale, vf);
  if (pt.alt < 12) return;
  const s = hzVec(pt.alt, pt.az);

  // Pick a source: a shower (by rate share) or sporadic
  let pick = Math.random() * rate, radiant = null;
  for (const [r, v] of live) { if ((pick -= r) < 0) { radiant = v; break; } }
  let tan;
  if (radiant) {
    const k = dot(s, radiant); // away from the radiant along the great circle
    tan = [s[0] * k - radiant[0], s[1] * k - radiant[1], s[2] * k - radiant[2]];
  } else {
    const rnd = [Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5];
    const k = dot(s, rnd);
    tan = [rnd[0] - k * s[0], rnd[1] - k * s[1], rnd[2] - k * s[2]];
  }
  if (Math.hypot(tan[0], tan[1], tan[2]) < 1e-6) return;
  tan = norm(tan);

  const len = (8 + Math.random() * 20) * D2R;
  const e = norm([s[0] * Math.cos(len) + tan[0] * Math.sin(len),
                  s[1] * Math.cos(len) + tan[1] * Math.sin(len),
                  s[2] * Math.cos(len) + tan[2] * Math.sin(len)]);
  _active.push({ s, e, t0: now, dur: 500 + Math.random() * 900, alpha: 0.75 + 0.25 * Math.random() });
}

/** True while any meteor is on screen — the render loop runs full rate then. */
export function meteorsActive() {
  return _active.length > 0;
}

function project(v, rc) {
  const { cx, cy, scale, vf } = rc;
  const cosA = v[0] * vf.fX + v[1] * vf.fY + v[2] * vf.fZ;
  if (cosA < 0.05) return null;
  const D = 1 + cosA;
  return [cx + (v[0] * vf.rX + v[1] * vf.rY) / D * scale,
          cy - (v[0] * vf.uX + v[1] * vf.uY + v[2] * vf.uZ) / D * scale];
}

function along(m, u) {
  return norm([m.s[0] + (m.e[0] - m.s[0]) * u, m.s[1] + (m.e[1] - m.s[1]) * u, m.s[2] + (m.e[2] - m.s[2]) * u]);
}

export function renderMeteors(rc) {
  if (!_active.length) return;
  const { ctx } = rc;
  const now = performance.now();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (const m of _active) {
    const u = Math.min(1, (now - m.t0) / m.dur);
    const head = project(along(m, u), rc);
    const tail = project(along(m, Math.max(0, u - 0.5)), rc);
    if (!head || !tail) continue;
    // Quick flare, longer fade
    const env = u < 0.15 ? u / 0.15 : 1 - (u - 0.15) / 0.85;
    const a = m.alpha * env;
    const grad = ctx.createLinearGradient(tail[0], tail[1], head[0], head[1]);
    grad.addColorStop(0, 'rgba(200,220,255,0)');
    grad.addColorStop(1, `rgba(255,255,245,${a})`);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(tail[0], tail[1]); ctx.lineTo(head[0], head[1]); ctx.stroke();
    // Bright head
    ctx.fillStyle = `rgba(255,255,250,${a})`;
    ctx.beginPath(); ctx.arc(head[0], head[1], 1.4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
