/* ============ محرك المزامنة (Sync Engine) - للجداول الجديدة ============ */

/**
 * تحميل كل البيانات من السيرفر (Jadwal) إلى الـ State
 * @param {string} ownerId - صاحب المحل (المدير)
 */
async function syncDown(ownerId) {
  if (!navigator.onLine || !supabaseClient) return;

  const tables = [
    { name: 'products', key: 'products' },
    { name: 'customers', key: 'customers' },
    { name: 'sales', key: 'sales' },
    { name: 'returns', key: 'returns' },
    { name: 'expenses', key: 'expenses' },
    { name: 'shifts', key: 'shifts' },
    { name: 'audit_logs', key: 'auditLogs' },
    { name: 'suppliers', key: 'suppliers' },             // [جديد]
    { name: 'purchases', key: 'purchases' },             // [جديد]
    { name: 'customer_payments', key: 'customerPayments' }, // [جديد]
    { name: 'supplier_payments', key: 'supplierPayments' }, // [جديد]
    { name: 'stock_moves', key: 'stockMoves' },          // [جديد]
    { name: 'held_carts', key: 'heldCarts' },            // [جديد]
    { name: 'store_settings', key: 'storeSettings', single: true }
  ];

  for (const t of tables) {
    try {
      let query = supabaseClient.from(t.name).select('*').eq('user_id', ownerId);
      
      if (t.single) {
        const { data } = await query.maybeSingle();
        if (data) {
          state[t.key] = {
            name: data.name, phone: data.phone, address: data.address,
            taxNumber: data.tax_number, currency: data.currency, logo: data.logo,
            monthlyGoal: data.monthly_goal, pointsRate: data.points_rate,
            pointValue: data.point_value, printType: data.print_type,
            permissions: data.permissions || {}
          };
        }
      } else {
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        
        if (data) {
          state[t.key] = data.map(row => {
            if (t.name === 'sales') return { id: row.id, date: row.date, subtotal: row.subtotal, discount: row.discount, total: row.total, paid: row.paid, remaining: row.remaining, customerId: row.customer_id, payMethod: row.pay_method, notes: row.notes, cashier: row.cashier, shiftId: row.shift_id, items: [] };
            if (t.name === 'products') return { id: row.id, name: row.name, barcode: row.barcode, category: row.category, price: row.price, cost: row.cost, stock: row.stock, minStock: row.min_stock };
            if (t.name === 'customers') return { id: row.id, name: row.name, phone: row.phone, openingDebt: row.opening_debt, points: row.points };
            if (t.name === 'expenses') return { id: row.id, name: row.name, amount: row.amount, notes: row.notes, date: row.date };
            if (t.name === 'returns') return { id: row.id, saleId: row.sale_id, productId: row.product_id, productName: row.product_name, qty: row.qty, reason: row.reason, date: row.date };
            if (t.name === 'shifts') return { id: row.id, cashierName: row.cashier_name, startTime: row.start_time, endTime: row.end_time, actualCash: row.actual_cash, difference: row.difference, notes: row.notes };
            if (t.name === 'audit_logs') return { id: row.id, action: row.action, details: row.details, date: row.created_at, userId: row.user_id, role: row.role };
            if (t.name === 'suppliers') return { id: row.id, name: row.name, phone: row.phone, openingDebt: row.opening_debt };
            if (t.name === 'purchases') return { id: row.id, date: row.date, supplierId: row.supplier_id, productId: row.product_id, productName: row.product_name, qty: row.qty, cost: row.cost, total: row.total, paid: row.paid, remaining: row.remaining };
            if (t.name === 'customer_payments') return { id: row.id, customerId: row.customer_id, customerName: row.customer_name, amount: row.amount, date: row.date, notes: row.notes };
            if (t.name === 'supplier_payments') return { id: row.id, supplierId: row.supplier_id, supplierName: row.supplier_name, amount: row.amount, date: row.date, notes: row.notes };
            if (t.name === 'stock_moves') return { id: row.id, date: row.date, productId: row.product_id, productName: row.product_name, type: row.type, qty: row.qty, oldStock: row.old_stock, newStock: row.new_stock, reason: row.reason };
            if (t.name === 'held_carts') return { id: row.id, time: row.time, cart: row.cart_data, customerId: row.customer_id, customerName: row.customer_name, discount: row.discount, discountType: row.discount_type, notes: row.notes };
            return row;
          });
        }
      }
    } catch (err) {
      console.warn(`SyncDown failed for ${t.name}:`, err.message);
    }
  }
  
  // جلب تفاصيل الفواتير
  try {
    const { data: items } = await supabaseClient.from('sale_items').select('*').eq('user_id', ownerId);
    if (items && items.length > 0) {
      state.sales.forEach(s => {
        s.items = items.filter(i => i.sale_id === s.id).map(i => ({ id: i.product_id, name: i.product_name, qty: Number(i.qty), price: Number(i.price), cost: Number(i.cost) }));
      });
    }
  } catch (err) { console.warn('Failed to load sale items', err); }
}
/**
 * رفع التعديلات (للمدير) للسيرفر
 */
