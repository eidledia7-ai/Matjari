/* ============ التشغيل الأولي ووضع الأوفلاين ============ */

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    // ✅ التعديل الجذري: إجبار المتصفح على تجاهل الكاش لملف الـ SW نفسه
    const reg = await navigator.serviceWorker.register('service-worker.js', { 
      scope: './',
      updateViaCache: 'none' 
    });
    
    // فحص التحديثات كل دقيقة أثناء فتح التطبيق
    setInterval(() => { reg.update(); }, 60000);

    navigator.serviceWorker.addEventListener('controllerchange', function() {
      if (!window.__swReloaded) { window.__swReloaded = true; location.reload(); }
    });
  } catch (e) { console.warn('SW registration failed:', e.message); }
}

function loadOfflineSession() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith('matjari_cache_'));
  if (keys.length === 0) { showLoggedOutUI(); return; }

  let lastUserRaw = null;
  try { lastUserRaw = JSON.parse(localStorage.getItem('matjari_last_user')); } catch (e) {}

  let chosenKey = null;
  let chosenId = null;

  const ownerIdForCache = (lastUserRaw && lastUserRaw.role === 'employee' && lastUserRaw.ownerId)
    ? lastUserRaw.ownerId
    : (lastUserRaw ? lastUserRaw.id : null);

  if (ownerIdForCache && keys.indexOf('matjari_cache_' + ownerIdForCache) !== -1) {
    chosenKey = 'matjari_cache_' + ownerIdForCache;
    chosenId = lastUserRaw.id;
  } else {
    console.warn('[offline] No valid user found. Redirecting to login.');
    showLoggedOutUI();
    return;
  }

  let cache = {};
  try { cache = JSON.parse(localStorage.getItem(chosenKey)) || {}; } catch (e) { cache = {}; }
  
  state.currentUser = { id: chosenId, email: 'offline-user' };
  state.role = (lastUserRaw && lastUserRaw.role) ? lastUserRaw.role : 'manager';
  state.ownerId = (state.role === 'employee' && lastUserRaw && lastUserRaw.ownerId)
    ? lastUserRaw.ownerId
    : null;
  
  if (cache.products) state.products = cache.products;
  if (cache.sales) state.sales = cache.sales;
  if (cache.customers) state.customers = cache.customers;
  if (cache.suppliers) state.suppliers = cache.suppliers;
  if (cache.expenses) state.expenses = cache.expenses;
  if (cache.stockMoves) state.stockMoves = cache.stockMoves;
  if (cache.returns) state.returns = cache.returns;
  if (cache.customerPayments) state.customerPayments = cache.customerPayments;
  if (cache.supplierPayments) state.supplierPayments = cache.supplierPayments;
  if (cache.purchases) state.purchases = cache.purchases;
  if (cache.shifts) state.shifts = cache.shifts;
  if (cache.currentShift) state.currentShift = cache.currentShift;
  if (cache.storeSettings) state.storeSettings = Object.assign({}, state.storeSettings, cache.storeSettings);
  if (cache.auditLogs) state.auditLogs = cache.auditLogs;
  if (cache.heldCarts) state.heldCarts = cache.heldCarts;
  if (cache.saleItems) state.saleItems = cache.saleItems;   // ✅ X57

  if (cache.subscription) state.subscription = cache.subscription;
  state.ownerPlan = state.subscription ? state.subscription.plan : null;

  try { if (typeof saveData === 'function') saveData(); } catch (e) { console.warn('saveData offline failed:', e); }
  
  showLoggedInUI(); 
  applyRolePermissions(); 
  renderAll(); 
  showPage('sales');
  showNotification('تم تشغيل التطبيق في وضع عدم الاتصال (أوفلاين) ✅', 'info');
}

window.onload = function() {
  registerServiceWorker();
  initAudio();
  setLanguage(currentLang);
  setupEventListeners();
  
  if (navigator.onLine) {
    startAuth();
  } else {
    loadOfflineSession();
  }
  
  if (typeof applySavedDarkMode === 'function') {
    applySavedDarkMode();
  }

  setInterval(function() {
    if (navigator.onLine && typeof checkForUpdates === 'function') {
      checkForUpdates().catch(function() {});
    }
  }, 30 * 60 * 1000);
  // ✅ v7.8 — Init Offline-First بعد جاهزية التطبيق
setTimeout(() => { if (typeof initOfflineFirst === 'function') initOfflineFirst(); }, 500);
};

