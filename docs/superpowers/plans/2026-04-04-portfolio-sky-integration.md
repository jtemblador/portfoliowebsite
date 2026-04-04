# Portfolio Sky Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the simple 180-dot canvas background in the portfolio with the real star viewer, supporting passive portfolio mode and full interactive exploration mode.

**Architecture:** Single-page, two-mode design. `index.html` loads the star viewer behind portfolio content. A `portfolioMode` flag controls which render layers are active and whether input is enabled. Mode toggled via an explore/back button with CSS fade transitions.

**Tech Stack:** Vanilla JS (ES modules), Canvas2D, CSS transitions

---

### Task 1: Make starfield.js exportable (not self-executing)

Currently `starfield.js` self-executes via the `if (document.readyState...)` block at the bottom. We need it to export `init()` and `setPortfolioMode()` so `main.js` can control it.

**Files:**
- Modify: `js/starfield.js`

- [ ] **Step 1: Add portfolioMode state and export setter**

Add after the `let dsoScreenBuf = [];` line (~line 68):

```js
// Portfolio mode: passive background (reduced layers, no interaction)
let portfolioMode = true;
let _inputEnabled = false;
let _frameId = null;
```

- [ ] **Step 2: Export setPortfolioMode and init**

Replace the self-executing block at the bottom of the file (lines 336-340):

```js
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
```

With exported functions:

```js
export function setPortfolioMode(enabled) {
  portfolioMode = enabled;
  if (enabled) {
    // Clear exploration-mode state
    selectedObject = null;
    clickedConst = null;
    hoveredConst = null;
    constFadeAlphas = {};
    viewTarget = null;
    canvas.style.cursor = '';
  } else {
    canvas.style.cursor = 'grab';
  }
}

export function isPortfolioMode() {
  return portfolioMode;
}

export function startRenderer() {
  if (!_frameId) frame();
}

export function stopRenderer() {
  if (_frameId) { cancelAnimationFrame(_frameId); _frameId = null; }
}

export { init };
```

- [ ] **Step 3: Update frame() to track the animation frame ID**

Replace:
```js
function frame() {
  render();
  requestAnimationFrame(frame);
}
```

With:
```js
function frame() {
  render();
  _frameId = requestAnimationFrame(frame);
}
```

- [ ] **Step 4: Gate render layers on portfolioMode**

Replace the render call section in `render()` (the block from `// Clear` through the layer calls) with:

```js
  // Clear
  ctx.fillStyle = '#050510';
  ctx.fillRect(0, 0, W, H);

  // Background layers
  renderMilkyWay(rc);
  if (!portfolioMode) renderTwilight(rc, lstDeg, getCachedSun());
  if (!portfolioMode && overlays.altAzGrid) renderAltAzGrid(rc);
  if (!portfolioMode && overlays.eqGrid) renderEqGrid(rc);
  if (!portfolioMode && overlays.ecliptic) { renderZodiacBand(rc); renderEcliptic(rc); }

  // Sky objects
  if (!portfolioMode) dsoScreenBuf = renderDSOs(rc, data.dsos, selectedObject);
  renderConstellationLines(rc, data.constellations, constFadeAlphas, toggles.constellations);
  starScreenCount = renderStars(rc, data.stars, starScreenBuf);
  if (!portfolioMode) renderConstellationHighlight(rc, constFadeAlphas, constByAbbr, data.hip);
  if (!portfolioMode) renderSelection(rc, selectedObject);
  if (!portfolioMode) renderHorizon(rc);
  if (!portfolioMode) renderCardinals(rc);
  renderPlanets(rc, getCachedPlanets());
  renderSun(rc, getCachedSun());
  moonScreenPos = renderMoon(rc, getCachedMoon(), getCachedSun());
  if (!portfolioMode) constLabelScreen = renderLabels(rc, data.constellations, data.dsos, constFadeAlphas, toggles.constellations);

  // UI updates (only in exploration mode)
  if (!portfolioMode) {
    updateInfo();
    updateClock();
    callUpdatePopup();
  }
```

Note: `renderPlanets` no longer assigns to `planetScreenBuf` in portfolio mode since hit testing is disabled. Same for moon — we still render it but the screenPos is only used by input. This is fine since input is disabled.

- [ ] **Step 5: Defer setupInput until exploration mode is entered**

In `init()`, wrap the `setupInput` call so it only runs once, the first time exploration mode is entered. Replace the `setupInput(...)` block with:

```js
  // Input setup deferred until exploration mode is first entered
  // (setupInput wires DOM listeners that should not fire in portfolio mode)
```

