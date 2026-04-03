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

import { D2R, ALT_MIN, ALT_MAX, SIN_LAT, COS_LAT } from './config.js';

/**
 * Build camera basis vectors from the current view orientation.
 * The three vectors (Right, Up, Forward) form an orthonormal frame where:
 *   Forward = view direction at (alt, az)
 *   Right   = horizontal (always z=0, guarantees flat horizon)
 *   Up      = Right × Forward (tilts toward zenith)
 */
export function buildViewFrame(altDeg, azDeg, lstDeg) {
  const altR = altDeg * D2R, azR = azDeg * D2R;
  const sinAz = Math.sin(azR), cosAz = Math.cos(azR);
  const sinAlt = Math.sin(altR), cosAlt = Math.cos(altR);
  return {
    rX: cosAz, rY: -sinAz,                                   // Right vector (z=0)
    uX: -sinAz * sinAlt, uY: -cosAz * sinAlt, uZ: cosAlt,   // Up vector
    fX: sinAz * cosAlt, fY: cosAz * cosAlt, fZ: sinAlt,      // Forward vector
    lstDeg,
  };
}

/**
 * Project a sky point from RA/Dec to camera-frame screen space.
 * Returns { x, y, cosAngle, belowHorizon } or null if behind the viewer.
 */
export function projectStar(ra, dec, viewFrame) {
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
  return { x: camX / D, y: camY / D, cosAngle: cosA, belowHorizon: zHz < 0 };
}

/**
 * Project a point in horizontal coordinates (alt/az degrees) to screen space.
 * Used for horizon line, cardinal labels, and grid overlays.
 */
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

export function projectHzPoint(alt, az, viewFrame) {
  const altR = alt * D2R, azR = az * D2R;
  const xHz = Math.cos(altR) * Math.sin(azR);
  const yHz = Math.cos(altR) * Math.cos(azR);
  const zHz = Math.sin(altR);
  const camX = xHz * viewFrame.rX + yHz * viewFrame.rY;
  const camY = xHz * viewFrame.uX + yHz * viewFrame.uY + zHz * viewFrame.uZ;
  const cosA = xHz * viewFrame.fX + yHz * viewFrame.fY + zHz * viewFrame.fZ;
  const D = 1 + cosA;
  if (D < 0.001) return null;
  return { x: camX / D, y: camY / D, cosAngle: cosA };
}
