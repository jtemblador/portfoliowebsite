/**
 * input.js — Mouse, touch, keyboard, and button input for the star viewer.
 *
 * Handles all user interaction: drag panning, pinch zoom, keyboard shortcuts,
 * click/tap object selection, and overlay button wiring. Communicates with the
 * application via state refs (read/write) and callbacks (one-way notifications).
 *
 * No render logic — only reads screen buffers filled each frame by render modules.
 */

import { FOV_MIN, FOV_MAX } from './config.js';
import { applyDragRotation } from './camera.js';
import { findNearestStar, findNearestPlanet, findNearestDSO, findNearestConstLabel } from './hittest.js';
import { togglePause } from './controls.js';
import { isSearchOpen, openSearch, closeSearch } from './search.js';

// --- Click handler ---

function handleClick(clickX, clickY, state, callbacks) {
  const { starScreenBuf, starScreenCount, planetScreenBuf, moonScreenPos, constLabelScreen, dsoScreenBuf, data, hipToConst } = callbacks.getScreenState();

  // Priority: Moon > Planets > DSOs > Constellation labels > Stars > Empty sky

  if (moonScreenPos) {
    const dx = moonScreenPos.px - clickX, dy = moonScreenPos.py - clickY;
    if (dx * dx + dy * dy < 20 * 20) {
      callbacks.setSelectedObject({ type: 'moon', ...moonScreenPos });
      callbacks.setClickedConst(null);
      return;
    }
  }

  const planet = findNearestPlanet(clickX, clickY, 20, planetScreenBuf);
  if (planet) { callbacks.setSelectedObject(planet); callbacks.setClickedConst(null); return; }

  const dso = findNearestDSO(clickX, clickY, 20, dsoScreenBuf);
  if (dso) { callbacks.setSelectedObject(dso); callbacks.setClickedConst(null); return; }

  const cl = findNearestConstLabel(clickX, clickY, 30, constLabelScreen);
  if (cl) { callbacks.setClickedConst(cl.abbr); callbacks.setSelectedObject(null); return; }

  const star = findNearestStar(clickX, clickY, 15, starScreenBuf, starScreenCount, data.stars);
  if (star) {
    callbacks.setSelectedObject(star);
    const key = star.ra.toFixed(6) + ',' + star.dec.toFixed(5);
    callbacks.setClickedConst((hipToConst && hipToConst.get(key)) || null);
    return;
  }

  callbacks.setSelectedObject(null);
  callbacks.setClickedConst(null);
}

// --- Overlay button sync ---

function syncOverlayButtons(overlays, toggles) {
  for (const [id, key] of [['btn-altaz', 'altAzGrid'], ['btn-eq', 'eqGrid'], ['btn-ecl', 'ecliptic']]) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('active', overlays[key]);
  }
  const btnConst = document.getElementById('btn-const');
  if (btnConst) btnConst.classList.toggle('active', toggles.constellations);
}

// --- Overlay menu toggle ---

function setupOverlayMenu() {
  const menuToggle = document.getElementById('menu-toggle');
  const overlayMenu = document.getElementById('overlay-menu');
  if (menuToggle && overlayMenu) {
    menuToggle.addEventListener('click', () => overlayMenu.classList.toggle('visible'));
    document.addEventListener('click', (e) => {
      if (!menuToggle.contains(e.target) && !overlayMenu.contains(e.target)) {
        overlayMenu.classList.remove('visible');
      }
    });
  }
}

// --- Main input wiring ---

/**
 * Wire all input event listeners to the canvas and window.
 *
 * @param {Object} state  - Mutable refs: { view, drag, overlays, toggles, canvas, getSize }
 *   view      = { az, alt, fov }         (read/write)
 *   drag      = { active, prevX, ... }   (read/write)
 *   overlays  = { altAzGrid, eqGrid, ecliptic } (read/write)
 *   toggles   = { constellations }       (read/write)
 *   canvas    = <canvas> element
 *   getSize   = () => { W, H }
 *
 * @param {Object} callbacks - One-way notifications back to the app:
 *   setViewTarget(target)       — set animated pan target
 *   setSelectedObject(obj)      — set selected sky object
 *   setClickedConst(abbr)       — set clicked constellation
 *   setHoveredConst(abbr)       — set hovered constellation
 *   getScreenState()            — read ephemeral screen buffers
 */
