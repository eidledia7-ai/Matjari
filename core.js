let currentLang = localStorage.getItem('matjari_lang') || 'ar';

function tr(key) { const dict = translations[currentLang] || translations.ar; return dict[key] || translations.ar[key] || key; }

function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('matjari_lang', lang);
  document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  document.documentElement.setAttribute('lang', lang);

  const dict = translations[lang] || translations.ar;
  const placeholderKeys = { authEmail: 'email_placeholder', authPassword: 'password_placeholder', newPassword: 'new_password_placeholder' };
  Object.keys(placeholderKeys).forEach(id => { const el = document.getElementById(id); if (el) el.setAttribute('data-i18n-placeholder', placeholderKeys[id]); });
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) el.textContent = dict[key];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (dict[key]) el.placeholder = dict[key];
  });
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.getAttribute('data-i18n-html');
    if (dict[key]) el.innerHTML = dict[key];
  });

  const langDisp = document.getElementById('currentLangDisplay');
  if (langDisp) langDisp.textContent = lang === 'ar' ? 'العربية (Arabic)' : 'English';
  const langSwText = document.getElementById('langSwitchText');
  if (langSwText) langSwText.textContent = lang === 'ar' ? 'English' : 'العربية';

  const landing = document.getElementById('landingView');
  if (landing && landing.style.display !== 'none') renderLandingView();
  if (document.getElementById('subscriptionBlock')) enforceSubscriptionBlock();
}

function toggleLanguage() {
  setLanguage(currentLang === 'ar' ? 'en' : 'ar');
  renderAll();
}

/* ============ القوائم الفرعية المنسدلة ============ */
function toggleSubMenu(id) {
  const menu = document.getElementById(id);
  if (!menu) return;
  const isOpened = menu.classList.contains('open');
  
  document.querySelectorAll('.sub-menu').forEach(m => m.classList.remove('open'));
  document.querySelectorAll('.nav-toggle').forEach(b => b.classList.remove('open'));

  if (!isOpened) {
    menu.classList.add('open');
    if (menu.previousElementSibling) {
      menu.previousElementSibling.classList.add('open');
    }
  }
}

/* ============ الحالة العامة ============ */
let state = {
  currentUser: null,
  role: 'employee',
  cart: [],
  heldCarts: [],
  auditLogs: [],
  products: [],
  sales: [],
  customers: [],
  suppliers: [],
  expenses: [],
  stockMoves: [],
  returns: [],
  customerPayments: [],
  supplierPayments: [],
  purchases: [],
  shifts: [],
  currentShift: null,
  storeSettings: {
    name: 'متجري',
    phone: '',
    address: '',
    currency: 'ج.م',
    logo: '',
    taxNumber: '',
    monthlyGoal: 0
  },
  subscription: { plan: 'trial', status: 'active', expires_at: null }
};

let syncTimer = null;
let isSyncing = false;
let salesChartInstance = null;
let audioCtx = null;
let barcodeStream = null;
let barcodeDetector = null;
let barcodeScanFrame = null;
let barcodeTimer = null;
let lastProcessedBarcode = '';
let activeExportContext = { type: null };

