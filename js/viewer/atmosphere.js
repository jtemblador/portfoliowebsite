/**
 * atmosphere.js — Atmospheric extinction and scintillation.
 *
 * Light from low in the sky crosses much more air: it dims, reddens (blue
 * scatters out first), and twinkles harder. Lookup tables indexed by
 * sin(altitude) keep the per-star cost to an array read. Pure math — no DOM.
 */

import { D2R } from './config.js';

// Airmass (Kasten & Young 1989) with per-channel extinction coefficients
// (mag/airmass); blue is scattered most, so low objects dim and redden.
const K_RGB = [0.12, 0.2, 0.32];
const EXT_N = 512;                       // LUT over sin(alt) ∈ [0, 1]
export const EXT_ALPHA = new Float32Array(EXT_N + 1);  // V-band transmission
const EXT_TINT = [];                     // per-entry [r, g, b] multipliers, max = 1

function airmass(altDeg) {
  const h = Math.max(altDeg, -0.5);
  return 1 / (Math.sin(h * D2R) + 0.50572 * Math.pow(h + 6.07995, -1.6364));
}
for (let i = 0; i <= EXT_N; i++) {
  const X = airmass(Math.asin(i / EXT_N) / D2R);
  const t = K_RGB.map(k => Math.pow(10, -0.4 * k * (X - 1)));
  EXT_ALPHA[i] = t[1];
  const m = Math.max(t[0], t[1], t[2]);
  EXT_TINT.push(t.map(v => v / m));
}

/** LUT index for a direction's sin(altitude). */
export function extIndex(sinAlt) {
  return sinAlt <= 0 ? 0 : sinAlt >= 1 ? EXT_N : (sinAlt * EXT_N) | 0;
}

/** [r, g, b] color multipliers (max 1) for light seen at this sin(altitude). */
export function extTint(sinAlt) {
  return EXT_TINT[extIndex(sinAlt)];
}

// Reddened "r,g,b" strings, quantized into altitude bands so a handful of
// sprite colors cover every low star. Band 0 = no visible reddening.
const REDDEN_BANDS = [0.34, 0.17, 0.087, 0.052, 0.026]; // sin(alt) ≈ 20°, 10°, 5°, 3°, 1.5°
const _reddenCache = new Map();

export function reddenBand(sinAlt) {
  let b = 0;
  while (b < REDDEN_BANDS.length && sinAlt < REDDEN_BANDS[b]) b++;
  return b;
}

/** "r,g,b" tinted as seen through the atmosphere at the given band. */
export function reddenRgb(rgb, band) {
  if (band === 0) return rgb;
  const key = rgb + '|' + band;
  let out = _reddenCache.get(key);
  if (!out) {
    const s = band < REDDEN_BANDS.length ? REDDEN_BANDS[band] : 0.01;
    const tint = EXT_TINT[extIndex(s)];
    out = rgb.split(',').map((c, i) => Math.round(c * tint[i])).join(',');
    _reddenCache.set(key, out);
  }
  return out;
}

/** Twinkle amplitude: scintillation grows with airmass. */
export function twinkleAmp(sinAlt) {
  const X = 1 / Math.max(sinAlt, 0.05);
  return Math.min(0.12 + 0.045 * (X - 1), 0.45);
}
