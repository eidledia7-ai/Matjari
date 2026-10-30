/* ============ محرك المزامنة (Sync Engine) - للجداول الجديدة ============ */

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
    { name: 'suppliers', key: 'suppliers' },
    { name: 'purchases', key: 'purchases' },
    { name: 'customer_payments', key: 'customerPayments' },
    { name: 'supplier_payments', key: 'supplierPayments' },
    { name: 'stock_moves', key: 'stockMoves' },
    { name: 'held_carts', key: 'heldCarts' },
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
        let finalQuery;
if (t.name === 'returns') {
  finalQuery = query.order('date', { ascending: false });
} else if (t.name === 'shifts') {
  finalQuery = query.order('start_time', { ascending: false });
} else {
  finalQuery = query.order('created_at', { ascending: false });
}

        const { data, error } = await finalQuery;
        if (error) throw error;

        if (data) {
          state[t.key] = data.map(row => {
            if (t.name === 'sales') return { id: row.id, date: row.date, subtotal: row.subtotal, discount: row.discount, total: row.total, paid: row.paid, remaining: row.remaining, returned_total: row.returned_total, net_total: row.net_total, customer_id: row.customer_id, customerId: row.customer_id, pay_method: row.pay_method, payMethod: row.pay_method, notes: row.notes, cashier: row.cashier, shift_id: row.shift_id, shiftId: row.shift_id, items: [] };
            if (t.name === 'products') return { id: row.id, name: row.name, barcode: row.barcode, category: row.category, price: row.price, cost: row.cost, stock: row.stock, min_stock: row.min_stock, minStock: row.min_stock };
            if (t.name === 'customers') return { id: row.id, name: row.name, phone: row.phone, opening_debt: row.opening_debt, openingDebt: row.opening_debt, points: row.points };
            if (t.name === 'expenses') return { id: row.id, name: row.name, amount: row.amount, notes: row.notes, date: row.date, shift_id: row.shift_id, shiftId: row.shift_id, pay_method: row.pay_method, payMethod: row.pay_method };
            if (t.name === 'returns') return { id: row.id, sale_id: row.sale_id, saleId: row.sale_id, product_id: row.product_id, productId: row.product_id, product_name: row.product_name, productName: row.product_name, qty: row.qty, price: row.price, total: row.total, refund_method: row.refund_method, refundMethod: row.refund_method, shift_id: row.shift_id, shiftId: row.shift_id, customer_id: row.customer_id, customerId: row.customer_id, reason: row.reason, date: row.date };
            if (t.name === 'shifts') return { id: row.id, cashier_name: row.cashier_name, cashierName: row.cashier_name, start_time: row.start_time, startTime: row.start_time, end_time: row.end_time, endTime: row.end_time, opening_cash: row.opening_cash, openingCash: row.opening_cash, expected_cash: row.expected_cash, expectedCash: row.expected_cash, actual_cash: row.actual_cash, actualCash: row.actual_cash, difference: row.difference, notes: row.notes };
            if (t.name === 'audit_logs') return { id: row.id, action: row.action, details: row.details, date: row.created_at, userId: row.user_id, role: row.role };
            if (t.name === 'suppliers') return { id: row.id, name: row.name, phone: row.phone, opening_debt: row.opening_debt, openingDebt: row.opening_debt };
            if (t.name === 'purchases') return { id: row.id, date: row.date, supplier_id: row.supplier_id, supplierId: row.supplier_id, product_id: row.product_id, productId: row.product_id, product_name: row.product_name, productName: row.product_name, qty: row.qty, cost: row.cost, total: row.total, paid: row.paid, remaining: row.remaining };
            if (t.name === 'customer_payments') return { id: row.id, customer_id: row.customer_id, customerId: row.customer_id, customer_name: row.customer_name, customerName: row.customer_name, amount: row.amount, date: row.date, notes: row.notes, shift_id: row.shift_id, shiftId: row.shift_id, pay_method: row.pay_method, payMethod: row.pay_method };
            if (t.name === 'supplier_payments') return { id: row.id, supplier_id: row.supplier_id, supplierId: row.supplier_id, supplier_name: row.supplier_name, supplierName: row.supplier_name, amount: row.amount, date: row.date, notes: row.notes };
            if (t.name === 'stock_moves') return { id: row.id, date: row.date, product_id: row.product_id, productId: row.product_id, product_name: row.product_name, productName: row.product_name, type: row.type, qty: row.qty, old_stock: row.old_stock, oldStock: row.old_stock, new_stock: row.new_stock, newStock: row.new_stock, reason: row.reason };
            if (t.name === 'held_carts') return { id: row.id, time: row.time, cart: row.cart_data, customer_id: row.customer_id, customerId: row.customer_id, customer_name: row.customer_name, customerName: row.customer_name, discount: row.discount, discount_type: row.discount_type, discountType: row.discount_type, notes: row.notes, shift_id: row.shift_id, shiftId: row.shift_id };
            return row;
          });
        }
      }
    } catch (err) {
      console.warn(`SyncDown failed for ${t.name}:`, err.message);
    }
  }

  // التأكد من وجود العميل النقدي العام
  if (!state.customers || state.customers.length === 0) {
    state.customers = [{ id: 'CASH-CUSTOMER', name: 'عميل نقدي عام', phone: '-', openingDebt: 0, opening_debt: 0, points: 0 }];
  } else if (!state.customers.find(c => c.name === 'عميل نقدي عام' || c.name === 'Cash Customer')) {
    state.customers.unshift({ id: 'CASH-CUSTOMER', name: 'عميل نقدي عام', phone: '-', openingDebt: 0, opening_debt: 0, points: 0 });
  }

  // جلب تفاصيل الفواتير + بناء state.saleItems (flat)
  try {
    const { data: items } = await supabaseClient.from('sale_items').select('*').eq('user_id', ownerId);
    if (items && items.length > 0) {
      const flatItems = items.map(i => ({
        id: i.id,
        sale_id: i.sale_id,
        saleId: i.sale_id,
        user_id: i.user_id,
        product_id: i.product_id,
        productId: i.product_id,
        product_name: i.product_name,
        productName: i.product_name,
        qty: Number(i.qty),
        price: Number(i.price),
        cost: Number(i.cost)
      }));

      // 1) ربط items بكل فاتورة في state.sales
      state.sales.forEach(s => {
        s.items = flatItems.filter(i => i.sale_id === s.id).map(i => ({
          id: i.product_id,
          name: i.product_name,
          qty: i.qty,
          price: i.price,
          cost: i.cost
        }));
      });

      // 2) بناء state.saleItems كـ flat array لـ finance-core COGS
      state.saleItems = flatItems;
    } else {
      state.saleItems = [];
    }
  } catch (err) {
    console.warn('Failed to load sale items', err);
    if (!state.saleItems) state.saleItems = [];
  }
}

