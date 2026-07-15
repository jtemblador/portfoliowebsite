/**
 * camera.js — Camera-frame stereographic projection in horizontal coordinates.
 *
 * This is the core projection system for the star viewer. It differs from the
 * equatorial stereographic projection in sky/projection.js: here the projection
 * center is always in horizontal (Alt/Az) space with the camera's "up" direction
 * pointing toward the zenith. This guarantees a flat horizon at all azimuths
 * and eliminates the parallactic angle rotation that would tilt the horizon
 * when projecting in equatorial space.
 *
 * Pipeline per star:
 *   RA/Dec → horizontal Cartesian (East, North, Up) via hour angle
 *         → camera frame (Right, Up, Forward) via dot products
 *         → stereographic projection: x = camX/(1+cosAngle)
 *         → canvas: px = cx + x*scale, py = cy - y*scale
 */

import { D2R, R2D, ALT_MIN, ALT_MAX, SIN_LAT, COS_LAT } from './config.js';

/**
 * Build camera basis vectors from the current view orientation.
 * The three vectors (Right, Up, Forward) form an orthonormal frame where:
 *   Forward = view direction at (alt, az)
 *   Right   = horizontal (always z=0, guarantees flat horizon)
 *   Up      = Right × Forward (tilts toward zenith)
 */
export function buildViewFrame(altDeg, azDeg, lstDeg) {
  const altR = altDeg * D2R, azR = azDeg * D2R, lstR = lstDeg * D2R;
  const sinAz = Math.sin(azR), cosAz = Math.cos(azR);
  const sinAlt = Math.sin(altR), cosAlt = Math.cos(altR);
  return {
    rX: cosAz, rY: -sinAz,                                   // Right vector (z=0)
    uX: -sinAz * sinAlt, uY: -cosAz * sinAlt, uZ: cosAlt,   // Up vector
    fX: sinAz * cosAlt, fY: cosAz * cosAlt, fZ: sinAlt,      // Forward vector
    lstDeg,
    cosLst: Math.cos(lstR), sinLst: Math.sin(lstR),          // for projectStarPre
  };
}

// Reusable scratch results — projection runs ~17k times per frame at the
// default overlays (up to ~29k with both grids enabled), so
// returning a fresh object per call would allocate megabytes/sec of garbage.
// Callers that need two live results at once (line segments) pass their own.
const _out = { x: 0, y: 0, cosAngle: 0, belowHorizon: false };
const _outHz = { x: 0, y: 0, cosAngle: 0 };

/**
 * Project a sky point from RA/Dec to camera-frame screen space.
 * Returns the (reused!) result object or null if behind the viewer.
 * Pass `out` when holding more than one result at a time.
 */
export function projectStar(ra, dec, viewFrame, out = _out) {
  const H = (viewFrame.lstDeg - ra * 15) * D2R;
  const decR = dec * D2R;
  const sd = Math.sin(decR), cd = Math.cos(decR);
  const ch = Math.cos(H), sh = Math.sin(H);

  // Equatorial → horizontal Cartesian (East, North, Up)
  const xHz = -cd * sh;
  const yHz = COS_LAT * sd - SIN_LAT * cd * ch;
  const zHz = SIN_LAT * sd + COS_LAT * cd * ch;

  // Horizontal → camera frame
  const camX = xHz * viewFrame.rX + yHz * viewFrame.rY;
  const camY = xHz * viewFrame.uX + yHz * viewFrame.uY + zHz * viewFrame.uZ;
  const cosA = xHz * viewFrame.fX + yHz * viewFrame.fY + zHz * viewFrame.fZ;

  // Stereographic projection
  const D = 1 + cosA;
  if (D < 0.001) return null;
  out.x = camX / D; out.y = camY / D;
  out.cosAngle = cosA; out.belowHorizon = zHz < 0;
  return out;
}

/**
 * Zero-trig projection for points with precomputed equatorial terms:
 *   sd = sin(dec),  cdcr = cos(dec)·cos(ra·15°),  cdsr = cos(dec)·sin(ra·15°)
 * The hour-angle rotation folds into the view frame's cosLst/sinLst, so the
 * per-point cost is pure multiply-adds. `cullCos` rejects points outside the
 * field of view before the projection divide.
 */