/* ============ أدوات مساعدة ============ */
function uid(prefix) {
  prefix = prefix || 'ID';
  return prefix + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function money(n) {
  const cur = String((state.storeSettings && state.storeSettings.currency) || 'ج.م').trim();
  const decimals = 2;
  return (Number(n) || 0).toLocaleString(currentLang === 'en' ? 'en-US' : 'ar-EG', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + ' ' + cur;
}

function escapeHTML(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function normalizeBarcode(v) {
  return String(v == null ? '' : v)
    .normalize('NFKC')
    .replace(/[٠-٩]/g, function(c) { return String(c.charCodeAt(0) - 1632); })
    .replace(/[۰-۹]/g, function(c) { return String(c.charCodeAt(0) - 1776); })
    .replace(/[\s\-]/g, '')
    .trim();
}

/* ============ الصوت ============ */
function initAudio() {
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) { console.warn('Audio not supported'); }
}

function playBeep(success) {
  if (!audioCtx) return;
  try {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.value = success ? 880 : 220;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);
  } catch (e) {}
}

/* ============ الإشعارات ============ */
function showNotification(msg, type) {
  type = type || 'success';
  const colors = { success: '#2e7d32', error: '#c62828', warning: '#e58a16', info: '#1769aa' };
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const div = document.createElement('div');
  div.className = 'notification-toast ' + type;
  div.innerHTML = '<span style="font-size:18px">' + (icons[type] || '') + '</span> ' + escapeHTML(msg);
  div.style.cssText =
   'position:fixed;bottom:20px;left:20px;z-index:10000000;' +
    'padding:12px 20px;border-radius:10px;color:#fff;font-weight:bold;' +
    'background:' + (colors[type] || colors.success) + ';' +
    'box-shadow:0 6px 20px rgba(0,0,0,0.25);transition:opacity 0.3s;max-width:90vw;' +
    'display:flex;align-items:center;gap:10px;font-family:Tahoma,Arial,sans-serif';
  document.body.appendChild(div);
  setTimeout(function() {
    div.style.opacity = '0';
    setTimeout(function() { div.remove(); }, 300);
  }, 3000);
}

/* ============ Loading ============ */
function showLoading(text) {
  if (document.querySelector('.spinner-overlay')) return;
  const overlay = document.createElement('div');
  overlay.className = 'spinner-overlay';
  overlay.style.cssText =
    'position:fixed;inset:0;background:#0007;display:flex;align-items:center;' +
    'justify-content:center;z-index:99999;backdrop-filter:blur(3px);';
  overlay.innerHTML =
    '<div style="text-align:center;color:#fff">' +
    '<div style="width:50px;height:50px;border:5px solid #ffffff30;' +
    'border-top-color:#fff;border-radius:50%;animation:spin 0.8s linear infinite;margin:auto"></div>' +
    '<p style="margin-top:14px;font-weight:700">' + escapeHTML(text || 'جارٍ التحميل...') + '</p>' +
    '</div>' +
    '<style>@keyframes spin{to{transform:rotate(360deg)}}</style>';
  document.body.appendChild(overlay);
}

function hideLoading() {
  const o = document.querySelector('.spinner-overlay');
  if (o) o.remove();
}

/* ============ حفظ الصفحة الحالية ============ */
function saveCurrentPage(pageId) {
  if (!state.currentUser) return;
  try {
    localStorage.setItem('matjari_lastPage_' + state.currentUser.id, pageId);
  } catch (e) {}
}

function getLastPage() {
  if (!state.currentUser) return 'home';
  try {
    return localStorage.getItem('matjari_lastPage_' + state.currentUser.id) || 'home';
  } catch (e) { return 'home'; }
}

/* ============ التنقل السلس والفتح الفردي للصفحات ============ */
function toggleSidebar(show) {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (!sidebar || !backdrop) return;
  if (show) {
    sidebar.classList.add('open');
    backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  } else {
    sidebar.classList.remove('open');
    backdrop.classList.remove('open');
    document.body.style.overflow = '';
  }
}

function showPage(pageId) {
  // قائمة الصفحات الممنوعة صراحةً على الموظف
// الموظف مسموح له بصفحة البيع فقط
if (state.role === 'employee' && pageId !== 'sales' && pageId !== 'invReturns') {
  showNotification('هذه الصفحة متاحة للمدير فقط', 'warning');
  pageId = 'sales';
}
if (pageId === 'finCompare' && !canUse('compare')) {
  upgradePrompt(currentLang === 'en' ? 'Compare Periods' : 'مقارنة الفترات');
  return;
}
  document.querySelectorAll('.page').forEach(function(p) {
    p.classList.remove('active');
    p.style.display = 'none';
  });
  
  document.querySelectorAll('.sidebar-nav button').forEach(function(b) { b.classList.remove('active-nav'); });

  const targetPage = document.getElementById(pageId);
  if (targetPage) {
    targetPage.classList.add('active');
    targetPage.style.display = 'block';
  }

  const targetBtn = document.querySelector('.sidebar-nav button[data-page="' + pageId + '"]');
  if (targetBtn) targetBtn.classList.add('active-nav');

  saveCurrentPage(pageId);
  toggleSidebar(false);
  window.scrollTo(0, 0);

  if (pageId === 'home') renderDashboard();
  if (pageId === 'sales') {
    populateSalesDropdowns();
    const bc = document.getElementById('saleBarcode');
    if (bc) bc.focus();
  }
  if (pageId === 'invProducts') renderProducts();
  if (pageId === 'invMoves') { populateAdjustDropdown(); renderStockMoves(); }
  if (pageId === 'invReturns') { populateReturnDropdowns(); renderReturns(); }
  
  if (pageId === 'partCustomers') { renderCustomers(); renderCustomerPayments(); }
  if (pageId === 'partSuppliers') { renderSuppliers(); renderPurchases(); renderSupplierPayments(); }

  if (pageId === 'finExpenses') renderExpenses();
  if (pageId === 'finReports') renderReports();
  if (pageId === 'finCompare') { if (typeof onCompareTypeChange === 'function') onCompareTypeChange(); }
  if (pageId === 'finShift') { calcExpectedShiftCash(); renderShifts(); }
if (pageId === 'settSubscription') renderSubscriptionPage();
  if (pageId === 'settStore') loadStoreSettings();
 if (pageId === 'settStaff') { loadStaffList(); renderAuditLogs(); }
}