async function syncUp(ownerId) {
  if (!navigator.onLine || !supabaseClient) return;
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
}

function saveData() {
  const cacheOwnerId = (state.role === 'employee' && state.ownerId) ? state.ownerId : (state.currentUser ? state.currentUser.id : null);
  if (!cacheOwnerId) return;
  const key = 'matjari_cache_' + cacheOwnerId;
  try {
    const cache = {
      products: state.products, customers: state.customers, sales: state.sales, returns: state.returns,
      expenses: state.expenses, shifts: state.shifts, auditLogs: state.auditLogs, storeSettings: state.storeSettings,
      subscription: state.subscription, suppliers: state.suppliers, purchases: state.purchases,
      customerPayments: state.customerPayments, supplierPayments: state.supplierPayments,
      stockMoves: state.stockMoves, heldCarts: state.heldCarts,
      saleItems: state.saleItems
    };
    localStorage.setItem(key, JSON.stringify(cache));
  } catch (e) {}
}

async function syncEmployeeChanges() {
  if (!state.currentUser || state.role !== 'employee' || !state.ownerId) return;
  if (!navigator.onLine || !supabaseClient) return;

  const ownerId = state.ownerId;

  for (const sale of state.sales) {
    try {
      await supabaseClient.from('sales').upsert({
        id: sale.id, user_id: ownerId, date: sale.date, subtotal: sale.subtotal,
        discount: sale.discount, total: sale.total, paid: sale.paid, remaining: sale.remaining,
        customer_id: sale.customerId || sale.customer_id, pay_method: sale.payMethod || sale.pay_method,
        notes: sale.notes, cashier: sale.cashier, shift_id: sale.shiftId || sale.shift_id
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

  for (const ret of state.returns) {
    try {
      await supabaseClient.from('returns').upsert({
        id: ret.id, user_id: ownerId, sale_id: ret.saleId || ret.sale_id,
        product_id: ret.productId || ret.product_id, product_name: ret.productName || ret.product_name,
        qty: ret.qty, price: ret.price, total: ret.total,
        refund_method: ret.refundMethod || ret.refund_method,
        shift_id: ret.shiftId || ret.shift_id,
        customer_id: ret.customerId || ret.customer_id,
        reason: ret.reason, date: ret.date
      }, { onConflict: 'id' });
    } catch (e) { console.warn('Return upload failed', e); }
  }

  for (const exp of state.expenses) {
    try {
      await supabaseClient.from('expenses').upsert({
        id: exp.id, user_id: ownerId, name: exp.name, amount: exp.amount,
        notes: exp.notes, date: exp.date,
        shift_id: exp.shiftId || exp.shift_id,
        pay_method: exp.payMethod || exp.pay_method
      }, { onConflict: 'id' });
    } catch (e) { console.warn('Expense upload failed', e); }
  }

  for (const pay of (state.customerPayments || [])) {
    try {
      await supabaseClient.from('customer_payments').upsert({
        id: pay.id, user_id: ownerId,
        customer_id: pay.customerId || pay.customer_id,
        customer_name: pay.customerName || pay.customer_name,
        amount: pay.amount, date: pay.date, notes: pay.notes,
        shift_id: pay.shiftId || pay.shift_id,
        pay_method: pay.payMethod || pay.pay_method
      }, { onConflict: 'id' });
    } catch (e) { console.warn('Customer payment upload failed', e); }
  }

  for (const log of state.auditLogs) {
    try {
      await supabaseClient.from('audit_logs').upsert({
        id: log.id, user_id: state.currentUser.id, owner_id: ownerId,
        role: 'employee', action: log.action, details: log.details, created_at: log.date || new Date().toISOString()
      }, { onConflict: 'id' });
    } catch (e) { console.warn('Audit log upload failed', e); }
  }
}

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