/* Service worker — network-first for pages, cache-first for static assets.
   Bump CACHE when the precache list changes to evict stale shells. */
const CACHE = 'nf-shell-v3';
const OFFLINE_URL = '/offline.html';
const PRECACHE = ['/', OFFLINE_URL, '/manifest.json', '/logo.svg', '/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Drop caches from previous versions.
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

const isStaticAsset = (pathname) => /\.(js|css|svg|png|webp|avif|ico|woff2?|ttf)$/.test(pathname);

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return; // never cache API/dynamic data

  // Page navigations → network-first, fall back to cache, then the offline page.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          return fresh;
        } catch {
          const cached = await caches.match(request);
          return cached || (await caches.match(OFFLINE_URL)) || (await caches.match('/'));
        }
      })()
    );
    return;
  }

  // Static assets → cache-first with background refresh (stale-while-revalidate).
  if (isStaticAsset(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((res) => {
            if (res.ok) {
              const clone = res.clone();
              caches.open(CACHE).then((c) => c.put(request, clone));
            }
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});

self.addEventListener('push', (event) => {
  const data = event.data?.json?.() ?? { title: 'نیاز فایندر', body: 'اعلان جدید' };
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'نیاز فایندر', {
      body: data.body ?? '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      dir: 'rtl',
      lang: 'fa',
      data: data.url ?? '/',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data ?? '/';
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      // Focus an existing tab if one is open, else open a new window.
      for (const client of all) {
        if ('focus' in client) {
          client.navigate?.(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })()
  );
});
