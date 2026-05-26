/**
 * Service worker minimo per rendere l'app "installable" (requisito PWA
 * obbligatorio per Chrome/Android e per il wrapping in TWA su Google Play).
 *
 * Strategia: network-first con fallback cache. L'utente online prende sempre
 * l'ultima versione (bundle Angular hashati, sempre freschi); l'utente offline
 * o con network capricciosa prende l'ultima copia messa in cache, cosi' l'app
 * si apre comunque invece di mostrare la pagina di errore del browser.
 *
 * Non e' pensato per essere offline-first: la sincronizzazione Firestore vive
 * comunque solo online. Lo scopo qui e' "installability" + resilienza basic.
 */

const CACHE = 'gtc-shell-v1';

const SHELL_PRECACHE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'favicon.svg',
  'favicon-32.png',
  'icon-192.png',
  'icon-512.png',
  'apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SHELL_PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Solo same-origin: niente caching di Google Fonts, Firebase API, ecc.
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        // Per le sole risposte ok, aggiorno la cache in background.
        if (res && res.ok && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(req, clone)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('./'))),
  );
});
