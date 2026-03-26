const CACHE = 'prodify-v199';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/app-mobile.js',
  '/app-mobile.css',
  '/manifest.json',
  '/icons/logo.png',
];

// Install — cache only local assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

// Activate — clean up old caches immediately
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — network-first for HTML/JS/CSS (always get latest), cache-first for everything else
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // Skip external domains entirely — let them handle their own caching
  if (url.hostname !== self.location.hostname) return;

  const isCore = e.request.destination === 'document'
    || url.pathname === '/'
    || url.pathname.endsWith('.html')
    || url.pathname.endsWith('.js')
    || url.pathname.endsWith('.css');

  if (isCore) {
    // Network-first for core files — always fetch fresh, fall back to cache offline
    e.respondWith(
      fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match(e.request).then(cached => cached || caches.match('/index.html')))
    );
  } else {
    // Cache-first for local assets (icons, etc.)
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          if (res && res.status === 200 && res.type === 'basic') {
            const clone = res.clone();
            caches.open(CACHE).then(cache => cache.put(e.request, clone));
          }
          return res;
        }).catch(() => {
          if (e.request.destination === 'document') return caches.match('/index.html');
        });
      })
    );
  }
});
