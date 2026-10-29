/**
 * render-overlays.js — Overlay render layers for the star viewer.
 *
 * Constellation lines/highlights, object selection ring, cardinal direction
 * markers, and constellation/DSO labels. Lines draw beneath the stars;
 * highlights, cardinals, and labels draw on top of all sky objects.
 *
 * All functions take a render context: { ctx, cx, cy, scale, vf, fov }.
 */

import { D2R, CARDINALS, BELOW_HORIZON_DIM, reducedMotion } from './config.js';
import { edgeFade, fovMagLimit, magToRadius } from './visual.js';
import { projectStar, projectStarPre, projectHzPoint } from './camera.js';
import { isBelowSkyline } from './render-skyline.js';

// --- Constellation lines ---

// Segment endpoints are held simultaneously, so they need their own scratch
// objects (the shared camera.js scratch would be overwritten by the 2nd call).
const _p1 = { x: 0, y: 0, cosAngle: 0, belowHorizon: false, hx: 0, hy: 0, hz: 0 };
const _p2 = { x: 0, y: 0, cosAngle: 0, belowHorizon: false, hx: 0, hy: 0, hz: 0 };

// Segments are culled only when BOTH endpoints are outside the FOV, so the
// projection itself can't cull-first — pass an always-pass threshold and
// apply the two-endpoint test after.
const NO_CULL = -2;

export function renderConstellationLines(rc, constellations, constFadeAlphas, showConst) {
  const { ctx, cx, cy, scale, vf, fov } = rc;
  const cullCos = Math.cos((fov / 2 + 30) * D2R);

  // Batch all non-highlighted constellations into one path — they share
  // the same stroke style, so one beginPath/stroke replaces ~500-600.
  if (showConst) {
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (const c of constellations) {
      if (constFadeAlphas[c.abbr] > 0) continue;
      for (const seg of c.resolvedLines) {
        const p1 = projectStarPre(seg[0], seg[1], seg[2], vf, NO_CULL, _p1);
        const p2 = projectStarPre(seg[3], seg[4], seg[5], vf, NO_CULL, _p2);
        if (!p1 || !p2) continue;
        if (p1.cosAngle < cullCos && p2.cosAngle < cullCos) continue;
        ctx.moveTo(cx + p1.x * scale, cy - p1.y * scale);
        ctx.lineTo(cx + p2.x * scale, cy - p2.y * scale);
      }
    }
    ctx.stroke();
  }

  // Highlighted constellations (1-2 at a time) need individual styles.
  for (const c of constellations) {
    const ha = constFadeAlphas[c.abbr] || 0;
    if (ha <= 0) continue;
    const a = 0.35 + 0.30 * ha;
    ctx.strokeStyle = `rgba(${Math.round(255 - 155*ha)},${Math.round(255 - 75*ha)},255,${a})`;
    ctx.lineWidth = 1.2 + 1.0 * ha;
    ctx.beginPath();
    for (const seg of c.resolvedLines) {
      const p1 = projectStarPre(seg[0], seg[1], seg[2], vf, NO_CULL, _p1);
      const p2 = projectStarPre(seg[3], seg[4], seg[5], vf, NO_CULL, _p2);
      if (!p1 || !p2) continue;
      if (p1.cosAngle < cullCos && p2.cosAngle < cullCos) continue;
      ctx.moveTo(cx + p1.x * scale, cy - p1.y * scale);
      ctx.lineTo(cx + p2.x * scale, cy - p2.y * scale);
    }
    ctx.stroke();
  }
}

// --- Constellation highlight rings ---

const _highlightSeen = new Set();

