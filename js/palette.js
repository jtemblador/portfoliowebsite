/**
 * palette.js — anonymous, cookie-free usage signals for the site owner.
 * No identifiers are collected; the endpoint discards raw IPs.
 * Fire-and-forget: failures are invisible to the page. No-ops on localhost.
 */
const EP = '/assets/palette.json';
const IS_LOCAL = /^(localhost|127\.|192\.168\.|\[::1\])/.test(location.hostname);
const sent = Object.create(null);
const t0 = Date.now();
let interacted = false;
let maxScroll = 0;
let viewerT0 = 0;

function send(event, detail) {
  const key = event + '|' + (detail ?? '');
  if (IS_LOCAL || sent[key]) return;
  sent[key] = 1;
  const body = JSON.stringify({ event, page: location.pathname, detail: detail ?? null, vw: innerWidth, vh: innerHeight });
  try {
    if (!(navigator.sendBeacon && navigator.sendBeacon(EP, new Blob([body], { type: 'application/json' }))))
      fetch(EP, { method: 'POST', body, keepalive: true }).catch(() => {});
  } catch { /* telemetry must never break the page */ }
}

// which breakpoint did this visitor actually get?
const bp = innerWidth <= 400 ? '<=400' : innerWidth <= 600 ? '<=600' : innerWidth <= 768 ? '<=768' : innerWidth <= 1024 ? '<=1024' : '>1024';
send('pageview-meta', `${bp}|rm:${matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 0}`);

// resume + outbound clicks (delegated)
document.addEventListener('click', (e) => {
  interacted = true;
  const a = e.target.closest('a[href]');
  if (!a) return;
  const href = a.getAttribute('href') || '';
  if (href.endsWith('.pdf')) return send('resume_open');
  if (href.startsWith('mailto:')) return send('outbound', 'email');
  try {
    const u = new URL(href, location.href);
    if (u.hostname && u.hostname !== location.hostname) {
      const h = u.hostname.replace(/^www\./, '');
      const label = h === 'github.com' ? 'github' : h.includes('linkedin') ? 'linkedin' : h === 'jtemblador.github.io' ? 'orbitwatch' : h;
      send('outbound', label);
    }
  } catch { /* ignore malformed hrefs */ }
}, { capture: true, passive: true });

// star viewer sessions
document.getElementById('explore-btn')?.addEventListener('click', () => { viewerT0 = Date.now(); send('viewer_enter'); });
const viewerDone = () => { if (viewerT0) { send('viewer_exit', String(Math.round((Date.now() - viewerT0) / 1000))); viewerT0 = 0; } };
document.getElementById('back-btn')?.addEventListener('click', viewerDone);
window.addEventListener('viewer-exit', viewerDone);

// scroll depth
addEventListener('scroll', () => {
  interacted = true;
  const doc = document.documentElement;
  const depth = (scrollY + innerHeight) / Math.max(1, doc.scrollHeight);
  maxScroll = Math.max(maxScroll, depth);
}, { passive: true });

// engagement summary — once, when the page is really going away
addEventListener('pagehide', () => {
  const bucket = maxScroll >= 0.95 ? '100' : maxScroll >= 0.75 ? '75' : maxScroll >= 0.5 ? '50' : maxScroll >= 0.25 ? '25' : '0';
  if (bucket !== '0') send('scroll', bucket);
  const secs = Math.round((Date.now() - t0) / 1000);
  send('engagement', `${secs}|b:${secs < 10 && !interacted ? 1 : 0}`);
});
