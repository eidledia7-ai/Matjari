/* ============ تحديثات التطبيق ============ */
async function checkForUpdates() {
  if (!('serviceWorker' in navigator)) {
    return showNotification(currentLang === 'en' ? 'This browser does not support auto-update.' : 'المتصفح لا يدعم التحديث التلقائي', 'info');
  }
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return showNotification(currentLang === 'en' ? 'No service worker registered.' : 'لا يوجد Service Worker مسجّل', 'warning');
    await reg.update();
    if (reg.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
      showNotification(currentLang === 'en' ? 'Update ready, reloading...' : 'التحديث جاهز، جارٍ إعادة التحميل...', 'info');
    } else {
      showNotification(currentLang === 'en' ? '✅ App is up to date' : '✅ التطبيق محدّث');
    }
  } catch (e) {
    showNotification(currentLang === 'en' ? 'Update failed' : 'تعذر التحديث', 'error');
  }
}

async function clearAppCache() {
  if (!confirm(tr('msg_clear_cache'))) return;
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.active) {
        const channel = new MessageChannel();
        reg.active.postMessage({ type: 'CLEAR_CACHES' }, [channel.port2]);
        await new Promise(function(resolve) {
          let done = false;
          channel.port1.onmessage = function() { if (!done) { done = true; resolve(); } };
          setTimeout(function() { if (!done) { done = true; resolve(); } }, 1500);
        });
      }
    }
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(names.map(function(n) { return caches.delete(n); }));
    }
  } catch (e) {
    console.warn('Clear cache error:', e);
  }
  location.reload();
}

