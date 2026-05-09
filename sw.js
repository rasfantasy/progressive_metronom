// Прогрессивный метроном — Service Worker
// Стратегия: cache-first для статики + сетевой фолбэк
// При обновлении версии CACHE_NAME старый кэш будет удалён

const CACHE_NAME = 'metronome-v1.0.0';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './icons/favicon.png',
];

// Установка — предкэшируем всё
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Активация — чистим старые версии кэша
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Перехват запросов — cache-first
self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Только GET, без cross-origin (включая голосовые модели TTS)
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          // Кладём в кэш только успешные ответы
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => {
          // Фолбэк для навигации — отдаём index.html
          if (req.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
    })
  );
});

// Поддержка ручного обновления через postMessage
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
