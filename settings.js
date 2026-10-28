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
if (pDiscount) pDiscount.checked = perms.canDiscount || false;
if (pDelete) pDelete.checked = perms.canDelete || false;
if (pEdit) pEdit.checked = perms.canEditPrice || false;
  const printTypeEl = document.getElementById('storePrintType');
if (printTypeEl) printTypeEl.value = s.printType || 'thermal';
  const preview = document.getElementById('storeLogoPreview');
  if (preview && s.logo) { preview.src = s.logo; preview.style.display = 'block'; }
  else if (preview) { preview.style.display = 'none'; }
  
  const dz = document.getElementById('dangerZone');
  if (dz) dz.style.display = (state.role === 'manager') ? 'block' : 'none';
}

function saveStoreSettings() {
  if (state.role !== 'manager') return showNotification('هذه العملية للمدير فقط', 'warning');
  state.storeSettings.name = (document.getElementById('storeName').value || '').trim() || 'متجري';
  state.storeSettings.phone = (document.getElementById('storePhone').value || '').trim();
  state.storeSettings.address = (document.getElementById('storeAddress').value || '').trim();
  state.storeSettings.taxNumber = (document.getElementById('storeTaxNumber').value || '').trim();
  state.storeSettings.currency = (document.getElementById('storeCurrency').value || 'ج.م').trim();
  state.storeSettings.monthlyGoal = parseFloat(document.getElementById('storeMonthlyGoal').value) || 0;
state.storeSettings.pointsRate = parseFloat(document.getElementById('storePointsRate').value) || 0;
state.storeSettings.pointValue = parseFloat(document.getElementById('storePointValue').value) || 0;
state.storeSettings.permissions = {
  canDiscount: document.getElementById('perm_canDiscount').checked,
  canDelete: document.getElementById('perm_canDelete').checked,
  canEditPrice: document.getElementById('perm_canEditPrice').checked
};
state.storeSettings.printType = document.getElementById('storePrintType').value;
  const titleEl = document.querySelector('.logo-title');
  if (titleEl) titleEl.textContent = state.storeSettings.name;

  saveData();
  showNotification('تم حفظ بيانات المحل');
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

function buildBackupData() {
  return { version: 5, storeSettings: state.storeSettings, products: state.products, customers: state.customers, suppliers: state.suppliers, expenses: state.expenses,sales: state.sales,  stockMoves: state.stockMoves, returns: state.returns, customerPayments: state.customerPayments, supplierPayments: state.supplierPayments, purchases: state.purchases, shifts: state.shifts };
}

async function downloadEncryptedBackup(pass, silent) {
  const encrypted = await encryptData(JSON.stringify(buildBackupData()), pass);
  const blob = new Blob([JSON.stringify({ encrypted: true, data: encrypted })], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'backup-matjari-' + today() + '.shopbak';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function() { URL.revokeObjectURL(url); }, 1500);
  if (!silent) showNotification(currentLang === 'en' ? 'Encrypted backup downloaded.' : 'تم تنزيل النسخة الاحتياطية المشفرة ✅');
}

/* ============ حماية منطقة الخطر ============ */
async function safeClearAllDataPrompt() {
  if (state.role !== 'manager') return showNotification('هذه العملية للمدير فقط', 'warning');
  const pass = prompt(tr('dlg_wipe_password'));
  if (pass === null) return;
  if (!(await verifyCurrentUserPassword(pass))) return showNotification(currentLang === 'en' ? 'Password verification failed. Action cancelled.' : 'كلمة المرور غير صحيحة! تم إلغاء العملية.', 'error');

  if (!confirm(tr('msg_wipe_all'))) return;

  try {
    downloadEncryptedBackup(pass, true);
  } catch (backupError) {
    showNotification(currentLang === 'en' ? 'Automatic backup failed. Data was not cleared.' : 'فشل إنشاء النسخة الاحتياطية التلقائية. لم يتم مسح البيانات.', 'error');
    return;
  }

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

  if (state.currentUser) {
    localStorage.removeItem('matjari_cache_' + state.currentUser.id);
  }
// مسح الفواتير من الجدول المنفصل
if (navigator.onLine && supabaseClient && state.currentUser) {
  const cacheOwnerId = (state.role === 'employee' && state.ownerId) ? state.ownerId : state.currentUser.id;
  await supabaseClient.from('sales').delete().eq('user_id', cacheOwnerId);
}
  await uploadToCloud();
  renderAll();
  updateStockBadge();
  showNotification('تم مسح كافة بيانات التطبيق بنجاح ✅');
}

