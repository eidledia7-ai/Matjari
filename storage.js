/* ============ التخزين السحابي والمحلي ============ */
function saveData() {
  // [إصلاح الكاش] نحفظ على ownerId للموظف و user.id للمدير
  const cacheOwnerId = (state.role === 'employee' && state.ownerId) ? state.ownerId : (state.currentUser ? state.currentUser.id : null);
  if (!cacheOwnerId) return;
  const key = 'matjari_cache_' + cacheOwnerId;
  try {
    const cache = {
      products: state.products,
      customers: state.customers,sales: state.sales,
      suppliers: state.suppliers,
      expenses: state.expenses,
      stockMoves: state.stockMoves,
      returns: state.returns,
      customerPayments: state.customerPayments,
      supplierPayments: state.supplierPayments,
      purchases: state.purchases,
      shifts: state.shifts,
      currentShift: state.currentShift,
      heldCarts: state.heldCarts,
      auditLogs: state.auditLogs,
      storeSettings: state.storeSettings
    };
    localStorage.setItem(key, JSON.stringify(cache));
    scheduleSync();
  } catch (e) {}
}

// ملاحظة مقصودة: منع رفع بيانات الموظف للسحابة (uploadToCloud) مقصود مؤقتاً
// لمنع تعارض الكتابة بين المدير والموظف على نفس سطر shop_data.
// الحل المستقبلي: جدول منفصل للحركات/الفواتير أو merge على مستوى السجل.
function scheduleSync() {
  if (!state.currentUser || state.role === 'employee') return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(function() { uploadToCloud(); }, 2000);
}

async function uploadToCloud() {
 
  if (!navigator.onLine) return;
  
  if (!state.currentUser || isSyncing) return;
  
  isSyncing = true;
  try {
    const payload = {
      products: state.products,
      customers: state.customers,
      suppliers: state.suppliers,
      expenses: state.expenses,
      stockMoves: state.stockMoves,
      returns: state.returns,
      customerPayments: state.customerPayments,
      supplierPayments: state.supplierPayments,
      purchases: state.purchases,
      shifts: state.shifts,
      currentShift: state.currentShift,
      heldCarts: state.heldCarts,
      auditLogs: state.auditLogs,
      storeSettings: state.storeSettings
    };
    const result = await supabaseClient
      .from('shop_data')
      .upsert({
        user_id: (state.role === 'employee' && state.ownerId) ? state.ownerId : state.currentUser.id,
        shop_data: payload,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
    if (result.error) throw result.error;
  } catch (e) {
    console.warn('Cloud sync failed:', e.message);
  } finally {
    isSyncing = false;
  }
}
// دالة مزامنة الفواتير المعلقة (للأوفلاين ولضمان تطابق الأجهزة)
async function syncPendingSales() {
  if (!navigator.onLine || !supabaseClient || !state.currentUser) return;
  
  try {
    const cacheOwnerId = (state.role === 'employee' && state.ownerId) ? state.ownerId : state.currentUser.id;
    
    // تحويل الفواتير لشكل الأعمدة اللي في الداتا بيز
    const salesToSync = state.sales.map(s => ({
      id: s.id,
      user_id: cacheOwnerId,
      date: s.date,
      items: s.items,
      subtotal: s.subtotal,
      discount: s.discount,
      total: s.total,
      paid: s.paid,
      remaining: s.remaining,
      customer_id: s.customerId,
      pay_method: s.payMethod,
      notes: s.notes,
      cashier: s.cashier,
      shift_id: s.shiftId
    }));

    // بنستخدم upsert عشان لو الفاتورة موجودة ميعملهاش Error ولو مش موجودة يضيفها
    const { error } = await supabaseClient.from('sales').upsert(salesToSync);
    
    if (error) console.warn('Sync sales error:', error);
    else console.log('All sales synced successfully');
  } catch (e) {
    console.warn('Failed to sync sales:', e);
  }
}
async function syncNow() {
  if (!state.currentUser) return showNotification('سجّل الدخول أولاً', 'warning');
  showLoading('جارٍ المزامنة...');
  try {
    await uploadToCloud();
    showNotification('تمت المزامنة بنجاح ✅');
  } catch (e) {
    showNotification('تعذرت المزامنة', 'error');
  } finally {
    hideLoading();
  }
}