Then add a function that sets up input on first use:

```js
let _inputSetUp = false;
function ensureInputSetup() {
  if (_inputSetUp) return;
  _inputSetUp = true;
  setupInput(
    { view, drag, overlays, toggles, canvas, getSize: () => ({ W, H }) },
    {
      setViewTarget: (t) => { viewTarget = t; },
      setSelectedObject: (o) => { selectedObject = o; },
      setClickedConst: (c) => { clickedConst = c; },
      setHoveredConst: (h) => { hoveredConst = h; },
      onResize: resize,
      getScreenState: () => ({
        starScreenBuf, starScreenCount, planetScreenBuf, moonScreenPos,
        constLabelScreen, dsoScreenBuf, data, hipToConst,
      }),
    },
  );
}
```

Export it:
```js
export { ensureInputSetup };
```

- [ ] **Step 6: Remove the loading overlay removal from init()**

The loading overlay will be managed by `main.js` instead. Remove these lines from `init()`:

```js
  const loadingEl = document.getElementById('loading');
  if (loadingEl) {
    loadingEl.classList.add('hidden');
    setTimeout(() => loadingEl.remove(), 800);
  }
```

Also remove `frame()` from the end of `init()` — the caller (`main.js`) will call `startRenderer()`.

- [ ] **Step 7: Commit**

```bash
git add js/starfield.js
git commit -m "feat: make starfield.js exportable with portfolio mode support"
```

---

### Task 2: Update index.html with viewer UI and explore button

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add starfield.css to head**

Add after the `style.css` link:

```html
<link rel="stylesheet" href="css/starfield.css">
```

- [ ] **Step 2: Replace the old canvas and add explore button**

Replace `<canvas id="stars"></canvas>` with:

```html
<canvas id="sky-canvas"></canvas>
```

Add the explore button just before the closing `</div>` of `.page`:

```html
  <button id="explore-btn" class="explore-btn" title="Explore the sky">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36z"/>
    </svg>
  </button>
```

- [ ] **Step 3: Add viewer UI elements (hidden by default)**

Add after the `.page` div closes, before the script tag:

```html
<div id="viewer-ui">
  <div id="info"></div>

  <div id="clock-panel">
    <div id="clock-time"></div>
    <div id="clock-date"></div>
  </div>

  <div id="time-controls">
    <span id="live-indicator" class="live">LIVE</span>
    <button id="btn-rewind" title="Rewind">&lt;&lt;</button>
    <button id="btn-pause" title="Pause/Play (Space)">||</button>
    <button id="btn-forward" title="Fast Forward">&gt;&gt;</button>
    <button id="btn-now" title="Return to Now">Now</button>
    <span id="time-speed"></span>
  </div>

  <button id="search-btn" class="ctrl-btn" title="Search (/)">Search</button>

  <div id="search-panel">
    <input id="search-input" type="text" placeholder="Search stars, constellations... (/)" autocomplete="off">
    <div id="search-results"></div>
  </div>

  <div id="menu-container">
    <button id="menu-toggle">Overlays</button>
    <div id="overlay-menu">
      <button id="btn-altaz" title="Alt/Az Grid (G)">Alt/Az Grid</button>
      <button id="btn-eq" title="Equatorial Grid (Q)">Equatorial Grid</button>
      <button id="btn-ecl" class="active" title="Ecliptic (E)">Ecliptic</button>
      <button id="btn-const" class="active" title="Constellations (C)">Constellations</button>
    </div>
  </div>

  <div id="object-popup"></div>

  <button id="back-btn" class="explore-btn" title="Back to portfolio">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M19 12H5M12 19l-7-7 7-7"/>
    </svg>
  </button>
</div>
```

- [ ] **Step 4: Change script tag to module**

Replace:
```html
<script src="js/main.js"></script>
```

With:
```html
<script type="module" src="js/main.js"></script>
```

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: add viewer UI elements and explore button to index.html"
```

---

### Task 3: Add CSS for explore button, viewer UI visibility, and transitions

**Files:**
- Modify: `css/style.css`
- Modify: `css/starfield.css`

- [ ] **Step 1: Update style.css canvas selector**

In `css/style.css`, replace the `#stars` rules (lines 93-101):

```css
/* Star field canvas */
#stars {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 0.8;
}
html[data-theme="light"] #stars { opacity: 0; }
```

With:

```css
/* Star field canvas */
#sky-canvas {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}
html[data-theme="light"] #sky-canvas { display: none; }
```

- [ ] **Step 2: Add explore/back button and transition styles to style.css**

Add at the end of `css/style.css`:

