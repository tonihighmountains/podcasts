// Cambia VERSION cada vez que subas una versión nueva de la app
const VERSION = 'v14';
const SHELL_CACHE = 'shell-' + VERSION;
const IMG_CACHE = 'img';
const SHELL = ['./', 'index.html', 'styles.css', 'app.js', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', (e) => {
  // Se piden sin usar la caché HTTP de GitHub para no guardar archivos viejos
  e.waitUntil(
    caches.open(SHELL_CACHE)
      .then((c) => Promise.all(SHELL.map((u) => fetch(u, { cache: 'reload' }).then((r) => { if (r.ok) return c.put(u, r); }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL_CACHE && k !== IMG_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    e.respondWith(networkFirst(e, req));
  } else if (req.destination === 'image') {
    e.respondWith(staleWhileRevalidate(e, IMG_CACHE, req));
  }
  // El resto (puente, audios, RSS) va directo a la red
});

// Aplicación: siempre intenta la versión más reciente (revalidando con GitHub); si tarda más de 2,5 s o no hay red, usa la copia guardada
async function networkFirst(e, req) {
  const cache = await caches.open(SHELL_CACHE);
  const net = fetch(req, { cache: 'no-cache' }).then((res) => {
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  });
  const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('lento')), 2500));
  try {
    const res = await Promise.race([net, timeout]);
    if (res && res.ok) return res;
  } catch (err) { /* sin red o lenta: se usa la copia guardada */ }
  e.waitUntil(net.catch(() => null));
  let hit = await cache.match(req);
  if (!hit && req.mode === 'navigate') hit = (await cache.match('./')) || (await cache.match('index.html'));
  return hit || (await net.catch(() => Response.error()));
}

async function staleWhileRevalidate(e, cacheName, req) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  const net = fetch(req)
    .then((res) => {
      if (res && (res.ok || res.type === 'opaque')) {
        cache.put(req, res.clone());
        cache.keys().then((k) => { if (k.length > 400) cache.delete(k[0]); });
      }
      return res;
    })
    .catch(() => null);
  e.waitUntil(net);
  return hit || (await net) || Response.error();
}
