/**
 * search.js — Search index, UI, and navigation for the star viewer.
 *
 * Self-contained search feature: builds a searchable index of constellations,
 * named stars, planets, Moon, and DSOs. Provides autocomplete UI with arrow
 * key navigation and smooth animated pan to selected targets.
 *
 * Communicates with the application via callbacks — no direct access to app state.
 */

import { LAT_LA, LON_LA, ALT_MIN, ALT_MAX, D2R } from './config.js';
import { getTimeState } from './controls.js';
import { lst, eqToHz } from '../sky/time.js';

// --- Search state (module-private) ---

let searchIndex = [];
let searchOpen = false;
let _searchMatches = [];
let _searchSelIdx = -1;

// Callbacks set during setupSearch — used by navigateToResult
let _callbacks = null;

/** Whether the search panel is currently open (read by input handlers). */
export function isSearchOpen() {
  return searchOpen;
}

/**
 * Build the searchable index from star catalog data and cached ephemeris.
 * Should be called once at init after data and ephemeris are loaded.
 */
export function buildSearchIndex(data, cachedPlanets, cachedMoon) {
  searchIndex = [];

  // Constellations (88)
  for (const c of data.constellations) {
    searchIndex.push({ name: c.name, type: 'constellation', ra: c.label_ra, dec: c.label_dec, abbr: c.abbr });
  }

  // Named stars (~393)
  if (data.star_names) {
    for (const hipID of Object.keys(data.star_names)) {
      const info = data.star_names[hipID];
      const pos = data.hip[hipID];
      if (pos) searchIndex.push({ name: info.name, type: 'star', ra: pos[0], dec: pos[1], hipID });
    }
  }

  // Planets + Moon (from cached ephemeris)
  if (cachedPlanets) {
    for (const p of cachedPlanets) searchIndex.push({ name: p.name, type: 'planet', ra: p.ra, dec: p.dec });
  }
  if (cachedMoon) searchIndex.push({ name: 'Moon', type: 'moon', ra: cachedMoon.ra, dec: cachedMoon.dec });

  // DSOs (27)
  for (const d of data.dsos) {
    searchIndex.push({ name: d.name, type: 'dso', ra: d.ra, dec: d.dec });
  }
}

export function openSearch() {
  const panel = document.getElementById('search-panel');
  const input = document.getElementById('search-input');
  if (!panel || !input) return;
  searchOpen = true;
  panel.classList.add('visible');
  input.value = '';
  input.focus();
  _searchMatches = [];
  _searchSelIdx = -1;
  updateSearchResults('');
}

export function closeSearch() {
  const panel = document.getElementById('search-panel');
  if (!panel) return;
  searchOpen = false;
  panel.classList.remove('visible');
  _searchMatches = [];
  _searchSelIdx = -1;
}

function updateSearchResults(query) {
  const resultsEl = document.getElementById('search-results');
  if (!resultsEl) return;
  _searchSelIdx = -1;
  if (!query) { resultsEl.innerHTML = ''; _searchMatches = []; return; }

  const q = query.toLowerCase();
  _searchMatches = searchIndex
    .filter(e => e.name.toLowerCase().includes(q))
    .sort((a, b) => {
      const aStart = a.name.toLowerCase().startsWith(q) ? 0 : 1;
      const bStart = b.name.toLowerCase().startsWith(q) ? 0 : 1;
      return aStart - bStart;
    })
    .slice(0, 8);

  renderSearchResults(resultsEl);
}

function renderSearchResults(resultsEl) {
  resultsEl.innerHTML = _searchMatches.map((m, i) =>
    `<div class="search-result${i === _searchSelIdx ? ' selected' : ''}" data-idx="${i}">` +
    `<span class="sr-type">${m.type === 'constellation' ? '*' : m.type === 'planet' ? 'P' : m.type === 'moon' ? 'M' : '.'}</span>` +
    `<span class="sr-name">${m.name}</span>` +
    `<span class="sr-label">${m.type}</span>` +
    `</div>`
  ).join('');

  resultsEl.querySelectorAll('.search-result').forEach((el, i) => {
    el.addEventListener('click', () => navigateToResult(_searchMatches[i]));
  });
}

/**
 * Navigate the view to a search result. Computes the target alt/az from
 * the result's RA/Dec at the current sidereal time, then delegates to
 * the application via callbacks to set view target and selection state.
 */
