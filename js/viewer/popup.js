/**
 * popup.js — Stellarium-style object data panel.
 *
 * Renders star, planet, Moon, constellation, and DSO information in the
 * top-left popup overlay. Includes all coordinate/distance formatters
 * (only used here, so co-located rather than in a separate utils file).
 */

import { LON_LA, LAT_LA, D2R } from './config.js';
import { getSatellite, satelliteStatus } from './satellites.js';
import { bvToColor } from './visual.js';
import { lst, eqToHz } from '../sky/time.js';

// --- Formatters ---

export function formatRA(ra) {
  const h = Math.floor(ra);
  const mFull = (ra - h) * 60;
  const m = Math.floor(mFull);
  const s = ((mFull - m) * 60).toFixed(1);
  return `${String(h).padStart(2,'0')}h ${String(m).padStart(2,'0')}m ${s.padStart(4,'0')}s`;
}

export function formatDec(dec) {
  const sign = dec >= 0 ? '+' : '-';
  const d = Math.abs(dec);
  const deg = Math.floor(d);
  const mFull = (d - deg) * 60;
  const m = Math.floor(mFull);
  const s = ((mFull - m) * 60).toFixed(1);
  return `${sign}${String(deg).padStart(2,'0')}\u00b0 ${String(m).padStart(2,'0')}' ${s.padStart(4,'0')}"`;
}

export function formatAz(az) {
  const deg = Math.floor(az);
  const mFull = (az - deg) * 60;
  const m = Math.floor(mFull);
  const s = ((mFull - m) * 60).toFixed(1);
  return `${String(deg).padStart(3,'0')}\u00b0 ${String(m).padStart(2,'0')}' ${s.padStart(4,'0')}"`;
}

export function formatAlt(alt) {
  const sign = alt >= 0 ? '+' : '-';
  const d = Math.abs(alt);
  const deg = Math.floor(d);
  const mFull = (d - deg) * 60;
  const m = Math.floor(mFull);
  const s = ((mFull - m) * 60).toFixed(1);
  return `${sign}${String(deg).padStart(2,'0')}\u00b0 ${String(m).padStart(2,'0')}' ${s.padStart(4,'0')}"`;
}

function spectColor(spect) {
  if (!spect) return '#aaa';
  const cls = spect.charAt(0).toUpperCase();
  const colors = { O: '#4466ff', B: '#6688ff', A: '#88bbff', F: '#ffffff', G: '#ffee99', K: '#ff9944', M: '#ff4422' };
  return colors[cls] || '#aaa';
}

function formatDist(dist) {
  if (dist == null) return '\u2014';
  if (dist < 100) return dist.toFixed(1) + ' ly';
  return Math.round(dist).toLocaleString() + ' ly';
}

function popupRow(label, value) {
  return `<div class="popup-row"><span class="popup-label">${label}</span><span class="popup-value">${value}</span></div>`;
}

// --- Popup state ---

let _popupTarget = null;

/**
 * Update the object popup based on current selection state.
 * Called once per render frame from the main loop.
 *
 * @param {HTMLElement} popupEl - The popup DOM element
 * @param {Object|null} selectedObject - Currently selected star/planet/moon/dso
 * @param {string|null} clickedConst - Clicked constellation abbreviation
 * @param {Object} deps - Dependencies: { cachedPlanets, cachedMoon, constByAbbr, timeOffsetMs }
 */
