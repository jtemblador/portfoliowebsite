/**
 * hittest.js — Screen-space hit testing for click/hover interaction.
 *
 * All functions are pure: they take screen buffers and data as explicit
 * parameters, making them testable without application state.
 */

/**
 * Find the nearest star to a click point. Bright stars are weighted higher
 * (magnitude penalty makes faint stars harder to select).
 *
 * @param {number} clickX - Screen X coordinate
 * @param {number} clickY - Screen Y coordinate
 * @param {number} threshold - Max pixel distance
 * @param {Float32Array} screenBuf - Star screen buffer (px, py, starIndex triples)
 * @param {number} screenCount - Number of entries in the buffer
 * @param {Array} stars - The data.stars array (for magnitude/color lookup)
 * @returns {Object|null} Hit result with type, position, and star data
 */
export function findNearestStar(clickX, clickY, threshold, screenBuf, screenCount, stars) {
  let bestScore = Infinity, bestIdx = -1;
  const th2 = threshold * threshold;
  for (let i = 0; i < screenCount; i++) {
    const bufIdx = i * 3;
    const dx = screenBuf[bufIdx] - clickX, dy = screenBuf[bufIdx + 1] - clickY;
    const dist2 = dx * dx + dy * dy;
    if (dist2 > th2) continue;
    const si = screenBuf[bufIdx + 2];
    const mag = stars[si][2];
    // Penalize faint stars: effective distance increases with magnitude
    const magPenalty = 1 + Math.max(0, mag - 2) * 0.3;
    const score = dist2 * magPenalty * magPenalty;
    if (score < bestScore) { bestScore = score; bestIdx = i; }
  }
  if (bestIdx < 0) return null;
  const bufIdx = bestIdx * 3;
  const si = screenBuf[bufIdx + 2];
  const s = stars[si];
  return {
    type: 'star', px: screenBuf[bufIdx], py: screenBuf[bufIdx + 1],
    mag: s[2], ci: s[3], dist: s[4], spect: s[5], ra: s[0], dec: s[1],
  };
}

/**
 * Find the nearest planet to a click point.
 * @param {Array} planetBuf - Array of {name, px, py, ra, dec, screenR}
 */
export function findNearestPlanet(clickX, clickY, threshold, planetBuf) {
  let bestDist = threshold * threshold, best = null;
  for (const p of planetBuf) {
    const dx = p.px - clickX, dy = p.py - clickY;
    const d = dx * dx + dy * dy;
    if (d < bestDist) { bestDist = d; best = p; }
  }
  return best ? { type: 'planet', ...best } : null;
}

/**
 * Find the nearest constellation label to a click point.
 * @param {Array} labelBuf - Array of {abbr, px, py}
 */
export function findNearestConstLabel(clickX, clickY, threshold, labelBuf) {
  let bestDist = threshold * threshold, best = null;
  for (const c of labelBuf) {
    const dx = c.px - clickX, dy = c.py - clickY;
    const d = dx * dx + dy * dy;
    if (d < bestDist) { bestDist = d; best = c; }
  }
  return best;
}

/**
 * Find the nearest DSO to a click point. Uses screenR for hit area.
 * @param {Array} dsoBuf - Array of {name, type, px, py, ra, dec, screenR}
 */
export function findNearestDSO(clickX, clickY, threshold, dsoBuf) {
  let bestDist = threshold * threshold, best = null;
  for (const d of dsoBuf) {
    const dx = d.px - clickX, dy = d.py - clickY;
    const dist2 = dx * dx + dy * dy;
    const hitR = Math.max(d.screenR, threshold);
    if (dist2 < hitR * hitR && dist2 < bestDist) { bestDist = dist2; best = d; }
  }
  return best ? { type: 'dso', ...best } : null;
}

/**
 * Look up a star's name and constellation by its RA/Dec coordinates.
 * @param {Map} nameMap - The starNameLookup Map ("ra,dec" → {name, con, hipID})
 */
export function lookupStarName(ra, dec, nameMap) {
  if (!nameMap) return null;
  return nameMap.get(ra.toFixed(6) + ',' + dec.toFixed(5)) || null;
}