export function renderConstellationHighlight(rc, constFadeAlphas, constByAbbr, hip) {
  const { ctx, cx, cy, scale, vf } = rc;

  for (const abbr in constFadeAlphas) {
    const ha = constFadeAlphas[abbr];
    if (ha <= 0.01) continue;
    const con = constByAbbr.get(abbr);
    if (!con) continue;

    _highlightSeen.clear();
    ctx.strokeStyle = `rgba(100,180,255,${0.8 * ha})`;
    ctx.lineWidth = 1.5;

    for (const [h1, h2] of con.lines) {
      for (const h of [h1, h2]) {
        if (_highlightSeen.has(h)) continue;
        _highlightSeen.add(h);
        const pos = hip[String(h)];
        if (!pos) continue;
        const p = projectStar(pos[0], pos[1], vf);
        if (!p) continue;
        ctx.beginPath();
        ctx.arc(cx + p.x * scale, cy - p.y * scale, 6, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }
}

// --- Selection ring ---

export function renderSelection(rc, selectedObject) {
  if (!selectedObject) return;
  const { ctx, cx, cy, scale, vf } = rc;
  const p = projectStar(selectedObject.ra, selectedObject.dec, vf);
  if (!p) return;
  const px = cx + p.x * scale, py = cy - p.y * scale;
  const pulse = reducedMotion ? 1.0 : 0.7 + 0.3 * Math.sin(performance.now() * 0.003);

  ctx.strokeStyle = `rgba(255,220,100,${pulse})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(px, py, Math.max(8, (selectedObject.screenR || 0) + 4), 0, Math.PI * 2);
  ctx.stroke();

  // Update screen position for popup positioning
  selectedObject.px = px;
  selectedObject.py = py;
}

// --- Cardinal directions ---

export function renderCardinals(rc) {
  const { ctx, cx, cy, scale, vf, fov } = rc;
  ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  for (const { az, label } of CARDINALS) {
    const p = projectHzPoint(0, az, vf);
    if (!p || p.cosAngle < 0.01) continue;
    const alpha = edgeFade(p.cosAngle, fov);
    if (alpha <= 0) continue;
    const px = cx+p.x*scale, py = cy-p.y*scale;
    ctx.strokeStyle = `rgba(255,255,255,${0.75*alpha})`; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(px, py-7); ctx.lineTo(px, py+7); ctx.stroke();
    ctx.fillStyle = `rgba(255,255,255,${0.9*alpha})`;
    ctx.fillText(label, px, py-10);
  }
}

// --- Labels ---
// Every on-sky label goes through one placer per render: labels claim screen
// rectangles in priority order (planets, bright star names, constellations,
// deep sky objects) and any label that would overlap an earlier one is
// skipped, so crowded regions stay readable.

const _textW = new Map(); // "font|text" → width (px)
function textWidth(ctx, text) {
  const key = ctx.font + '|' + text;
  let w = _textW.get(key);
  if (w === undefined) { w = ctx.measureText(text).width; _textW.set(key, w); }
  return w;
}

function makePlacer() {
  const rects = [];
  return (x0, y0, x1, y1) => {
    for (let i = 0; i < rects.length; i += 4) {
      if (x0 < rects[i + 2] && x1 > rects[i] && y0 < rects[i + 3] && y1 > rects[i + 1]) return false;
    }
    rects.push(x0 - 2, y0 - 1, x1 + 2, y1 + 1); // small gutter
    return true;
  };
}

/** Faintest magnitude whose proper name is labeled: more names as you zoom in. */
function starNameMagLimit(fov) {
  return Math.max(1.0, Math.min(4.0, 1.5 + (90 - fov) / 30));
}

/**
 * Render planet, star-name, constellation, and DSO labels without overlaps.
 * @param {Object} L - { constellations, dsos, constFadeAlphas, showConst,
 *                       planets, stars, showStarNames }
 * @returns {Array} constLabelScreen — [{abbr, px, py}] for hover/click
 */
export function renderLabels(rc, L) {
  const { ctx, cx, cy, scale, vf, fov, skyline } = rc;
  const place = makePlacer();
  const labelBuf = [];

  // Planets: centered under the dot
  if (L.planets) {
    const magLimit = fovMagLimit(fov);
    ctx.font = '11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (const planet of L.planets) {
      const p = projectStar(planet.ra, planet.dec, vf);
      if (!p) continue;
      const alpha = edgeFade(p.cosAngle, fov);
      if (alpha <= 0) continue;
      const visible = planet.magnitude <= magLimit;
      const hidden = p.belowHorizon || (skyline && isBelowSkyline(p.hx, p.hy, p.hz));
      const px = cx + p.x * scale, py = cy - p.y * scale;
      const ty = py + Math.max(visible ? magToRadius(planet.magnitude) : 1, 3) + 5;
      const w = textWidth(ctx, planet.name);
      if (!place(px - w / 2, ty, px + w / 2, ty + 12)) continue;
      const a = alpha * (hidden ? BELOW_HORIZON_DIM : 1) * (visible ? 0.85 : 0.45);
      ctx.fillStyle = `rgba(255,215,150,${a})`;
      ctx.fillText(planet.name, px, ty);
    }
  }

  // Bright stars' proper names: right of the star (data.stars is magnitude-sorted)
  if (L.showStarNames && L.stars) {
    const limit = starNameMagLimit(fov);
    const cullCos = Math.cos((fov / 2) * D2R);
    ctx.font = '11px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    for (const s of L.stars) {
      if (s[2] > limit) break;
      if (!s[15]) continue;                    // no proper name
      const p = projectStarPre(s[12], s[13], s[14], vf, cullCos);
      if (!p || p.belowHorizon || (skyline && isBelowSkyline(p.hx, p.hy, p.hz))) continue;
      const alpha = edgeFade(p.cosAngle, fov);
      if (alpha <= 0) continue;
      const px = cx + p.x * scale + s[9] + 4, py = cy - p.y * scale;
      const w = textWidth(ctx, s[15]);
      if (!place(px, py - 6, px + w, py + 6)) continue;
      ctx.fillStyle = `rgba(200,215,255,${0.7 * alpha})`;
      ctx.fillText(s[15], px, py);
    }
  }

  // Constellations: centered above the label point
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.font = '13px sans-serif';
  for (const c of L.constellations) {
    const p = projectStar(c.label_ra, c.label_dec, vf);
    if (!p) continue;
    const alpha = edgeFade(p.cosAngle, fov);
    if (alpha <= 0) continue;
    const px = cx + p.x * scale, py = cy - p.y * scale;
    if (!L.showConst) {
      // Hidden labels still answer hover so constellations stay discoverable
      labelBuf.push({ abbr: c.abbr, px, py });
      continue;
    }
    const w = textWidth(ctx, c.name);
    if (!place(px - w / 2, py - 24, px + w / 2, py - 10)) continue;
    const ha = L.constFadeAlphas[c.abbr] || 0;
    const r = Math.round(255 - 155 * ha), g = Math.round(255 - 75 * ha);
    ctx.fillStyle = `rgba(${r},${g},255,${(0.45 + 0.40 * ha) * alpha})`;
    ctx.fillText(c.name, px, py - 10);
    labelBuf.push({ abbr: c.abbr, px, py });
  }

  // Deep sky objects: centered below the marker
  ctx.textBaseline = 'top'; ctx.font = '11px sans-serif';
  for (const d of L.dsos) {
    const p = projectStar(d.ra, d.dec, vf);
    if (!p) continue;
    const alpha = edgeFade(p.cosAngle, fov);
    if (alpha <= 0) continue;
    const px = cx + p.x * scale, py = cy - p.y * scale + 10;
    const w = textWidth(ctx, d.name);
    if (!place(px - w / 2, py, px + w / 2, py + 12)) continue;
    ctx.fillStyle = `rgba(180,180,255,${0.40 * alpha})`;
    ctx.fillText(d.name, px, py);
  }

  return labelBuf;
}
