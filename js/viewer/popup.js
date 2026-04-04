/**
 * popup.js — Stellarium-style object data panel.
 *
 * Renders star, planet, Moon, constellation, and DSO information in the
 * top-left popup overlay. Includes all coordinate/distance formatters
 * (only used here, so co-located rather than in a separate utils file).
 */

import { D2R, LON_LA, LAT_LA } from './config.js';
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
 * @param {Object} deps - Dependencies: { cachedPlanets, cachedSun, cachedMoon, constByAbbr, hipToConst, starNameLookup, timeOffsetMs }
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
  const timeSuffix = (target.type === 'planet' || target.type === 'moon') ? ':' + Math.floor(Date.now() / 1000) : '';
  const targetKey = target.type + ':' + (target.name || target.abbr || target.ra) + timeSuffix;
  if (_popupTarget === targetKey) return;
  _popupTarget = targetKey;

  let html = '';
  const { cachedPlanets, cachedMoon, constByAbbr, hipToConst, starNameLookup, timeOffsetMs } = deps;

  // Helper: get current LST for Az/Alt computation
  const currentLst = () => lst((Date.now() + timeOffsetMs) / 86400000 + 2440587.5, LON_LA);

  if (target.type === 'star') {
    const info = starNameLookup?.get(target.ra.toFixed(6) + ',' + target.dec.toFixed(5)) || null;
    const name = info ? info.name : '\u2014';
    const conAbbr = info ? info.con : (hipToConst?.get(target.ra.toFixed(6) + ',' + target.dec.toFixed(5))) || '\u2014';
    const conName = conAbbr !== '\u2014' ? (constByAbbr?.get(conAbbr)?.name || conAbbr) : '\u2014';
    const rgb = bvToColor(target.ci);
    const dist = target.dist ?? info?.dist;
    const spect = target.spect ?? info?.spect;
    const sColor = spectColor(spect);
    html = `<div class="popup-name">${name !== '\u2014' ? name : 'Star'}</div>`
      + `<div class="popup-type">Star</div>`
      + popupRow('Magnitude', target.mag.toFixed(2))
      + popupRow('Distance', formatDist(dist))
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
    const k = moon ? (1 + Math.cos(moon.elongation * D2R)) / 2 : 0.5;
    const pct = Math.round(k * 100);
    let phaseName = 'New Moon';
    if (pct > 2 && pct < 48) phaseName = 'Waxing Crescent';
    if (pct >= 48 && pct <= 52) phaseName = 'Quarter';
    if (pct > 52 && pct < 98) phaseName = 'Gibbous';
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

  } else if (target.type === 'dso') {
    html = `<div class="popup-name">${target.name}</div>`
      + `<div class="popup-type">Deep Sky Object</div>`
      + popupRow('RA/Dec', formatRA(target.ra) + '&nbsp;&nbsp;&nbsp;' + formatDec(target.dec));
  }

  popupEl.innerHTML = html;
  popupEl.classList.add('fade-in');
  requestAnimationFrame(() => requestAnimationFrame(() => popupEl.classList.add('visible')));
}
