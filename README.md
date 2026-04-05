# Jose T. Temblador — Portfolio

Live at [josetemblador.com](https://josetemblador.com).

I'm a Computer Science student at California State University Dominguez Hills, graduating May 2026. I like building things from scratch and understanding how they work under the hood. I'm currently looking for full-time roles in software and ML engineering.

## What's Here

**Portfolio** — About me, projects, experience, and contact info. Vanilla HTML, CSS, and JavaScript — no frameworks, no build step.

**Live Star Viewer** — The background is a real-time interactive star viewer rendering the night sky from Los Angeles. It's built entirely in vanilla JavaScript and Canvas2D across 15 ES modules (~2,400 lines). Click the star icon in the sidebar to enter full exploration mode with drag-to-pan, zoom, search, time controls, and object info popups.

## Projects

- **OrbitWatch** — Real-time satellite orbit tracker and collision predictor. Custom C++ SGP4 propagation engine compiled via pybind11, full coordinate transform pipeline (TEME → ECEF → geodetic) using NASA SPICE, FastAPI REST backend, and Cesium.js interactive 3D globe. 279 automated tests across 7 files.
- **NFL Player Performance Prediction System** — 40+ position-specific CatBoost models trained on 109 weeks of NFL data with 50 engineered features. Achieved 4.26 MAE, outperforming professional DFS platforms (industry benchmark: 4.5–5.5).
- **Portfolio + Star Viewer** — This site. Real-time night sky rendered with 15,598 stars from the HYG v42 catalog, runtime planetary ephemeris via JPL Keplerian elements, 88 IAU constellation overlays, and a full interactive exploration mode — built across 15 ES modules in vanilla JS and Canvas2D.
- **Crypto Market Trend Predictor** — Binary classification pipeline combining 5 technical indicators (MACD, RSI, Bollinger Bands) with FinBERT sentiment scores from Reddit and X, ingesting live data from Kraken, Reddit, and X APIs.

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
