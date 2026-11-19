/**
 * game.js — bootstrap: engine + scene + UI, and the animation loop.
 */

import { createEngine } from './state.js';
import { Scene } from './render.js';
import { createUI } from './ui.js';

const canvas = document.getElementById('stage');
const engine = createEngine();
const scene = new Scene(canvas);
const ui = createUI(engine, scene);

scene.setState(engine.state);

let last = performance.now();
let acc = 0;

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  scene.update(dt);
  scene.draw();

  // Keep the canvas backing store in sync when the layout shifts.
  acc += dt;
  if (acc > 0.5) {
    acc = 0;
    scene.resize();
  }

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

// Autosave every 20 seconds of play so a refresh never loses a session.
setInterval(() => {
  if (!engine.state.over) engine.save();
}, 20000);

window.addEventListener('beforeunload', () => {
  if (!engine.state.over) engine.save();
});

// First-time welcome.
const seen = (() => {
  try {
    return localStorage.getItem('twfb.seen') === '1';
  } catch {
    return false;
  }
})();
if (!seen) {
  ui.openHelp();
  try {
    localStorage.setItem('twfb.seen', '1');
  } catch {
    /* storage may be blocked; the game still runs */
  }
}

// Expose for debugging in the console.
window.__twfb = { engine, scene, ui };

// Register the offline cache. Skipped on file:// (Android/Electron shells),
// where a service worker cannot register and is not needed.
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
