/**
 * planets.js — Planetary positions using JPL Table 1 Keplerian elements.
 *
 * Source: https://ssd.jpl.nasa.gov/planets/approx_pos.html
 * Valid range: 1800 AD – 2050 AD
 * Accuracy: 15–600 arcsec in longitude (sufficient for visual rendering)
 *
 * Method (Standish & Williams 1992):
 *   1. Evaluate elements at epoch T = (JD - 2451545.0) / 36525 (Julian centuries)
 *   2. Compute argument of perihelion ω = ϖ - Ω and mean anomaly M = L - ϖ
 *   3. Solve Kepler's equation iteratively for eccentric anomaly E
 *   4. Compute heliocentric position in orbital plane, then rotate to J2000 ecliptic
 *   5. Subtract Earth's heliocentric position → geocentric ecliptic coords
 *   6. Rotate ecliptic → equatorial (obliquity ε = 23.43928°)
 *   7. RA = atan2(y, x), Dec = atan2(z, √(x²+y²))
 *
 * Outputs RA in hours (0–24) and Dec in degrees to match stars.json convention.
 */

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

// Obliquity of the ecliptic (J2000, fixed — change is ~0.013°/century, negligible here)
const OBLIQUITY_R = 23.43928 * D2R;
const SIN_OBL     = Math.sin(OBLIQUITY_R);
const COS_OBL     = Math.cos(OBLIQUITY_R);

/**
 * JPL Table 1 orbital elements: [a, e, I, L, ϖ, Ω] and their per-century rates.
 * Each row: [a0, ȧ, e0, ė, I0, İ, L0, L̇, ϖ0, ϖ̇, Ω0, Ω̇]
 * Units: AU, deg, deg/century
 */
const ELEMENTS = {
  Mercury: [0.38709927, 0.00000037,  0.20563593,  0.00001906,  7.00497902, -0.00594749, 252.25032350, 149472.67411175,  77.45779628,  0.16047689,  48.33076593, -0.12534081],
  Venus:   [0.72333566, 0.00000390,  0.00677672, -0.00004107,  3.39467605, -0.00078890, 181.97909950,  58517.81538729, 131.60246718,  0.00268329,  76.67984255, -0.27769418],
  Earth:   [1.00000261, 0.00000562,  0.01671123, -0.00004392, -0.00001531, -0.01294668, 100.46457166,  35999.37244981, 102.93768193,  0.32327364,   0.0,          0.0        ],
  Mars:    [1.52371034, 0.00001847,  0.09339410,  0.00007882,  1.84969142, -0.00813131,  -4.55343205,  19140.30268499, -23.94362959,  0.44441088,  49.55953891, -0.29257343],
  Jupiter: [5.20288700,-0.00011607,  0.04838624, -0.00013253,  1.30439695, -0.00183714,  34.39644051,   3034.74612775,  14.72847983,  0.21252668, 100.47390909,  0.20469106],
  Saturn:  [9.53667594,-0.00125060,  0.05386179, -0.00050991,  2.48599187,  0.00193609,  49.95424423,   1222.49362201,  92.59887831, -0.41897216, 113.66242448, -0.28867794],
  Uranus:  [19.18916464,-0.00196176, 0.04725744, -0.00004397,  0.77263783, -0.00242939, 313.23810451,    428.48202785, 170.95427630,  0.40805281,  74.01692503,  0.04240589],
  Neptune: [30.06992276, 0.00026291, 0.00859048,  0.00005105,  1.77004347,  0.00035372, -55.12002969,    218.45945325,  44.96476227, -0.32241464, 131.78422574, -0.00508664],
  // Pluto not in JPL Table 1; approximate elements valid near J2000
  Pluto:   [39.48211675, -0.00031596, 0.24882730, 0.00005170, 17.14001206, 0.00004818, 238.92903833, 145.20780515, 224.06891629, -0.04062942, 110.30393684, -0.01183482],
};

// Planet visual radii in km — used to size the rendered dots proportionally
const PLANET_RADIUS_KM = {
  Mercury: 2440,
  Venus:   6051,
  Mars:    3390,
  Jupiter: 71492,
  Saturn:  60268,
  Uranus:  25559,
  Neptune: 24764,
  Pluto:   1188,
};

