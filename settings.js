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
  
  if (pDiscount) pDiscount.checked = perms.canDiscount || false;
  if (pDelete) pDelete.checked = perms.canDelete || false;
  if (pEdit) pEdit.checked = perms.canEditPrice || false;
  if (pReturn) pReturn.checked = perms.canReturn || false; 
  
  const printTypeEl = document.getElementById('storePrintType');
  if (printTypeEl) printTypeEl.value = s.printType || 'thermal';
  
  const preview = document.getElementById('storeLogoPreview');
  if (preview && s.logo) { preview.src = s.logo; preview.style.display = 'block'; }
  else if (preview) { preview.style.display = 'none'; }
  
  const dz = document.getElementById('dangerZone');
  if (dz) dz.style.display = (state.role === 'manager') ? 'block' : 'none';
}

async function saveStoreSettings() {
  if (state.role !== 'manager') return showNotification('هذه العملية للمدير فقط', 'warning');
  
  const permDiscountEl = document.getElementById('perm_canDiscount');
  const permDeleteEl = document.getElementById('perm_canDelete');
  const permEditEl = document.getElementById('perm_canEditPrice');
  const permReturnEl = document.getElementById('perm_canReturn');

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
    permissions: {
      canDiscount: permDiscountEl ? permDiscountEl.checked : false,
      canDelete: permDeleteEl ? permDeleteEl.checked : false,
      canEditPrice: permEditEl ? permEditEl.checked : false,
      canReturn: permReturnEl ? permReturnEl.checked : false
    }
  };

  // تحديث الـ state
  state.storeSettings = Object.assign({}, state.storeSettings, newSettings);

  const titleEl = document.querySelector('.logo-title');
  if (titleEl) titleEl.textContent = state.storeSettings.name;

  // الحفظ في السيرفر (الجدول الجديد store_settings)
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
      permissions: newSettings.permissions,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });
    
    if (error) {
      console.warn('Settings upload failed:', error);
      showNotification('تم الحفظ محلياً، وسيتم الرفع عند عودة الاتصال.', 'warning');
    }
  }

  if (typeof addAuditLog === 'function') {
    addAuditLog('save_store_settings', { storeName: state.storeSettings.name });
  }

  saveData();
  showNotification('تم حفظ بيانات المحل ✅');
}

function handleLogoUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  if (file.size > 500 * 1024) return showNotification('حجم الصورة كبير (حد أقصى 500KB)', 'warning');
  const reader = new FileReader();
  reader.onload = function() {
    state.storeSettings.logo = reader.result;
    const preview = document.getElementById('storeLogoPreview');
    if (preview) { preview.src = reader.result; preview.style.display = 'block'; }
    saveData();
    showNotification('تم رفع الشعار');
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
  showNotification('تم حذف الشعار');
}

async function verifyCurrentUserPassword(password) {
  if (!supabaseClient || !state.currentUser || !state.currentUser.email || !password) return false;
  try {
    const { error } = await supabaseClient.auth.signInWithPassword({ email: state.currentUser.email, password: password });
    return !error;
  } catch (e) { return false; }
}

/* ============ حماية منطقة الخطر ============ */
async function safeClearAllDataPrompt() {
  if (state.role !== 'manager') return showNotification('هذه العملية للمدير فقط', 'warning');
  const pass = prompt(tr('dlg_wipe_password'));
  if (pass === null) return;
  if (!(await verifyCurrentUserPassword(pass))) return showNotification(currentLang === 'en' ? 'Password verification failed. Action cancelled.' : 'كلمة المرور غير صحيحة! تم إلغاء العملية.', 'error');

  if (!confirm(tr('msg_wipe_all'))) return;

  try {
    if (typeof downloadEncryptedBackup !== 'function') throw new Error('Backup function not available');
    await downloadEncryptedBackup(pass, true);
  } catch (backupError) {
    showNotification(currentLang === 'en' ? 'Automatic backup failed. Data was not cleared.' : 'فشل إنشاء النسخة الاحتياطية التلقائية. لم يتم مسح البيانات.', 'error');
    return;
  }

  const ownerId = state.currentUser.id;

  // مسح البيانات من السيرفر
  if (navigator.onLine && supabaseClient) {
    showLoading('جارٍ مسح البيانات...');
    try {
      await supabaseClient.from('sale_items').delete().eq('user_id', ownerId);
      await supabaseClient.from('sales').delete().eq('user_id', ownerId);
      await supabaseClient.from('returns').delete().eq('user_id', ownerId);
      await supabaseClient.from('expenses').delete().eq('user_id', ownerId);
      await supabaseClient.from('products').delete().eq('user_id', ownerId);
      await supabaseClient.from('customers').delete().eq('user_id', ownerId);
      await supabaseClient.from('shifts').delete().eq('user_id', ownerId);
    } catch (err) {
      console.warn('Failed to clear server data:', err);
    }
    hideLoading();
  }

  // مسح البيانات المحلية
  state.products = [];
  state.sales = [];
  state.customers = [{ id: uid('CUST'), name: 'عميل نقدي عام', phone: '-', openingDebt: 0 }];
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

  localStorage.removeItem('matjari_cache_' + ownerId);

  if (typeof addAuditLog === 'function') {
    addAuditLog('clear_all_data', { timestamp: new Date().toISOString() });
  }

  saveData();
  renderAll();
  updateStockBadge();
  showNotification('تم مسح كافة بيانات التطبيق بنجاح ✅');
}