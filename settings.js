/* ============ إدارة الإعدادات ============ */
function loadStoreSettings() {
  const s = state.storeSettings || {};
  const set = function(id, val) { const el = document.getElementById(id); if (el) el.value = val || ''; };
  set('storeName', s.name);
  set('storePhone', s.phone);
  set('storeAddress', s.address);
  set('storeTaxNumber', s.taxNumber);
  set('storeCurrency', s.currency);
  set('storeMonthlyGoal', s.monthlyGoal);
  set('storePointsRate', s.pointsRate);
  set('storePointValue', s.pointValue);
  
  const perms = s.permissions || {};
  const pDiscount = document.getElementById('perm_canDiscount');
  const pDelete = document.getElementById('perm_canDelete');
  const pEdit = document.getElementById('perm_canEditPrice');
  const pReturn = document.getElementById('perm_canReturn'); 
  const pDrawer = document.getElementById('perm_canDrawerExpense');
  
  if (pDiscount) pDiscount.checked = perms.canDiscount || false;
  if (pDelete) pDelete.checked = perms.canDelete || false;
  if (pEdit) pEdit.checked = perms.canEditPrice || false;
  if (pReturn) pReturn.checked = perms.canReturn || false; 
  if (pDrawer) pDrawer.checked = perms.canDrawerExpense === true;
  
  const printTypeEl = document.getElementById('storePrintType');
  if (printTypeEl) printTypeEl.value = s.printType || 'thermal';
  const autoPrintEl = document.getElementById('autoPrintOnScan');
if (autoPrintEl) autoPrintEl.checked = !!(s.autoPrintOnScan || s.auto_print_on_scan);

  const vatEnabledVal = (s.vatEnabled ?? s.vat_enabled ?? false) === true;
  const vatRateVal = Number(s.vatRate ?? s.vat_rate ?? 0) || 0;
  const vatModeVal = s.vatMode || s.vat_mode || 'inclusive';
  
  const vatEnabledEl = document.getElementById('storeVatEnabled');
  if (vatEnabledEl) vatEnabledEl.checked = vatEnabledVal;
  
  const vatRateEl = document.getElementById('storeVatRate');
  if (vatRateEl) vatRateEl.value = String(vatRateVal);
  
  const vatModeEl = document.getElementById('storeVatMode');
  if (vatModeEl) vatModeEl.value = vatModeVal;
  
  const vatFieldsEl = document.getElementById('storeVatFields');
  if (vatFieldsEl) vatFieldsEl.style.display = vatEnabledVal ? 'block' : 'none';
  
  const abEnabledEl = document.getElementById('autoBackupEnabled');
  if (abEnabledEl) abEnabledEl.checked = !!s.autoBackupEnabled;

  const abIntervalEl = document.getElementById('autoBackupInterval');
  if (abIntervalEl) abIntervalEl.value = s.autoBackupInterval || 'daily';

  const abRetentionEl = document.getElementById('autoBackupRetention');
  if (abRetentionEl) abRetentionEl.value = String(Number(s.autoBackupRetention) || 7);

  const abStatusEl = document.getElementById('autoBackupStatus');
  if (abStatusEl) {
    if (s.lastAutoBackupAt) {
      const d = new Date(s.lastAutoBackupAt);
      abStatusEl.textContent = tr('last_auto_backup') + ': ' + d.toLocaleString(currentLang === 'en' ? 'en-US' : 'ar-EG');
    } else {
      abStatusEl.textContent = tr('no_auto_backup_yet');
    }
  }
  
  const preview = document.getElementById('storeLogoPreview');
  if (preview && s.logo) { preview.src = s.logo; preview.style.display = 'block'; }
  else if (preview) { preview.style.display = 'none'; }
  
  const dz = document.getElementById('dangerZone');
  if (dz) dz.style.display = (state.role === 'manager') ? 'block' : 'none';
}