const R_JUPITER_KM = 71492;
// Screen dot radius: MIN_DOT + (MAX_DOT - MIN_DOT) * (r / R_JUPITER)
const DOT_MIN = 2.0;  // CSS px
const DOT_MAX = 12.0;

/** Evaluate orbital elements at time T (Julian centuries from J2000). */
function evalElements(elems, T) {
  return {
    a:   elems[0]  + elems[1]  * T,
    e:   elems[2]  + elems[3]  * T,
    I:   elems[4]  + elems[5]  * T,
    L:   elems[6]  + elems[7]  * T,
    peri:elems[8]  + elems[9]  * T,  // ϖ (longitude of perihelion)
    node:elems[10] + elems[11] * T,  // Ω (longitude of ascending node)
  };
}

/** Normalize angle to (-180, +180] degrees. */
function norm180(deg) {
  let d = ((deg % 360) + 360) % 360;
  return d > 180 ? d - 360 : d;
}

/**
 * Solve Kepler's equation E - e·sin(E) = M for eccentric anomaly E.
 * All values in degrees. Converges in ~5 iterations for e < 0.99.
 */
function solveKepler(M_deg, e) {
  const eStar = (180 / Math.PI) * e;   // eccentricity in degree units
  let E = M_deg + eStar * Math.sin(M_deg * D2R);
  for (let i = 0; i < 10; i++) {
    const dE = (M_deg - E + eStar * Math.sin(E * D2R)) / (1 - e * Math.cos(E * D2R));
    E += dE;
    if (Math.abs(dE) < 1e-6) break;
  }
  return E;
}

/**
 * Heliocentric ecliptic J2000 position (AU) for a single planet.
 * Returns { x, y, z } in the J2000 ecliptic plane.
 */
function helioEcliptic(elems, T) {
  const el = evalElements(elems, T);

  const omega = el.peri - el.node;                    // argument of perihelion
  const M     = norm180(el.L - el.peri);              // mean anomaly
  const E     = solveKepler(M, el.e);                 // eccentric anomaly

  // Orbital-plane (perifocal) coordinates
  const xOrb = el.a * (Math.cos(E * D2R) - el.e);
  const yOrb = el.a * Math.sqrt(1 - el.e * el.e) * Math.sin(E * D2R);

  // Rotate to J2000 ecliptic via R_z(-Ω)·R_x(-I)·R_z(-ω)
  const omR = omega     * D2R;
  const nR  = el.node   * D2R;
  const IR  = el.I      * D2R;

  const cosOm = Math.cos(omR), sinOm = Math.sin(omR);
  const cosN  = Math.cos(nR),  sinN  = Math.sin(nR);
  const cosI  = Math.cos(IR),  sinI  = Math.sin(IR);

  const x = (cosOm * cosN - sinOm * sinN * cosI) * xOrb
          + (-sinOm * cosN - cosOm * sinN * cosI) * yOrb;
  const y = (cosOm * sinN + sinOm * cosN * cosI) * xOrb
          + (-sinOm * sinN + cosOm * cosN * cosI) * yOrb;
  const z = (sinOm * sinI) * xOrb
          + (cosOm * sinI) * yOrb;

  return { x, y, z };
}

/**
 * Compute RA/Dec for all 8 visible planets + Pluto at the given Julian Date.
 * Returns array of { name, ra (hours), dec (degrees), screenR (CSS px) }.
 */
export function planetPositions(jd) {
  const T = (jd - 2451545.0) / 36525;

  // Heliocentric ecliptic position of Earth (EM Bary)
  const earth = helioEcliptic(ELEMENTS.Earth, T);

  const results = [];

  for (const name of ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']) {
    const hel = helioEcliptic(ELEMENTS[name], T);

    // Geocentric ecliptic
    const gx = hel.x - earth.x;
    const gy = hel.y - earth.y;
    const gz = hel.z - earth.z;

    // Rotate ecliptic → equatorial (around X-axis by obliquity ε)
    const eqX = gx;
    const eqY = COS_OBL * gy - SIN_OBL * gz;
    const eqZ = SIN_OBL * gy + COS_OBL * gz;

    // RA in degrees, then convert to hours
    const raDeg = (Math.atan2(eqY, eqX) * R2D + 360) % 360;
    const ra    = raDeg / 15;
    const dec   = Math.atan2(eqZ, Math.sqrt(eqX * eqX + eqY * eqY)) * R2D;

    const screenR = DOT_MIN + (DOT_MAX - DOT_MIN) * (PLANET_RADIUS_KM[name] / R_JUPITER_KM);

    results.push({ name, ra, dec, screenR });
  }

  return results;
}

