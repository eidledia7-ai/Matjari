/* ============ التخزين السحابي والمحلي ============ */

/* ============ حفظ محلي ============ */
function saveData() {
  // نحفظ على ownerId للموظف و user.id للمدير
  const cacheOwnerId = (state.role === 'employee' && state.ownerId) ? state.ownerId : (state.currentUser ? state.currentUser.id : null);
  if (!cacheOwnerId) return;
  const key = 'matjari_cache_' + cacheOwnerId;
  try {
    const cache = {
      products: state.products,
      customers: state.customers,
      sales: state.sales,
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
      storeSettings: state.storeSettings,
      subscription: state.subscription   // [إضافة] عشان ownerPlan يشتغل أوفلاين
    };
    localStorage.setItem(key, JSON.stringify(cache));
    scheduleSync();
  } catch (e) {}
}

/* ============ رفع مصروف الدرج فقط للموظف ============ */
/**
 * ترفع مصروف درج واحد للموظف على shop_data المدير بعملية دمج آمنة.
 * تُستدعى من helpers.js (saveDrawerExpense) بعد إضافة مصروف درج.
 */
async function pushDrawerExpenseToServer(expense) {
  if (!navigator.onLine || !supabaseClient || !state.currentUser) return false;
  if (state.role !== 'employee' || !state.ownerId) return false;
  if (!expense || !expense.id) return false;

  const ownerId = state.ownerId;
  try {
    const getRes = await supabaseClient
      .from('shop_data')
      .select('shop_data')
      .eq('user_id', ownerId)
      .maybeSingle();

    let remote = (getRes && getRes.data && getRes.data.shop_data) ? getRes.data.shop_data : {};
    const remoteExpenses = Array.isArray(remote.expenses) ? remote.expenses : [];
    const exists = remoteExpenses.some(function (x) { return x && x.id === expense.id; });
    if (!exists) remote.expenses = remoteExpenses.concat([expense]);

    const upRes = await supabaseClient
      .from('shop_data')
      .upsert({
        user_id: ownerId,
        shop_data: remote,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
    if (upRes.error) throw upRes.error;

    if (typeof addAuditLog === 'function') {
      addAuditLog('drawer_expense_push', {
        expenseId: expense.id,
        name: expense.name,
        amount: expense.amount
      }, expense.id);
    }
    return true;
  } catch (e) {
    console.warn('pushDrawerExpenseToServer failed:', e && e.message);
    return false;
  }
}

/* ============ جدولة المزامنة (المدير فقط للحالة الكاملة) ============ */
function scheduleSync() {
  if (!state.currentUser || state.role === 'employee') return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(function() { uploadToCloud(); }, 2000);
}

/* ============ مزامنة الحالة الكاملة (للمدير فقط) ============ */
async function uploadToCloud() {
  if (!navigator.onLine) return;
  if (!state.currentUser || isSyncing) return;
  if (!supabaseClient) return;
  if (state.role === 'employee') return; // حماية إضافية

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
    console.warn('Cloud sync failed:', e && e.message);
  } finally {
    isSyncing = false;
  }
}

/* ============ مزامنة الفواتير (لكل الأدوار) ============ */
async function syncPendingSales() {
  if (!navigator.onLine || !supabaseClient || !state.currentUser) return;
  try {
    const cacheOwnerId = (state.role === 'employee' && state.ownerId) ? state.ownerId : state.currentUser.id;

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

    if (!salesToSync.length) return;

    const { error } = await supabaseClient
      .from('sales')
      .upsert(salesToSync, { onConflict: 'id' });

    if (error) console.warn('Sync sales error:', error);
  } catch (e) {
    console.warn('Failed to sync sales:', e);
  }
}

/* ============ مزامنة الموظف: فواتير + مصروفات درج فقط ============ */
async function syncEmployeeChanges() {
  if (!state.currentUser || state.role !== 'employee') return;
  if (!navigator.onLine || !supabaseClient) return;

  // 1. الفواتير
  await syncPendingSales();

  // 2. مصروفات الدرج فقط (الاسم بيبدأ بـ "مصروف وردية: ")
  const drawerExpenses = (state.expenses || []).filter(function (e) {
    return e && typeof e.name === 'string' && e.name.startsWith('مصروف وردية:');
  });

  if (drawerExpenses.length && state.ownerId) {
    try {
      const getRes = await supabaseClient
        .from('shop_data')
        .select('shop_data')
        .eq('user_id', state.ownerId)
        .maybeSingle();

      let remote = (getRes && getRes.data && getRes.data.shop_data) ? getRes.data.shop_data : {};
      const remoteExpenses = Array.isArray(remote.expenses) ? remote.expenses : [];
      const remoteIds = new Set(remoteExpenses.map(function (x) { return x && x.id; }));

      let added = 0;
      drawerExpenses.forEach(function (exp) {
        if (!remoteIds.has(exp.id)) {
          remoteExpenses.push(exp);
          remoteIds.add(exp.id);
          added++;
        }
      });

      if (added > 0) {
        remote.expenses = remoteExpenses;
        const upRes = await supabaseClient
          .from('shop_data')
          .upsert({
            user_id: state.ownerId,
            shop_data: remote,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });
        if (upRes.error) throw upRes.error;
      }
    } catch (e) {
      console.warn('syncEmployeeChanges: drawer expenses push failed:', e && e.message);
    }
  }
}

/* ============ المزامنة اليدوية (موجّهة حسب الدور) ============ */
async function syncNow() {
  if (!state.currentUser) return showNotification('سجّل الدخول أولاً', 'warning');
  if (!supabaseClient) return showNotification('لا يوجد اتصال بالسيرفر', 'error');
  if (!navigator.onLine) return showNotification('لا يوجد اتصال بالإنترنت', 'error');

  showLoading('جارٍ المزامنة...');
  try {
    if (state.role === 'employee') {
      await syncEmployeeChanges();
      showNotification('تمت مزامنة شغلك بنجاح ✅');
    } else {
      await uploadToCloud();
      await syncPendingSales();
      showNotification('تمت المزامنة بنجاح ✅');
    }
  } catch (e) {
    showNotification('تعذرت المزامنة', 'error');
  } finally {
    hideLoading();
  }
}