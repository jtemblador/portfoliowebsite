/**
 * time.js — Sidereal time and coordinate conversion helpers.
 *
 * All angle inputs/outputs are in degrees unless noted.
 * RA is in HOURS (0–24) to match stars.json / projection.js convention.
 *
 * Coordinate systems:
 *   Equatorial: RA (hours), Dec (degrees) — catalog / projection basis
 *   Horizontal: Alt (degrees, +up), Az (degrees, N=0 E=90 S=180 W=270) — observer frame
 *   Hour angle: H = LST_deg - RA_hours * 15
 */

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

/**
 * Current Julian Date from the system clock.
 */
export function julianDate() {
  return Date.now() / 86400000 + 2440587.5;
}

/**
 * Greenwich Mean Sidereal Time in degrees for a given Julian Date.
 * IAU 1982 formula — accurate to ~0.1s for dates 1900–2100.
 */
export function gmst(jd) {
  const d = jd - 2451545.0;          // days from J2000.0
  const T = d / 36525;               // Julian centuries from J2000.0
  // GMST at 0h UT, converted to degrees, then add rotation for fractional day
  let g = 280.46061837 + 360.98564736629 * d
        + 0.000387933 * T * T
        - (T * T * T) / 38710000;
  return ((g % 360) + 360) % 360;
}

/**
 * Local Sidereal Time in degrees for a given Julian Date and observer longitude.
 * lon: observer longitude in degrees (east positive; LA ≈ -118.2437)
 */
export function lst(jd, lon) {
  return ((gmst(jd) + lon) % 360 + 360) % 360;
}

/**
 * Equatorial → Horizontal conversion.
 * ra:  right ascension in hours (0–24)
 * dec: declination in degrees
 * lstDeg: local sidereal time in degrees
 * lat: observer latitude in degrees
 * Returns { alt, az } in degrees.
 *
 * Derivation: rotation matrix R from HA/Dec frame to Alt/Az frame:
 *   R = [[ 0,       1,    0      ],
 *        [-sinφ,    0,    cosφ   ],
 *        [ cosφ,    0,    sinφ   ]]
 * Maps (cos δ cos H, −cos δ sin H, sin δ) → (cos a sin A, cos a cos A, sin a)
 */
export function eqToHz(ra, dec, lstDeg, lat) {
  const H    = (lstDeg - ra * 15) * D2R;  // hour angle in radians
  const decR = dec * D2R;
  const latR = lat * D2R;

  const sinAlt = Math.sin(latR) * Math.sin(decR)
               + Math.cos(latR) * Math.cos(decR) * Math.cos(H);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt))) * R2D;

  // az: measured from North (0°) clockwise through East (90°)
  const az = (Math.atan2(
    -Math.cos(decR) * Math.sin(H),
     Math.cos(latR) * Math.sin(decR) - Math.sin(latR) * Math.cos(decR) * Math.cos(H)
  ) * R2D + 360) % 360;

  return { alt, az };
}

/**
 * Horizontal → Equatorial conversion.
 * alt: altitude in degrees
 * az:  azimuth in degrees (N=0, E=90, S=180, W=270)
 * lstDeg: local sidereal time in degrees
 * lat: observer latitude in degrees
 * Returns { ra (hours 0–24), dec (degrees) }.
 *
 * Inverse of the rotation matrix R^T:
 *   x_eq = −sinφ · y_hz + cosφ · z_hz   (= cos δ cos H)
 *   y_eq = x_hz                           (= −cos δ sin H)
 *   z_eq =  cosφ · y_hz + sinφ · z_hz   (= sin δ)
 * where x_hz = cos(alt)sin(az), y_hz = cos(alt)cos(az), z_hz = sin(alt)
 */
export function hzToEq(alt, az, lstDeg, lat) {
  const altR = alt * D2R;
  const azR  = az  * D2R;
  const latR = lat * D2R;

  const xHz = Math.cos(altR) * Math.sin(azR);   // East
  const yHz = Math.cos(altR) * Math.cos(azR);   // North
  const zHz = Math.sin(altR);                    // Zenith

  // z_eq = cos(φ)·y_hz + sin(φ)·z_hz = sin(δ) [from rotation matrix R^T]
  const sinDec = Math.cos(latR) * yHz + Math.sin(latR) * zHz;
  const dec = Math.asin(Math.max(-1, Math.min(1, sinDec))) * R2D;

  // Hour angle H = atan2(-y_eq, x_eq)
  // x_eq = −sin(φ)·y_hz + cos(φ)·z_hz (= cos δ cos H)
  const xEq = -Math.sin(latR) * yHz + Math.cos(latR) * zHz;
  const yEq =  xHz;                                           // −cos δ sin H
  const H   = Math.atan2(-yEq, xEq) * R2D;                  // hour angle in degrees

  const ra = ((lstDeg - H) % 360 + 360) % 360 / 15;         // convert degrees to hours

  return { ra, dec };
}
