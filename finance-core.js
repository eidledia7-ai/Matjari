/* ============================================================
   finance-core.js — Single Source of Truth للعمليات المالية
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
      collections_total: 0, cogs: 0, net_profit: 0
    };
  }

  async function getShiftExpectedCash(shiftId) {
    if (!shiftId) return 0;
    if (!supabaseClient) throw new Error('No Supabase client');
    const { data, error } = await supabaseClient.rpc('get_shift_expected_cash', {
      p_shift_id: shiftId
    });
    if (error) throw error;
    return Number(data) || 0;
  }

  async function getCustomerBalance(customerId) {
    if (!customerId) return 0;
    if (!supabaseClient) throw new Error('No Supabase client');
    const { data, error } = await supabaseClient.rpc('get_customer_balance', {
      p_customer_id: customerId
    });
    if (error) throw error;
    return Number(data) || 0;
  }

  async function getSupplierBalance(supplierId) {
    if (!supplierId) return 0;
    if (!supabaseClient) throw new Error('No Supabase client');
    const { data, error } = await supabaseClient.rpc('get_supplier_balance', {
      p_supplier_id: supplierId
    });
    if (error) throw error;
    return Number(data) || 0;
  }

  // ✅ _inRange محسّن للتعامل مع null/invalid dates
  function _inRange(dateStr, from, to) {
    if (!dateStr) return false;
    const t = new Date(dateStr).getTime();
    if (!Number.isFinite(t)) return false;
    return t >= from.getTime() && t <= to.getTime();
  }

  function calcPeriodSummary(from, to) {
  // ✅ [إصلاح] ضمان أن البداية أول اليوم والنهاية آخر اليوم حتى لو جاءت كـ نص
  const f = (from instanceof Date) ? startOfDay(from) : startOfDay(new Date(from));
  const t = (to instanceof Date) ? endOfDay(to) : endOfDay(new Date(to));
  
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
    net_profit: net - cogs - expensesTotal
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

  function getPeriod(type) {
    const now = new Date();
    switch (type) {
      case 'today': {
        return { from: startOfDay(now), to: endOfDay(now) };
      }
      case 'week': {
        const from = startOfDay(new Date(now.getTime() - 6 * 86400000));
        return { from, to: endOfDay(now) };
      }
      case 'month': {
        const from = startOfDay(new Date(now.getTime() - 29 * 86400000));
        return { from, to: endOfDay(now) };
      }
      case 'currentMonth': {
        const from = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
        return { from, to: endOfDay(now) };
      }
      case 'year': {
        const from = startOfDay(new Date(now.getFullYear(), 0, 1));
        return { from, to: endOfDay(now) };
      }
      case 'all':
      default:
        return { from: new Date(0), to: endOfDay(now) };
    }
  }

  return {
    getPeriodSummary,
    getShiftExpectedCash,
    getCustomerBalance,
    getSupplierBalance,
    calcPeriodSummary,
    calcCustomerBalance,
    calcSupplierBalance,
    calcShiftExpectedCash,
    getPeriod,
    startOfDay,
    endOfDay,
    ownerId
  };
})();