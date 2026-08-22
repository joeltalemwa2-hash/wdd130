/* Terry service worker
 *
 * Keeps the shell (HTML/CSS/JS/icons) available offline and holds on to
 * posters so a second visit costs almost nothing on a slow connection.
 * Video files and API calls are never cached — those must stay fresh.
 */

const VERSION = 'terry-v1';
const SHELL = `${VERSION}-shell`;
const IMAGES = `${VERSION}-images`;

const SHELL_FILES = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './config.js',
  './manifest.webmanifest',
  './favicon.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL)
      .then(cache => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Never touch video streams or downloads — range requests and the Cache API
  // do not get along, and these files are far too big to store.
  if (url.pathname.includes('/data/') || url.pathname.includes('/download/')) return;
  if (req.headers.has('range')) return;

  // Posters and backdrops: serve from cache, refresh in the background.
  if (url.hostname === 'image.tmdb.org') {
    event.respondWith(
      caches.open(IMAGES).then(async cache => {
        const hit = await cache.match(req);
        const fetching = fetch(req).then(res => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        }).catch(() => hit);
        return hit || fetching;
      })
    );
    return;
  }

  // TMDB and local API: always try the network, fall back to nothing useful.
  if (url.hostname === 'api.themoviedb.org' || url.pathname.includes('/api/')) return;

  // Shell: cache first, then network.
  event.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok && url.origin === self.location.origin) {
        const copy = res.clone();
        caches.open(SHELL).then(cache => cache.put(req, copy));
      }
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
