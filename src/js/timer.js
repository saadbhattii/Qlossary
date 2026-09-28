// timer.js -- countdown measured against a fixed deadline, so it never drifts.
// onTick(secondsLeft) fires only when the whole second shown changes.

export function makeTimer(seconds, onTick, onEnd, now) {
  now = now || (() => performance.now());
  let left = seconds * 1000;   // ms remaining while paused
  let deadline = 0;
  let id = 0;
  let shown = -1;
  const t = {
    running: false,
    secondsLeft() { return Math.max(0, Math.ceil((t.running ? deadline - now() : left) / 1000)); },
    tick() {
      const s = t.secondsLeft();
      if (s !== shown) { shown = s; onTick(s); }
      if (t.running && deadline - now() <= 0) { t.stop(); onEnd(); }
    },
    start() {
      if (t.running) return;
      deadline = now() + left;
      t.running = true;
      id = setInterval(t.tick, 200);
      t.tick();
    },
    pause() {
      if (!t.running) return;
      left = Math.max(0, deadline - now());
      t.running = false;
      clearInterval(id);
    },
    stop() {
      if (t.running) left = Math.max(0, deadline - now());
      t.running = false;
      clearInterval(id);
    },
  };
  return t;
}

export function fmtTime(s) { return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
