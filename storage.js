/* ============ محرك المزامنة (Sync Engine) - v7.6 ============ */

// ✅ v7.4 — ثوابت الـ pagination
const SYNC_SALES_LIMIT   = 500;
const SYNC_RETURNS_LIMIT = 500;
const SYNC_DAYS          = 30;
const SYNC_AUDIT_LIMIT   = 100;
const SYNC_MOVES_LIMIT   = 500;
const SYNC_ITEMS_CHUNK   = 200;
async function syncDown(ownerId) {
  if (!navigator.onLine || !supabaseClient) return;

// ✅ v7.9 — حماية الفواتير والمرتجعات المعلقة من المسح
const _protectedSales = (state.sales || []).filter(s => s._pendingUpload === true);
const _protectedReturns = (state.returns || []).filter(r => r._pendingUpload === true);

// ✅ X43: حماية المنتجات المعلقة من المسح
const _protectedProducts = (state.products || []).filter(p => p._pendingUpload === true);

  const cutoffDate    = new Date(Date.now() - SYNC_DAYS * 86400000).toISOString();
  const cutoffDateStr = cutoffDate.split('T')[0];

  // ═══════════════════════════════════════════════════════
  // A) sales — آخر 30 يوماً، بحد أقصى 500
  // ═══════════════════════════════════════════════════════
  try {
    const { data, error } = await supabaseClient
      .from('sales').select('*')
      .eq('user_id', ownerId)
      .gte('created_at', cutoffDate)
      .order('created_at', { ascending: false })
      .limit(SYNC_SALES_LIMIT);

    if (error) throw error;

    state.sales = (data || []).map(row => ({
      id: row.id, date: row.date, subtotal: row.subtotal, discount: row.discount,
      total: row.total, paid: row.paid, remaining: row.remaining,
      returned_total: row.returned_total, net_total: row.net_total,
      points_used: row.points_used, pointsUsed: row.points_used,
      customer_id: row.customer_id, customerId: row.customer_id,
      pay_method: row.pay_method, payMethod: row.pay_method, notes: row.notes,
      cashier: row.cashier, shift_id: row.shift_id, shiftId: row.shift_id, items: [],
      vat_rate: Number(row.vat_rate) || 0, vatRate: Number(row.vat_rate) || 0,
      vat_amount: Number(row.vat_amount) || 0, vatAmount: Number(row.vat_amount) || 0,
      vat_mode: row.vat_mode || 'inclusive', vatMode: row.vat_mode || 'inclusive'
    }));
    state.salesDataLimited = (data || []).length >= SYNC_SALES_LIMIT;
    state.salesDataFromDate = cutoffDate;

    // ✅ v7.9 — دمج الفواتير المعلقة
    {
      const pendingIds = (typeof getPendingSaleIdsFromQueue === 'function') ? getPendingSaleIdsFromQueue() : new Set();
      const existing = new Set(state.sales.map(s => s.id));
      _protectedSales.forEach(ps => {
        if (!existing.has(ps.id) || pendingIds.has(ps.id)) {
          const localIdx = state.sales.findIndex(s => s.id === ps.id);
          if (localIdx === -1) state.sales.unshift(ps);
          else state.sales[localIdx]._pendingUpload = true;
        }
      });
    }
  } catch (err) {
    console.warn('SyncDown sales failed:', err.message);
  }

  const loadedSaleIds = (state.sales || []).map(s => s.id);

  // ═══════════════════════════════════════════════════════
  // B) returns — آخر 30 يوماً، بحد أقصى 500
  // ═══════════════════════════════════════════════════════
  try {
    const { data, error } = await supabaseClient
      .from('returns').select('*')
      .eq('user_id', ownerId)
      .gte('date', cutoffDateStr)
      .order('date', { ascending: false })
      .limit(SYNC_RETURNS_LIMIT);

    if (error) throw error;

    state.returns = (data || []).map(row => ({
      id: row.id, sale_id: row.sale_id, saleId: row.sale_id,
      product_id: row.product_id, productId: row.product_id,
      product_name: row.product_name, productName: row.product_name,
      qty: row.qty, price: row.price, total: row.total,
      refund_method: row.refund_method, refundMethod: row.refund_method,
      shift_id: row.shift_id, shiftId: row.shift_id,
      customer_id: row.customer_id, customerId: row.customer_id,
      reason: row.reason, date: row.date,
      vat_amount: Number(row.vat_amount) || 0, vatAmount: Number(row.vat_amount) || 0
    }));
    state.returnsDataLimited = (data || []).length >= SYNC_RETURNS_LIMIT;

    // ✅ v7.9 — دمج المرتجعات المعلقة
    {
      const existing = new Set(state.returns.map(r => r.id));
      _protectedReturns.forEach(pr => {
        if (!existing.has(pr.id)) state.returns.unshift(pr);
      });
    }
  } catch (err) {
    console.warn('SyncDown returns failed:', err.message);
  }

  // ═══════════════════════════════════════════════════════
  // C) audit_logs — آخر 100
  // ═══════════════════════════════════════════════════════
  try {
    const { data, error } = await supabaseClient
      .from('audit_logs').select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
      .limit(SYNC_AUDIT_LIMIT);
    if (error) throw error;
    state.auditLogs = (data || []).map(row => ({
      id: row.id, action: row.action, details: row.details,
      date: row.created_at, userId: row.user_id, role: row.role,
      uploaded: true 
    }));
  } catch (err) {
    console.warn('SyncDown audit_logs failed:', err.message);
  }

  // ═══════════════════════════════════════════════════════
  // D) stock_moves — آخر 500
  // ═══════════════════════════════════════════════════════
  try {
    const { data, error } = await supabaseClient
      .from('stock_moves').select('*')
      .eq('user_id', ownerId)
      .order('date', { ascending: false })
      .limit(SYNC_MOVES_LIMIT);
    if (error) throw error;
    state.stockMoves = (data || []).map(row => ({
      id: row.id, date: row.date, product_id: row.product_id, productId: row.product_id,
      product_name: row.product_name, productName: row.product_name,
      type: row.type, qty: row.qty,
      old_stock: row.old_stock, oldStock: row.old_stock,
      new_stock: row.new_stock, newStock: row.new_stock, reason: row.reason
    }));
  } catch (err) {
    console.warn('SyncDown stock_moves failed:', err.message);
  }

  // ═══════════════════════════════════════════════════════
  // E) الجداول الكاملة
  // ═══════════════════════════════════════════════════════
  const fullTables = [
    { name: 'products', key: 'products' },
    { name: 'customers', key: 'customers' },
    { name: 'expenses', key: 'expenses' },
    { name: 'shifts', key: 'shifts' },
    { name: 'suppliers', key: 'suppliers' },
    { name: 'purchases', key: 'purchases' },
    { name: 'customer_payments', key: 'customerPayments' },
    { name: 'supplier_payments', key: 'supplierPayments' },
    { name: 'held_carts', key: 'heldCarts' },
    { name: 'store_settings', key: 'storeSettings', single: true }
  ];

  for (const t of fullTables) {
    try {
      const query = supabaseClient.from(t.name).select('*').eq('user_id', ownerId);

      if (t.single) {
        const { data } = await query.maybeSingle();
        if (data) {
          state[t.key] = {
            name: data.name, phone: data.phone, address: data.address,
            taxNumber: data.tax_number, currency: data.currency, logo: data.logo,
            monthlyGoal: data.monthly_goal, pointsRate: data.points_rate,
            pointValue: data.point_value, printType: data.print_type,
            autoPrintOnScan: data.auto_print_on_scan === true,
            permissions: data.permissions || {},
            vatEnabled: data.vat_enabled === true,
            vatRate: Number(data.vat_rate) || 0,
            vatMode: data.vat_mode || 'inclusive',
            autoBackupEnabled:   data.auto_backup_enabled === true,
            autoBackupInterval:  data.auto_backup_interval || 'daily',
            autoBackupRetention: Number(data.auto_backup_retention) || 7,
            lastAutoBackupAt:    data.last_auto_backup_at || null
          };
        }
      } else {
        const finalQuery = (t.name === 'shifts')
          ? query.order('start_time', { ascending: false })
          : query.order('created_at', { ascending: false });

        const { data, error } = await finalQuery;
        if (error) throw error;

        if (data) {
          state[t.key] = data.map(row => {
            if (t.name === 'products') return { id: row.id, name: row.name, barcode: row.barcode, category: row.category, price: row.price, cost: row.cost, stock: row.stock, min_stock: row.min_stock, minStock: row.min_stock };
            if (t.name === 'customers') return { id: row.id, name: row.name, phone: row.phone, opening_debt: row.opening_debt, openingDebt: row.opening_debt, points: row.points };
            if (t.name === 'expenses') return { id: row.id, name: row.name, amount: row.amount, notes: row.notes, date: row.date, shift_id: row.shift_id, shiftId: row.shift_id, pay_method: row.pay_method, payMethod: row.pay_method };
            if (t.name === 'shifts') return { id: row.id, cashier_name: row.cashier_name, cashierName: row.cashier_name, start_time: row.start_time, startTime: row.start_time, end_time: row.end_time, endTime: row.end_time, opening_cash: row.opening_cash, openingCash: row.opening_cash, expected_cash: row.expected_cash, expectedCash: row.expected_cash, actual_cash: row.actual_cash, actualCash: row.actual_cash, difference: row.difference, cash_sales: row.cash_sales, cashSales: row.cash_sales, cash_returns: row.cash_returns, cashReturns: row.cash_returns, cash_expenses: row.cash_expenses, cashExpenses: row.cash_expenses, cash_collections: row.cash_collections, cashCollections: row.cash_collections, notes: row.notes };
            if (t.name === 'suppliers') return { id: row.id, name: row.name, phone: row.phone, opening_debt: row.opening_debt, openingDebt: row.opening_debt };
            if (t.name === 'purchases') return { id: row.id, date: row.date, supplier_id: row.supplier_id, supplierId: row.supplier_id, product_id: row.product_id, productId: row.product_id, product_name: row.product_name, productName: row.product_name, qty: row.qty, cost: row.cost, total: row.total, paid: row.paid, remaining: row.remaining };
            if (t.name === 'customer_payments') return { id: row.id, customer_id: row.customer_id, customerId: row.customer_id, customer_name: row.customer_name, customerName: row.customer_name, amount: row.amount, date: row.date, notes: row.notes, shift_id: row.shift_id, shiftId: row.shift_id, pay_method: row.pay_method, payMethod: row.pay_method };
            if (t.name === 'supplier_payments') return { id: row.id, supplier_id: row.supplier_id, supplierId: row.supplier_id, supplier_name: row.supplier_name, supplierName: row.supplier_name, amount: row.amount, date: row.date, notes: row.notes };
            if (t.name === 'held_carts') return { id: row.id, time: row.time, cart: row.cart_data, customer_id: row.customer_id, customerId: row.customer_id, customer_name: row.customer_name, customerName: row.customer_name, discount: row.discount, discount_type: row.discount_type, discountType: row.discount_type, notes: row.notes, shift_id: row.shift_id, shiftId: row.shift_id };
            return row;
          });
           // ✅ X43: إرجاع المنتجات المعلقة اللي لسه ما اترفعتش
          if (t.name === 'products' && _protectedProducts.length > 0) {
            const existingIds = new Set(state.products.map(p => p.id));
            _protectedProducts.forEach(pp => {
              if (!existingIds.has(pp.id)) {
                state.products.unshift(pp); // إرجاع المنتج المعلق عشان يفضل ظاهر
              }
            });
          }
        }
        
      
    } catch (err) {
      console.warn(`SyncDown failed for ${t.name}:`, err.message);
    }
  }

  // ═══════════════════════════════════════════════════════
  // F) العميل النقدي الافتراضي
  // ═══════════════════════════════════════════════════════
  if (!state.customers || state.customers.length === 0) {
    state.customers = [{ id: 'CASH-CUSTOMER', name: 'عميل نقدي عام', phone: '-', openingDebt: 0, opening_debt: 0, points: 0 }];
  } else if (!state.customers.find(c => c.name === 'عميل نقدي عام' || c.name === 'Cash Customer')) {
    state.customers.unshift({ id: 'CASH-CUSTOMER', name: 'عميل نقدي عام', phone: '-', openingDebt: 0, opening_debt: 0, points: 0 });
  }

  // ═══════════════════════════════════════════════════════
  // G) sale_items
  // ═══════════════════════════════════════════════════════
  try {
    if (loadedSaleIds.length === 0) {
      state.saleItems = [];
      state.sales.forEach(s => { s.items = []; });
    } else {
      const allItems = [];
      for (let i = 0; i < loadedSaleIds.length; i += SYNC_ITEMS_CHUNK) {
        const chunk = loadedSaleIds.slice(i, i + SYNC_ITEMS_CHUNK);
        try {
          const { data: items, error } = await supabaseClient
            .from('sale_items').select('*')
            .eq('user_id', ownerId)
            .in('sale_id', chunk);
          if (error) throw error;
          if (items) allItems.push(...items);
        } catch (chunkErr) {
          console.warn('Sale items chunk failed:', chunkErr.message);
        }
      }

      const flatItems = allItems.map(i => ({
        id: i.id, sale_id: i.sale_id, saleId: i.sale_id, user_id: i.user_id,
        product_id: i.product_id, productId: i.product_id,
        product_name: i.product_name, productName: i.product_name,
        qty: Number(i.qty), price: Number(i.price), cost: Number(i.cost)
      }));

      const itemsBySale = new Map();
      flatItems.forEach(i => {
        if (!itemsBySale.has(i.sale_id)) itemsBySale.set(i.sale_id, []);
        itemsBySale.get(i.sale_id).push({
          id: i.product_id, name: i.product_name, qty: i.qty, price: i.price, cost: i.cost
        });
      });
      state.sales.forEach(s => { s.items = itemsBySale.get(s.id) || []; });
      state.saleItems = flatItems;
    }
  } catch (err) {
    console.warn('Failed to load sale items:', err);
    if (!state.saleItems) state.saleItems = [];
  }

  // ═══════════════════════════════════════════════════════
  // H) أرصدة العملاء
  // ═══════════════════════════════════════════════════════
  try {
    const { data, error } = await supabaseClient.rpc('get_all_customer_balances', {
      p_user_id: ownerId
    });
    if (error) throw error;
    state.customerBalances = (data && typeof data === 'object' && !Array.isArray(data)) ? data : {};
  } catch (err) {
    console.warn('syncDown customer balances failed:', err.message);
    if (!state.customerBalances) state.customerBalances = {};
  }

  // ═══════════════════════════════════════════════════════
  // I) ✅ v7.9 — تحديث عدد تعارضات المخزون
  // ═══════════════════════════════════════════════════════
  if (navigator.onLine && supabaseClient) {
    try {
      const { data: conflicts } = await supabaseClient.rpc('get_flagged_sales', { p_user_id: ownerId });
      state._stockConflictCount = Array.isArray(conflicts) ? conflicts.length : 0;
    } catch (e) {}
 }
 // ✅ v7.23.3 — Emit sync completion event (root solution — decoupled)
try {
  if (typeof window !== 'undefined' && window.dispatchEvent) {
    window.dispatchEvent(new CustomEvent('matjari:syncDownComplete', { detail: { ownerId } }));
  }
} catch (e) {}
}
async function syncUp(ownerId) {
  if (!navigator.onLine || !supabaseClient) return;
  try {
    await supabaseClient.from('store_settings').upsert({
      user_id: ownerId, name: state.storeSettings.name, phone: state.storeSettings.phone,
      address: state.storeSettings.address, tax_number: state.storeSettings.taxNumber,
      currency: state.storeSettings.currency, logo: state.storeSettings.logo,
      monthly_goal: state.storeSettings.monthlyGoal, points_rate: state.storeSettings.pointsRate,
      point_value: state.storeSettings.pointValue, print_type: state.storeSettings.printType,
      permissions: state.storeSettings.permissions, vat_enabled: !!state.storeSettings.vatEnabled,
      vat_rate: Number(state.storeSettings.vatRate) || 0, vat_mode: state.storeSettings.vatMode || 'inclusive',
      auto_backup_enabled: !!state.storeSettings.autoBackupEnabled, auto_backup_interval: state.storeSettings.autoBackupInterval || 'daily',
      auto_backup_retention: Number(state.storeSettings.autoBackupRetention) || 7, updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });
  } catch (e) { console.warn('Settings sync failed', e); }

  try { await drainSyncQueue(); } catch (e) { console.warn('Queue drain failed', e); }

  for (const log of state.auditLogs) {
    if (log.uploaded) continue;
    if (log.userId && log.userId !== state.currentUser.id) continue;
    try {
      const { error } = await supabaseClient.from('audit_logs').insert({
        id: log.id, user_id: state.currentUser.id, owner_id: ownerId,
        role: 'manager', action: log.action, details: log.details, created_at: log.date || new Date().toISOString()
      });
      if (!error || error.code === '23505') log.uploaded = true; 
    } catch (e) { console.warn('Audit log upload failed', e); }
  }
}
let _saveDataTimer = null;

function saveData() {
  // Debounce: نحفظ بعد 1.5 ثانية من آخر تعديل
  clearTimeout(_saveDataTimer);
  _saveDataTimer = setTimeout(_actualSaveData, 1500);
}

function _actualSaveData() {
  _saveDataTimer = null;
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
      saleItems: state.saleItems,
      customerBalances: state.customerBalances || {},
      salesDataLimited: state.salesDataLimited || false,
      salesDataFromDate: state.salesDataFromDate || null,
      returnsDataLimited: state.returnsDataLimited || false,
      lastAutoBackupAt: state.storeSettings?.lastAutoBackupAt || null
    };
    localStorage.setItem(key, JSON.stringify(cache));
  } catch (e) {}
}

