/* ==========================================================
   متجري v5.0 - Service Worker (معدّل)
   ========================================================== */

const CACHE_NAME = 'matjari-cache-v5.2';
const ASSETS = [
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// المسارات اللي بتستخدم Network-First (محتواها بيتغير كتير)
// بنطابقها بـ endsWith عشان تشتغل حتى لو التطبيق مش على root
const NETWORK_FIRST_SUFFIXES = ['/', '/index.html', '/style.css', '/app.js'];

/* ============ Install ============ */
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) {
        // addAll بيفشل كله لو ملف واحد فشل، فبنستخدم add فردي مع تجاهل الأخطاء
        return Promise.all(
          ASSETS.map(function (url) {
            return cache.add(url).catch(function (err) {
              console.warn('[SW] فشل تخزين:', url, err);
            });
          })
        );
      })
      .then(function () {
        // ❗ شيلنا self.skipWaiting() من هنا
        // عشان منقتلش الصفحة اللي المستخدم شغال عليها (ممكن يكون في نص حفظ فاتورة)
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

  // تجاهل أي طلب مش GET
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // تجاهل أي طلب مش http/https (chrome-extension, blob, data, ...)
  if (!url.protocol.startsWith('http')) return;

  // تجاهل أي طلب لمصدر خارجي (Supabase, CDN, ...)
  if (url.origin !== self.location.origin) return;

  // تجاهل طلبات Supabase صراحةً (احتياطي)
  if (url.href.includes('supabase.co')) return;

  const pathname = url.pathname;

  // هل المسار ضمن Network-First؟
  const isNetworkFirst = NETWORK_FIRST_SUFFIXES.some(function (suffix) {
    return pathname === suffix || pathname.endsWith(suffix);
  });

  if (isNetworkFirst) {
    // Network-First: جرّب الشبكة الأول، لو فشلت ارجع للكاش
    event.respondWith(networkFirst(request));
  } else {
    // Cache-First: للـ assets الثابتة (صور, manifest, ...)
    event.respondWith(cacheFirst(request));
  }
});

/* ============ استراتيجية Network-First ============ */
async function networkFirst(request) {
  try {
    const response = await fetch(request);

    // خزّن النسخة الجديدة بس لو الرد سليم
    if (response && response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    // فشلت الشبكة → ارجع للكاش
    const cached = await caches.match(request);
    if (cached) return cached;

    // لو ده طلب تنقّل (فتح صفحة) → ارجع index.html من الكاش
    if (request.mode === 'navigate') {
      const fallback = await caches.match('./index.html');
      if (fallback) return fallback;
    }

    // آخر حل: رد فاضي 503 بدل ما نرمي خطأ
    return new Response('', {
      status: 503,
      statusText: 'Offline and no cached copy available'
    });
  }
}

/* ============ استراتيجية Cache-First ============ */
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
    self.skipWaiting();
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