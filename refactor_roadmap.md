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

## Things to Delete or Consolidate

| Item | Action | Reason |
|------|--------|--------|
| `projection.js` unused exports (`project`, `toCanvas`, `fromCanvas`) | Add comment, keep | Correct implementations; may be needed for Section 2 |
| `buildStarNameLookup` in starfield.js | Move to search.js | Only used to build search-related data |
| `buildMilkyWayPoints` in starfield.js | Move to render-background.js | Init-time preprocessing for that module |
| `_cachedPlanets/Sun/Moon` + `updateEphemeris` | Move to controls.js | Time-domain cache logic belongs with time management |
| Duplicate `D2R`/`R2D` in sky modules | Document in config.js | sky/ can't import from viewer/ (wrong direction) — intentional |
| `milkyWayPoints` module-level var | Encapsulate in render-background.js | Module owns its own init-time data |

---

## Performance Improvements

### During refactor (Phase 3–5)

1. **Pre-compute star RGB strings at init**
   - `bvToColor(ci)` called for every visible star every frame (~9000 LUT lookups/frame)
   - Build `data.starColors = data.stars.map(s => bvToColor(s[3]))` once at init
   - In renderStars, use `data.starColors[i]` instead of `bvToColor(ci)`
   - Eliminates per-frame string formatting in the hot loop

2. **Move ephemeris cache to controls.js**
   - Consolidates time + ephemeris into one module
   - Cache invalidation is time-domain logic

3. **Batch constellation line rendering**
   - Non-highlighted constellations share the same stroke style
   - Batch all their segments into one `beginPath/stroke` call instead of per-segment

### Post-refactor (future improvements)

4. **Pre-render glow sprites to offscreen canvas**
   - `createRadialGradient` for bright stars runs per frame (~20 allocations/frame)
   - Pre-render a unit-radius glow for each color band, `drawImage` at position

5. **Web Worker for ephemeris computation**
   - Kepler solver for 9 planets is CPU-intensive (~0.5ms per solve)
   - Could run in a worker and post results back every minute

6. **Spatial index for star rendering**
   - At narrow FOV (15°), only a fraction of 15,598 stars are visible
   - A grid-based spatial index on RA/Dec could skip the per-star projection entirely for off-screen quadrants

7. **Canvas layer separation**
   - Static layers (Milky Way, grids) could render to an offscreen canvas and composite once
   - Only re-render when view changes (not every frame for real-time rotation)

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
