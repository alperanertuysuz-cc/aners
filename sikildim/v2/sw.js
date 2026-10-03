/* Sıkıldım service worker — generated; do not edit by hand.
   Precaches the whole app so it opens offline. VERSION changes whenever any shipped file changes,
   which makes the page show "Yeni sürüm hazır". */
const VERSION = '6a591d404303';
const CACHE = 'sikildim-v2-' + VERSION;
const FONT_CACHE = 'sikildim-fonts';
const PRECACHE = [
  "./",
  "./app.css",
  "./core.js",
  "./hub.js",
  "./icons/apple-touch-icon.png",
  "./icons/favicon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-512.png",
  "./index.html",
  "./manifest.webmanifest",
  "./toys/2048.js",
  "./toys/duello.js",
  "./toys/hafiza.js",
  "./toys/kaleydoskop.js",
  "./toys/kelime-words.js",
  "./toys/kelime.js",
  "./toys/melodi.js",
  "./toys/nefes.js",
  "./toys/patlat.js",
  "./toys/refleks.js",
  "./toys/ritim.js",
  "./toys/yapsam.js",
  "./toys/yaz.js",
  "./toys/yilan.js"
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE.map(u => new Request(u, { cache: 'reload' })))));
});
self.addEventListener('message', e => { if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('sikildim-v2-') && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});
async function fromCache(req, fallbackUrl) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req, { ignoreSearch: true }) || (fallbackUrl && await cache.match(fallbackUrl));
  if (hit) return hit;
  return fetch(req);
}
async function fonts(req) {
  const cache = await caches.open(FONT_CACHE);
  const hit = await cache.match(req);
  const net = fetch(req).then(res => { if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone()); return res; }).catch(() => hit);
  return hit || net;
}
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') { e.respondWith(fonts(req)); return; }
  if (url.origin !== self.location.origin) return;
  const scope = new URL(self.registration.scope);
  if (!url.pathname.startsWith(scope.pathname)) return;
  if (req.mode === 'navigate') { e.respondWith(fromCache(new URL('./', scope).href, new URL('./index.html', scope).href)); return; }
  e.respondWith(fromCache(req));
});
