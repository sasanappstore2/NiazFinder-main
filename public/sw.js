/* Minimal service worker — cache shell + offline fallback */
const CACHE = 'nf-shell-v1';
const PRECACHE = ['/', '/manifest.json', '/logo.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ||
        fetch(event.request).then((res) => {
          if (res.ok && url.pathname.match(/\.(js|css|svg|png|webp|woff2?)$/)) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(event.request, clone));
          }
          return res;
        }).catch(() => caches.match('/') )
    )
  );
});

self.addEventListener('push', (event) => {
  const data = event.data?.json?.() ?? { title: 'نیاز فایندر', body: 'اعلان جدید' };
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'نیاز فایندر', {
      body: data.body ?? '',
      icon: '/logo.svg',
      data: data.url ?? '/',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data ?? '/';
  event.waitUntil(self.clients.openWindow(target));
});
