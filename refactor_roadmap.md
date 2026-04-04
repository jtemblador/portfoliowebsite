# Star Viewer — Refactor Roadmap

## Goal

Reduce `starfield.js` from ~1,255 lines to ~350 lines by extracting focused modules. The result should be clean, modular, recruiter-friendly, and easy to explain in an interview.

---

## Current Architecture (After Phase 1–2)

```
js/
  sky/                          — Pure astronomy (no DOM)
    projection.js  (101 lines)    Stereographic math (partially unused)
    time.js        (114 lines)    Sidereal time, coordinate conversion
    planets.js     (274 lines)    Planet/Sun/Moon ephemeris

  viewer/                       — Reusable modules (no app state)
    config.js       (50 lines)    Constants, observer config
    visual.js      (110 lines)    Color LUT, mag mapping, edge fade
    camera.js       (80 lines)    Camera-frame projection
    hittest.js      (95 lines)    Pure hit testing
    controls.js     (75 lines)    Time control state machine
    popup.js       (170 lines)    Data panel + formatters

  starfield.js   (1255 lines)  — Everything else: state, render, UI, interaction

css/
  style.css                     — Portfolio styles
  starfield.css  (290 lines)    — Viewer UI styles

starfield.html                  — Viewer entry point
```

---

## What's Still in starfield.js

| Section | Lines | Extractable? | Target Module |
|---------|-------|-------------|---------------|
| DOM refs + state | ~50 | No — app shell | stays |
| Canvas resize | ~10 | No — writes shared dims | stays |
| **14 render functions** | **~520** | **Yes** | render-background, render-objects, render-overlays |
| Popup wrapper | ~7 | No — thin delegation | stays |
| Clock + info panel | ~50 | No — thin DOM updates | stays |
| Drag math | ~10 | Yes — pure function | camera.js |
| Ephemeris cache | ~15 | Yes — time-domain | controls.js |
| **Render loop** | ~65 | No — orchestration | stays |
| **Input/events** | **~200** | **Yes** | input.js |
| **Search** | **~185** | **Yes** | search.js |
| Init | ~50 | No — startup wiring | stays |

---

## Phased Roadmap

### Phase 3: Extract Search (~185 lines)

**Risk:** Zero. Most self-contained feature in the file.

**Create `js/viewer/search.js`**

Move:
- `buildSearchIndex`, `openSearch`, `closeSearch`
- `updateSearchResults`, `renderSearchResults`, `navigateToResult`
- `setupSearch`, `_searchMatches`, `_searchSelIdx`, `searchIndex`, `searchOpen`

Interface:
```js
export function setupSearch(callbacks) {
  // callbacks = { setViewTarget, setSelectedObject, setClickedConst, getAppState }
}
export function buildSearchIndex(data, cachedPlanets, cachedMoon) { ... }
export function isSearchOpen() { return searchOpen; }
```

**Why first:** Search has zero coupling to the render pipeline. Only outputs: sets `viewTarget`, `selectedObject`, `clickedConst` via callbacks.

**starfield.js after:** ~1070 lines

---

### Phase 4: Extract Input/Events (~200 lines)

**Risk:** Low. Must come after search (keyboard handler checks `searchOpen`).

**Create `js/viewer/input.js`**

Move:
- `setupInput` (mouse, touch, keyboard, wheel, button wiring)
- `handleClick`, `syncOverlayButtons`

