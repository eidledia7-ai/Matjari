/* ==========================================================
   متجري v6.1 - Service Worker
   ========================================================== */

const CACHE_NAME = 'matjari-cache-v6.1';
const ASSETS = [
  './index.html',
  './style.css',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  // كل ملفات JS
  './config.js',
  './translations.js',
  './core.js',
  './audit.js',
  './helpers.js',
  './storage.js',
  './auth.js',
  './products.js',
  './settings.js',
  './sales.js',
  './inventory.js',
  './partners.js',
  './finance.js',
  './dashboard.js',
  './printing.js',
  './backup.js',
  './updates.js',
  './barcode.js',
  './compare.js',
  './staff.js',
  './subscription.js',
  './landing.js',
  './main.js',
  // الخطوط
  './cairo-regular.ttf',
  './cairo-semibold.ttf',
  './cairo-bold.ttf',
  './cairo-extrabold.ttf',
  './cairo-black.ttf'
];

// الملفات اللي بتستخدم Network-First (المحتوى بيتغير كتير)
const NETWORK_FIRST_SUFFIXES = [
  '/',
  '/index.html',
  '/style.css',
  '/main.js',
  '/config.js',
  '/translations.js',
  '/core.js',
  '/audit.js',
  '/helpers.js',
  '/auth.js',
  '/storage.js'
];

/* ============ Install ============ */
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) {
        return Promise.all(
          ASSETS.map(function (url) {
            return cache.add(url).catch(function (err) {
              console.warn('[SW] فشل تخزين:', url, err);
            });
          })
        );
      })
      .then(function () {
        // بدون skipWaiting — نخلي checkForUpdates في updates.js تتحكم
      })
  );
});

/* ============ Activate ============ */
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(
          keys.map(function (key) {
            if (key !== CACHE_NAME) {
              console.log('[SW] حذف كاش قديم:', key);
              return caches.delete(key);
            }
          })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

/* ============ Fetch ============ */
self.addEventListener('fetch', function (event) {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (!url.protocol.startsWith('http')) return;
  if (url.origin !== self.location.origin) return;
  if (url.href.includes('supabase.co')) return;

  const pathname = url.pathname;

  const isNetworkFirst = NETWORK_FIRST_SUFFIXES.some(function (suffix) {
    return pathname === suffix || pathname.endsWith(suffix);
  });

  if (isNetworkFirst) {
    event.respondWith(networkFirst(request));
  } else {
    event.respondWith(cacheFirst(request));
  }
});

/* ============ Network-First ============ */
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;

    if (request.mode === 'navigate') {
      const fallback = await caches.match('./index.html');
      if (fallback) return fallback;
    }

    return new Response('', {
      status: 503,
      statusText: 'Offline and no cached copy available'
    });
  }
}

/* ============ Cache-First ============ */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    return new Response('', {
      status: 503,
      statusText: 'Offline and no cached copy available'
    });
  }
}

/* ============ رسائل من الصفحة ============ */
self.addEventListener('message', function (event) {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING') {
    console.log('[SW] تخطي الانتظار — تفعيل النسخة الجديدة');
    event.waitUntil(self.skipWaiting());
  }

  if (event.data.type === 'CLEAR_CACHES') {
    event.waitUntil(
      caches.keys().then(function (keys) {
        return Promise.all(keys.map(function (k) { return caches.delete(k); }));
      }).then(function () {
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ ok: true });
        }
      })
    );
  }
});