function setupEventListeners() {
  window.addEventListener('keydown', function(e) {
    if (e.key === 'F2') { e.preventDefault(); showPage('sales'); }
    if (e.key === 'F4') {
      e.preventDefault();
      showPage('sales');
      const bc = document.getElementById('saleBarcode');
      if (bc) bc.focus();
    }
    if (e.key === 'F8') { e.preventDefault(); if (typeof clearCart === 'function') clearCart(); }
    if (e.key === 'F9') { e.preventDefault(); if (typeof completeSale === 'function') completeSale(); }
  });

  if (typeof setupBarcodeListener === 'function') {
    try { setupBarcodeListener(); } catch (e) { console.warn('setupBarcodeListener failed:', e); }
  }

  const logoInput = document.getElementById('storeLogo');
  if (logoInput && typeof handleLogoUpload === 'function') {
    logoInput.addEventListener('change', handleLogoUpload);
  }

  const expDate = document.getElementById('expenseDate');
  if (expDate) expDate.value = today();
  const custPayDate = document.getElementById('customerPaymentDate');
  if (custPayDate) custPayDate.value = today();
  const suppPayDate = document.getElementById('supplierPaymentDate');
  if (suppPayDate) suppPayDate.value = today();

  setupPullToRefresh();
  setupBackButtonHandler();
}

/* ============ Pull-to-Refresh ============ */
function setupPullToRefresh() {
  if (typeof window === 'undefined' || !('ontouchstart' in window)) return;

  let startY = 0;
  let pulling = false;
  let indicator = null;
  const threshold = 80;

  function createIndicator() {
    if (document.getElementById('ptrIndicator')) return document.getElementById('ptrIndicator');
    const el = document.createElement('div');
    el.id = 'ptrIndicator';
    el.style.cssText =
      'position:fixed;top:0;left:0;right:0;height:0;display:flex;align-items:center;justify-content:center;' +
      'background:linear-gradient(180deg,#176b70,#ffffff00);color:#fff;font-weight:bold;' +
      'z-index:999999;overflow:hidden;transition:height 0.2s;pointer-events:none;';
    el.innerHTML = '<div style="display:flex;align-items:center;gap:10px;padding:8px;">' +
      '<div class="ptr-spinner" style="width:22px;height:22px;border:3px solid #ffffff50;border-top-color:#fff;border-radius:50%;animation:spin 0.8s linear infinite;"></div>' +
      '<span>اسحب للتحديث...</span></div>' +
      '<style>@keyframes spin{to{transform:rotate(360deg)}}</style>';
    document.body.appendChild(el);
    return el;
  }

  document.addEventListener('touchstart', function(e) {
  // ✅ v7.21 — إلغاء PTR لو القائمة الجانبية مفتوحة
  const sb = document.getElementById('sidebar');
  if (sb && sb.classList.contains('open')) return;
  if (window.scrollY !== 0) return;
  if (e.touches.length !== 1) return;
  startY = e.touches[0].clientY;
  pulling = true;
}, { passive: true });

  document.addEventListener('touchmove', function(e) {
  // ✅ v7.21 — إلغاء لو القائمة اتفتحت أثناء السحب
  const sb = document.getElementById('sidebar');
  if (sb && sb.classList.contains('open')) { pulling = false; return; }
  if (!pulling) return;
  const delta = e.touches[0].clientY - startY;
  if (delta <= 0) return;
  
  // ✅ منع المتصفح من عمل الـ Reload بتاعه
  if (e.cancelable) e.preventDefault(); 
  
  if (!indicator) indicator = createIndicator();
  const h = Math.min(delta * 0.6, threshold + 20);
  indicator.style.height = h + 'px';
}, { passive: false }); // ✅ غيرناها لـ false

  document.addEventListener('touchend', function() {
    if (!pulling) return;
    pulling = false;
    if (indicator) {
      const h = parseFloat(indicator.style.height) || 0;
      if (h >= threshold * 0.6) {
        indicator.style.height = '50px';
        setTimeout(async function() {
          if (navigator.onLine) {
            try {
              if (state.role === 'employee' && typeof syncEmployeeChanges === 'function') {
                await syncEmployeeChanges();
              } else if (typeof syncNow === 'function') {
                await syncNow();
              }
            } catch(e) {
              console.warn('PTR Sync failed:', e);
            } finally {
              if (indicator) { indicator.remove(); indicator = null; }
            }
          } else {
            // لو مفيش نت، نظهر إشعار صغير ونشيل الدايرة
            if (typeof showNotification === 'function' && typeof tr === 'function') {
              showNotification(tr('error_no_internet') || 'لا يوجد اتصال بالإنترنت', 'error');
            }
            if (indicator) { indicator.remove(); indicator = null; }
          }
        }, 300);
      } else {
        indicator.remove();
        indicator = null;
      }
    }
  }, { passive: true });
}

