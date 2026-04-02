/**
 * projection.js — Stereographic projection for the night sky renderer.
 *
 * Projects equatorial coordinates (RA/Dec) onto a 2D plane tangent to the
 * view center. Conformal: preserves angles and constellation shapes.
 * Standard in planetarium software (Stellarium, Cartes du Ciel).
 *
 * Coordinates:
 *   RA in hours (0–24), Dec in degrees (-90 to +90)
 *   Projected (x, y): east = +x, north = +y, unit-sphere scale
 *   Canvas: px = cx - x*scale  (east is LEFT — we view from inside the sphere)
 *
 * Projection math (unit sphere, R=1):
 *   D = 1 + sin(dec₀)sin(dec) + cos(dec₀)cos(dec)cos(Δra)
 *   x = cos(dec)·sin(Δra) / D
 *   y = (cos(dec₀)·sin(dec) − sin(dec₀)·cos(dec)·cos(Δra)) / D
 *   ρ = tan(θ/2)  where θ = angular distance from view center
 *   scale = canvasHalf / tan(fov/4)
 */

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;
const H2R = Math.PI / 12;   // hours → radians
const R2H = 12 / Math.PI;   // radians → hours

/**
 * Project a sky point (ra, dec) given view center (ra0, dec0).
 * Returns { x, y, cosAngle } or null if the point is at the antipode (D ≈ 0).
 * cosAngle = cos(angular distance from center); used for culling and label fade.
 */
export function project(ra, dec, ra0, dec0) {
  const decR  = dec  * D2R;
  const dec0R = dec0 * D2R;
  const draR  = (ra - ra0) * H2R;

  // cos(θ) = dot product of the two unit vectors
  const cosAngle = Math.sin(dec0R) * Math.sin(decR)
                 + Math.cos(dec0R) * Math.cos(decR) * Math.cos(draR);

  const D = 1 + cosAngle;
  if (D < 0.001) return null; // antipode — undefined projection

  const x =  Math.cos(decR) * Math.sin(draR) / D;
  const y = (Math.cos(dec0R) * Math.sin(decR) - Math.sin(dec0R) * Math.cos(decR) * Math.cos(draR)) / D;

  return { x, y, cosAngle };
}

/**
 * Convert projected (x, y) to canvas pixel coordinates.
 * East (+x) maps to LEFT on canvas (inside-sphere mirroring).
 */
export function toCanvas(x, y, scale, cx, cy) {
  return {
    px: cx - x * scale,
    py: cy - y * scale,
  };
}

/**
 * Compute the projection scale (pixels per unit) for a given FOV.
 * A star at FOV/2 from center lands exactly at canvasHalf pixels from center.
 * ρ = tan(θ/2) → scale = canvasHalf / tan(fov/4).
 */
export function fovToScale(fovDeg, canvasHalf) {
  return canvasHalf / Math.tan((fovDeg / 4) * D2R);
}

/**
 * Inverse projection: canvas pixel → sky coordinates (ra, dec).
 * Uses the standard inverse azimuthal formula for c = 2·atan(ρ).
 */
export function fromCanvas(px, py, scale, cx, cy, ra0, dec0) {
  const x = (cx - px) / scale; // east component
  const y = (cy - py) / scale; // north component
  const rho = Math.sqrt(x * x + y * y);

  if (rho < 1e-10) return { ra: ra0, dec: dec0 };

  const dec0R = dec0 * D2R;
  const ra0R  = ra0  * H2R;

  // c = 2·atan(ρ) for stereographic: angular distance from view center
  const c    = 2 * Math.atan(rho);
  const cosC = Math.cos(c);
  const sinC = Math.sin(c);

  const decR = Math.asin(
    cosC * Math.sin(dec0R) + (y / rho) * sinC * Math.cos(dec0R)
  );
  const draR = Math.atan2(
    x * sinC,
    rho * Math.cos(dec0R) * cosC - y * Math.sin(dec0R) * sinC
  );

  return {
    ra:  (((ra0R + draR) * R2H) % 24 + 24) % 24,
    dec: decR * R2D,
  };
}
