/**
 * projection.js — Stereographic projection utilities.
 *
 * Currently only provides the FOV-to-scale mapping. The full equatorial
 * stereographic projection (project, toCanvas, fromCanvas) was removed
 * because the viewer uses a horizontal-frame projection in camera.js instead.
 *
 * Projection math reference (unit sphere, R=1):
 *   scale = canvasHalf / tan(fov/4)
 */

const D2R = Math.PI / 180;

/**
 * Compute the projection scale (pixels per unit) for a given FOV.
 * A star at FOV/2 from center lands exactly at canvasHalf pixels from center.
 */
export function fovToScale(fovDeg, canvasHalf) {
  return canvasHalf / Math.tan((fovDeg / 4) * D2R);
}
