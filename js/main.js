/**
 * main.js — Portfolio site controller.
 *
 * Theme toggle, nav highlighting, scroll fade-ins, mouse highlight,
 * and star viewer integration with portfolio/exploration mode toggle.
 */

import { init as initStarfield, startRenderer, stopRenderer, setPortfolioMode, ensureInputSetup } from './starfield.js';

const html = document.documentElement;

// --- Theme Toggle ---

const toggle = document.getElementById('theme-toggle');
const iconSun  = document.getElementById('icon-sun');
const iconMoon = document.getElementById('icon-moon');
const canvas   = document.getElementById('sky-canvas');

let isDark = true;

function applyTheme(dark) {
  isDark = dark;
  html.setAttribute('data-theme', dark ? 'dark' : 'light');
  iconSun.style.display  = dark ? 'block' : 'none';
  iconMoon.style.display = dark ? 'none'  : 'block';
  if (dark) {
    startRenderer();
  } else {
    stopRenderer();
    if (_explorationMode) exitExploration();
  }
}

applyTheme(true);
toggle.addEventListener('click', () => applyTheme(!isDark));

// --- Star Viewer Init ---

initStarfield().then(() => {
  startRenderer();
  const loadingEl = document.getElementById('loading');
  if (loadingEl) {
    loadingEl.classList.add('hidden');
    setTimeout(() => loadingEl.remove(), 800);
  }
}).catch(() => {
  const loadingEl = document.getElementById('loading');
  if (loadingEl) loadingEl.remove();
});

// --- Exploration Mode Toggle ---

const page       = document.querySelector('.page');
const viewerUI   = document.getElementById('viewer-ui');
const exploreBtn = document.getElementById('explore-btn');
const backBtn    = document.getElementById('back-btn');

let _explorationMode = false;

function enterExploration() {
  _explorationMode = true;
  ensureInputSetup();
  setPortfolioMode(false);
  canvas.style.pointerEvents = 'auto';
  page.classList.add('hidden');
  setTimeout(() => { viewerUI.classList.add('visible'); }, 300);
}

function exitExploration() {
  _explorationMode = false;
  setPortfolioMode(true);
  canvas.style.pointerEvents = 'none';
  viewerUI.classList.remove('visible');
  setTimeout(() => { page.classList.remove('hidden'); }, 300);
}

exploreBtn.addEventListener('click', enterExploration);
backBtn.addEventListener('click', exitExploration);

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
