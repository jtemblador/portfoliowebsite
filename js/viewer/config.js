/**
 * config.js — Constants and observer configuration for the star viewer.
 *
 * Centralizes all magic numbers, observer position, and shared constants.
 * Imported by all other viewer modules — no circular dependencies.
 */

// Observer location: Los Angeles, CA
export const LAT_LA  =  34.0522;   // degrees north
export const LON_LA  = -118.2437;  // degrees east (west is negative)
export const SIN_LAT = Math.sin(LAT_LA * Math.PI / 180);
export const COS_LAT = Math.cos(LAT_LA * Math.PI / 180);

// Trig conversion
export const D2R = Math.PI / 180;
export const R2D = 180 / Math.PI;

// Star visual encoding
export const MAG_BRIGHT = -1.5;    // brightest star magnitude (Sirius = -1.46)
export const MAG_DIM    =  6.5;    // dimmest naked-eye magnitude
export const R_MAX      =  5.5;    // brightest star radius (CSS px)
export const R_MIN      =  0.8;    // dimmest star radius
export const A_MAX      =  1.0;    // brightest star alpha
export const A_MIN      =  0.15;   // dimmest star alpha

// Field of view constraints (degrees)
export const FOV_DEFAULT  =  90;
export const FOV_MIN      =  15;
export const FOV_MAX      = 150;

// Altitude constraints — ±85° avoids gimbal lock at zenith/nadir
export const ALT_MIN = -85;
export const ALT_MAX =  85;

// Rendering
export const LABEL_FADE_DEG    =  6;    // angular band for edge label fade
export const BELOW_HORIZON_DIM = 0.35;  // alpha multiplier below horizon
export const MAG_FADE_BAND     = 0.5;   // smooth magnitude fade band
export const OBLIQUITY         = 23.43928; // ecliptic obliquity (J2000, degrees)

// Time control speed steps (negative = rewind)
export const SPEED_STEPS = [-1000, -100, -10, -1, 0, 1, 10, 100, 1000];

// Cardinal direction markers on the horizon
export const CARDINALS = [
  { az:   0, label: 'N' },
  { az:  90, label: 'E' },
  { az: 180, label: 'S' },
  { az: 270, label: 'W' },
];

// Accessibility: respect user's motion preferences
export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
