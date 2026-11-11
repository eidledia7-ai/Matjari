/* ==========================================================
   متجري v7.22.0 - Service Worker
   ========================================================== */
const CACHE_NAME = 'matjari-cache-v7.25.3';
const ASSETS = [
  './index.html', './style.css', './manifest.json', './icon-192.png', './icon-512.png',
  './config.js', './translations.js', './core.js', './audit.js', './helpers.js', './storage.js',
  './auth.js', './products.js', './settings.js', './sales.js', './inventory.js', './partners.js',
  './finance.js', './dashboard.js', './printing.js', './backup.js', './updates.js', './barcode.js',
  './compare.js', './staff.js', './subscription.js', './landing.js', './main.js',
  /* ملفات v7.10.1 */
  './finance-core.js', './cashier-hotkeys.js', './auto-backup.js', './sync-queue.js',
  './stock-conflicts.js', './connection-banner.js', './operations-center.js',
  /* الخطوط */
  './cairo-regular.ttf', './cairo-semibold.ttf', './cairo-bold.ttf', './cairo-extrabold.ttf', './cairo-black.ttf',
  /* v7.22 — Import Libraries (cdnjs — مطابقة لـ index.html) */
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js'
];

self.addEventListener('install', function (event) {
  self.skipWaiting(); 
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return Promise.all(
        ASSETS.map(function (url) {
          return cache.add(url).catch(function (err) {
            console.warn('[SW] فشل تخزين:', url, err);
          });
        })
      );
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (key) {
          if (key !== CACHE_NAME) {
            return caches.delete(key); 
          }
        })
      );
    }).then(function () {
      return self.clients.claim(); 
    })
  );
});

self.addEventListener('fetch', function (event) {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  
  if (!url.protocol.startsWith('http')) return;

  // ✅ v7.22 — دعم cdnjs (xlsx, papaparse) + jsdelivr (Chart.js, supabase, qrcode, jsbarcode)
  const CDN_ALLOWLIST = ['cdnjs.cloudflare.com', 'cdn.jsdelivr.net'];
  if (url.origin !== self.location.origin && !CDN_ALLOWLIST.includes(url.hostname)) return;

  if (url.href.includes('supabase.co')) return;

  const isStaticAsset = ASSETS.some(asset => url.href === asset || url.pathname.endsWith(asset.replace('./', '')));

  if (isStaticAsset || request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
  } else {
    event.respondWith(cacheFirst(request));
  }
});

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
    return new Response('', { status: 503, statusText: 'Offline and no cached copy available' });
  }
}

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
    return new Response('', { status: 503, statusText: 'Offline and no cached copy available' });
  }
}

self.addEventListener('message', function (event) {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') {
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