Also move `applyDragRotation` to `camera.js` (it's alt/az rotation math).

Interface:
```js
export function setupInput(state, callbacks) {
  // state = { view, drag, overlays, toggles } (read/write refs)
  // callbacks = { onSelect, onConstClick, onHoverConst, togglePause, changeSpeed, ... }
}
```

**starfield.js after:** ~870 lines

---

### Phase 5: Extract Render Layers (~520 lines)

**Risk:** Moderate — render functions share `ctx`, `cx`, `cy`, `scale`, `data`. Use a render context object.

**Render context pattern:**
```js
const rc = { ctx, cx, cy, scale, viewFrame, fov: view.fov, data };
```

**Create `js/viewer/render-background.js` (~210 lines)**

Move:
- `buildMilkyWayPoints` (called once at init)
- `renderMilkyWay`, `renderTwilight`
- `drawGridLine` (private helper)
- `renderAltAzGrid`, `renderEqGrid`, `renderEcliptic`, `renderZodiacBand`
- `renderHorizon`

**Create `js/viewer/render-objects.js` (~250 lines)**

Move:
- `renderStars` (fills and returns `starScreenBuf`/`starScreenCount`)
- `renderDSOs` (fills and returns `dsoScreenBuf`)
- `renderSun`, `renderMoon` (updates `moonScreenPos`)
- `renderPlanets` (fills and returns `planetScreenBuf`)

**Create `js/viewer/render-overlays.js` (~160 lines)**

Move:
- `renderConstellationLines`, `renderConstellationHighlight`
- `renderSelection`, `renderCardinals`, `renderLabels`

**starfield.js after:** ~350 lines

---

## Target Architecture (After Phase 5)

```
js/
  sky/                                — Pure astronomy (no DOM)
    projection.js      (101 lines)      Stereographic math
    time.js            (114 lines)      Sidereal time, coordinate conversion
    planets.js         (274 lines)      Planet/Sun/Moon ephemeris

  viewer/                             — Feature modules (no app state)
    config.js           (50 lines)      Constants, observer config
    visual.js          (110 lines)      Color LUT, mag mapping, edge fade
    camera.js           (90 lines)      Camera projection + drag rotation
    hittest.js          (95 lines)      Pure hit testing
    controls.js         (90 lines)      Time + ephemeris state machine
    popup.js           (170 lines)      Data panel + all formatters
    search.js          (185 lines)      Search index, UI, navigation
    input.js           (200 lines)      Mouse, touch, keyboard, buttons
    render-background.js (210 lines)    Milky Way, grids, twilight, horizon
    render-objects.js    (250 lines)    Stars, DSOs, Sun, Moon, planets
    render-overlays.js   (160 lines)    Constellations, selection, labels

  starfield.js         (~350 lines)   — App shell: state, init, render loop

css/
  style.css                           — Portfolio styles
  starfield.css        (290 lines)    — Viewer UI styles

starfield.html                        — Viewer entry point
```

**Total JS:** ~2,450 lines across 15 files (avg ~163 lines/file)
**starfield.js:** ~350 lines (79% reduction from 1,643)

---

## Dependency Graph

```
config.js           — no imports (leaf)
visual.js           ← config
camera.js           ← config

sky/time.js         — no imports (leaf)
sky/planets.js      — no imports (leaf)
sky/projection.js   — no imports (leaf)

hittest.js          — no imports (pure functions with params)
render-background.js ← config, camera, visual, sky/time
render-objects.js    ← config, camera, visual
render-overlays.js   ← config, camera, visual

popup.js            ← config, visual, sky/time
controls.js         ← config, sky/planets
search.js           ← config, controls, sky/time
input.js            ← config, camera, hittest, controls, search

starfield.js        ← ALL (entry point)
```

No circular dependencies. Strict DAG with starfield.js at the root.

---

## Cleanup — Delete, Consolidate, or Document

| Item | Status | Action |
|------|--------|--------|
| `buildMilkyWayPoints` in starfield.js | **Done** | Moved to render-background.js as `initMilkyWay()` |
| `milkyWayPoints` module-level var | **Done** | Encapsulated as module-private in render-background.js |
| `projection.js` unused exports (`project`, `toCanvas`, `fromCanvas`) | Not done | Delete or add `// Reserved for Section 2` comment. Dead exports signal unmaintained code. |
| `buildStarNameLookup` in starfield.js | **Stays** | Roadmap originally said "move to search.js" — incorrect. Builds `starNameLookup` (used by popup) and `hipToConst` (used by input hover/click). Serves multiple consumers, not just search. Belongs in the app shell. |
| `_cachedPlanets/Sun/Moon` + `updateEphemeris` | Not done | Move to controls.js with getter exports. Time-domain cache logic. No perf gain — structural only. |
| Duplicate `D2R`/`R2D` in sky modules | Not done | Defined in config.js, projection.js, time.js, planets.js (4 copies). Intentional: sky/ can't import from viewer/. Add a comment in config.js explaining this. |

---

## Performance Improvements

Audited against the actual codebase after Phase 5. Ordered by impact-to-effort ratio.
The star viewer runs as a live portfolio background — per-frame cost directly affects
battery life, thermal throttle, and scrolling smoothness on weaker devices.

### Priority 1: Batch constellation line strokes (~20 min, high impact) — DONE

- [x] Non-highlighted constellations (usually 86–87 of 88) share the same stroke style
- [x] Currently: each segment gets its own `beginPath()`/`stroke()` — ~600 state changes per frame
- [x] Fix: collect all same-style segments into one `beginPath()` with `moveTo()`/`lineTo()` pairs, then one `stroke()`
- [x] Highlighted constellations (1–2 at a time) still need individual style, which is fine
- [x] **Eliminates ~600 canvas state changes per frame**

### Priority 2: Remove `toFixed()` from render hot loops (~15 min, high impact) — DONE

- [x] `toFixed(3)` called per star per frame — ~5,000 string allocations at 90° FOV
- [x] Canvas clamps alpha internally; the precision formatting is unnecessary overhead
- [x] Fix: pass raw floats directly in all rgba() strings across all three render modules
- [x] Also removed from DSOs, Sun, Moon, planets, constellations, labels, cardinals, twilight
- [x] **Eliminates ~5,000+ string allocations per frame**

### Priority 3: Pre-render glow sprites (~45 min, medium impact)

- [ ] `createRadialGradient()` allocates a new CanvasGradient object per bright star per frame
- [ ] ~20 bright stars + ~9 planets + Sun + Moon = ~30 gradient allocations per frame, all GC'd
- [ ] Fix: at init, pre-render a unit glow circle for each color band to a small offscreen canvas
- [ ] At render time, use `drawImage()` at the right position and scale instead of gradient
- [ ] **Eliminates ~30 CanvasGradient allocations per frame + GC pressure**

### Priority 4: Reduce Milky Way draw calls (~30 min, medium impact)

- [ ] Milky Way interpolation produces ~480 translucent circles (n_waypoints × 8 steps × 2 points)
- [ ] Each drawn at alpha 0.008 — barely visible, but GPU still composites every one
- [ ] Options: (a) render to offscreen canvas once, composite each frame (redraw on view change),
      (b) reduce interpolation steps from 8 to 4 (~240 calls), (c) skip on low-power devices
- [ ] **Eliminates ~240–480 draw calls per frame**

### Priority 5: Dead code cleanup (~5 min each)

- [ ] Delete or comment `project`, `toCanvas`, `fromCanvas` in projection.js — never imported
- [ ] Add comment in config.js documenting intentional D2R/R2D duplication in sky/ modules

### Priority 6: Structural cleanup (~20 min)

- [ ] Move ephemeris cache (`_cachedPlanets/Sun/Moon`, `updateEphemeris`) to controls.js
- [ ] Export getters: `getCachedPlanets()`, `getCachedSun()`, `getCachedMoon()`
- [ ] No performance gain — consolidates all time-domain state in one module

### Not worth doing now

- **Web Worker for ephemeris** — Kepler solver runs once per minute, takes <1ms. Worker message-passing overhead would cost more than it saves.
- **Spatial index for star rendering** — Stars are sorted by magnitude with early-exit at the mag limit. At 90° FOV only ~5,000 of 15,598 are touched. A spatial index helps at narrow FOVs (15°) but adds complexity for a niche case.
- **Canvas layer separation** — Compositing two canvases has its own cost (alpha blending, GPU texture upload). The view rotates in real-time so everything redraws anyway. Only worth it if Milky Way + grids become truly static.
- **Pre-compute star RGB at init** — Original roadmap item. Already done: `bvToColor()` uses a 256-entry LUT built at module load. Each call is an O(1) array index lookup returning a pre-computed string. No action needed.

---

## Architecture Principles

1. **State lives in one place** — starfield.js owns all mutable application state
2. **No circular imports** — strict DAG enforced by directory structure
3. **Render functions are pure given context** — read render context, draw to canvas
4. **Modules export functions, not state** — state access via getters/callbacks
5. **Name files by responsibility** — `render-objects.js` not `stuff.js`
6. **Co-locate related code** — formatters with popup, drag rotation with camera
7. **Comments explain WHY, not WHAT** — architectural decisions documented, not obvious logic
8. **No premature abstraction** — 3 similar lines > unnecessary helper

---

## Interview Explanation (30 seconds)

> "The star viewer has three layers. `sky/` contains pure astronomy math — sidereal time, Kepler solvers, coordinate conversion — with zero DOM dependencies. `viewer/` has feature modules split by responsibility: camera projection, hit testing, time controls, search, input handling, and three render groups for background, objects, and overlays. `starfield.js` is the thin application shell — just state, init, and the render loop that sequences everything. The CSS is in its own file, completely separate from the portfolio page styles. Each module averages about 160 lines, and the dependency graph has no cycles."