/* ============ Back Button ============ */
function setupBackButtonHandler() {
  try { history.pushState({ __matjari: true, page: 'home' }, ''); } catch (e) {}

  window.addEventListener('popstate', function(e) {
    const modals = document.querySelectorAll('.modal-overlay, #paymobIframeModal, #planDetailModal, #customConfirmModal');
    let anyOpen = false;
    modals.forEach(function(m) {
      if (m.style.display !== 'none' && m.style.display !== '') {
        m.style.display = 'none';
        anyOpen = true;
      }
    });
    if (anyOpen) {
      history.pushState({ __matjari: true }, '');
      return;
    }

    const currentPage = document.querySelector('.page.active');
    const pageId = currentPage ? currentPage.id : 'sales';
    if (pageId && pageId !== 'sales' && pageId !== 'home') {
      showPage(state.role === 'employee' ? 'sales' : 'home');
      history.pushState({ __matjari: true }, '');
      return;
    }

    const now = Date.now();
    if (window.__lastBackPress && now - window.__lastBackPress < 2000) {
      try { history.back(); } catch (e) {}
    } else {
      window.__lastBackPress = now;
      showNotification('اضغط مرة أخرى للخروج', 'info');
      history.pushState({ __matjari: true }, '');
    }
  });
}

window.addEventListener('online', function() {
  if (!state.currentUser) return;
  
  // ✅ X63: ننتظر ثانيتين عشان نتأكد إن الاتصال استقر فعلاً (مشكلة الموبايل)
  setTimeout(() => {
    if (!navigator.onLine) return; // لو لسه فاصل، منعملش حاجة
    
    if (state.role === 'manager' && typeof syncNow === 'function') {
      syncNow();
    } else if (state.role === 'employee' && typeof syncEmployeeChanges === 'function') {
      syncEmployeeChanges().catch(function(e) { console.warn('syncEmployeeChanges failed:', e); });
    }
  }, 2000);
});

function renderAll() {
  renderDashboard();
  renderProducts();
  renderSales();
  renderCustomers();
  renderCustomerPayments();
  renderSuppliers();
  renderPurchases();
  renderSupplierPayments();
  renderExpenses();
  renderReturns();
  renderStockMoves();
  if (typeof renderReports === 'function') renderReports();
  if (typeof renderShifts === 'function') renderShifts();
  if (typeof renderCart === 'function') renderCart();
  if (typeof loadStoreSettings === 'function') {
    try { loadStoreSettings(); } catch (e) { console.warn('loadStoreSettings failed:', e); }
  }
  updateStockBadge();
}

function updateStockBadge() {
  const lowCount = state.products.filter(function(p) {
    const min = Number.isFinite(Number(p.minStock)) ? Number(p.minStock) : 5;
    return (Number(p.stock) || 0) <= min;
  }).length;
  const badge = document.getElementById('stockAlertBadge');
  if (badge) {
    badge.innerText = lowCount > 0 ? lowCount : '';
    badge.style.cssText = lowCount > 0
      ? 'display:inline-block;background:#c0392b;color:#fff;border-radius:10px;padding:1px 7px;font-size:11px;margin-right:5px'
      : 'display:none';
  }
}

