/* ============ تحديثات التطبيق ============ */
async function checkForUpdates() {
  if (!('serviceWorker' in navigator)) {
    // ✅ v7.10.2 — ترجمة
    return showNotification(tr('update_browser_unsupported'), 'info');
  }
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    // ✅ v7.10.2 — ترجمة
    if (!reg) return showNotification(tr('update_no_sw'), 'warning');
    await reg.update();
    if (reg.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
      // ✅ v7.10.2 — ترجمة
      showNotification(tr('update_ready_reloading'), 'info');
    } else {
      // ✅ v7.10.2 — ترجمة
      showNotification(tr('update_up_to_date'));
    }
  } catch (e) {
    // ✅ v7.10.2 — ترجمة
    showNotification(tr('update_failed'), 'error');
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