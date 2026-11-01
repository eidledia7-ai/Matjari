/* ============================================================
   finance-core.js — Single Source of Truth للعمليات المالية
   v7.2 — إضافة: calcProductProfitReport (تقرير أرباح المنتجات)
   ============================================================ */

window.financeCore = (function () {
  'use strict';

  function ownerId() {
    return (state.role === 'employee' && state.ownerId) ? state.ownerId : state.currentUser?.id;
  }

  function toISO(date) {
    if (!date) return null;
    if (typeof date === 'string') return date;
    return date.toISOString();
  }

  function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function endOfDay(date) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  // ══════════════════════════════════════════════════════════════
  // VAT Core (v7.1) — Additive
  // ══════════════════════════════════════════════════════════════
  function calcVatInclusive(total, rate) {
    const t = Number(total) || 0;
    const r = Number(rate) || 0;
    if (r <= 0) return 0;
    return t - (t / (1 + r / 100));
  }

  function calcVatExclusive(base, rate) {
    const b = Number(base) || 0;
    const r = Number(rate) || 0;
    if (r <= 0) return 0;
    return b * (r / 100);
  }

  function calcVatForSale(base) {
    const b = Number(base) || 0;
    const s = state.storeSettings || {};
    const enabled = (s.vatEnabled ?? s.vat_enabled ?? false) === true;
    const rate = enabled ? (Number(s.vatRate ?? s.vat_rate) || 0) : 0;
    const mode = s.vatMode || s.vat_mode || 'inclusive';

    if (!enabled || rate <= 0) {
      return { total: b, vat_rate: 0, vat_amount: 0 };
    }
    if (mode === 'exclusive') {
      const vat = calcVatExclusive(b, rate);
      return { total: b + vat, vat_rate: rate, vat_amount: vat };
    }
    const vat = calcVatInclusive(b, rate);
    return { total: b, vat_rate: rate, vat_amount: vat };
  }

  function calcVatFromSnapshot(base, vatRate, vatMode) {
    const b = Number(base) || 0;
    const r = Number(vatRate) || 0;
    const mode = vatMode || 'inclusive';
    if (r <= 0) return { total: b, vat_amount: 0 };
    if (mode === 'exclusive') {
      const vat = calcVatExclusive(b, r);
      return { total: b + vat, vat_amount: vat };
    }
    const vat = calcVatInclusive(b, r);
    return { total: b, vat_amount: vat };
  }

  // ══════════════════════════════════════════════════════════════
  // RPCs
  // ══════════════════════════════════════════════════════════════
  async function getPeriodSummary(from, to) {
    if (!supabaseClient) throw new Error('No Supabase client');
    const { data, error } = await supabaseClient.rpc('get_period_summary', {
      p_user_id: ownerId(),
      p_from: toISO(from),
      p_to: toISO(to)
    });
    if (error) throw error;
    return data || {
      gross_sales: 0, net_sales: 0, returns_total: 0, cash_collected: 0,
      credit_remaining: 0, invoices_count: 0, expenses_total: 0,
      collections_total: 0, cogs: 0, net_profit: 0, vat_collected: 0
    };
  }

  async function getShiftExpectedCash(shiftId) {
    if (!shiftId) return 0;
    if (!supabaseClient) throw new Error('No Supabase client');
    const { data, error } = await supabaseClient.rpc('get_shift_expected_cash', { p_shift_id: shiftId });
    if (error) throw error;
    return Number(data) || 0;
  }

  async function getCustomerBalance(customerId) {
    if (!customerId) return 0;
    if (!supabaseClient) throw new Error('No Supabase client');
    const { data, error } = await supabaseClient.rpc('get_customer_balance', { p_customer_id: customerId });
    if (error) throw error;
    return Number(data) || 0;
  }

  async function getSupplierBalance(supplierId) {
    if (!supplierId) return 0;
    if (!supabaseClient) throw new Error('No Supabase client');
    const { data, error } = await supabaseClient.rpc('get_supplier_balance', { p_supplier_id: supplierId });
    if (error) throw error;
    return Number(data) || 0;
  }

  function _inRange(dateStr, from, to) {
    if (!dateStr) return false;
    const t = new Date(dateStr).getTime();
    if (!Number.isFinite(t)) return false;
    return t >= from.getTime() && t <= to.getTime();
  }

function calcPeriodSummary(from, to) {
  const parseLocal = (val, isEnd) => {
    if (!val) return isEnd ? new Date() : new Date(0);
    if (val instanceof Date) return isEnd ? endOfDay(val) : startOfDay(val);
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
      const [y, m, d] = val.split('-');
      const dt = new Date(y, m - 1, d);
      return isEnd ? endOfDay(dt) : startOfDay(dt);
    }
    const dt = new Date(val);
    return isEnd ? endOfDay(dt) : startOfDay(dt);
  };

  const f = parseLocal(from, false);
  const t = parseLocal(to, true);

  const sales = (state.sales || []).filter(s => _inRange(s.date, f, t));
  const returns = (state.returns || []).filter(r => _inRange(r.date, f, t));
  const expenses = (state.expenses || []).filter(e => _inRange(e.date, f, t));
  const collections = (state.customerPayments || []).filter(p => _inRange(p.date, f, t));

  const gross = sales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  const returnsTotal = sales.reduce((sum, s) => sum + (Number(s.returned_total) || 0), 0);
  const net = sales.reduce((sum, s) => {
    const n = Number(s.net_total);
    if (Number.isFinite(n)) return sum + n;
    return sum + ((Number(s.total) || 0) - (Number(s.returned_total) || 0));
  }, 0);
  const cashCollected = sales.reduce((sum, s) => sum + (Number(s.paid) || 0), 0);
  const creditRemaining = sales.reduce((sum, s) => sum + (Number(s.remaining) || 0), 0);
  const expensesTotal = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const collectionsTotal = collections.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const vatCollected = sales.reduce((sum, s) => sum + (Number(s.vat_amount) || 0), 0);

  const saleIds = new Set(sales.map(s => s.id));
  const cogs = (state.saleItems || [])
    .filter(si => saleIds.has(si.sale_id))
    .reduce((sum, si) => sum + ((Number(si.cost) || 0) * (Number(si.qty) || 0)), 0);

  return {
    gross_sales: gross,
    net_sales: net,
    returns_total: returnsTotal,
    cash_collected: cashCollected,
    credit_remaining: creditRemaining,
    invoices_count: sales.length,
    expenses_total: expensesTotal,
    collections_total: collectionsTotal,
    cogs: cogs,
    net_profit: net - cogs - expensesTotal,
    vat_collected: vatCollected
  };
}

  function calcCustomerBalance(customerId) {
    const cust = (state.customers || []).find(c => c.id === customerId);
    const opening = Number(cust?.opening_debt) || 0;
    const salesDebt = (state.sales || [])
      .filter(s => s.customer_id === customerId || s.customerId === customerId)
      .reduce((sum, s) => sum + (Number(s.remaining) || 0), 0);
    const payments = (state.customerPayments || [])
      .filter(p => p.customer_id === customerId || p.customerId === customerId)
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const returnsCredit = (state.returns || [])
      .filter(r => (r.customer_id === customerId || r.customerId === customerId) && r.refund_method === 'credit')
      .reduce((sum, r) => sum + (Number(r.total) || 0), 0);
    return opening + salesDebt - payments - returnsCredit;
  }

  function calcSupplierBalance(supplierId) {
    const sup = (state.suppliers || []).find(s => s.id === supplierId);
    const opening = Number(sup?.opening_debt) || 0;
    const purchasesDebt = (state.purchases || [])
      .filter(p => p.supplier_id === supplierId || p.supplierId === supplierId)
      .reduce((sum, p) => sum + (Number(p.remaining) || 0), 0);
    const payments = (state.supplierPayments || [])
      .filter(p => p.supplier_id === supplierId || p.supplierId === supplierId)
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    return opening + purchasesDebt - payments;
  }

  function calcShiftExpectedCash(shiftId) {
    const shift = (state.shifts || []).find(s => s.id === shiftId);
    const opening = Number(shift?.opening_cash ?? shift?.openingCash) || 0;
    const cashSales = (state.sales || [])
      .filter(s => (s.shift_id === shiftId || s.shiftId === shiftId) && s.pay_method === 'cash')
      .reduce((sum, s) => sum + (Number(s.paid) || 0), 0);
    const cashCollections = (state.customerPayments || [])
      .filter(p => (p.shift_id === shiftId || p.shiftId === shiftId) && p.pay_method === 'cash')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const cashReturns = (state.returns || [])
      .filter(r => (r.shift_id === shiftId || r.shiftId === shiftId) && r.refund_method === 'cash')
      .reduce((sum, r) => sum + (Number(r.total) || 0), 0);
    const cashExpenses = (state.expenses || [])
      .filter(e => (e.shift_id === shiftId || e.shiftId === shiftId) && e.pay_method === 'cash')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    return opening + cashSales + cashCollections - cashReturns - cashExpenses;
  }

  // ══════════════════════════════════════════════════════════════
  // v7.2 — تقرير أرباح المنتجات (Additive)
  // الإيراد ex-VAT موزّع pro-rata على أصناف الفاتورة.
  // المرتجعات تُنسب لفترة الفاتورة الأصلية (Option A).
  // تكلفة المرتجع تُقرأ من Snapshot sale_items.cost وقت البيع.
  // ══════════════════════════════════════════════════════════════
  function calcProductProfitReport(from, to) {
    const parseLocal = (val, isEnd) => {
      if (!val) return isEnd ? new Date() : new Date(0);
      if (val instanceof Date) return isEnd ? endOfDay(val) : startOfDay(val);
      if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
        const [y, m, d] = val.split('-');
        const dt = new Date(y, m - 1, d);
        return isEnd ? endOfDay(dt) : startOfDay(dt);
      }
      const dt = new Date(val);
      return isEnd ? endOfDay(dt) : startOfDay(dt);
    };

    const f = parseLocal(from, false);
    const t = parseLocal(to, true);

    const periodSales = (state.sales || []).filter(s => _inRange(s.date, f, t));
    const salesById = new Map(periodSales.map(s => [s.id, s]));
    const periodSaleIds = new Set(periodSales.map(s => s.id));

    // group sale_items by sale_id (only for period sales)
    const itemsBySale = new Map();
    (state.saleItems || []).forEach(si => {
      if (!periodSaleIds.has(si.sale_id)) return;
      if (!itemsBySale.has(si.sale_id)) itemsBySale.set(si.sale_id, []);
      itemsBySale.get(si.sale_id).push(si);
    });

    // cost snapshot lookup (sale_id|product_id → cost)
    const costLookup = new Map();
    (state.saleItems || []).forEach(si => {
      if (!periodSaleIds.has(si.sale_id)) return;
      costLookup.set(si.sale_id + '|' + si.product_id, Number(si.cost) || 0);
    });

    // per-product accumulator
    const productMap = new Map();
    function ensureProduct(pid, name) {
      if (!productMap.has(pid)) {
        productMap.set(pid, {
          product_id: pid,
          product_name: name || '-',
          sold_qty: 0,
          returned_qty: 0,
          net_qty: 0,
          sold_revenue_ex_vat: 0,
          returned_revenue_ex_vat: 0,
          net_revenue_ex_vat: 0,
          sold_cost: 0,
          returned_cost: 0,
          net_cogs: 0,
          gross_profit: 0,
          margin_pct: 0
        });
      }
      return productMap.get(pid);
    }

    // 1) sales → pro-rata revenue ex-VAT + cost snapshot
    itemsBySale.forEach((items, saleId) => {
      const sale = salesById.get(saleId);
      if (!sale) return;

      const itemsSubtotal = items.reduce((sum, i) => sum + ((Number(i.price) || 0) * (Number(i.qty) || 0)), 0);
      if (itemsSubtotal <= 0) return;

      const vatAmount = Number(sale.vat_amount ?? sale.vatAmount ?? 0) || 0;
      const revenueExVat = (Number(sale.total) || 0) - vatAmount;

      items.forEach(item => {
        const lineTotal = (Number(item.price) || 0) * (Number(item.qty) || 0);
        const share = lineTotal / itemsSubtotal;
        const itemRevenue = share * revenueExVat;
        const itemCost = (Number(item.cost) || 0) * (Number(item.qty) || 0);

        const p = ensureProduct(item.product_id, item.product_name);
        p.sold_qty += Number(item.qty) || 0;
        p.sold_revenue_ex_vat += itemRevenue;
        p.sold_cost += itemCost;
      });
    });

    // 2) returns → only for sales in period (Option A)
    (state.returns || []).forEach(r => {
      const saleId = r.sale_id || r.saleId;
      if (!periodSaleIds.has(saleId)) return;

      const productId = r.product_id || r.productId;
      const qty = Number(r.qty) || 0;
      const vatAmount = Number(r.vat_amount ?? r.vatAmount ?? 0) || 0;
      const revenueReturn = (Number(r.total) || 0) - vatAmount;

      const costAtSale = costLookup.get(saleId + '|' + productId);
      const costReturn = (costAtSale !== undefined ? costAtSale : 0) * qty;

      const p = ensureProduct(productId, r.product_name || r.productName);
      p.returned_qty += qty;
      p.returned_revenue_ex_vat += revenueReturn;
      p.returned_cost += costReturn;
    });

    // 3) finalize + sort by profit desc
    const result = [];
    productMap.forEach(p => {
      p.net_qty = p.sold_qty - p.returned_qty;
      p.net_revenue_ex_vat = p.sold_revenue_ex_vat - p.returned_revenue_ex_vat;
      p.net_cogs = p.sold_cost - p.returned_cost;
      p.gross_profit = p.net_revenue_ex_vat - p.net_cogs;
      p.margin_pct = p.net_revenue_ex_vat > 0 ? (p.gross_profit / p.net_revenue_ex_vat) * 100 : 0;
      result.push(p);
    });
    result.sort((a, b) => b.gross_profit - a.gross_profit);

    return result;
  }

  function getPeriod(type) {
    const now = new Date();
    switch (type) {
      case 'today': return { from: startOfDay(now), to: endOfDay(now) };
      case 'week': { const from = startOfDay(new Date(now.getTime() - 6 * 86400000)); return { from, to: endOfDay(now) }; }
      case 'month': { const from = startOfDay(new Date(now.getTime() - 29 * 86400000)); return { from, to: endOfDay(now) }; }
      case 'currentMonth': { const from = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)); return { from, to: endOfDay(now) }; }
      case 'year': { const from = startOfDay(new Date(now.getFullYear(), 0, 1)); return { from, to: endOfDay(now) }; }
      case 'all':
      default: return { from: new Date(0), to: endOfDay(now) };
    }
  }

  return {
    getPeriodSummary,
    getShiftExpectedCash,
    getCustomerBalance,
    getSupplierBalance,
    calcPeriodSummary,
    calcProductProfitReport,   // ✅ v7.2
    calcCustomerBalance,
    calcSupplierBalance,
    calcShiftExpectedCash,
    getPeriod,
    startOfDay,
    endOfDay,
    ownerId,
    // VAT API
    calcVatInclusive,
    calcVatExclusive,
    calcVatForSale,
    calcVatFromSnapshot
  };
})();