export function projectStarPre(sd, cdcr, cdsr, viewFrame, cullCos, out = _out) {
  // cd·cos(H) and cd·sin(H) via angle-difference identities (H = lst − ra15)
  const cdch = viewFrame.cosLst * cdcr + viewFrame.sinLst * cdsr;
  const cdsh = viewFrame.sinLst * cdcr - viewFrame.cosLst * cdsr;

  const xHz = -cdsh;
  const yHz = COS_LAT * sd - SIN_LAT * cdch;
  const zHz = SIN_LAT * sd + COS_LAT * cdch;

  const cosA = xHz * viewFrame.fX + yHz * viewFrame.fY + zHz * viewFrame.fZ;
  if (cosA < cullCos) return null;

  const D = 1 + cosA;
  if (D < 0.001) return null;
  const camX = xHz * viewFrame.rX + yHz * viewFrame.rY;
  const camY = xHz * viewFrame.uX + yHz * viewFrame.uY + zHz * viewFrame.uZ;
  out.x = camX / D; out.y = camY / D;
  out.cosAngle = cosA; out.belowHorizon = zHz < 0;
  return out;
}

/** Precompute the three projectStarPre terms for a fixed RA/Dec point. */
export function precomputeEq(ra, dec) {
  const raR = ra * 15 * D2R, decR = dec * D2R;
  const cd = Math.cos(decR);
  return [Math.sin(decR), cd * Math.cos(raR), cd * Math.sin(raR)];
}

/**
 * Inverse of the stereographic projection: screen pixel → horizontal alt/az.
 * Used to keep the sky point under the cursor fixed while zooming.
 * Returns { alt, az } in degrees.
 */
export function unprojectScreen(px, py, cx, cy, scale, viewFrame) {
  const sx = (px - cx) / scale, sy = (cy - py) / scale;
  const r2 = sx * sx + sy * sy;
  const cosA = (1 - r2) / (1 + r2);   // from r² = (1-cosA)/(1+cosA)
  const D = 1 + cosA;
  const camX = sx * D, camY = sy * D;
  // Reconstruct the horizontal-frame direction: v = camX·R + camY·U + cosA·F
  const vx = camX * viewFrame.rX + camY * viewFrame.uX + cosA * viewFrame.fX;
  const vy = camX * viewFrame.rY + camY * viewFrame.uY + cosA * viewFrame.fY;
  const vz =                       camY * viewFrame.uZ + cosA * viewFrame.fZ;
  return {
    alt: Math.asin(Math.max(-1, Math.min(1, vz))) * R2D,
    az: ((Math.atan2(vx, vy) * R2D) % 360 + 360) % 360,
  };
}

/**
 * Apply drag rotation to the view. Scales azimuth movement by cos(alt)
 * so horizontal dragging feels consistent near the zenith/nadir.
 */
export function applyDragRotation(alt, az, dx, dy, degPerPx) {
  const cosAlt = Math.cos(alt * D2R);
  let newAz = ((az - dx * degPerPx / Math.max(cosAlt, 0.15)) % 360 + 360) % 360;
  let newAlt = alt + dy * degPerPx;
  newAlt = Math.max(ALT_MIN, Math.min(ALT_MAX, newAlt));
  return { alt: newAlt, az: newAz };
}

/**
 * Project a point in horizontal coordinates (alt/az degrees) to screen space.
 * Used for horizon line, cardinal labels, and grid overlays.
 */
export function projectHzPoint(alt, az, viewFrame, out = _outHz) {
  const altR = alt * D2R, azR = az * D2R;
  const xHz = Math.cos(altR) * Math.sin(azR);
  const yHz = Math.cos(altR) * Math.cos(azR);
  const zHz = Math.sin(altR);
  const camX = xHz * viewFrame.rX + yHz * viewFrame.rY;
  const camY = xHz * viewFrame.uX + yHz * viewFrame.uY + zHz * viewFrame.uZ;
  const cosA = xHz * viewFrame.fX + yHz * viewFrame.fY + zHz * viewFrame.fZ;
  const D = 1 + cosA;
  if (D < 0.001) return null;
  out.x = camX / D; out.y = camY / D; out.cosAngle = cosA;
  return out;
}
