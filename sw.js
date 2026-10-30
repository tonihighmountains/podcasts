// Cambia VERSION cada vez que subas una versión nueva de la app
const VERSION = 'v3';
const SHELL_CACHE = 'shell-' + VERSION;
const IMG_CACHE = 'img';
const SHELL = ['./', 'index.html', 'styles.css', 'app.js', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL_CACHE && k !== IMG_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    e.respondWith(staleWhileRevalidate(e, SHELL_CACHE, req, false));
  } else if (req.destination === 'image') {
    e.respondWith(staleWhileRevalidate(e, IMG_CACHE, req, true));
  }
  // El resto (Worker, audios, RSS) va directo a la red
});

async function staleWhileRevalidate(e, cacheName, req, trim) {
  const cache = await caches.open(cacheName);
  let hit = await cache.match(req);
  if (!hit && req.mode === 'navigate') hit = (await cache.match('./')) || (await cache.match('index.html'));
  const net = fetch(req)
    .then((res) => {
      if (res && (res.ok || res.type === 'opaque')) {
        cache.put(req, res.clone());
        if (trim) trimCache(cache, 400);
      }
      return res;
    })
    .catch(() => null);
  e.waitUntil(net);
  return hit || (await net) || Response.error();
}

async function trimCache(cache, max) {
  const keys = await cache.keys();
  if (keys.length > max) await cache.delete(keys[0]);
}