/* ============ [إصلاح] الوضع الليلي ============ */
function applySavedDarkMode() {
  if (localStorage.getItem('matjari_dark') === '1') {
    document.body.classList.add('dark-mode');
  }
}
/* ═══════════════════════════════════════════════════════════ */
/* v7.23.3 — Last Sync Indicator                              */
/* ═══════════════════════════════════════════════════════════ */

function _updateLastSyncBadge() {
  const badge = document.getElementById('lastSyncBadge');
  if (!badge) return;

  const oid = state.currentUser?.id;
  if (!oid) { badge.style.display = 'none'; return; }

  const lastSync = Number(localStorage.getItem('matjari_last_sync_' + oid)) || 0;
  if (!lastSync) { badge.style.display = 'none'; return; }

  const diff = Date.now() - lastSync;
  const min = Math.floor(diff / 60000);
  const hr = Math.floor(diff / 3600000);
  const day = Math.floor(diff / 86400000);

  let text = '', cls = '';
  if (diff < 60000) {
    text = '🟢 ' + tr('sync_just_now');
    cls = 'fresh';
  } else if (min < 60) {
    text = '🟢 ' + tr('sync_min_ago').replace('{n}', min);
    cls = 'fresh';
  } else if (hr < 24) {
    text = '🟡 ' + tr('sync_hr_ago').replace('{n}', hr);
    cls = 'stale';
  } else {
    text = '🔴 ' + tr('sync_day_ago').replace('{n}', day);
    cls = 'old';
  }

  badge.textContent = text;
  badge.className = 'last-sync-badge ' + cls;
  badge.style.display = 'inline-block';
}

function _markSyncComplete() {
  const oid = state.currentUser?.id;
  if (!oid) return;
  try {
    localStorage.setItem('matjari_last_sync_' + oid, String(Date.now()));
  } catch (e) {}
  _updateLastSyncBadge();
}

// ✅ v7.23.3 — Listen for sync completion (from storage.js event)
window.addEventListener('matjari:syncDownComplete', function() {
  _markSyncComplete();
  
  // ✅ X63: تحديث الواجهة فوراً بعد سحب البيانات الجديدة من السيرفر
  if (typeof refreshCurrentPage === 'function') {
    refreshCurrentPage();
  }
});

// Periodic badge refresh
setInterval(() => {
  if (state.currentUser) _updateLastSyncBadge();
}, 60000);

// Initial display
setTimeout(() => {
  if (state.currentUser) _updateLastSyncBadge();
}, 1500);
/* ═══════════════════════════════════════════════════════════ */
/* v7.23.3 — Global ESC Handler for Modals                    */
/* ═══════════════════════════════════════════════════════════ */

(function _installEscHandler() {
  if (window._escHandlerInstalled) return;
  window._escHandlerInstalled = true;

  const CLOSE_MAP = [
    { id: 'reconciliationModal', fn: 'closeReconciliationModal' },
    { id: 'movesFullLogModal',   fn: 'closeMovesFullLog' },
    { id: 'excelImportModal',    fn: 'closeImportModal' },
    { id: 'exportModal',         fn: 'closeExportModal' },
    { id: 'checkoutModal',       fn: 'closeCheckoutModal' },
    { id: 'heldInvoicesModal',   fn: 'closeHeldInvoices' },
    { id: 'drawerExpenseModal',  fn: 'closeDrawerExpense' },
    { id: 'customerStatementModal', fn: null }
  ];

  document.addEventListener('keydown', function(e) {
    if (e.key !== 'Escape') return;

    for (let i = 0; i < CLOSE_MAP.length; i++) {
      const m = CLOSE_MAP[i];
      const el = document.getElementById(m.id);
      if (el && (el.style.display === 'flex' || el.style.display === 'block')) {
        e.preventDefault();
        try {
          if (m.fn && typeof window[m.fn] === 'function') {
            window[m.fn]();
          } else {
            el.style.display = 'none';
            document.body.style.overflow = '';
          }
        } catch (err) {
          console.warn('ESC close failed:', err);
          el.style.display = 'none';
          document.body.style.overflow = '';
        }
        return;
      }
    }
  }, true);
})();