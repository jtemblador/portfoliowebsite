/**
 * render-overlays.js — Overlay render layers for the star viewer.
 *
 * Constellation lines/highlights, object selection ring, cardinal direction
 * markers, and constellation/DSO labels. Drawn on top of all sky objects.
 *
 * All functions take a render context: { ctx, cx, cy, scale, vf, fov }.
 */

import { D2R, CARDINALS, reducedMotion } from './config.js';
import { edgeFade } from './visual.js';
import { projectStar, projectHzPoint } from './camera.js';

// --- Constellation lines ---

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
        const p1 = projectStar(seg[0], seg[1], vf);
        const p2 = projectStar(seg[2], seg[3], vf);
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
      const p1 = projectStar(seg[0], seg[1], vf);
      const p2 = projectStar(seg[2], seg[3], vf);
      if (!p1 || !p2) continue;
      if (p1.cosAngle < cullCos && p2.cosAngle < cullCos) continue;
      ctx.moveTo(cx + p1.x * scale, cy - p1.y * scale);
      ctx.lineTo(cx + p2.x * scale, cy - p2.y * scale);
    }
    ctx.stroke();
  }
}

// --- Constellation highlight rings ---

export function renderConstellationHighlight(rc, constFadeAlphas, constByAbbr, hip) {
  const { ctx, cx, cy, scale, vf } = rc;

  for (const abbr in constFadeAlphas) {
    const ha = constFadeAlphas[abbr];
    if (ha <= 0.01) continue;
    const con = constByAbbr.get(abbr);
    if (!con) continue;

    const seen = new Set();
    ctx.strokeStyle = `rgba(100,180,255,${0.8 * ha})`;
    ctx.lineWidth = 1.5;

    for (const [h1, h2] of con.lines) {
      for (const h of [h1, h2]) {
        if (seen.has(h)) continue;
        seen.add(h);
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
  ctx.arc(px, py, 8, 0, Math.PI * 2);
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

/**
 * Render constellation and DSO labels. Returns constLabelScreen for hit testing.
 * @returns {Array} constLabelScreen — [{abbr, px, py}]
 */
export function renderLabels(rc, constellations, dsos, constFadeAlphas, showConst) {
  const { ctx, cx, cy, scale, vf, fov } = rc;
  const labelBuf = [];

  if (showConst) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.font = '13px sans-serif';
    for (const c of constellations) {
      const p = projectStar(c.label_ra, c.label_dec, vf);
      if (!p) continue;
      const alpha = edgeFade(p.cosAngle, fov);
      if (alpha <= 0) continue;
      const px = cx + p.x * scale, py = cy - p.y * scale;
      const ha = constFadeAlphas[c.abbr] || 0;
      const r = Math.round(255 - 155 * ha), g = Math.round(255 - 75 * ha);
      const a2 = (0.45 + 0.40 * ha) * alpha;
      ctx.fillStyle = `rgba(${r},${g},255,${a2})`;
      ctx.fillText(c.name, px, py - 10);
      labelBuf.push({ abbr: c.abbr, px, py });
    }
  } else {
    // Still fill label buffer for hover detection even when labels hidden
    for (const c of constellations) {
      const p = projectStar(c.label_ra, c.label_dec, vf);
      if (!p) continue;
      if (edgeFade(p.cosAngle, fov) <= 0) continue;
      labelBuf.push({ abbr: c.abbr, px: cx + p.x * scale, py: cy - p.y * scale });
    }
  }

  ctx.textBaseline = 'top'; ctx.font = '11px sans-serif';
  for (const d of dsos) {
    const p = projectStar(d.ra, d.dec, vf);
    if (!p) continue;
    const alpha = edgeFade(p.cosAngle, fov);
    if (alpha <= 0) continue;
    ctx.fillStyle = `rgba(180,180,255,${0.40*alpha})`;
    ctx.fillText(d.name, cx+p.x*scale, cy-p.y*scale+10);
  }

  return labelBuf;
}