async function syncUp(ownerId) {
  if (!navigator.onLine || !supabaseClient) return;
  
  // إعدادات المحل
  try {
    await supabaseClient.from('store_settings').upsert({
      user_id: ownerId,
      name: state.storeSettings.name,
      phone: state.storeSettings.phone,
      address: state.storeSettings.address,
      tax_number: state.storeSettings.taxNumber,
      currency: state.storeSettings.currency,
      logo: state.storeSettings.logo,
      monthly_goal: state.storeSettings.monthlyGoal,
      points_rate: state.storeSettings.pointsRate,
      point_value: state.storeSettings.pointValue,
      print_type: state.storeSettings.printType,
      permissions: state.storeSettings.permissions,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });
  } catch (e) { console.warn('Settings sync failed', e); }

  // هنا تقدر تضيف رفع المنتجات والعملاء لو المدير عدلهم
}

/**
 * حفظ محلي (للكاش)
 */
function saveData() {
  const cacheOwnerId = (state.role === 'employee' && state.ownerId) ? state.ownerId : (state.currentUser ? state.currentUser.id : null);
  if (!cacheOwnerId) return;
  const key = 'matjari_cache_' + cacheOwnerId;
  try {
    const cache = {
      products: state.products,
      customers: state.customers,
      sales: state.sales,
      returns: state.returns,
      expenses: state.expenses,
      shifts: state.shifts,
      auditLogs: state.auditLogs,
      storeSettings: state.storeSettings,
      subscription: state.subscription
    };
    localStorage.setItem(key, JSON.stringify(cache));
  } catch (e) {}
}

/**
 * مزامنة الموظف: رفع الفواتير، المرتجعات، المصروفات، وسجل النشاط
 */
async function syncEmployeeChanges() {
  if (!state.currentUser || state.role !== 'employee' || !state.ownerId) return;
  if (!navigator.onLine || !supabaseClient) return;

  const ownerId = state.ownerId;

  // 1. رفع الفواتير (Sales & Sale Items)
  for (const sale of state.sales) {
    try {
      await supabaseClient.from('sales').upsert({
        id: sale.id, user_id: ownerId, date: sale.date, subtotal: sale.subtotal,
        discount: sale.discount, total: sale.total, paid: sale.paid, remaining: sale.remaining,
        customer_id: sale.customerId, pay_method: sale.payMethod, notes: sale.notes,
        cashier: sale.cashier, shift_id: sale.shiftId
      }, { onConflict: 'id' });

      if (sale.items && sale.items.length > 0) {
        const itemsToInsert = sale.items.map(i => ({
          sale_id: sale.id, user_id: ownerId, product_id: i.id, product_name: i.name,
          qty: i.qty, price: i.price, cost: i.cost
        }));
        await supabaseClient.from('sale_items').upsert(itemsToInsert, { onConflict: 'sale_id, product_id' });
      }
    } catch (e) { console.warn('Sale upload failed', e); }
  }

  // 2. رفع المرتجعات
  for (const ret of state.returns) {
    try {
      await supabaseClient.from('returns').upsert({
        id: ret.id, user_id: ownerId, sale_id: ret.saleId, product_id: ret.productId,
        product_name: ret.productName, qty: ret.qty, reason: ret.reason, date: ret.date
      }, { onConflict: 'id' });
    } catch (e) { console.warn('Return upload failed', e); }
  }

  // 3. رفع المصروفات
  for (const exp of state.expenses) {
    try {
      await supabaseClient.from('expenses').upsert({
        id: exp.id, user_id: ownerId, name: exp.name, amount: exp.amount, notes: exp.notes, date: exp.date
      }, { onConflict: 'id' });
    } catch (e) { console.warn('Expense upload failed', e); }
  }

  // 4. رفع سجل النشاط
  for (const log of state.auditLogs) {
    try {
      await supabaseClient.from('audit_logs').upsert({
        id: log.id, user_id: state.currentUser.id, owner_id: ownerId,
        role: 'employee', action: log.action, details: log.details, created_at: log.date || new Date().toISOString()
      }, { onConflict: 'id' });
    } catch (e) { console.warn('Audit log upload failed', e); }
  }
}

/**
 * المزامنة اليدوية (موجّهة حسب الدور)
 */
async function syncNow() {
  if (!state.currentUser) return showNotification('سجّل الدخول أولاً', 'warning');
  if (!supabaseClient) return showNotification('لا يوجد اتصال بالسيرفر', 'error');
  if (!navigator.onLine) return showNotification('لا يوجد اتصال بالإنترنت', 'error');

  showLoading('جارٍ المزامنة...');
  try {
    const ownerId = (state.role === 'employee' && state.ownerId) ? state.ownerId : state.currentUser.id;
    if (state.role === 'employee') {
      await syncEmployeeChanges();
    } else {
      await syncUp(ownerId);
    }
    await syncDown(ownerId);
    showNotification('تمت المزامنة بنجاح ✅');
  } catch (e) {
    console.error(e);
    showNotification('تعذرت المزامنة', 'error');
  } finally {
    hideLoading();
  }
}