// ✅ حفظ فوري قبل إغلاق الصفحة (عشان مفيش داتا تضيع)
window.addEventListener('beforeunload', function() {
  if (_saveDataTimer) {
    clearTimeout(_saveDataTimer);
    _actualSaveData();
  }
});

async function syncEmployeeChanges() {
  if (!state.currentUser || state.role !== 'employee' || !state.ownerId) return;
  if (!navigator.onLine || !supabaseClient) return;
  try { await drainSyncQueue(); } catch (e) { console.warn('Queue drain failed', e); }
  for (const log of state.auditLogs) {
    if (log.uploaded) continue;
    try {
      const { error } = await supabaseClient.from('audit_logs').insert({
        id: log.id, user_id: state.currentUser.id, owner_id: state.ownerId, role: 'employee',
        action: log.action, details: log.details, created_at: log.date || new Date().toISOString()
      });
      if (!error || error.code === '23505') log.uploaded = true;
    } catch (e) { console.warn('Audit log upload failed', e); }
  }
}

async function syncNow() {
  if (!state.currentUser) return showNotification('سجّل الدخول أولاً', 'warning');
  if (!supabaseClient) return showNotification('لا يوجد اتصال بالسيرفر', 'error');
  if (!navigator.onLine) return showNotification('لا يوجد اتصال بالإنترنت', 'error');

  
  try {
    const ownerId = (state.role === 'employee' && state.ownerId) ? state.ownerId : state.currentUser.id;
    if (state.role === 'employee') await syncEmployeeChanges();
    else await syncUp(ownerId);
    await syncDown(ownerId);
    showNotification('تمت المزامنة بنجاح ✅');
  } catch (e) {
    console.error(e);
    showNotification('تعذرت المزامنة', 'error');
  } finally {
    
  }
}