```css
/* --- Explore/Back button (bottom-right) --- */

.explore-btn {
  position: fixed;
  bottom: 0.75rem;
  right: 0.75rem;
  z-index: 20;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.15);
  color: #777;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.explore-btn:hover { color: #ccc; border-color: rgba(255,255,255,0.35); background: rgba(255,255,255,0.1); }
html[data-theme="light"] .explore-btn { display: none; }

/* --- Mode transitions --- */

.page { transition: opacity 0.3s ease; }
.page.hidden { opacity: 0; pointer-events: none; }
```

- [ ] **Step 3: Add viewer-ui visibility rules to starfield.css**

Add at the top of `css/starfield.css`, right after the `#sky-canvas` rule:

```css
/* --- Viewer UI container (hidden until exploration mode) --- */

#viewer-ui { display: none; opacity: 0; transition: opacity 0.3s ease; }
#viewer-ui.visible { display: block; opacity: 1; }
```

- [ ] **Step 4: Commit**

```bash
git add css/style.css css/starfield.css
git commit -m "feat: add explore button, viewer-ui visibility, and mode transition CSS"
```

---

### Task 4: Rewrite main.js as ES module with mode toggle

**Files:**
- Modify: `js/main.js`

- [ ] **Step 1: Rewrite main.js**

Replace the entire contents of `js/main.js` with:

```js
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
  // Stop/start renderer based on theme
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
  // Star data failed to load — portfolio works without it
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
  // After portfolio fades out, show viewer UI
  setTimeout(() => { viewerUI.classList.add('visible'); }, 300);
}

function exitExploration() {
  _explorationMode = false;
  setPortfolioMode(true);
  canvas.style.pointerEvents = 'none';
  viewerUI.classList.remove('visible');
  // After viewer UI fades out, show portfolio
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
```

- [ ] **Step 2: Commit**

```bash
git add js/main.js
git commit -m "feat: rewrite main.js as ES module with exploration mode toggle"
```

---

### Task 5: Make init() async-safe and return a promise

The current `init()` in `starfield.js` is `async` but the self-executing wrapper doesn't care about its return value. Now that `main.js` calls `init()` and chains `.then()`, we need to make sure `init()` returns cleanly on failure (no `return` that silently swallows errors — let the caller handle it).

**Files:**
- Modify: `js/starfield.js`

- [ ] **Step 1: Update init() error handling**

In `init()`, change the catch block from:

```js
  } catch (err) {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) loadingEl.textContent = `failed to load star catalog: ${err.message}`;
    return;
  }
```

To:

```js
  } catch (err) {
    throw new Error(`failed to load star catalog: ${err.message}`);
  }
```

The caller (`main.js`) will handle the loading overlay on failure.

- [ ] **Step 2: Commit**

```bash
git add js/starfield.js
git commit -m "feat: init() throws on failure so caller can handle loading UI"
```

---

### Task 6: Test and verify both modes

**Files:** None (manual testing)

- [ ] **Step 1: Start local server and test**

```bash
python3 -m http.server 8765
```

Open `http://localhost:8765` (the portfolio page, NOT starfield.html).

- [ ] **Step 2: Verify portfolio mode**

Check:
- Real stars render behind portfolio content
- Constellation lines visible, no labels
- Planets/Sun/Moon visible
- No grids, no horizon, no DSOs
- Sky rotates in real-time
- Canvas does not respond to mouse drag or click
- Scrolling and nav work normally

- [ ] **Step 3: Verify exploration mode**

Click the compass icon (bottom-right). Check:
- Portfolio content fades out
- Viewer UI fades in (search, time controls, overlays, info panel)
- Drag to pan, scroll to zoom work
- Click stars/planets for info popup
- Keyboard shortcuts work (G, Q, E, C, /, Space)

- [ ] **Step 4: Verify back button**

Click the back arrow (bottom-right). Check:
- Viewer UI fades out
- Portfolio content fades back in
- Sky continues rotating
- Explore button reappears

- [ ] **Step 5: Verify light mode**

Click theme toggle. Check:
- Canvas hidden
- Explore button hidden
- No console errors
- Switch back to dark: canvas reappears, sky rendering resumes

- [ ] **Step 6: Commit any fixes**

```bash
git add -A
git commit -m "fix: address issues found during integration testing"
```

---

### Task 7: Final commit and PR

- [ ] **Step 1: Create branch, squash or group commits, push**

```bash
git push -u origin feat/portfolio-sky-integration
```

- [ ] **Step 2: Create PR**

```bash
gh pr create --title "feat: integrate star viewer as portfolio background" --body "..."
```