/**
 * Sun's geocentric equatorial position at the given Julian Date.
 * Simply the negative of Earth's heliocentric position, rotated to equatorial.
 */
export function sunPosition(jd) {
  const T = (jd - 2451545.0) / 36525;
  const earth = helioEcliptic(ELEMENTS.Earth, T);
  const gx = -earth.x, gy = -earth.y, gz = -earth.z;
  const eqX = gx;
  const eqY = COS_OBL * gy - SIN_OBL * gz;
  const eqZ = SIN_OBL * gy + COS_OBL * gz;
  const raDeg = (Math.atan2(eqY, eqX) * R2D + 360) % 360;
  return {
    name: 'Sun',
    ra: raDeg / 15,
    dec: Math.atan2(eqZ, Math.sqrt(eqX * eqX + eqY * eqY)) * R2D,
  };
}

/**
 * Moon's geocentric equatorial position using simplified Meeus algorithm.
 * ~1° accuracy — sufficient for visual rendering (Moon is 0.5° across).
 * Returns { name, ra, dec, elongation } where elongation is Sun-Moon angle.
 */
export function moonPosition(jd) {
  const T = (jd - 2451545.0) / 36525;

  // Mean elements (degrees)
  const Lp = 218.3165 + 481267.8813 * T;   // mean longitude
  const D  = 297.8502 + 445267.1115 * T;   // mean elongation
  const M  = 357.5291 +  35999.0503 * T;   // Sun's mean anomaly
  const Mp = 134.9634 + 477198.8676 * T;   // Moon's mean anomaly
  const F  =  93.2720 + 483202.0175 * T;   // argument of latitude

  const Dr = D * D2R, Mr = M * D2R, Mpr = Mp * D2R, Fr = F * D2R;

  // Ecliptic longitude (6 largest terms)
  const lon = Lp
    + 6.289 * Math.sin(Mpr)
    - 1.274 * Math.sin(2 * Dr - Mpr)
    + 0.658 * Math.sin(2 * Dr)
    + 0.214 * Math.sin(2 * Mpr)
    - 0.186 * Math.sin(Mr)
    - 0.114 * Math.sin(2 * Fr);

  // Ecliptic latitude (4 largest terms)
  const lat = 5.128 * Math.sin(Fr)
    + 0.281 * Math.sin(Mpr + Fr)
    - 0.278 * Math.sin(Mpr - Fr)
    - 0.173 * Math.sin(2 * Dr - Fr);

  // Ecliptic → equatorial
  const lonR = lon * D2R, latR = lat * D2R;
  const raRad = Math.atan2(
    Math.sin(lonR) * COS_OBL - Math.tan(latR) * SIN_OBL,
    Math.cos(lonR)
  );
  const decRad = Math.asin(
    Math.sin(latR) * COS_OBL + Math.cos(latR) * SIN_OBL * Math.sin(lonR)
  );

  const ra = ((raRad * R2D + 360) % 360) / 15;
  const dec = decRad * R2D;

  // Elongation (Sun-Moon angle for phase)
  const sun = sunPosition(jd);
  const sunRaR = sun.ra * 15 * D2R, sunDecR = sun.dec * D2R;
  const moonRaR = ra * 15 * D2R, moonDecR = dec * D2R;
  const cosElong = Math.sin(sunDecR) * Math.sin(moonDecR)
                 + Math.cos(sunDecR) * Math.cos(moonDecR) * Math.cos(sunRaR - moonRaR);
  const elongation = Math.acos(Math.max(-1, Math.min(1, cosElong))) * R2D;

  return { name: 'Moon', ra, dec, elongation };
}
