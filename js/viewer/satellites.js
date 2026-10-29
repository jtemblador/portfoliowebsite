/**
 * satellites.js — The ISS and bright satellites crossing the sky, live.
 *
 * Orbital elements (TLEs) for CelesTrak's ~150 brightest satellites are
 * fetched on first use (cached 12 h in localStorage) and propagated with
 * SGP4 (vendored satellite.js) every frame at the simulated time, then
 * turned into the observer's East/North/Up frame. A satellite shows only
 * when it's up, sunlit, and the observer's sky is dark — the same moments
 * you could spot it outside. The ISS is labeled and always findable.
 *
 * Render functions take a render context: { ctx, cx, cy, scale, vf, fov, skyline }.
 */

import { D2R, LAT_LA, LON_LA } from './config.js';
import { magToRadius, magToAlpha } from './visual.js';
import { eqToHz } from '../sky/time.js';
import { isBelowSkyline } from './render-skyline.js';

const TLE_URL = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=visual&FORMAT=tle';
const CACHE_KEY = 'tle-visual';
const CACHE_MS = 12 * 3600 * 1000;   // CelesTrak asks for ≤ 1 download per ~2 h
const MAX_EPOCH_DAYS = 7;            // TLEs drift; hide satellites beyond this
const ISS_ID = 25544;
const OBS_ALT_KM = 1.134;            // El Paso elevation
const R_EARTH_KM = 6371;
// Standard magnitude at 1000 km range (rough; most "visual" objects ~3–4)
const STD_MAG = { 25544: -1.8, 48274: -0.6, 20580: 2.2 }; // ISS, Tiangong, Hubble
const DEFAULT_STD_MAG = 3.5;

let _sat = null;          // satellite.js module
let _list = [];           // { id, name, rec, epochMs, stdMag }
let _loading = null;
const _state = new Map(); // id → live state, refreshed each frame
let _screen = [];         // drawn this frame: [{ id, name, px, py, screenR }]

// Observer position (ECEF, km) and local East/North/Up basis, WGS84
const _obs = (() => {
  const a = 6378.137, f = 1 / 298.257223563, e2 = f * (2 - f);
  const lat = LAT_LA * D2R, lon = LON_LA * D2R;
  const sl = Math.sin(lat), cl = Math.cos(lat), so = Math.sin(lon), co = Math.cos(lon);
  const N = a / Math.sqrt(1 - e2 * sl * sl);
  return {
    p: [(N + OBS_ALT_KM) * cl * co, (N + OBS_ALT_KM) * cl * so, (N * (1 - e2) + OBS_ALT_KM) * sl],
    E: [-so, co, 0], N: [-sl * co, -sl * so, cl], U: [cl * co, cl * so, sl],
  };
})();

function parseTle(text) {
  const lines = text.split(/\r?\n/).map(l => l.trimEnd());
  const out = [];
  for (let i = 0; i + 2 < lines.length; i++) {
    if (!lines[i + 1].startsWith('1 ') || !lines[i + 2].startsWith('2 ')) continue;
    try {
      const rec = _sat.twoline2satrec(lines[i + 1], lines[i + 2]);
      const id = rec.satnum ? parseInt(rec.satnum, 10) : parseInt(lines[i + 1].slice(2, 7), 10);
      // TLE epoch: 2-digit year + fractional day of year
      const yy = parseInt(lines[i + 1].slice(18, 20), 10), day = parseFloat(lines[i + 1].slice(20, 32));
      const epochMs = Date.UTC(yy < 57 ? 2000 + yy : 1900 + yy, 0, 1) + (day - 1) * 86400000;
      out.push({ id, name: lines[i].trim(), rec, epochMs, stdMag: STD_MAG[id] ?? DEFAULT_STD_MAG });
    } catch { /* skip malformed element set */ }
    i += 2;
  }
  return out;
}

function readCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY)); } catch { return null; }
}

/**
 * Load satellite.js and the element sets once. Resolves to the satellite
 * list ([{ id, name }]) or [] if nothing could be loaded.
 */
export function loadSatellites() {
  if (_loading) return _loading;
  _loading = (async () => {
    _sat = await import('../vendor/satellite.min.js');
    const cached = readCache();
    let text = cached && Date.now() - cached.t < CACHE_MS ? cached.text : null;
    if (!text) {
      try {
        const resp = await fetch(TLE_URL);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const fresh = await resp.text();
        if (!fresh.includes('\n1 ')) throw new Error('no element sets in response');
        text = fresh;
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), text })); } catch { /* storage full/blocked */ }
      } catch (err) {
        console.warn('Satellite data unavailable:', err);
        text = cached?.text || null; // stale beats nothing
      }
    }
    _list = text ? parseTle(text) : [];
    return _list.map(s => ({ id: s.id, name: s.id === ISS_ID ? 'ISS' : s.name }));
  })().catch(err => { console.warn('Satellites failed to load:', err); return []; });
  return _loading;
}