function navigateToResult(result) {
  closeSearch();
  if (!_callbacks) return;

  const ts = getTimeState();
  const jd = (Date.now() + ts.timeOffsetMs) / 86400000 + 2440587.5;
  const lstDeg = lst(jd, LON_LA);
  const hz = eqToHz(result.ra, result.dec, lstDeg, LAT_LA);
  const targetAlt = Math.max(ALT_MIN, Math.min(ALT_MAX, hz.alt));

  // Get live ephemeris data for planets/Moon (positions may have changed since index was built)
  const { cachedPlanets, cachedMoon, data, cx, cy } = _callbacks.getAppState();

  if (result.type === 'constellation') {
    _callbacks.setClickedConst(result.abbr);
    _callbacks.setSelectedObject(null);
    _callbacks.setViewTarget({ az: hz.az, alt: targetAlt });

  } else if (result.type === 'star') {
    const pos = data.hip[result.hipID];
    if (pos) {
      const obj = { type: 'star', ra: pos[0], dec: pos[1], mag: 0, ci: null, dist: null, spect: null, px: cx, py: cy };
      for (const s of data.stars) {
        if (Math.abs(s[0] - pos[0]) < 0.0001 && Math.abs(s[1] - pos[1]) < 0.0001) {
          obj.mag = s[2]; obj.ci = s[3]; obj.dist = s[4]; obj.spect = s[5]; break;
        }
      }
      _callbacks.setSelectedObject(obj);
    }
    _callbacks.setClickedConst(null);
    _callbacks.setViewTarget({ az: hz.az, alt: targetAlt });

  } else if (result.type === 'planet') {
    const live = cachedPlanets?.find(p => p.name === result.name);
    const ra = live?.ra ?? result.ra, dec = live?.dec ?? result.dec;
    _callbacks.setSelectedObject({ type: 'planet', name: result.name, ra, dec, px: cx, py: cy });
    const hzLive = eqToHz(ra, dec, lstDeg, LAT_LA);
    _callbacks.setViewTarget({ az: hzLive.az, alt: Math.max(ALT_MIN, Math.min(ALT_MAX, hzLive.alt)) });
    _callbacks.setClickedConst(null);

  } else if (result.type === 'moon') {
    const ra = cachedMoon?.ra ?? result.ra, dec = cachedMoon?.dec ?? result.dec;
    _callbacks.setSelectedObject({
      type: 'moon', name: 'Moon', ra, dec,
      illumination: cachedMoon ? (1 + Math.cos(cachedMoon.elongation * D2R)) / 2 : 0.5,
      elongation: cachedMoon?.elongation || 0, px: cx, py: cy,
    });
    const hzLive = eqToHz(ra, dec, lstDeg, LAT_LA);
    _callbacks.setViewTarget({ az: hzLive.az, alt: Math.max(ALT_MIN, Math.min(ALT_MAX, hzLive.alt)) });
    _callbacks.setClickedConst(null);

  } else if (result.type === 'dso') {
    _callbacks.setSelectedObject({ type: 'dso', name: result.name, ra: result.ra, dec: result.dec, px: cx, py: cy });
    _callbacks.setClickedConst(null);
    _callbacks.setViewTarget({ az: hz.az, alt: targetAlt });
  }
}

/**
 * Wire up search DOM event listeners.
 * @param {Object} callbacks - { setViewTarget, setSelectedObject, setClickedConst, getAppState }
 */
export function setupSearch(callbacks) {
  _callbacks = callbacks;

  const input = document.getElementById('search-input');
  if (!input) return;
  input.addEventListener('input', () => updateSearchResults(input.value));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeSearch(); e.stopPropagation(); }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (_searchMatches.length > 0) {
        _searchSelIdx = Math.min(_searchSelIdx + 1, _searchMatches.length - 1);
        renderSearchResults(document.getElementById('search-results'));
      }
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (_searchSelIdx > 0) {
        _searchSelIdx--;
        renderSearchResults(document.getElementById('search-results'));
      }
    }
    if (e.key === 'Enter') {
      const idx = _searchSelIdx >= 0 ? _searchSelIdx : 0;
      if (_searchMatches[idx]) navigateToResult(_searchMatches[idx]);
    }
  });

  // Search button toggle
  const searchBtn = document.getElementById('search-btn');
  if (searchBtn) searchBtn.addEventListener('click', () => {
    if (searchOpen) closeSearch(); else openSearch();
  });

  // Click outside search closes it
  const searchPanel = document.getElementById('search-panel');
  document.addEventListener('click', (e) => {
    if (searchOpen && searchBtn && searchPanel &&
        !searchBtn.contains(e.target) && !searchPanel.contains(e.target)) {
      closeSearch();
    }
  });
}
