/**
 * controls.js — Time control state machine.
 *
 * Manages simulated time: pause/play, speed steps, and time offset.
 * The render loop reads time state each frame to advance the sky.
 */

import { SPEED_STEPS } from './config.js';

// --- Time state ---

let timeOffsetMs = 0;     // offset from real time (ms)
let timeSpeed = 1;        // 0=paused, 1=real, negative=rewind
let _lastRealTime = Date.now();
let _prevTimeSpeed = 1;   // for pause/resume toggle

/** Get current time state (read by the render loop each frame). */
export function getTimeState() {
  return { timeOffsetMs, timeSpeed, lastRealTime: _lastRealTime };
}

/**
 * Advance simulated time by one frame's elapsed real time.
 * Called at the start of each render() frame.
 * Returns the current Julian Date.
 */
export function advanceTime() {
  const realNow = Date.now();
  const elapsed = realNow - _lastRealTime;
  _lastRealTime = realNow;
  timeOffsetMs += elapsed * (timeSpeed - 1);
  return (realNow + timeOffsetMs) / 86400000 + 2440587.5;
}

/** Toggle between paused and the previous speed. */
export function togglePause() {
  if (timeSpeed === 0) {
    timeSpeed = _prevTimeSpeed || 1;
    _lastRealTime = Date.now(); // prevent stale elapsed accumulation on resume
  } else {
    _prevTimeSpeed = timeSpeed;
    timeSpeed = 0;
  }
}

/** Step speed up (dir=1) or down (dir=-1) through SPEED_STEPS. */
export function changeSpeed(dir) {
  const wasPaused = timeSpeed === 0;
  const idx = SPEED_STEPS.indexOf(timeSpeed);
  if (idx === -1) return;
  const next = idx + dir;
  if (next >= 0 && next < SPEED_STEPS.length) timeSpeed = SPEED_STEPS[next];
  if (wasPaused && timeSpeed !== 0) _lastRealTime = Date.now();
}

/** Reset to real-time (speed=1, offset=0). */
export function resetTime() {
  timeOffsetMs = 0;
  timeSpeed = 1;
  _lastRealTime = Date.now();
}

/** Wire up the time control DOM buttons. */
export function setupTimeControls() {
  const btnRew = document.getElementById('btn-rewind');
  const btnPause = document.getElementById('btn-pause');
  const btnFwd = document.getElementById('btn-forward');
  const btnNow = document.getElementById('btn-now');
  if (btnRew) btnRew.addEventListener('click', () => changeSpeed(-1));
  if (btnPause) btnPause.addEventListener('click', togglePause);
  if (btnFwd) btnFwd.addEventListener('click', () => changeSpeed(1));
  if (btnNow) btnNow.addEventListener('click', resetTime);
}