/**
 * Propagate every satellite to the simulated time and classify visibility.
 * @param {Date} date - simulated time
 * @param {number} lstDeg - local sidereal time (for the Sun's altitude)
 * @param {Object} sun - { ra (h), dec (°) }
 */
export function updateSatellites(date, lstDeg, sun) {
  if (!_list.length || !sun) return;
  const gmst = _sat.gstime(date);
  const cg = Math.cos(gmst), sg = Math.sin(gmst);
  const sunAlt = eqToHz(sun.ra, sun.dec, lstDeg, LAT_LA).alt;
  const sr = sun.ra * 15 * D2R, sd = sun.dec * D2R;
  const sunEci = [Math.cos(sd) * Math.cos(sr), Math.cos(sd) * Math.sin(sr), Math.sin(sd)];
  const { p: o, E, N, U } = _obs;
  const t = date.getTime();

  for (const s of _list) {
    if (Math.abs(t - s.epochMs) > MAX_EPOCH_DAYS * 86400000) { _state.delete(s.id); continue; }
    const pv = _sat.propagate(s.rec, date);
    if (!pv || !pv.position || typeof pv.position === 'boolean') { _state.delete(s.id); continue; }
    const r = pv.position, v = pv.velocity;

    // ECI → ECEF (rotate by GMST), then topocentric East/North/Up
    const dx = r.x * cg + r.y * sg - o[0];
    const dy = -r.x * sg + r.y * cg - o[1];
    const dz = r.z - o[2];
    const range = Math.hypot(dx, dy, dz);
    const hx = (dx * E[0] + dy * E[1] + dz * E[2]) / range;
    const hy = (dx * N[0] + dy * N[1] + dz * N[2]) / range;
    const hz = (dx * U[0] + dy * U[1] + dz * U[2]) / range;

    // Cylindrical Earth shadow
    const along = r.x * sunEci[0] + r.y * sunEci[1] + r.z * sunEci[2];
    const sunlit = along > 0 || Math.hypot(r.x - along * sunEci[0], r.y - along * sunEci[1],
                                           r.z - along * sunEci[2]) > R_EARTH_KM;

    _state.set(s.id, {
      id: s.id, name: s.id === ISS_ID ? 'ISS' : s.name, fullName: s.name,
      hx, hy, hz, rangeKm: range,
      altKm: Math.hypot(r.x, r.y, r.z) - R_EARTH_KM,
      speedKmS: Math.hypot(v.x, v.y, v.z),
      sunlit, darkSky: sunAlt < -4,
      mag: s.stdMag + 5 * Math.log10(range / 1000),
    });
  }
}

/** Live state for one satellite (popup, selection tracking), or null. */
export function getSatellite(id) {
  return _state.get(id) || null;
}

/** "Visible", "In Earth's shadow", … for the popup. */
export function satelliteStatus(st) {
  if (st.hz <= 0) return 'Below the horizon';
  if (!st.sunlit) return "In Earth's shadow";
  if (!st.darkSky) return 'Daylight — too bright to see';
  return 'Visible now';
}

/** True while a moving satellite is drawn — the render loop runs full rate then. */
export function satellitesInView() {
  return _screen.length > 0;
}

/**
 * Draw visible satellites (sunlit, dark sky, above the skyline), plus a
 * findable marker for the ISS whenever it's up.
 * @returns {Array} [{ id, name, px, py, screenR }] for hit testing
 */
export function renderSatellites(rc) {
  _screen = [];
  if (!_state.size) return _screen;
  const { ctx, cx, cy, scale, vf, skyline } = rc;
  const W = cx * 2, H = cy * 2;

  for (const st of _state.values()) {
    if (st.hz <= 0 || (skyline && isBelowSkyline(st.hx, st.hy, st.hz))) continue;
    const cosA = st.hx * vf.fX + st.hy * vf.fY + st.hz * vf.fZ;
    if (cosA < 0.05) continue;
    const D = 1 + cosA;
    const px = cx + (st.hx * vf.rX + st.hy * vf.rY) / D * scale;
    const py = cy - (st.hx * vf.uX + st.hy * vf.uY + st.hz * vf.uZ) / D * scale;
    if (px < -20 || px > W + 20 || py < -20 || py > H + 20) continue;

    const visible = st.sunlit && st.darkSky;
    const isISS = st.id === ISS_ID;
    if (!visible && !isISS) continue;

    if (visible) {
      const r = Math.max(1, magToRadius(st.mag)), a = Math.max(0.35, magToAlpha(st.mag));
      ctx.fillStyle = `rgba(240,244,255,${a})`;
      ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
    } else {
      // ISS up but dark (shadow/daylight): a hollow marker so it can be found
      ctx.strokeStyle = 'rgba(140,200,255,0.5)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.stroke();
    }
    if (isISS) {
      ctx.font = '11px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillStyle = `rgba(140,200,255,${visible ? 0.9 : 0.55})`;
      ctx.fillText('ISS', px + 7, py);
    }
    _screen.push({ id: st.id, name: st.name, px, py, screenR: 6 });
  }
  return _screen;
}
