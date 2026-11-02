/* ============================================================
   connection-banner.js — v7.9.1
   Persistent Banner لحالة الاتصال + عدد العمليات المعلقة
   ============================================================ */

let _bannerUpdateTimer = null;

function _getBannerState() {
  const online = navigator.onLine;
  const queue = (typeof getSyncQueueCounts === 'function') ? getSyncQueueCounts() : { pending: 0, failed: 0 };
  const neg = Number(state._negativeStockCount) || 0;
  const conflicts = Number(state._stockConflictCount) || 0;

  if (!online) {
    return { cls: 'offline', icon: '🔴', textKey: 'conn_offline', count: queue.pending };
  }
  if (state._syncing) {
    const p = state._syncProgress || { done: 0, total: 0 };
    return { cls: 'syncing', icon: '🔄', textKey: 'conn_syncing', progress: p };
  }
  if (queue.failed > 0) {
    return { cls: 'failed', icon: '⚠️', textKey: 'conn_failed', count: queue.failed };
  }
  if (queue.pending > 0) {
    return { cls: 'pending', icon: '🟡', textKey: 'conn_pending', count: queue.pending };
  }
  if (neg > 0 || conflicts > 0) {
    return { cls: 'warn', icon: '⚠️', textKey: 'conn_stock_conflict', count: neg + conflicts };
  }
  return { cls: 'online', icon: '🟢', textKey: 'conn_online', count: 0 };
}

function _applyBannerState(st) {
  const el = document.getElementById('connectionBanner');
  if (!el) return;

  // إخفاء في حالة "online نظيف"
  if (st.cls === 'online') {
    el.style.display = 'none';
    el.className = 'connection-banner';
    return;
  }

  el.style.display = 'flex';
  el.className = 'connection-banner banner-' + st.cls;

  let text = '';
  if (st.cls === 'syncing' && st.progress) {
    text = tr(st.textKey) + ' ' + (st.progress.done || 0) + '/' + (st.progress.total || 0);
  } else if (typeof st.count === 'number' && st.count > 0) {
    text = tr(st.textKey) + ' (' + st.count + ')';
  } else {
    text = tr(st.textKey);
  }

  // ✅ v7.9.1 — تعديل الزرار
  const btnHtml = (st.cls === 'failed' || st.cls === 'warn')
    ? '<button class="banner-btn" onclick="openOperationsCenter()">' + tr('conn_review') + '</button>'
    : '';

  el.innerHTML =
    '<span class="banner-icon">' + st.icon + '</span>' +
    '<span class="banner-text">' + text + '</span>' +
    btnHtml;
}

function renderConnectionBanner() {
  if (_bannerUpdateTimer) return;
  _bannerUpdateTimer = requestAnimationFrame(() => {
    _bannerUpdateTimer = null;
    try { _applyBannerState(_getBannerState()); } catch (e) {}
  });
}

function initConnectionBanner() {
  renderConnectionBanner();

  // Online/Offline
  window.addEventListener('online',  () => { renderConnectionBanner(); });
  window.addEventListener('offline', () => { renderConnectionBanner(); });

  // Queue changes
  window.addEventListener('syncqueue:changed', renderConnectionBanner);
  window.addEventListener('syncqueue:drainStart', (e) => {
    state._syncing = true;
    state._syncProgress = { done: 0, total: e.detail?.total || 0 };
    renderConnectionBanner();
  });
  window.addEventListener('syncqueue:drainProgress', (e) => {
    state._syncProgress = { done: e.detail?.done || 0, total: e.detail?.total || 0 };
    renderConnectionBanner();
  });
  window.addEventListener('syncqueue:drainEnd', () => {
    state._syncing = false;
    state._syncProgress = null;
    renderConnectionBanner();
    if (typeof refreshStockConflictIndicator === 'function') {
      refreshStockConflictIndicator().catch(() => {});
    }
  });

  // Stock conflicts
  window.addEventListener('stockconflicts:changed', renderConnectionBanner);

  // Poll احتياطي كل 30 ثانية
  setInterval(() => { if (!state._syncing) renderConnectionBanner(); }, 30000);
}