export function setupInput(state, callbacks) {
  const { view, drag, overlays, toggles, canvas } = state;

  canvas.style.cursor = 'grab';

  // --- Mouse ---

  canvas.addEventListener('mousedown', (e) => {
    drag.active = true;
    drag.prevX = e.clientX; drag.prevY = e.clientY;
    drag.startX = e.clientX; drag.startY = e.clientY;
    drag.startTime = performance.now();
    callbacks.setViewTarget(null);
    canvas.style.cursor = 'grabbing';
  });

  window.addEventListener('mousemove', (e) => {
    if (!drag.active) {
      const { starScreenBuf, starScreenCount, constLabelScreen, data, hipToConst } = callbacks.getScreenState();
      let found = null;
      const nearStar = findNearestStar(e.clientX, e.clientY, 20, starScreenBuf, starScreenCount, data.stars);
      if (nearStar && hipToConst) {
        const key = nearStar.ra.toFixed(6) + ',' + nearStar.dec.toFixed(5);
        found = hipToConst.get(key) || null;
      }
      if (!found) {
        const cl = findNearestConstLabel(e.clientX, e.clientY, 50, constLabelScreen);
        found = cl ? cl.abbr : null;
      }
      callbacks.setHoveredConst(found);
      return;
    }

    const dx = e.clientX - drag.prevX, dy = e.clientY - drag.prevY;
    const { W, H } = state.getSize();
    const degPerPx = view.fov / Math.min(W, H);
    const nv = applyDragRotation(view.alt, view.az, dx, dy, degPerPx);
    view.alt = nv.alt; view.az = nv.az;
    drag.prevX = e.clientX; drag.prevY = e.clientY;
  });

  window.addEventListener('mouseup', (e) => {
    const wasDrag = drag.active;
    drag.active = false;
    canvas.style.cursor = 'grab';

    if (wasDrag) {
      const dx = e.clientX - drag.startX, dy = e.clientY - drag.startY;
      const dt = performance.now() - drag.startTime;
      if (Math.abs(dx) < 5 && Math.abs(dy) < 5 && dt < 300) {
        handleClick(e.clientX, e.clientY, state, callbacks);
      }
    }
  });

  // --- Wheel zoom ---

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    let delta = e.deltaY;
    if (e.deltaMode === 1) delta *= 30;
    if (e.deltaMode === 2) delta *= 300;
    view.fov = Math.max(FOV_MIN, Math.min(FOV_MAX, view.fov * Math.pow(1.0003, delta)));
  }, { passive: false });

  // --- Keyboard ---

  window.addEventListener('keydown', (e) => {
    if (isSearchOpen() && e.key !== 'Escape') return;

    if (e.key === 'g' || e.key === 'G') { overlays.altAzGrid = !overlays.altAzGrid; syncOverlayButtons(overlays, toggles); }
    if (e.key === 'q' || e.key === 'Q') { overlays.eqGrid = !overlays.eqGrid; syncOverlayButtons(overlays, toggles); }
    if (e.key === 'e' || e.key === 'E') { overlays.ecliptic = !overlays.ecliptic; syncOverlayButtons(overlays, toggles); }
    if (e.key === 'c' || e.key === 'C') { toggles.constellations = !toggles.constellations; syncOverlayButtons(overlays, toggles); }

    const PAN_DEG = 2;
    if (e.key === 'ArrowUp')    { callbacks.setViewTarget(null); const nv = applyDragRotation(view.alt, view.az, 0, -1, PAN_DEG); view.alt = nv.alt; e.preventDefault(); }
    if (e.key === 'ArrowDown')  { callbacks.setViewTarget(null); const nv = applyDragRotation(view.alt, view.az, 0, 1, PAN_DEG); view.alt = nv.alt; e.preventDefault(); }
    if (e.key === 'ArrowLeft')  { callbacks.setViewTarget(null); const nv = applyDragRotation(view.alt, view.az, -1, 0, PAN_DEG); view.az = nv.az; e.preventDefault(); }
    if (e.key === 'ArrowRight') { callbacks.setViewTarget(null); const nv = applyDragRotation(view.alt, view.az, 1, 0, PAN_DEG); view.az = nv.az; e.preventDefault(); }
    if (e.key === '+' || e.key === '=') view.fov = Math.max(FOV_MIN, view.fov * 0.95);
    if (e.key === '-') view.fov = Math.min(FOV_MAX, view.fov * 1.05);

    if (e.key === '/') { e.preventDefault(); openSearch(); }
    if (e.key === 'Escape') { if (isSearchOpen()) closeSearch(); else { callbacks.setSelectedObject(null); callbacks.setClickedConst(null); } }

    if (e.key === ' ') { e.preventDefault(); togglePause(); }
  });

  // --- Overlay buttons ---

  for (const [id, obj, key] of [
    ['btn-altaz', overlays, 'altAzGrid'], ['btn-eq', overlays, 'eqGrid'], ['btn-ecl', overlays, 'ecliptic'],
    ['btn-const', toggles, 'constellations'],
  ]) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', () => { obj[key] = !obj[key]; syncOverlayButtons(overlays, toggles); });
  }

  // --- Touch ---

  let lastTouchDist = null, lastTouchX = null, lastTouchY = null;
  let touchStartX = 0, touchStartY = 0, touchStartTime = 0;

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (e.touches.length === 1) {
      lastTouchX = e.touches[0].clientX; lastTouchY = e.touches[0].clientY;
      touchStartX = lastTouchX; touchStartY = lastTouchY;
      touchStartTime = performance.now();
      lastTouchDist = null;
    } else if (e.touches.length === 2) {
      lastTouchDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (e.touches.length === 1 && lastTouchX !== null) {
      const dx = e.touches[0].clientX - lastTouchX, dy = e.touches[0].clientY - lastTouchY;
      const { W, H } = state.getSize();
      const degPerPx = view.fov / Math.min(W, H);
      const nv = applyDragRotation(view.alt, view.az, dx, dy, degPerPx);
      view.alt = nv.alt; view.az = nv.az;
      lastTouchX = e.touches[0].clientX; lastTouchY = e.touches[0].clientY;
    } else if (e.touches.length === 2 && lastTouchDist !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      view.fov = Math.max(FOV_MIN, Math.min(FOV_MAX, view.fov * lastTouchDist / dist));
      lastTouchDist = dist;
    }
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) lastTouchDist = null;
    if (e.touches.length < 1) {
      const dx = lastTouchX - touchStartX, dy = lastTouchY - touchStartY;
      const dt = performance.now() - touchStartTime;
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && dt < 300) {
        handleClick(touchStartX, touchStartY, state, callbacks);
      }
      lastTouchX = null; lastTouchY = null;
    }
  }, { passive: false });

  window.addEventListener('resize', callbacks.onResize);

  // --- Overlay menu ---
  setupOverlayMenu();

  // Initial button state
  syncOverlayButtons(overlays, toggles);
}
