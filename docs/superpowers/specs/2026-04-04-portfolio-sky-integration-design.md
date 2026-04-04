# Portfolio Sky Integration — Design Spec

## Overview

Replace the simple 180-dot twinkling canvas in `index.html` with the real star viewer as a live background. Single-page architecture with two modes: portfolio (passive sky behind content) and exploration (full interactive viewer).

## Architecture

### Single Page, Two Modes

`index.html` is the only page. It loads both the portfolio styles and the star viewer. A `portfolioMode` boolean controls which render layers are active and whether user interaction is enabled.

```
index.html
  ├── css/style.css         (portfolio styles)
  ├── css/starfield.css     (viewer UI styles)
  ├── js/main.js            (theme, nav, transitions, mode toggle)
  └── js/starfield.js       (star viewer — render loop, modules)
```

### File Changes

**`index.html`**
- Add `<link rel="stylesheet" href="css/starfield.css">` to head
- Replace `<canvas id="stars">` with `<canvas id="sky-canvas">`
- Add viewer UI elements (search, time controls, overlays, info panel, object popup) — hidden by default
- Add explore button (bottom-right corner icon)
- Change `<script src="js/main.js">` to `<script type="module" src="js/main.js">`
- Remove old star field canvas reference

**`js/main.js`**
- Remove the old 180-dot star canvas code (lines 22–61)
- Import starfield module and call its init
- Add mode toggle logic: fade portfolio content out/in, toggle viewer UI, set `portfolioMode` flag
- Hide explore button and stop render loop in light mode

**`js/starfield.js`**
- Export an `init()` function instead of self-executing
- Export a `setPortfolioMode(boolean)` function
- When `portfolioMode === true`: render only stars, Milky Way, planets, constellation lines
- When `portfolioMode === false`: render all layers (full viewer)
- Input module disabled in portfolio mode (canvas doesn't respond to drag/click/keyboard)

**`css/starfield.css`**
- Viewer UI elements (`#time-controls`, `#search-btn`, `#info`, etc.) start with `display: none`
- Add `.exploration-mode` class that shows them
- Transition rules for fade in/out

## Portfolio Mode (Default)

### Visible Render Layers
- Stars (with twinkle, B-V color, magnitude scaling)
- Milky Way glow
- Planets + Sun + Moon
- Constellation lines (no highlight on hover — input disabled)

### Hidden Render Layers
- Constellation/DSO labels
- Alt/Az grid, Equatorial grid
- Ecliptic + Zodiac band
- Horizon line + Cardinals
- DSO rendering
- Selection ring
- Constellation highlight rings

### Behavior
- Real-time sidereal rotation at 60fps
- No user interaction — canvas ignores all mouse, touch, keyboard
- No viewer UI panels visible (search, time controls, overlays, info, popup)
- Portfolio content renders on top via z-index

### Explore Button
- Small icon button, bottom-right corner
- Subtle styling matching the portfolio aesthetic (semi-transparent, monospace font)
- Tooltip: "Explore the sky"
- Hidden in light mode

## Exploration Mode

### Activation
1. User clicks explore button
2. Portfolio content fades out (~300ms): sidebar, cards, nav, theme toggle, explore button
3. Viewer UI fades in (~300ms): search bar, time controls, overlays menu, info panel
4. `setPortfolioMode(false)` called — all render layers activate, input enabled
5. "Back" button appears (same bottom-right position) to return to portfolio

### Full Viewer Features
- All render layers available
- Drag to pan, scroll to zoom, keyboard shortcuts
- Click/tap objects for info popup
- Search, time controls, overlay toggles
- Identical behavior to current `starfield.html`

### Deactivation
1. User clicks "Back" button
2. Viewer UI fades out (~300ms)
3. `setPortfolioMode(true)` called — layers reduced, input disabled
4. Portfolio content fades in (~300ms)
5. Explore button reappears

## Light Mode

- Canvas set to `display: none` (no rendering, no CPU cost)
- Explore button hidden
- Render loop does not run
- When switching back to dark mode: canvas shown, render loop resumes

## Data Loading

- `stars.json` fetched on page load (751 KB)
- Loading overlay shown until data is ready (same as current `starfield.html`)
- Portfolio content can render immediately — it doesn't depend on star data
- If fetch fails: portfolio works normally, just no star background

## Render Context in Portfolio Mode

The render loop calls the same `render()` function regardless of mode. The mode flag controls which layer functions are called:

```js
// In render():
renderMilkyWay(rc);
if (!portfolioMode) renderTwilight(rc, lstDeg, getCachedSun());
if (!portfolioMode && overlays.altAzGrid) renderAltAzGrid(rc);
if (!portfolioMode && overlays.eqGrid) renderEqGrid(rc);
if (!portfolioMode && overlays.ecliptic) { renderZodiacBand(rc); renderEcliptic(rc); }
if (!portfolioMode) dsoScreenBuf = renderDSOs(rc, data.dsos, selectedObject);
renderConstellationLines(rc, data.constellations, constFadeAlphas, toggles.constellations);
starScreenCount = renderStars(rc, data.stars, starScreenBuf);
// ... etc
```

Portfolio mode skips: grids, ecliptic, DSOs, labels, horizon, cardinals, twilight, highlight rings, selection ring. This also saves CPU since fewer layers render per frame.

## DOM Structure

```html
<!-- Portfolio content (fades out in exploration mode) -->
<div class="page" id="portfolio-content">
  <canvas id="sky-canvas"></canvas>
  <div class="mouse-highlight"></div>
  <button id="theme-toggle">...</button>
  <div class="container">
    <header class="sidebar">...</header>
    <main class="main-content">...</main>
  </div>
  <button id="explore-btn" title="Explore the sky">...</button>
</div>

<!-- Viewer UI (hidden by default, shown in exploration mode) -->
<div id="viewer-ui" style="display:none">
  <div id="info"></div>
  <div id="clock-panel">...</div>
  <div id="time-controls">...</div>
  <button id="search-btn">Search</button>
  <div id="search-panel">...</div>
  <div id="menu-container">...</div>
  <div id="object-popup"></div>
  <button id="back-btn" title="Back to portfolio">...</button>
</div>
```

The canvas lives inside `#portfolio-content` but is `position: fixed` so it stays fullscreen regardless. The viewer UI is a separate div that overlays the canvas when active.

## Transition CSS

```css
#portfolio-content { transition: opacity 0.3s ease; }
#portfolio-content.hidden { opacity: 0; pointer-events: none; }
#viewer-ui { transition: opacity 0.3s ease; }
#viewer-ui.visible { display: block; opacity: 1; }
```

## What Stays Unchanged

- `starfield.html` remains as the standalone test page
- All `js/viewer/` and `js/sky/` modules unchanged
- `css/style.css` unchanged
- Portfolio content HTML structure unchanged
- Theme toggle, nav observer, scroll fade-in animations all preserved