function toggleVatFields() {
  const vatEnabledEl = document.getElementById('storeVatEnabled');
  const vatFieldsEl = document.getElementById('storeVatFields');
  if (!vatEnabledEl || !vatFieldsEl) return;
  vatFieldsEl.style.display = vatEnabledEl.checked ? 'block' : 'none';
}

async function saveStoreSettings(isAutoSave = false) {
  if (state.role !== 'manager') return showNotification(tr('manager_only'), 'warning');
  
  const permDiscountEl = document.getElementById('perm_canDiscount');
  const permDeleteEl = document.getElementById('perm_canDelete');
  const permEditEl = document.getElementById('perm_canEditPrice');
  const permReturnEl = document.getElementById('perm_canReturn');
  const permDrawerEl = document.getElementById('perm_canDrawerExpense');

  const vatEnabledEl = document.getElementById('storeVatEnabled');
  const vatRateEl = document.getElementById('storeVatRate');
  const vatModeEl = document.getElementById('storeVatMode');

  const abEnabledEl = document.getElementById('autoBackupEnabled');
  const abIntervalEl = document.getElementById('autoBackupInterval');
  const abRetentionEl = document.getElementById('autoBackupRetention');

  const newSettings = {
    name: (document.getElementById('storeName').value || '').trim() || 'متجري',
    phone: (document.getElementById('storePhone').value || '').trim(),
    address: (document.getElementById('storeAddress').value || '').trim(),
    taxNumber: (document.getElementById('storeTaxNumber').value || '').trim(),
    currency: (document.getElementById('storeCurrency').value || 'ج.م').trim(),
    monthlyGoal: parseFloat(document.getElementById('storeMonthlyGoal').value) || 0,
    pointsRate: parseFloat(document.getElementById('storePointsRate').value) || 0,
    pointValue: parseFloat(document.getElementById('storePointValue').value) || 0,
    printType: document.getElementById('storePrintType') ? document.getElementById('storePrintType').value : 'thermal',
  autoPrintOnScan: document.getElementById('autoPrintOnScan') ? !!document.getElementById('autoPrintOnScan').checked : false,
    
        vatEnabled: vatEnabledEl ? !!vatEnabledEl.checked : false,
    vatRate: vatRateEl ? (parseFloat(vatRateEl.value) || 0) : 0,
    vatMode: vatModeEl ? (vatModeEl.value || 'inclusive') : 'inclusive',
    autoBackupEnabled:   abEnabledEl ? !!abEnabledEl.checked : false,
    autoBackupInterval:  abIntervalEl ? (abIntervalEl.value || 'daily') : 'daily',
    autoBackupRetention: abRetentionEl ? Math.min(30, Math.max(3, parseInt(abRetentionEl.value) || 7)) : 7,
    permissions: {
      canDiscount: permDiscountEl ? permDiscountEl.checked : false,
      canDelete: permDeleteEl ? permDeleteEl.checked : false,
      canEditPrice: permEditEl ? permEditEl.checked : false,
      canReturn: permReturnEl ? permReturnEl.checked : false,
      canDrawerExpense: permDrawerEl ? permDrawerEl.checked : false
    }
  };

  state.storeSettings = Object.assign({}, state.storeSettings, newSettings);

  const titleEl = document.querySelector('.logo-title');
  if (titleEl) titleEl.textContent = state.storeSettings.name;

  if (navigator.onLine && supabaseClient) {
    const ownerId = state.currentUser.id;
    const { error } = await supabaseClient.from('store_settings').upsert({
      user_id: ownerId,
      name: newSettings.name,
      phone: newSettings.phone,
      address: newSettings.address,
      tax_number: newSettings.taxNumber,
      currency: newSettings.currency,
      logo: state.storeSettings.logo,
      monthly_goal: newSettings.monthlyGoal,
      points_rate: newSettings.pointsRate,
      point_value: newSettings.pointValue,
      print_type: newSettings.printType,
      auto_print_on_scan: newSettings.autoPrintOnScan,
      permissions: newSettings.permissions,
      vat_enabled: newSettings.vatEnabled,
      vat_rate: newSettings.vatRate,
      vat_mode: newSettings.vatMode,
      auto_backup_enabled:   newSettings.autoBackupEnabled,
      auto_backup_interval:  newSettings.autoBackupInterval,
      auto_backup_retention: newSettings.autoBackupRetention,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });
    
    if (error) {
      console.warn('Settings upload failed:', error);
      showNotification(tr('settings_saving_offline'), 'warning');
    }
  }

  if (typeof addAuditLog === 'function') {
    addAuditLog('save_store_settings', { storeName: state.storeSettings.name });
  }

  saveData();
  if (isAutoSave) {
  // إظهار علامة صغيرة جداً فوق إن تم الحفظ
  const badge = document.createElement('div');
  badge.innerText = '✅ تم الحفظ تلقائياً';
  badge.style.cssText = 'position:fixed; bottom:20px; right:20px; background:#2e7d32; color:#fff; padding:8px 15px; border-radius:20px; font-size:12px; font-weight:bold; z-index:99999; transition:opacity 0.3s;';
  document.body.appendChild(badge);
  setTimeout(() => { badge.style.opacity = '0'; setTimeout(() => badge.remove(), 300); }, 1500);
} else {
  showNotification(tr('settings_saved_ok'));
}

  if (newSettings.autoBackupEnabled && typeof checkAndRunAutoBackup === 'function') {
    setTimeout(() => checkAndRunAutoBackup('load').catch(() => {}), 500);
  }
}

function handleLogoUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  if (file.size > 500 * 1024) return showNotification(tr('logo_too_large'), 'warning');
  const reader = new FileReader();
  reader.onload = function() {
    state.storeSettings.logo = reader.result;
    const preview = document.getElementById('storeLogoPreview');
    if (preview) { preview.src = reader.result; preview.style.display = 'block'; }
    saveData();
    showNotification(tr('logo_uploaded'));
  };
  reader.readAsDataURL(file);
}

function removeStoreLogo() {
  if (!confirm(tr('msg_delete_logo'))) return;
  state.storeSettings.logo = '';
  const preview = document.getElementById('storeLogoPreview');
  if (preview) preview.style.display = 'none';
  const input = document.getElementById('storeLogo');
  if (input) input.value = '';
  saveData();
  showNotification(tr('logo_deleted'));
}

async function verifyCurrentUserPassword(password) {
  if (!supabaseClient || !state.currentUser || !password) return false;
  try {
    const { data, error } = await supabaseClient.functions.invoke('verify-password', {
      body: { password: password }
    });
    if (error) return false;
    return data && data.valid === true;
  } catch (e) { return false; }
}

async function safeClearAllDataPrompt() {
  if (state.role !== 'manager') return showNotification(tr('manager_only'), 'warning');
  const pass = prompt(tr('msg_wipe_password'));
  if (pass === null) return;
  if (!(await verifyCurrentUserPassword(pass))) return showNotification(tr('password_verify_failed'), 'error');

  if (!confirm(tr('msg_wipe_all'))) return;

  // 1. ناخد نسخة احتياطية أمان الأول (بقت بتسحب من السيرفر دلوقتي)
  try {
    if (typeof downloadEncryptedBackup !== 'function') throw new Error('Backup function not available');
    await downloadEncryptedBackup(pass, true);
  } catch (backupError) {
    showNotification(tr('wipe_backup_failed'), 'error');
    return;
  }

  if (!navigator.onLine || !supabaseClient) {
    return showNotification(tr('error_no_server_connection'), 'error');
  }

  showLoading(tr('clearing_data'));

  try {
    // 2. 🔴 ننادي دالة المسح في السيرفر (اللي بتمسح كل حاجة بالترتيب الصح)
    const { error } = await supabaseClient.rpc('wipe_user_data');
    if (error) throw error;

    // 3. تصفير الذاكرة المحلية (الفرونت إند)
    state.products = [];
    state.sales = [];
    state.customers = [{ id: 'CASH-CUSTOMER', name: 'عميل نقدي عام', phone: '-', openingDebt: 0, points: 0 }];
    state.suppliers = [];
    state.expenses = [];
    state.stockMoves = [];
    state.returns = [];
    state.customerPayments = [];
    state.supplierPayments = [];
    state.purchases = [];
    state.shifts = [];
    state.currentShift = null;
    state.cart = [];
    state.auditLogs = [];
    state.saleItems = [];
    state.heldCarts = [];

    const ownerId = state.currentUser.id;
    localStorage.removeItem('matjari_cache_' + ownerId);
    
    // 4. تصفير طابور المزامنة
    if (typeof clearSyncQueue === 'function') clearSyncQueue();

    if (typeof addAuditLog === 'function') {
      addAuditLog('clear_all_data', { timestamp: new Date().toISOString() });
    }

    saveData();
    renderAll();
    updateStockBadge();
    showNotification(tr('wipe_success'));

  } catch (err) {
    console.error('Wipe failed:', err);
    showNotification((tr('error_generic_prefix') || '') + err.message, 'error');
  } finally {
    hideLoading();
  }
}
/* ============ v7.17 — Smart Settings (Auto-Save & Live Preview) ============ */

