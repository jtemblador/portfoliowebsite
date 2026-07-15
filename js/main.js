/**
 * main.js — Portfolio site controller.
 *
 * Nav highlighting, scroll fade-ins, mouse highlight,
 * and star viewer integration with portfolio/exploration mode toggle.
 */

import { init as initStarfield, startRenderer, stopRenderer, setPortfolioMode, ensureInputSetup } from './starfield.js';

const html = document.documentElement;
const canvas = document.getElementById('sky-canvas');

let _starfieldReady = false;

// --- Background sleep timer ---
// The decorative landing-page background stops animating after 8 minutes to
// avoid draining CPU/battery indefinitely. The last frame stays on screen.
// Entering exploration always wakes it; returning to the portfolio re-arms it.

const BG_SLEEP_MS = 8 * 60 * 1000;
let _bgSleepTimer = null;

function armBgSleepTimer() {
  clearTimeout(_bgSleepTimer);
  _bgSleepTimer = setTimeout(() => {
    if (!_explorationMode) stopRenderer();
  }, BG_SLEEP_MS);
}

// --- Star Viewer Init ---

initStarfield().then(() => {
  _starfieldReady = true;
  startRenderer();
  armBgSleepTimer();
  requestAnimationFrame(() => requestAnimationFrame(() => canvas.classList.add('visible'))); // triggers 3s CSS fade-in
}).catch((err) => {
  console.warn('Star viewer failed to load:', err);
});

// --- Exploration Mode Toggle ---

const page       = document.querySelector('.page');
const viewerUI   = document.getElementById('viewer-ui');
const exploreBtn = document.getElementById('explore-btn');
const backBtn    = document.getElementById('back-btn');

let _explorationMode = false;

function enterExploration() {
  if (!_starfieldReady || _explorationMode) return;
  _explorationMode = true;
  html.classList.add('exploring');
  clearTimeout(_bgSleepTimer);
  ensureInputSetup();
  // Switch mode (which resets sim time) BEFORE waking the renderer: after a
  // long background sleep, rendering first would flash one far-future sky
  // frame built from the stale portfolio-speed time offset.
  setPortfolioMode(false);
  startRenderer(); // wake the renderer in case the background sleep timer stopped it
  canvas.style.pointerEvents = 'auto';
  page.classList.add('hidden');
  setTimeout(() => {
    viewerUI.classList.add('visible');
    backBtn.focus(); // move keyboard focus into the viewer
  }, 300);
}

function exitExploration() {
  if (!_explorationMode) return;
  _explorationMode = false;
  html.classList.remove('exploring');
  setPortfolioMode(true);
  armBgSleepTimer();
  canvas.style.pointerEvents = 'none';
  viewerUI.classList.remove('visible');
  setTimeout(() => {
    page.classList.remove('hidden');
    exploreBtn.focus(); // return keyboard focus to where exploration began
  }, 300);
}

exploreBtn.addEventListener('click', enterExploration);
backBtn.addEventListener('click', exitExploration);
// Fired by the viewer's Escape handler (input.js) — keyboard path out of exploration
window.addEventListener('viewer-exit', () => { if (_explorationMode) exitExploration(); });

// Self-heal: an interrupted opacity transition (tab switch mid-fade, hot
// reload) can strand the page semi-transparent. Snap it to the correct
// state whenever the tab becomes visible again.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && !_explorationMode) page.classList.remove('hidden');
});

// --- Name scrolls back to top ---

const nameHeading = document.querySelector('.sidebar h1');
if (nameHeading) {
  nameHeading.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// --- Mouse Highlight ---

window.addEventListener('mousemove', (e) => {
  html.style.setProperty('--mouse-x', e.clientX + 'px');
  html.style.setProperty('--mouse-y', e.clientY + 'px');
});

// --- IntersectionObserver for Nav ---

const navLinks = document.querySelectorAll('.sidebar nav a');
const navObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        navLinks.forEach((link) => {
          link.classList.toggle('active', link.getAttribute('href') === '#' + entry.target.id);
        });
      }
    });
  },
  { threshold: 0.5 }
);
document.querySelectorAll('section[id]').forEach((s) => navObserver.observe(s));

// --- Fade-in on Scroll ---

const fadeElements = document.querySelectorAll('.card, .section-text, .arrow-link');
fadeElements.forEach((el, i) => {
  el.classList.add('fade-in');
  el.style.transitionDelay = (i % 5) * 150 + 'ms';
});

const fadeObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        const delay = parseFloat(entry.target.style.transitionDelay) || 0;
        setTimeout(() => { entry.target.style.transitionDelay = ''; }, delay + 600);
        fadeObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.1 }
);
fadeElements.forEach((el) => fadeObserver.observe(el));
