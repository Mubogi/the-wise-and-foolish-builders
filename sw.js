/* Offline cache so the game is installable and playable without a network. */
const CACHE = 'twfb-v1';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/game.js',
  './js/data.js',
  './js/state.js',
  './js/render.js',
  './js/ui.js',
  './manifest.webmanifest',
  './assets/assets-icon-192.png',
  './assets/assets-icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