function switchSettingsTab(tabId) {
  document.querySelectorAll('#settStore .tab-content').forEach(el => el.style.display = 'none');
  document.querySelectorAll('#settStore .tab-btn').forEach(el => el.classList.remove('active'));
  
  const content = document.getElementById('tab-' + tabId);
  if (content) content.style.display = 'block';
  
  const btn = document.querySelector('#settStore .tab-btn[data-tab="' + tabId + '"]');
  if (btn) btn.classList.add('active');
  
  if (tabId === 'set-store') updateReceiptPreview();
}

let _autoSaveTimer = null;
function triggerAutoSave() {
  updateReceiptPreview(); // تحديث المعاينة فوراً
  
  clearTimeout(_autoSaveTimer);
  _autoSaveTimer = setTimeout(() => {
    // ننادي دالة الحفظ الموجودة بس في صمت (من غير ما تطلع إشعار مزعج)
    if (typeof saveStoreSettings === 'function') {
      saveStoreSettings(true); 
    }
  }, 1000); // يحفظ بعد ما التاجر يبطّل كتابة لمدة ثانية
}

function updateReceiptPreview() {
  const nameInput = document.getElementById('storeName');
  const phoneInput = document.getElementById('storePhone');
  const addressInput = document.getElementById('storeAddress');
  const currencyInput = document.getElementById('storeCurrency');
  const logoPreview = document.getElementById('storeLogoPreview');
  
  if (document.getElementById('previewStoreName')) {
    document.getElementById('previewStoreName').innerText = nameInput.value || 'متجري';
    document.getElementById('previewStorePhone').innerText = phoneInput.value || '';
    document.getElementById('previewStoreAddress').innerText = addressInput.value || '';
    document.querySelectorAll('.previewCur').forEach(el => el.innerText = currencyInput.value || 'ج.م');
  }

  if (logoPreview && logoPreview.src && logoPreview.style.display !== 'none') {
    document.getElementById('previewLogo').src = logoPreview.src;
    document.getElementById('previewLogoWrap').style.display = 'block';
  } else {
    document.getElementById('previewLogoWrap').style.display = 'none';
  }
}

// ربط أحداث تحديث المعاينة (لما يغير الشعار أو الاسم)
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    ['storeName', 'storePhone', 'storeAddress', 'storeCurrency', 'storeLogo'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', updateReceiptPreview);
      if (el) el.addEventListener('change', updateReceiptPreview);
    });
    updateReceiptPreview();
  }, 1000);
});