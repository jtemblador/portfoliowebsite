/**
 * visual.js — Visual mapping functions for star rendering.
 *
 * Pure functions that convert astronomical data (magnitude, B-V color index)
 * into visual properties (radius, alpha, RGB color). No DOM access.
 */

import { MAG_BRIGHT, MAG_DIM, R_MAX, R_MIN, A_MAX, A_MIN, LABEL_FADE_DEG, D2R, R2D } from './config.js';

// --- B-V Color Index → RGB Lookup Table ---

/**
 * Build a 256-entry lookup table mapping B-V color index to "R,G,B" strings.
 * Piecewise linear interpolation through empirical anchor points.
 * Hot blue (B-V = -0.33) → cool red (B-V = 2.0).
 */
function buildColorLUT() {
  const anchors = [
    [-0.33, 155, 176, 255], [-0.17, 170, 191, 255], [0.00, 192, 209, 255],
    [0.15, 212, 225, 255], [0.30, 237, 238, 255], [0.45, 255, 251, 245],
    [0.60, 255, 244, 232], [0.80, 255, 227, 196], [1.00, 255, 210, 161],
    [1.40, 255, 187, 123], [2.00, 255, 160, 100],
  ];
  const lut = new Array(256);
  for (let i = 0; i < 256; i++) {
    const bv = (i / 255) * 2.4 - 0.4;
    let lo = 0, hi = anchors.length - 1;
    for (let j = 0; j < anchors.length - 1; j++) {
      if (bv >= anchors[j][0] && bv <= anchors[j + 1][0]) { lo = j; hi = j + 1; break; }
    }
    if (bv <= anchors[0][0]) { lo = 0; hi = 0; }
    if (bv >= anchors[anchors.length - 1][0]) { lo = anchors.length - 1; hi = lo; }
    const t = lo === hi ? 0 : (bv - anchors[lo][0]) / (anchors[hi][0] - anchors[lo][0]);
    const r = Math.round(anchors[lo][1] + (anchors[hi][1] - anchors[lo][1]) * t);
    const g = Math.round(anchors[lo][2] + (anchors[hi][2] - anchors[lo][2]) * t);
    const b = Math.round(anchors[lo][3] + (anchors[hi][3] - anchors[lo][3]) * t);
    lut[i] = `${r},${g},${b}`;
  }
  return lut;
}

const COLOR_LUT = buildColorLUT();

/** Convert B-V color index to "R,G,B" string for canvas rgba(). */
export function bvToColor(ci) {
  if (ci == null) return '220,220,255';
  return COLOR_LUT[Math.max(0, Math.min(255, Math.round((ci + 0.4) / 2.4 * 255)))];
}

// --- Magnitude → visual properties ---

/** Star radius in CSS pixels based on apparent magnitude. */
export function magToRadius(mag) {
  const t = Math.min(1, Math.max(0, (mag - MAG_BRIGHT) / (MAG_DIM - MAG_BRIGHT)));
  return R_MAX + (R_MIN - R_MAX) * t;
}

/** Star alpha (opacity) based on apparent magnitude. */
export function magToAlpha(mag) {
  const t = Math.min(1, Math.max(0, (mag - MAG_BRIGHT) / (MAG_DIM - MAG_BRIGHT)));
  return A_MAX + (A_MIN - A_MAX) * t;
}

/**
 * Alpha fade for objects approaching the FOV edge.
 * Returns 0 (invisible) to 1 (fully visible).
 */
export function edgeFade(cosAngle, fov) {
  const theta = Math.acos(Math.max(-1, Math.min(1, cosAngle))) * R2D;
  const halfFov = fov / 2;
  if (theta >= halfFov) return 0;
  if (theta <= halfFov - LABEL_FADE_DEG) return 1;
  return (halfFov - theta) / LABEL_FADE_DEG;
}

/**
 * FOV → magnitude limit for zoom-based star detail.
 * Wider FOV shows fewer (brighter) stars; narrow FOV reveals faint stars.
 */
export function fovMagLimit(fovDeg) {
  if (fovDeg >= 90) return Math.max(1.0, 6.0 + (fovDeg - 90) * (-2.0 / 60));
  if (fovDeg >= 50) return 6.0 + (90 - fovDeg) * (0.6 / 40);
  return 6.6 + (50 - fovDeg) * (0.4 / 35);
}
