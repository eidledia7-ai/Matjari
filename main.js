/* ============ التشغيل الأولي ووضع الأوفلاين ============ */

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.register('service-worker.js', { scope: './' });
    navigator.serviceWorker.addEventListener('controllerchange', function() {
      if (!window.__swReloaded) { window.__swReloaded = true; location.reload(); }
    });
  } catch (e) { console.warn('SW registration failed:', e.message); }
}

// [إصلاح] استخدام matjari_last_user لاختيار الكاش بدلاً من keys[0] العشوائي
function loadOfflineSession() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith('matjari_cache_'));
  if (keys.length === 0) { showLoggedOutUI(); return; }

  let lastUserRaw = null;
  try { lastUserRaw = JSON.parse(localStorage.getItem('matjari_last_user')); } catch (e) {}

  let chosenKey = null;
  let chosenId = null;
  if (lastUserRaw && lastUserRaw.id && keys.indexOf('matjari_cache_' + lastUserRaw.id) !== -1) {
    chosenKey = 'matjari_cache_' + lastUserRaw.id;
    chosenId = lastUserRaw.id;
  } else {
  console.warn('[offline] No valid user found. Redirecting to login.');
  showLoggedOutUI();
  return;
}

  const cache = JSON.parse(localStorage.getItem(chosenKey));
  
  state.currentUser = { id: chosenId, email: 'offline-user' };
  state.role = (lastUserRaw && lastUserRaw.role) ? lastUserRaw.role : 'manager';
  state.ownerId = (state.role === 'employee' && lastUserRaw && lastUserRaw.id) ? lastUserRaw.id : null;
  
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
  
  applySavedDarkMode();
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

  setupBarcodeListener();

  const logoInput = document.getElementById('storeLogo');
  if (logoInput) logoInput.addEventListener('change', handleLogoUpload);

  const expDate = document.getElementById('expenseDate');
  if (expDate) expDate.value = today();
  const custPayDate = document.getElementById('customerPaymentDate');
  if (custPayDate) custPayDate.value = today();
  const suppPayDate = document.getElementById('supplierPaymentDate');
  if (suppPayDate) suppPayDate.value = today();
}

window.addEventListener('online', function() {
  if (state.currentUser && state.role === 'manager') syncNow();
  syncPendingSales();
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
  renderReports();
  renderShifts();
  renderCart();
  loadStoreSettings();
  updateStockBadge();
}

function updateStockBadge() {
  const lowCount = state.products.filter(function(p) {
    return Number(p.stock) <= Number(p.minStock || 5);
  }).length;
  const badge = document.getElementById('stockAlertBadge');
  if (badge) {
    badge.innerText = lowCount > 0 ? lowCount : '';
    badge.style.cssText = lowCount > 0
      ? 'display:inline-block;background:#c0392b;color:#fff;border-radius:10px;padding:1px 7px;font-size:11px;margin-right:5px'
      : 'display:none';
  }
}