export function updatePopup(popupEl, selectedObject, clickedConst, deps) {
  if (!popupEl) return;

  const target = selectedObject || (clickedConst ? { type: 'constellation', abbr: clickedConst } : null);

  if (!target) {
    if (_popupTarget) {
      popupEl.classList.remove('visible');
      popupEl.addEventListener('transitionend', () => {
        if (!_popupTarget) popupEl.classList.remove('fade-in');
      }, { once: true });
      _popupTarget = null;
    }
    return;
  }

  // For planets/Moon, include timestamp so popup refreshes once per second
  const live = target.type === 'planet' || target.type === 'moon' || target.type === 'satellite';
  const timeSuffix = live ? ':' + Math.floor(Date.now() / 1000) : '';
  const targetKey = target.type + ':' + (target.name || target.abbr || target.ra) + timeSuffix;
  if (_popupTarget === targetKey) return;
  _popupTarget = targetKey;

  let html = '';
  const { cachedPlanets, cachedMoon, constByAbbr, timeOffsetMs } = deps;

  // Helper: get current LST for Az/Alt computation
  const currentLst = () => lst((Date.now() + timeOffsetMs) / 86400000 + 2440587.5, LON_LA);

  if (target.type === 'star') {
    // names: "primary;alternate;alternate", e.g. "Vega;α Lyrae;3 Lyrae"
    const [name, ...alts] = (target.names || 'Star').split(';');
    const conName = target.con ? (constByAbbr?.get(target.con)?.name || target.con) : '\u2014';
    const rgb = bvToColor(target.ci);
    const spect = target.spect;
    const sColor = spectColor(spect);
    html = `<div class="popup-name">${name}</div>`
      + `<div class="popup-type">${alts.length ? alts.join(' \u00b7 ') : 'Star'}</div>`
      + popupRow('Magnitude', target.mag.toFixed(2))
      + popupRow('Distance', formatDist(target.dist))
      + popupRow('Spectral Type', spect ? `<span style="color:${sColor}">${spect}</span>` : '\u2014')
      + popupRow('RA/Dec', formatRA(target.ra) + '&nbsp;&nbsp;&nbsp;' + formatDec(target.dec))
      + popupRow('Constellation', conName)
      + popupRow('Color (B-V)', `<span class="popup-swatch" style="background:rgb(${rgb})"></span>${target.ci != null ? target.ci.toFixed(2) : '\u2014'}`);

  } else if (target.type === 'planet') {
    const live = cachedPlanets?.find(p => p.name === target.name);
    const ra = live?.ra ?? target.ra, dec = live?.dec ?? target.dec;
    const hz = eqToHz(ra, dec, currentLst(), LAT_LA);
    const phasePct = live ? Math.round(live.phase * 100) : '\u2014';
    html = `<div class="popup-name">${target.name}</div>`
      + `<div class="popup-type">Planet</div>`
      + popupRow('RA/Dec', formatRA(ra) + '&nbsp;&nbsp;&nbsp;' + formatDec(dec))
      + popupRow('Az/Alt', `${formatAz(hz.az)}  ${formatAlt(hz.alt)}`)
      + popupRow('Distance', live ? live.distAU.toFixed(3) + ' AU' : '\u2014')
      + popupRow('Magnitude', live ? live.magnitude.toFixed(2) : '\u2014')
      + popupRow('Phase', phasePct + '%');

  } else if (target.type === 'moon') {
    const moon = cachedMoon;
    const ra = moon?.ra ?? target.ra, dec = moon?.dec ?? target.dec;
    const hz = eqToHz(ra, dec, currentLst(), LAT_LA);
    const pct = Math.round((moon ? moon.illumination : 0.5) * 100);
    const trend = moon?.waxing ? 'Waxing' : 'Waning';
    let phaseName = 'New Moon';
    if (pct > 2 && pct < 48) phaseName = `${trend} Crescent`;
    if (pct >= 48 && pct <= 52) phaseName = moon?.waxing ? 'First Quarter' : 'Last Quarter';
    if (pct > 52 && pct < 98) phaseName = `${trend} Gibbous`;
    if (pct >= 98) phaseName = 'Full Moon';
    html = `<div class="popup-name">Moon</div>`
      + `<div class="popup-type">${phaseName} (${pct}% illuminated)</div>`
      + popupRow('RA/Dec', formatRA(ra) + '&nbsp;&nbsp;&nbsp;' + formatDec(dec))
      + popupRow('Az/Alt', `${formatAz(hz.az)}  ${formatAlt(hz.alt)}`)
      + popupRow('Distance', moon ? Math.round(moon.distAU * 149597870.7).toLocaleString() + ' km' : '\u2014');

  } else if (target.type === 'constellation') {
    const con = constByAbbr?.get(target.abbr);
    const starCount = con?.starCount ?? 0;
    html = `<div class="popup-name">${con ? con.name : target.abbr}</div>`
      + `<div class="popup-type">Constellation (${target.abbr})</div>`
      + popupRow('Stars', String(starCount))
      + popupRow('Center RA/Dec', con ? formatRA(con.label_ra) + '&nbsp;&nbsp;&nbsp;' + formatDec(con.label_dec) : '\u2014');

  } else if (target.type === 'satellite') {
    const st = getSatellite(target.id);
    const alt = st ? Math.asin(st.hz) / D2R : null;
    const az = st ? (Math.atan2(st.hx, st.hy) / D2R + 360) % 360 : null;
    html = `<div class="popup-name">${target.name}</div>`
      + `<div class="popup-type">Satellite${st && st.fullName !== target.name ? ' (' + st.fullName + ')' : ''} · NORAD ${target.id}</div>`
      + popupRow('Status', st ? satelliteStatus(st) : 'No current orbit data')
      + popupRow('Az/Alt', st ? `${formatAz(az)}  ${formatAlt(alt)}` : '\u2014')
      + popupRow('Altitude', st ? Math.round(st.altKm).toLocaleString() + ' km' : '\u2014')
      + popupRow('Distance', st ? Math.round(st.rangeKm).toLocaleString() + ' km' : '\u2014')
      + popupRow('Speed', st ? st.speedKmS.toFixed(2) + ' km/s' : '\u2014');

  } else if (target.type === 'dso') {
    html = `<div class="popup-name">${target.name}</div>`
      + `<div class="popup-type">Deep Sky Object</div>`
      + popupRow('RA/Dec', formatRA(target.ra) + '&nbsp;&nbsp;&nbsp;' + formatDec(target.dec));
  }

  popupEl.innerHTML = html;
  popupEl.classList.add('fade-in');
  requestAnimationFrame(() => requestAnimationFrame(() => popupEl.classList.add('visible')));
}
