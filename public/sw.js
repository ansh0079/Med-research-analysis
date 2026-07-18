const CACHE_NAME = 'medresearch-shell-v4';
const RUNTIME_CACHE = 'medresearch-runtime-v4';
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
];

function isOfflineReadingApi(url) {
  return url.pathname === '/api/user/saved';
}

function isCacheableAsset(request, url) {
  if (request.destination) return ['style', 'script', 'worker', 'font', 'image', 'manifest'].includes(request.destination);
  return /\.(?:js|css|woff2?|svg|png|jpg|jpeg|webp|ico)$/i.test(url.pathname);
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => ![CACHE_NAME, RUNTIME_CACHE].includes(key))
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/index.html')));
    return;
  }

  if (url.pathname.startsWith('/api/') && !isOfflineReadingApi(url)) {
    return;
  }

  if (!isOfflineReadingApi(url) && !isCacheableAsset(request, url)) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
