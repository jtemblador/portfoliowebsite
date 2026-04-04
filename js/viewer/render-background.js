/**
 * render-background.js — Background render layers for the star viewer.
 *
 * Milky Way, twilight glow, coordinate grids (alt/az, equatorial, ecliptic),
 * zodiac band, and horizon line. These are drawn first, behind all sky objects.
 *
 * All functions take a render context: { ctx, cx, cy, scale, vf, fov }.
 */

import { D2R, R2D, LAT_LA, OBLIQUITY } from './config.js';
import { projectStar, projectHzPoint } from './camera.js';
import { eqToHz } from '../sky/time.js';

// --- Milky Way (module-private init-time data) ---

let milkyWayPoints = null;

/**
 * Build interpolated Milky Way points from catalog waypoints.
 * Called once at init — the module owns this data.
 */
export function initMilkyWay(waypoints) {
  const wp = (waypoints[0].ra === waypoints[waypoints.length - 1].ra &&
              waypoints[0].dec === waypoints[waypoints.length - 1].dec)
    ? waypoints.slice(0, -1) : waypoints;
  const pts = [], n = wp.length, STEPS = 8;
  for (let i = 0; i < n; i++) {
    const a = wp[(i-1+n)%n], b = wp[i], c = wp[(i+1)%n], d = wp[(i+2)%n];
    for (let s = 0; s < STEPS; s++) {
      const t = s / STEPS, t2 = t*t, t3 = t2*t;
      const ra  = 0.5*((2*b.ra)+(-a.ra+c.ra)*t+(2*a.ra-5*b.ra+4*c.ra-d.ra)*t2+(-a.ra+3*b.ra-3*c.ra+d.ra)*t3);
      const dec = 0.5*((2*b.dec)+(-a.dec+c.dec)*t+(2*a.dec-5*b.dec+4*c.dec-d.dec)*t2+(-a.dec+3*b.dec-3*c.dec+d.dec)*t3);
      const w = b.width + (c.width - b.width) * t;
      const seed = ((i*8+s)*2654435761)>>>0;
      const rA = ((seed&0xFFFF)/0xFFFF-0.5), rD = (((seed>>>16)&0xFFFF)/0xFFFF-0.5);
      pts.push({ra, dec, width: w*0.5});
      pts.push({ra: ra+rA*w*0.02, dec: dec+rD*w*0.3, width: w*0.3});
    }
  }
  milkyWayPoints = pts;
}

export function renderMilkyWay(rc) {
  if (!milkyWayPoints) return;
  const { ctx, cx, cy, scale, vf, fov } = rc;
  ctx.fillStyle = 'rgba(180,180,210,0.008)';
  for (const pt of milkyWayPoints) {
    const p = projectStar(pt.ra, pt.dec, vf);
    if (!p || p.cosAngle < Math.cos((fov/2+pt.width)*D2R)) continue;
    const px = cx + p.x * scale, py = cy - p.y * scale;
    ctx.beginPath(); ctx.arc(px, py, pt.width*D2R*scale, 0, Math.PI*2); ctx.fill();
  }
}

// --- Twilight glow ---

export function renderTwilight(rc, lstDeg, cachedSun) {
  const { ctx, cx, cy, scale, vf } = rc;
  const sunHz = eqToHz(cachedSun.ra, cachedSun.dec, lstDeg, LAT_LA);

  if (sunHz.alt > 0 || sunHz.alt < -18) return;

  const horizonP = projectHzPoint(0, sunHz.az, vf);
  if (!horizonP) return;

  const px = cx + horizonP.x * scale, py = cy - horizonP.y * scale;
  const depth = -sunHz.alt;
  const intensity = Math.max(0, 1 - depth / 18);
  const radius = 200 * intensity + 50;

  const r = depth < 6 ? 255 : Math.round(255 * Math.max(0, 1 - (depth-6)/12));
  const g = depth < 6 ? Math.round(180 - depth * 15) : Math.round(100 * Math.max(0, 1 - (depth-6)/12));
  const b = depth < 6 ? Math.round(100 + depth * 10) : Math.round(160 * Math.max(0, 1 - (depth-6)/12));

  const grad = ctx.createRadialGradient(px, py, 0, px, py, radius);
  grad.addColorStop(0, `rgba(${r},${g},${b},${intensity * 0.3})`);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(px, py, radius, 0, Math.PI*2); ctx.fill();
}

// --- Grid helper ---

