# Jose T. Temblador — Portfolio

Live at [josetemblador.com](https://josetemblador.com).

I'm a Computer Science student at California State University Dominguez Hills, graduating May 2026. I like building things from scratch and understanding how they work under the hood. I'm currently looking for full-time roles in software and ML engineering.

## What's Here

**Portfolio** — About me, projects, experience, and contact info. Vanilla HTML, CSS, and JavaScript — no frameworks, no build step.

**Live Star Viewer** — The background is a real-time interactive star viewer rendering the night sky from Los Angeles. It's built entirely in vanilla JavaScript and Canvas2D across 15 ES modules (~2,400 lines). Click the star icon in the sidebar to enter full exploration mode with drag-to-pan, zoom, search, time controls, and object info popups.

## Projects

- **OrbitWatch** — Real-time satellite orbit tracker with a custom C++ SGP4 propagation engine, NASA SPICE coordinate transforms, FastAPI backend, and Cesium.js 3D globe
- **Portfolio + Star Viewer** — This site. Real-time night sky background with 15,598 stars, planetary ephemeris, 88 constellations, and interactive exploration mode
- **NFL Prediction System** — 40+ CatBoost models predicting player performance, outperforming professional DFS projections
- **BlackJack Game** — Console-based C++ game with OOP design, dealer AI, and persistent state

## How the Star Viewer Works

The star catalog comes from the HYG v42 database (119,627 stars filtered to 15,598 at magnitude 7.0). A Python preprocessing pipeline combines it with Stellarium constellation data, 27 deep sky objects, and a Milky Way centerline path into a compact 521 KB JSON file.

At runtime, planetary positions are computed using JPL Keplerian orbital elements. Sun and Moon positions come from simplified Meeus algorithms. All ephemeris data is cached and refreshed once per minute.

The projection system uses a camera-frame stereographic projection in horizontal (Alt/Az) coordinates. This guarantees a flat horizon at all azimuths — the same approach used by planetarium software like Stellarium.

The renderer is split into three layer groups (background, objects, overlays), each in its own module. In portfolio mode, only stars, Milky Way, planets, and constellation lines render. In exploration mode, all layers activate including grids, labels, DSOs, horizon, and interactive features.

## Built With

- JavaScript (ES6 modules), Canvas2D
- Python (data preprocessing, HYG catalog processing)
- HTML, CSS (custom properties, CSS transitions)
- Git, GitHub Pages, GitHub Actions