function drawGridLine(ctx, cx, cy, count, getPoint, scale) {
  let penDown = false;
  for (let i = 0; i < count; i++) {
    const p = getPoint(i);
    if (!p || p.cosAngle < 0.01) { penDown = false; continue; }
    const px = cx + p.x * scale, py = cy - p.y * scale;
    if (!penDown) { ctx.moveTo(px, py); penDown = true; }
    else ctx.lineTo(px, py);
  }
}

// --- Coordinate grids ---

export function renderAltAzGrid(rc) {
  const { ctx, cx, cy, scale, vf } = rc;
  ctx.strokeStyle = 'rgba(100,150,200,0.25)'; ctx.lineWidth = 0.5;
  for (let alt = -80; alt <= 80; alt += 10) {
    if (alt === 0) continue;
    ctx.beginPath(); drawGridLine(ctx, cx, cy, 181, i => projectHzPoint(alt, i*2, vf), scale); ctx.stroke();
  }
  for (let az = 0; az < 360; az += 15) {
    ctx.beginPath(); drawGridLine(ctx, cx, cy, 91, i => projectHzPoint(-90+i*2, az, vf), scale); ctx.stroke();
  }
}

export function renderEqGrid(rc) {
  const { ctx, cx, cy, scale, vf } = rc;
  for (let dec = -80; dec <= 80; dec += 10) {
    ctx.strokeStyle = dec === 0 ? 'rgba(100,200,150,0.5)' : 'rgba(100,200,150,0.25)';
    ctx.lineWidth = dec === 0 ? 1.0 : 0.5;
    ctx.beginPath(); drawGridLine(ctx, cx, cy, 181, i => projectStar(i*24/180, dec, vf), scale); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(100,200,150,0.25)'; ctx.lineWidth = 0.5;
  for (let raH = 0; raH < 24; raH++) {
    ctx.beginPath(); drawGridLine(ctx, cx, cy, 91, i => projectStar(raH, -90+i*2, vf), scale); ctx.stroke();
  }
}

export function renderEcliptic(rc) {
  const { ctx, cx, cy, scale, vf } = rc;
  const oblR = OBLIQUITY * D2R;
  ctx.strokeStyle = 'rgba(200,200,100,0.35)'; ctx.lineWidth = 1.0;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  drawGridLine(ctx, cx, cy, 361, i => {
    const lamR = i * D2R;
    return projectStar(((Math.atan2(Math.sin(lamR)*Math.cos(oblR), Math.cos(lamR))*R2D+360)%360)/15,
                       Math.asin(Math.sin(lamR)*Math.sin(oblR))*R2D, vf);
  }, scale);
  ctx.stroke(); ctx.setLineDash([]);
}

export function renderZodiacBand(rc) {
  const { ctx, cx, cy, scale, vf } = rc;
  const oblR = OBLIQUITY * D2R;
  const BAND_HALF = 9;

  for (const offset of [BAND_HALF, -BAND_HALF]) {
    ctx.strokeStyle = 'rgba(40,120,200,0.18)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    drawGridLine(ctx, cx, cy, 361, i => {
      const lamR = i * D2R;
      const eclLat = offset * D2R;
      const sinLam = Math.sin(lamR), cosLam = Math.cos(lamR);
      const sinB = Math.sin(eclLat), cosB = Math.cos(eclLat);
      const x = cosB * cosLam;
      const y = cosB * sinLam * Math.cos(oblR) - sinB * Math.sin(oblR);
      const z = cosB * sinLam * Math.sin(oblR) + sinB * Math.cos(oblR);
      const ra = ((Math.atan2(y, x) * R2D + 360) % 360) / 15;
      const dec = Math.asin(Math.max(-1, Math.min(1, z))) * R2D;
      return projectStar(ra, dec, vf);
    }, scale);
    ctx.stroke();
  }
}

// --- Horizon ---

export function renderHorizon(rc) {
  const { ctx, cx, cy, scale, vf } = rc;
  ctx.beginPath(); let penDown = false;
  for (let i = 0; i <= 360; i++) {
    const p = projectHzPoint(0, i%360, vf);
    if (!p || p.cosAngle < 0.01) { penDown = false; continue; }
    const px = cx+p.x*scale, py = cy-p.y*scale;
    if (!penDown) { ctx.moveTo(px, py); penDown = true; } else ctx.lineTo(px, py);
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.5; ctx.stroke();
}
