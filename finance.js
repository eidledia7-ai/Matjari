/* ============ المصروفات ============ */
async function saveExpense() {
  if (window.isReadOnlyMode) return showNotification(tr('renew_sub_expense'), 'error');
  if (state.role !== 'manager') return showNotification(tr('manager_only'), 'warning');

  const name = document.getElementById('expenseName').value.trim();
  const amount = parseFloat(document.getElementById('expenseAmount').value);
  const date = document.getElementById('expenseDate').value || today();
  const notes = document.getElementById('expenseNotes').value.trim();

  if (!name || isNaN(amount) || amount <= 0) return showNotification(tr('invalid_expense'), 'error');

  const ownerId = (state.role === 'employee' && state.ownerId) ? state.ownerId : state.currentUser.id;

  let currentShiftId = null;
  if (state.currentShift) {
    currentShiftId = state.currentShift.id;
  } else {
    const openShift = (state.shifts || []).find(s => !s.end_time && !s.endTime);
    if (openShift) currentShiftId = openShift.id;
  }

  const newExpense = {
    id: uid('EXP'), user_id: ownerId, name: name, amount: amount, date: date, notes: notes,
    shift_id: currentShiftId, pay_method: 'cash'
  };

  enqueueSyncOperation('insert_expense', {
  id: newExpense.id, name: newExpense.name, amount: newExpense.amount,
  notes: newExpense.notes, date: newExpense.date,
  shift_id: newExpense.shift_id, pay_method: newExpense.pay_method,
  needs_review: false, created_by: null
}, newExpense.id);

  state.expenses.unshift({
    id: newExpense.id, name: name, amount: amount, date: date, notes: notes,
    shift_id: currentShiftId, shiftId: currentShiftId, pay_method: 'cash', payMethod: 'cash'
  });

  if (typeof addAuditLog === 'function') {
    addAuditLog('add_expense', { id: newExpense.id, name, amount }, newExpense.id);
  }

  saveData();
document.getElementById('expenseName').value = '';
document.getElementById('expenseAmount').value = '';
document.getElementById('expenseNotes').value = '';
refreshCurrentPage();
showNotification(tr('expense_saved'));
  switchExpenseTab('exp-list');
}

function renderExpenses() {
  const container = document.getElementById('expensesTable');
  if (!container) return;
  if (state.expenses.length === 0) {
    container.innerHTML = '<p class="text-muted text-center" style="padding:20px;">' + tr('no_expenses') + '</p>';
    return;
  }
  
  const delErrBtn = tr('delete_err_btn');
  const en = currentLang === 'en';
  
  let html = '<div class="table-wrap"><table class="data-table"><thead><tr>' +
    '<th>' + tr('th_date') + '</th>' +
'<th>' + tr('th_item_name') + '</th>' +
'<th>' + tr('th_amount') + '</th>' +
'<th>' + tr('th_action') + '</th>' +
    '</tr></thead><tbody>';
    
  state.expenses.forEach(function(e) {
    const dateObj = new Date(e.date);
    
    // تنسيق التاريخ والوقت مع بعض في سطر واحد
    const options = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    const dateStr = dateObj.toLocaleString(en ? 'en-US' : 'ar-EG', options);
    
    // دمج الملاحظات تحت اسم البند عشان نوفر مساحة
    const notesHtml = e.notes ? `<br><span style="color:#888; font-size:11px;">${escapeHTML(e.notes)}</span>` : '';
    
    html += '<tr>' +
      '<td style="white-space:nowrap; font-size:12px; color:#555;">' + dateStr + '</td>' +
      '<td><b style="font-size:13px;">' + escapeHTML(e.name) + '</b>' + notesHtml + '</td>' +
      '<td><b style="color:#c0392b; direction:ltr; font-size:13px;">' + Number(e.amount || 0).toFixed(2) + '</b></td>' +
      '<td><button class="small-btn red" style="padding:4px 8px;" onclick="safeDeleteRecord(\'expense\', \'' + e.id + '\')">' + delErrBtn + '</button></td>' +
      '</tr>';
  });
  
  html += '</tbody></table></div>';
  container.innerHTML = html;
}

function filterByPeriod(items, dateField, from, to) {
  if (!Array.isArray(items)) return [];
  const fields = Array.isArray(dateField) ? dateField : [dateField];
  return items.filter(function(item) {
    if (!item) return false;
    let raw = null;
    for (let i = 0; i < fields.length; i++) {
      const v = item[fields[i]];
      if (v !== undefined && v !== null && v !== '') { raw = v; break; }
    }
    if (raw === null) return false;
    const d = String(raw).split('T')[0];
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  });
}
async function renderReports() {
  const from = (document.getElementById('reportFrom') || {}).value || '';
  const to = (document.getElementById('reportTo') || {}).value || '';
  const fmt = (num) => Number(num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const currency = state.storeSettings.currency;

  // ─── 1. Skeleton فوري (إحساس إن التطبيق شغال) ───
  const cardsContainer = document.getElementById('reportCards');
  if (cardsContainer) {
    const skelCard = '<div class="stat-card"><h3><span class="skeleton-line" style="width:70%"></span></h3><p><span class="skeleton-line" style="width:90%;height:28px"></span></p></div>';
    cardsContainer.innerHTML = skelCard.repeat(6);
  }
  const dailyEl = document.getElementById('dailyReport');
  if (dailyEl) {
    dailyEl.innerHTML = '<p><span class="skeleton-line" style="width:100%"></span></p>'.repeat(6);
  }

  // ─── 2. جرب RPC (السيرفر) ───
  let summary = null;
  let fromRPC = false;
  if (navigator.onLine && supabaseClient) {
    try {
      summary = await financeCore.getPeriodSummary(from || '2000-01-01', to || today());
      fromRPC = true;
    } catch (e) {
      console.warn('RPC getPeriodSummary failed, using local fallback:', e);
    }
  }

  // ─── 3. Fallback محلي (زي القديم بالظبط) ───
  if (!summary) {
    const startDate = from ? financeCore.startOfDay(new Date(from)) : new Date(0);
    const endDate = to ? financeCore.endOfDay(new Date(to)) : new Date();
    summary = financeCore.calcPeriodSummary(startDate, endDate);
  }

  // ─── 4. شارة "بيانات مقطوعة" (لو رجعنا للمحلي والبيانات محدودة) ───
  const limitBadge = (!fromRPC && state.salesDataLimited)
    ? '<span class="data-limited-badge" title="' + tr('data_limited_hint') + '">' + tr('data_limited_warning') + '</span>'
    : '';

  // ─── 5. كروت الملخص (زي القديم + الشارة) ───
  const filteredSales = filterByPeriod(state.sales, 'date', from, to);
  const filteredReturns = filterByPeriod(state.returns, 'date', from, to);

  const totalDiscount = filteredSales.reduce(function(sum, s) { return sum + Number(s.discount || 0); }, 0);
  const avgInvoice = summary.invoices_count > 0 ? summary.gross_sales / summary.invoices_count : 0;

  if (cardsContainer) {
    cardsContainer.innerHTML =
      '<div class="stat-card"><h3>' + tr('dash_total_sales') + limitBadge + '</h3><p>' + fmt(summary.gross_sales) + ' ' + currency + '</p></div>' +
      '<div class="stat-card"><h3>' + tr('th_invoice_count') + '</h3><p>' + summary.invoices_count + '</p></div>' +
      '<div class="stat-card"><h3>' + tr('avg_invoice') + '</h3><p>' + fmt(avgInvoice) + ' ' + currency + '</p></div>' +
      '<div class="stat-card"><h3>' + tr('total_cost') + '</h3><p>' + fmt(summary.cogs) + ' ' + currency + '</p></div>' +
      '<div class="stat-card"><h3>' + tr('dash_expenses') + '</h3><p>' + fmt(summary.expenses_total) + ' ' + currency + '</p></div>' +
      '<div class="stat-card" style="background:linear-gradient(135deg,#c8e5d2,#a9d5bb);border-color:#8ab99f">' +
      '<h3>' + tr('dash_net_profit') + '</h3>' +
      '<p style="color:' + (summary.net_profit >= 0 ? '#17643a' : '#c0392b') + '">' + fmt(summary.net_profit) + ' ' + currency + '</p>' +
      '</div>';
  }

  // ─── 6. ملخص الأداء اليومي ───
  if (dailyEl) {
    dailyEl.innerHTML =
      '<p>' + tr('invoices_count_label') + ': <b>' + summary.invoices_count + '</b></p>' +
      '<p>' + tr('total_discounts') + ': <b>' + fmt(totalDiscount) + ' ' + currency + '</b></p>' +
      '<p>' + tr('net_sales_after_returns') + ' <b>' + fmt(summary.net_sales) + ' ' + currency + '</b></p>' +
      '<p>' + tr('total_returns') + ' <b>' + fmt(summary.returns_total) + ' ' + currency + '</b></p>' +
      '<p>' + tr('returns_count') + ' <b>' + filteredReturns.length + '</b></p>' +
      '<p>' + tr('expenses_count') + ' <b>' + (state.expenses.filter(e => { const d = (e.date||'').split('T')[0]; return (!from || d >= from) && (!to || d <= to); })).length + '</b></p>' +
      '<p>' + tr('collections_label') + ' <b>' + fmt(summary.collections_total) + ' ' + currency + '</b></p>';
  }

  // ─── 7. تفاصيل طرق الدفع + أفضل العملاء (زي القديم) ───
  const cashSales = filteredSales.filter(s => (s.payMethod || s.pay_method) === 'cash').reduce((sum, s) => sum + Number(s.paid || 0), 0);
  const cardSales = filteredSales.filter(s => (s.payMethod || s.pay_method) === 'visa' || (s.payMethod || s.pay_method) === 'card').reduce((sum, s) => sum + Number(s.paid || 0), 0);
  const transferSales = filteredSales.filter(s => (s.payMethod || s.pay_method) === 'transfer').reduce((sum, s) => sum + Number(s.paid || 0), 0);

  let debtSales;
  let debtIsFallback = false;
  if (state.customerBalances && Object.keys(state.customerBalances).length > 0) {
    debtSales = Object.values(state.customerBalances).reduce((s, b) => s + Math.max(0, Number(b) || 0), 0);
  } else {
    debtSales = summary.credit_remaining;
    debtIsFallback = true;
  }

  const customerTotals = {};
  filteredSales.forEach(s => {
    const custId = s.customer_id || s.customerId;
    if (custId) {
      const custName = state.customers.find(c => c.id === custId)?.name || tr('cash_label');
      if (custName !== 'عميل نقدي عام' && custName !== 'Cash Customer') {
        customerTotals[custName] = (customerTotals[custName] || 0) + Number(s.total || 0);
      }
    }
  });
  const topCustomers = Object.entries(customerTotals).sort((a, b) => b[1] - a[1]).slice(0, 5);

  let detailsHtml = `
    <div class="grid-2 mt-20">
      <div class="card">
        <h3>${tr('payment_methods_details')}</h3>
        <table class="data-table">
          <tbody>
            <tr><td>${tr('cash_sales_label')}</td><td><b>${fmt(cashSales)}</b></td></tr>
            <tr><td>${tr('visa_sales_label')}</td><td><b>${fmt(cardSales)}</b></td></tr>
            <tr><td>${tr('bank_transfers_label')}</td><td><b>${fmt(transferSales)}</b></td></tr>
          </tbody>
        </table>
      </div>
      <div class="card">
        <h3>${tr('top_customers')}</h3>
        ${topCustomers.length > 0 ? `
        <table class="data-table">
          <tbody>
            ${topCustomers.map((c, idx) => `
              <tr>
                <td>${idx + 1}. ${escapeHTML(c[0])}</td>
                <td><b>${fmt(c[1])}</b> ${currency}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ` : '<p class="text-muted text-center" style="padding: 20px;">' + tr('no_cust_sales') + '</p>'}
      </div>
    </div>
    <div class="card mt-20" style="background:#fff8e1;border-left:4px solid #b8860b;">
      <h3 style="margin:0 0 8px 0;color:#7a5c00;">${tr('current_customer_debts_title')}</h3>
      <p style="margin:0 0 12px 0;font-size:12px;color:#7a5c00;line-height:1.6;">${tr('current_customer_debts_note')}</p>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-top:1px solid #e8d79a;">
        <span style="font-weight:700;color:#17364c;">${tr('current_total_debts')}</span>
        <span style="font-weight:900;font-size:20px;color:#c0392b;direction:ltr;">${fmt(debtSales)} ${currency}</span>
      </div>
      ${debtIsFallback ? `<p style="margin:8px 0 0 0;font-size:11px;color:#b8860b;">⚠️ ${tr('current_debts_fallback_note')}</p>` : ''}
    </div>
  `;

  let activityContainer = document.getElementById('activityDetailsReport');
  if (activityContainer) activityContainer.innerHTML = detailsHtml;

  // ─── 8. الأكثر مبيعاً (زي القديم) ───
  const topContainer = document.getElementById('topProductsReportFinance');
  if (topContainer) {
    const salesByProduct = {};
    filteredSales.forEach(function(s) {
      if (!s.items || !Array.isArray(s.items)) return;
      s.items.forEach(function(i) {
        if (!salesByProduct[i.name]) salesByProduct[i.name] = { name: i.name, qty: 0, total: 0 };
        salesByProduct[i.name].qty += Number(i.qty || 0);
        salesByProduct[i.name].total += Number(i.price || 0) * Number(i.qty || 0);
      });
    });
    const top = Object.values(salesByProduct).sort(function(a, b) { return b.qty - a.qty; }).slice(0, 10);
    if (top.length === 0) {
      topContainer.innerHTML = '<p class="text-muted text-center" style="padding: 20px;">' + tr('no_period_sales') + '</p>';
    } else {
      let html = '<div class="table-wrap"><table class="data-table"><thead><tr><th>#</th><th>' + tr('th_product') + '</th><th>' + tr('th_quantity') + '</th><th>' + tr('th_value') + '</th></tr></thead><tbody>';
      top.forEach(function(t, i) {
        html += '<tr><td>' + (i + 1) + '</td><td>' + escapeHTML(t.name) + '</td><td><b>' + t.qty + '</b></td><td>' + fmt(t.total) + '</td></tr>';
      });
      html += '</tbody></table></div>';
      topContainer.innerHTML = html;
    }
  }

  // ─── 9. تقرير أرباح المنتجات (زي القديم + شارة) ───
  const profitContainer = document.getElementById('productProfitReport');
  if (profitContainer && typeof financeCore.calcProductProfitReport === 'function') {
    try {
      const startDate = from ? financeCore.startOfDay(new Date(from)) : new Date(0);
      const endDate = to ? financeCore.endOfDay(new Date(to)) : new Date();
      const allRows = financeCore.calcProductProfitReport(startDate, endDate);
      const showAllEl = document.getElementById('productProfitShowAll');
      const showAll = showAllEl ? showAllEl.checked : false;
      const rows = showAll ? allRows : allRows.filter(p => (Number(p.sold_qty) > 0) || (Number(p.returned_qty) > 0));

      if (rows.length === 0) {
        profitContainer.innerHTML = '<p class="text-muted text-center" style="padding: 20px;">' + tr('no_period_sales') + '</p>';
      } else {
        const sumRevenue = rows.reduce((s, p) => s + (Number(p.net_revenue_ex_vat) || 0), 0);
        const sumCost = rows.reduce((s, p) => s + (Number(p.net_cogs) || 0), 0);
        const sumProfit = rows.reduce((s, p) => s + (Number(p.gross_profit) || 0), 0);
        const avgMargin = sumRevenue > 0 ? (sumProfit / sumRevenue) * 100 : 0;

        let bannerHtml = '';
        if (state.salesDataLimited) {
          bannerHtml = '<div style="background:#fff8e1;border-left:4px solid #b8860b;padding:10px 14px;border-radius:6px;margin-bottom:12px;font-size:12px;color:#7a5c00;line-height:1.6;">⚠️ ' + tr('profit_data_limited_note') + '</div>';
        }

        const summaryCardsHtml =
          '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin-bottom:15px;">' +
            '<div class="stat-card" style="padding:12px;"><h3 style="font-size:12px;">' + tr('profit_total_revenue') + '</h3><p style="font-size:15px;">' + fmt(sumRevenue) + ' ' + currency + '</p></div>' +
            '<div class="stat-card" style="padding:12px;"><h3 style="font-size:12px;">' + tr('profit_total_cost') + '</h3><p style="font-size:15px;">' + fmt(sumCost) + ' ' + currency + '</p></div>' +
            '<div class="stat-card" style="padding:12px;"><h3 style="font-size:12px;">' + tr('profit_total_profit') + '</h3><p style="font-size:15px;color:' + (sumProfit >= 0 ? '#17643a' : '#c0392b') + '">' + fmt(sumProfit) + ' ' + currency + '</p></div>' +
            '<div class="stat-card" style="padding:12px;"><h3 style="font-size:12px;">' + tr('profit_avg_margin') + '</h3><p style="font-size:15px;">' + avgMargin.toFixed(1) + '%</p></div>' +
          '</div>';

        let html = bannerHtml + summaryCardsHtml +
          '<div class="table-wrap"><table class="data-table"><thead><tr>' +
            '<th>' + tr('th_product') + '</th>' +
            '<th>' + tr('profit_sold_qty') + '</th>' +
            '<th>' + tr('profit_returned_qty') + '</th>' +
            '<th>' + tr('profit_net_qty') + '</th>' +
            '<th>' + tr('profit_net_revenue') + '</th>' +
            '<th>' + tr('profit_net_cogs') + '</th>' +
            '<th>' + tr('profit_net_profit') + '</th>' +
            '<th>' + tr('profit_margin_pct') + '</th>' +
          '</tr></thead><tbody>';

        rows.forEach(p => {
          const profit = Number(p.gross_profit) || 0;
          const margin = Number(p.margin_pct) || 0;
          const profitClass = profit < 0 ? 'red-text' : '';
          const marginColor = margin < 10 ? '#c0392b' : (margin >= 30 ? '#17643a' : '#b8860b');
          const rowBg = profit < 0 ? ' style="background:#fef2f2"' : '';
          html += '<tr' + rowBg + '>' +
            '<td>' + escapeHTML(p.product_name || '-') + '</td>' +
            '<td>' + (Number(p.sold_qty) || 0) + '</td>' +
            '<td>' + (Number(p.returned_qty) || 0) + '</td>' +
            '<td><b>' + (Number(p.net_qty) || 0) + '</b></td>' +
            '<td>' + fmt(p.net_revenue_ex_vat) + '</td>' +
            '<td>' + fmt(p.net_cogs) + '</td>' +
            '<td class="' + profitClass + '"><b>' + fmt(profit) + '</b></td>' +
            '<td style="color:' + marginColor + ';font-weight:bold;">' + margin.toFixed(1) + '%</td>' +
          '</tr>';
        });
        html += '</tbody></table></div>';
        html += '<p style="margin-top:12px;padding:10px;background:#f1f6f8;border-left:3px solid #176b70;border-radius:6px;font-size:12px;line-height:1.7;color:#4a5f70;">' +
          '<b>' + tr('profit_report_note_title') + ':</b> ' + tr('profit_report_note_body') +
        '</p>';
        profitContainer.innerHTML = html;
      }
    } catch (e) {
      console.warn('Product profit report failed:', e);
      profitContainer.innerHTML = '<p class="text-muted text-center" style="padding: 20px;">' + tr('no_data') + '</p>';
    }
  }
}
function setReportPeriod(period) {
  const end = today();
  const d = new Date(end + 'T12:00:00');
  let from = end;
  if (period === 'today') from = end;
  if (period === 'week') { d.setDate(d.getDate() - 6); from = d.toISOString().slice(0, 10); }
  if (period === 'month') { d.setDate(d.getDate() - 29); from = d.toISOString().slice(0, 10); }
  if (period === 'currentMonth') { const now = new Date(); from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10); }
  if (period === 'year') { const now = new Date(); from = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10); }
  document.getElementById('reportFrom').value = from;
  document.getElementById('reportTo').value = end;
  renderReports();
}

function clearReportPeriod() {
  document.getElementById('reportFrom').value = '';
  document.getElementById('reportTo').value = '';
  renderReports();
}

/* ============ الوردية ============ */
async function calcExpectedShiftCash() {
  const shift = state.currentShift;
  if (!shift) {
    const openShift = (state.shifts || []).find(s => !s.end_time && !s.endTime);
    if (!openShift) {
      const el = document.getElementById('shiftExpectedCash');
      if (el) el.value = '0.00 ' + state.storeSettings.currency;
      const bd = document.getElementById('shiftCashBreakdown');
      if (bd) { bd.style.display = 'none'; bd.innerHTML = ''; }
      calculateShiftDiff();
      return;
    }
    state.currentShift = openShift;
  }

  const currentShift = state.currentShift;
  let expectedCash = null;
  if (navigator.onLine && supabaseClient) {
    try { expectedCash = await financeCore.getShiftExpectedCash(currentShift.id); }
    catch (e) { console.warn('RPC getShiftExpectedCash failed, using local fallback:', e); }
  }
  if (expectedCash === null) expectedCash = financeCore.calcShiftExpectedCash(currentShift.id);

  const nameInput = document.getElementById('shiftCashierName');
if (nameInput && !nameInput.value && state.currentUser && state.currentUser.email) {
  nameInput.value = state.currentUser.email.split('@')[0];
}

const el = document.getElementById('shiftExpectedCash');
if (el) el.value = expectedCash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + state.storeSettings.currency;

  calculateShiftDiff();
  try { renderShiftCashBreakdown(currentShift.id, expectedCash); }
  catch (e) { console.warn('Shift breakdown render failed:', e); }
}

function renderShiftCashBreakdown(shiftId, expectedTotalFromCore) {
  const container = document.getElementById('shiftCashBreakdown');
  if (!container) return;
  if (!shiftId) { container.style.display = 'none'; container.innerHTML = ''; return; }

  const cur = currencyLabel();
  const shift = (state.shifts || []).find(s => s.id === shiftId);
  const openingCash = Number(shift?.opening_cash ?? shift?.openingCash) || 0;

  const shiftCashSales = (state.sales || []).filter(s =>
    (s.shift_id === shiftId || s.shiftId === shiftId) &&
    (s.pay_method === 'cash' || s.payMethod === 'cash') &&
    (Number(s.paid) || 0) > 0
  );
  const cashSales = shiftCashSales.reduce((sum, s) => sum + (Number(s.paid) || 0), 0);
  const cashVat = shiftCashSales.reduce((sum, s) => sum + (Number(s.vat_amount ?? s.vatAmount ?? 0) || 0), 0);
  const cashInvoicesCount = shiftCashSales.length;

  const cashCollections = (state.customerPayments || [])
    .filter(p => (p.shift_id === shiftId || p.shiftId === shiftId) && (p.pay_method === 'cash' || p.payMethod === 'cash'))
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const cashReturns = (state.returns || [])
    .filter(r => (r.shift_id === shiftId || r.shiftId === shiftId) && (r.refund_method === 'cash' || r.refundMethod === 'cash'))
    .reduce((sum, r) => sum + (Number(r.total) || 0), 0);

  const cashExpenses = (state.expenses || [])
    .filter(e => (e.shift_id === shiftId || e.shiftId === shiftId) && (e.pay_method === 'cash' || e.payMethod === 'cash'))
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const manualExpected = openingCash + cashSales + cashCollections - cashReturns - cashExpenses;
  const finalExpected = Number(expectedTotalFromCore);
  const resolvedExpected = Number.isFinite(finalExpected) ? finalExpected : manualExpected;
  const matches = Math.abs(manualExpected - resolvedExpected) < 0.01;
  if (!matches) console.warn('[Shift Breakdown] Mismatch:', { shiftId, manual: manualExpected.toFixed(2), core: resolvedExpected.toFixed(2) });

  const fmt = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const row = (label, value, opts) => {
    const o = opts || {};
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 4px;border-bottom:1px dashed #e1e8ed;">' +
      '<span style="color:#4a5f70;font-size:13px;">' + (o.icon || '') + ' ' + label + '</span>' +
      '<span style="color:' + (o.color || '#203447') + ';font-weight:600;font-size:14px;direction:ltr;white-space:nowrap;">' + (o.sign || '') + fmt(value) + ' ' + cur + '</span>' +
    '</div>';
  };

  container.style.display = 'block';
  container.innerHTML =
    '<h4 style="margin:0 0 12px 0;color:#17364c;font-size:15px;">💼 ' + tr('shift_cash_breakdown_title') + '</h4>' +
    row(tr('shift_opening_cash'), openingCash, { icon: '💵', color: '#176b70' }) +
    row(tr('shift_cash_sales') + ' (' + cashInvoicesCount + ' ' + tr('invoices_word') + ')', cashSales, { sign: '+ ', icon: '🛒', color: '#176b70' }) +
    row(tr('shift_cash_collections'), cashCollections, { sign: '+ ', icon: '💰', color: '#176b70' }) +
    row(tr('shift_cash_returns'), cashReturns, { sign: '− ', icon: '↩️', color: '#c0392b' }) +
    row(tr('shift_cash_expenses'), cashExpenses, { sign: '− ', icon: '📤', color: '#c0392b' }) +
    '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 4px;margin-top:6px;border-top:2px solid #176b70;">' +
      '<span style="color:#17364c;font-weight:800;font-size:14px;">= ' + tr('shift_expected_total') + '</span>' +
      '<span style="color:' + (resolvedExpected >= 0 ? '#176b70' : '#c0392b') + ';font-weight:900;font-size:18px;direction:ltr;">' + fmt(resolvedExpected) + ' ' + cur + '</span>' +
    '</div>' +
    '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;margin-top:8px;background:#f1f6f8;border-radius:6px;">' +
      '<span style="color:#4a5f70;font-size:12px;">ℹ️ ' + tr('shift_vat_collected') + '</span>' +
      '<span style="color:#17364c;font-weight:600;font-size:13px;direction:ltr;">' + fmt(cashVat) + ' ' + cur + '</span>' +
    '</div>' +
    (!matches ? '<div style="margin-top:8px;padding:8px 12px;background:#fef2f2;border-left:3px solid #c0392b;border-radius:6px;color:#c0392b;font-size:12px;">⚠️ ' + tr('shift_reconciliation_mismatch') + '</div>' : '');
}

function calculateShiftDiff() {
  const expEl = document.getElementById('shiftExpectedCash');
  const actEl = document.getElementById('shiftActualCash');
  const diffEl = document.getElementById('shiftDifference');
  if (!expEl || !actEl || !diffEl) return;
  
  // إصلاح: مسح الفواصل والكلمات لقراءة الرقم صح
  const expClean = expEl.value.replace(/,/g, '').replace(/[^\d.-]/g, '');
  const expected = parseFloat(expClean) || 0;
  const actual = parseFloat(actEl.value) || 0;
  
  const diff = actual - expected;
  if (diff < 0) { 
    diffEl.value = diff.toLocaleString('en-US', {minimumFractionDigits: 2}) + ' ' + state.storeSettings.currency + tr('shortage'); 
    diffEl.style.color = '#c62828'; 
  }
  else if (diff > 0) { 
    diffEl.value = diff.toLocaleString('en-US', {minimumFractionDigits: 2}) + ' ' + state.storeSettings.currency + tr('surplus'); 
    diffEl.style.color = '#2e7d32'; 
  }
  else { 
    diffEl.value = '0.00 ' + state.storeSettings.currency + tr('matched'); 
    diffEl.style.color = '#17643a'; 
  }
}

async function closeShift() {
  if (state.role !== 'manager') return showNotification(tr('manager_only'), 'warning');
  const cashierName = (document.getElementById('shiftCashierName').value || '').trim();
  if (!cashierName) return showNotification(tr('enter_cashier_name'), 'error');
  const actualCash = parseFloat(document.getElementById('shiftActualCash').value) || 0;
  const notes = (document.getElementById('shiftNotes').value || '').trim();

  if (!state.currentShift) {
    const openShift = (state.shifts || []).find(s => !s.end_time && !s.endTime);
    if (openShift) state.currentShift = openShift;
    else return showNotification(tr('no_open_shift_sell'), 'warning');
  }

  const currentShift = state.currentShift;
  const expectedCash = financeCore.calcShiftExpectedCash(currentShift.id);
  const shiftStart = new Date(currentShift.start_time || currentShift.startTime).getTime();
  const shiftEnd = Date.now();

  const shiftSales = (state.sales || []).filter(function(s) {
    const t = new Date(s.date).getTime();
    return t >= shiftStart && t <= shiftEnd && (s.shift_id === currentShift.id || s.shiftId === currentShift.id);
  });

  const cashSales = shiftSales.filter(s => (s.pay_method || s.payMethod) === 'cash').reduce((sum, s) => sum + Number(s.paid || 0), 0);
  const cashCollections = (state.customerPayments || []).filter(p => (p.shift_id === currentShift.id || p.shiftId === currentShift.id) && (p.pay_method || p.payMethod) === 'cash').reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const cashReturns = (state.returns || []).filter(r => (r.shift_id === currentShift.id || r.shiftId === currentShift.id) && (r.refund_method || r.refundMethod) === 'cash').reduce((sum, r) => sum + Number(r.total || 0), 0);
  const cashExpenses = (state.expenses || []).filter(e => (e.shift_id === currentShift.id || e.shiftId === currentShift.id) && (e.pay_method || e.payMethod) === 'cash').reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const totalSales = shiftSales.reduce((sum, s) => sum + Number(s.total || 0), 0);
  const difference = actualCash - expectedCash;
  const ownerId = (state.role === 'employee' && state.ownerId) ? state.ownerId : state.currentUser.id;

  // ✅ v7.23.3 — Read variance reason BEFORE building closedShift
  const existingVariance = currentShift.variance_reason || currentShift.varianceReason || '';
  let finalNotes = notes;
  if (existingVariance && !notes.includes('--- سبب الفرق ---')) {
    finalNotes = (notes ? notes + '\n\n' : '') + '--- سبب الفرق ---\n' + existingVariance;
  }

  const closedShift = {
    id: currentShift.id, user_id: ownerId,
    cashier_name: cashierName, cashierName: cashierName,
    start_time: currentShift.start_time || currentShift.startTime,
    startTime: currentShift.start_time || currentShift.startTime,
    end_time: new Date().toISOString(), endTime: new Date().toISOString(),
    opening_cash: Number(currentShift.opening_cash || currentShift.openingCash || 0),
    openingCash: Number(currentShift.opening_cash || currentShift.openingCash || 0),
    expected_cash: expectedCash, expectedCash: expectedCash,
    cash_sales: cashSales, cashSales: cashSales,
    cash_collections: cashCollections, cashCollections: cashCollections,
    cash_returns: cashReturns, cashReturns: cashReturns,
    cash_expenses: cashExpenses, cashExpenses: cashExpenses,
    total_sales: totalSales, totalSales: totalSales,
    actual_cash: actualCash, actualCash: actualCash,
    difference: difference,
    notes: finalNotes,
    variance_reason: existingVariance,
    varianceReason: existingVariance,
    saleCount: shiftSales.length, drawerExpensesList: []
  };

  if (navigator.onLine && supabaseClient) {
    try {
      const { error } = await supabaseClient.from('shifts').upsert({
        id: closedShift.id, user_id: ownerId,
        cashier_name: cashierName, start_time: closedShift.start_time, end_time: closedShift.end_time,
        opening_cash: closedShift.opening_cash, expected_cash: closedShift.expected_cash,
        cash_sales: closedShift.cash_sales, cash_collections: closedShift.cash_collections,
        cash_returns: closedShift.cash_returns, cash_expenses: closedShift.cash_expenses,
        actual_cash: actualCash, difference: difference, notes: finalNotes
      }, { onConflict: 'id' });
      if (error) { console.warn('Shift close upload failed:', error); showNotification(tr('save_offline_warning'), 'warning'); }
    } catch (e) { console.warn('Shift close failed:', e); }
  }

  const existingIdx = state.shifts.findIndex(s => s.id === currentShift.id);
  if (existingIdx !== -1) state.shifts[existingIdx] = closedShift;
  else state.shifts.unshift(closedShift);
  state.currentShift = null;

  if (typeof addAuditLog === 'function') {
    addAuditLog('close_shift', { shiftId: closedShift.id, cashierName: cashierName, cashSales, cashCollections, cashReturns, cashExpenses, expectedCash, actualCash, difference }, closedShift.id);
  }

  saveData();
  document.getElementById('shiftCashierName').value = '';
  document.getElementById('shiftActualCash').value = '';
  document.getElementById('shiftDifference').value = '';
  document.getElementById('shiftNotes').value = '';
  calcExpectedShiftCash();
  renderShifts();
  renderDashboard();
  showNotification(tr('shift_closed'));
  switchShiftTab('shift-log');

  if (typeof triggerAutoBackup === 'function') {
    setTimeout(() => triggerAutoBackup('shift_close').catch(e => console.warn('shift auto-backup:', e)), 800);
  }
}
function renderShifts() {
  const container = document.getElementById('shiftsTable');
  if (!container) return;
  if (state.shifts.length === 0) { container.innerHTML = '<p class="text-muted">' + tr('no_closed_shifts') + '</p>'; return; }
  
  let html = '<div class="table-wrap"><table class="data-table"><thead><tr>' +
    '<th>' + tr('th_date') + '</th>' +
    '<th>' + tr('th_cashier') + '</th>' +
    '<th>' + tr('th_invoice_count') + '</th>' +
    '<th>' + tr('th_expected_cash') + '</th>' +
    '<th>' + tr('th_actual_cash') + '</th>' +
    '<th>' + tr('th_difference') + '</th>' +
    '<th>' + tr('th_action') + '</th>' +
    '</tr></thead><tbody>';
    
  state.shifts.forEach(function(s) {
    const diff = Number(s.difference) || 0;
    const diffClass = diff < 0 ? 'red-text' : (diff > 0 ? 'green-text' : '');
    const endTime = s.end_time || s.endTime;
    const cashierName = s.cashier_name || s.cashierName || '-';
    const expected = Number(s.expected_cash ?? s.expectedCash ?? s.cash_sales ?? s.cashSales ?? 0) || 0;
    const actual = Number(s.actual_cash ?? s.actualCash ?? 0) || 0;
    
    // ✅ حساب حي لعدد الفواتير من state.sales
    const liveCount = state.sales.filter(function(sale) {
      return (sale.shift_id === s.id || sale.shiftId === s.id);
    }).length;
    
    html += '<tr>' +
      '<td>' + new Date(endTime).toLocaleString(currentLang === 'en' ? 'en-US' : 'ar-EG') + '</td>' +
      '<td>' + escapeHTML(cashierName) + '</td>' +
      '<td><b>' + liveCount + '</b></td>' +
      '<td>' + expected.toFixed(2) + '</td>' +
      '<td>' + actual.toFixed(2) + '</td>' +
      '<td class="' + diffClass + '"><b>' + diff.toFixed(2) + '</b></td>' +
      '<td><button class="small-btn primary" onclick="printShiftReport(\'' + s.id + '\')" title="عرض وطباعة">🖨️</button></td>' +
      '</tr>';
  });
  html += '</tbody></table></div>';
  container.innerHTML = html;
}

function printShiftReport(shiftId) {
  let shift;
  if (shiftId) {
    shift = state.shifts.find(s => s.id === shiftId);
  } else {
    shift = state.currentShift || state.shifts[0] || null;
  }
  if (!shift) return showNotification(tr('no_closed_shifts'), 'warning');

  // ✅ v7.23.2 — استخدام shift.id دايماً (إصلاح باج الأصفار للوردية المفتوحة)
  const effectiveShiftId = shift.id;
  const isOpenShift = !(shift.end_time || shift.endTime);

  const sales = (state.sales || []).filter(s => (s.shift_id === effectiveShiftId || s.shiftId === effectiveShiftId));
  const shiftStart = new Date(shift.start_time || shift.startTime).getTime();
  const shiftEnd = (shift.end_time || shift.endTime) ? new Date(shift.end_time || shift.endTime).getTime() : Date.now();

  const openingCash = Number(shift.opening_cash ?? shift.openingCash) || 0;

  const shiftCashSales = sales.filter(s => (s.pay_method === 'cash' || s.payMethod === 'cash') && (Number(s.paid) || 0) > 0);
  const cashSales = shiftCashSales.reduce((sum, s) => sum + (Number(s.paid) || 0), 0);
  const cashVat = shiftCashSales.reduce((sum, s) => sum + (Number(s.vat_amount ?? s.vatAmount ?? 0) || 0), 0);
  const cashInvoicesCount = shiftCashSales.length;

  const cashCollections = (state.customerPayments || []).filter(p => (p.shift_id === effectiveShiftId || p.shiftId === effectiveShiftId) && (p.pay_method === 'cash' || p.payMethod === 'cash')).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const cashReturnsTotal = (state.returns || []).filter(r => (r.shift_id === effectiveShiftId || r.shiftId === effectiveShiftId) && (r.refund_method === 'cash' || r.refundMethod === 'cash')).reduce((sum, r) => sum + (Number(r.total) || 0), 0);
  const drawerExpensesTotal = (state.expenses || []).filter(e => (e.shift_id === effectiveShiftId || e.shiftId === effectiveShiftId) && (e.pay_method === 'cash' || e.payMethod === 'cash')).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const expectedCash = financeCore.calcShiftExpectedCash(effectiveShiftId);
  const totalSales = sales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  const visaSales = sales.filter(s => (s.pay_method === 'visa' || s.payMethod === 'visa')).reduce((sum, s) => sum + (Number(s.paid) || 0), 0);
  const transferSales = sales.filter(s => (s.pay_method === 'transfer' || s.payMethod === 'transfer')).reduce((sum, s) => sum + (Number(s.paid) || 0), 0);

  // ✅ v7.23.2 — لو الوردية مفتوحة، اقرأ الفعلي من خانة الإدخال
  const actualCash = isOpenShift
    ? (parseFloat(document.getElementById('shiftActualCash')?.value) || 0)
    : (Number(shift.actual_cash ?? shift.actualCash) || 0);
  const difference = actualCash - expectedCash;

  const cur = escapeHTML(state.storeSettings.currency || 'ج.م');
  const shop = escapeHTML(state.storeSettings.name || 'متجري');

  const payLabels = { cash: tr('cash_label'), visa: tr('th_visa_sales'), transfer: tr('th_bank_transfers'), card: tr('card_label') };

  const rows = sales.map(function(sale) {
    const custId = sale.customer_id || sale.customerId;
    const customer = state.customers.find(function(c) { return c.id === custId; });
    const payMethod = sale.pay_method || sale.payMethod;
    return '<tr><td>' + escapeHTML(sale.id) + '</td><td>' + escapeHTML(new Date(sale.date).toLocaleString(currentLang === 'en' ? 'en-US' : 'ar-EG')) + '</td><td>' + escapeHTML(customer ? customer.name : tr('cash_customer')) + '</td><td>' + escapeHTML(payLabels[payMethod] || payMethod || '-') + '</td><td>' + (Number(sale.total) || 0).toFixed(2) + ' ' + cur + '</td><td>' + (Number(sale.paid) || 0).toFixed(2) + ' ' + cur + '</td></tr>';
  }).join('');

  const fmt = (n) => Number(n || 0).toFixed(2);
  const bdRow = (label, value, sign, cls) =>
    '<tr class="' + (cls || '') + '"><td>' + sign + ' ' + label + '</td><td style="text-align:left;direction:ltr;">' + fmt(value) + ' ' + cur + '</td></tr>';

  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) return showNotification(tr('allow_popups_print'), 'warning');

  const en = currentLang === 'en';
  const dir = en ? 'ltr' : 'rtl';

  // ✅ v7.23.2 — banner تحذيري للوردية المفتوحة
  const openBanner = isOpenShift
    ? '<div style="background:#fef3c7;border:2px solid #d97706;padding:12px;border-radius:8px;margin-bottom:16px;color:#92400e;font-weight:800;text-align:center;">⚠️ ' + tr('recon_open_warning') + '</div>'
    : '';

  win.document.write(
    '<!doctype html><html lang="' + (en ? 'en' : 'ar') + '" dir="' + dir + '"><head><meta charset="utf-8"><title>' + tr('shift_report') + '</title>' +
    '<style>body{font-family:Arial,Tahoma,sans-serif;padding:24px;color:#17364c}h1{color:#176b70;margin:0 0 6px}h2{color:#17364c;font-size:16px;margin:20px 0 10px;border-bottom:2px solid #176b70;padding-bottom:6px}table{width:100%;border-collapse:collapse;margin:8px 0}th{background:#17364c;color:white;padding:9px;text-align:' + (en ? 'left' : 'right') + ';font-size:12px}td{padding:8px 10px;border:1px solid #ccd7df;font-size:12px;text-align:' + (en ? 'left' : 'right') + '}.breakdown td{border:1px solid #e1e8ed}.breakdown tr.total td{background:#e8f4f4;font-weight:900;color:#176b70;border-top:2px solid #176b70;font-size:13px}.breakdown tr.vat td{background:#f1f6f8;color:#4a5f70;font-size:11px}.breakdown tr.minus td{color:#c0392b}.recon-box{padding:14px;background:#f8fafb;border:1px solid #dce5ec;border-radius:8px;margin:12px 0}.recon-box table td{border:none;padding:6px 0}.recon-box .diff-row td{border-top:2px solid #dce5ec;padding-top:10px;font-weight:900;font-size:15px;color:' + (difference < 0 ? '#c0392b' : (difference > 0 ? '#176b70' : '#4a5f70')) + '}.note{padding:10px 14px;background:#fff8e1;border-left:3px solid #b8860b;border-radius:6px;font-size:11px;color:#7a5c00;line-height:1.6;margin-top:14px}@media print{button{display:none}body{padding:10px}}</style></head><body>' +
    openBanner +
    '<h1>' + shop + ' — ' + tr('shift_report') + '</h1>' +
    '<p style="margin:0 0 4px 0;font-size:13px;"><b>' + tr('th_cashier') + ':</b> ' + escapeHTML(shift.cashier_name || shift.cashierName || '-') + '</p>' +
    '<p style="margin:0 0 4px 0;font-size:13px;"><b>' + tr('shift_start') + ':</b> ' + new Date(shiftStart).toLocaleString(en ? 'en-US' : 'ar-EG') + ' &nbsp;&nbsp; <b>' + tr('shift_end') + ':</b> ' + (isOpenShift ? '—' : new Date(shiftEnd).toLocaleString(en ? 'en-US' : 'ar-EG')) + '</p>' +
    '<h2>' + tr('shift_cash_breakdown_title') + '</h2>' +
    '<table class="breakdown"><tbody>' +
      bdRow(tr('shift_opening_cash'), openingCash, '💵', '') +
      bdRow(tr('shift_cash_sales') + ' (' + cashInvoicesCount + ' ' + tr('invoices_word') + ')', cashSales, '+', '') +
      bdRow(tr('shift_cash_collections'), cashCollections, '+', '') +
      bdRow(tr('shift_cash_returns'), cashReturnsTotal, '−', 'minus') +
      bdRow(tr('shift_cash_expenses'), drawerExpensesTotal, '−', 'minus') +
      '<tr class="total"><td>= ' + tr('shift_expected_total') + '</td><td style="text-align:left;direction:ltr;">' + fmt(expectedCash) + ' ' + cur + '</td></tr>' +
      '<tr class="vat"><td>ℹ️ ' + tr('shift_vat_collected') + '</td><td style="text-align:left;direction:ltr;">' + fmt(cashVat) + ' ' + cur + '</td></tr>' +
    '</tbody></table>' +
    '<h2>' + tr('shift_reconciliation_title') + '</h2>' +
    '<div class="recon-box"><table>' +
      '<tr><td>' + tr('th_expected_cash') + '</td><td style="text-align:left;direction:ltr;"><b>' + fmt(expectedCash) + ' ' + cur + '</b></td></tr>' +
      '<tr><td>' + tr('th_actual_cash') + '</td><td style="text-align:left;direction:ltr;"><b>' + fmt(actualCash) + ' ' + cur + '</b></td></tr>' +
      '<tr class="diff-row"><td>' + tr('th_difference') + '</td><td style="text-align:left;direction:ltr;">' + (difference < 0 ? '−' : (difference > 0 ? '+' : '')) + fmt(Math.abs(difference)) + ' ' + cur + '</td></tr>' +
    '</table></div>' +
    '<h2>' + tr('shift_other_payments_title') + '</h2>' +
    '<table><tbody>' +
      '<tr><td>' + tr('th_visa_sales') + '</td><td style="text-align:left;direction:ltr;">' + fmt(visaSales) + ' ' + cur + '</td></tr>' +
      '<tr><td>' + tr('th_bank_transfers') + '</td><td style="text-align:left;direction:ltr;">' + fmt(transferSales) + ' ' + cur + '</td></tr>' +
      '<tr><td><b>' + tr('shift_total_sales_all') + '</b></td><td style="text-align:left;direction:ltr;"><b>' + fmt(totalSales) + ' ' + cur + '</b></td></tr>' +
    '</tbody></table>' +
    '<h2>' + tr('shift_invoices_table_title') + ' (' + sales.length + ')</h2>' +
    '<table><thead><tr><th>' + tr('th_invoice_number') + '</th><th>' + tr('th_date') + '</th><th>' + tr('th_customer') + '</th><th>' + tr('th_payment_method') + '</th><th>' + tr('th_total') + '</th><th>' + tr('th_paid') + '</th></tr></thead><tbody>' + rows + '</tbody></table>' +
    '<div class="note"><b>' + tr('shift_report_note_title') + ':</b> ' + tr('shift_report_note_body') + '</div>' +
    '<p style="text-align:center;margin-top:18px;color:#687b8b;font-size:11px;">' + tr('generated_by') + '</p>' +
    '<div style="text-align:center;margin-top:12px;"><button onclick="window.print()" style="padding:10px 24px;border:0;border-radius:8px;background:#176b70;color:#fff;font-weight:700;cursor:pointer;">' + tr('print_btn_text') + '</button></div>' +
    '<script>window.onload=function(){setTimeout(function(){window.print()},250)};<\/script></body></html>'
  );
  win.document.close();
}
function openExportModal(tableType) {
  activeExportContext.type = tableType;
  const modal = document.getElementById('exportModal');
  if (modal) modal.style.display = 'flex';
}

function closeExportModal() {
  const modal = document.getElementById('exportModal');
  if (modal) modal.style.display = 'none';
}

function toggleExportDateRange(show) {
  const box = document.getElementById('exportDateRangeBox');
  if (box) box.style.display = show ? 'grid' : 'none';
}

function executeExportAction(action) {
  const type = activeExportContext.type;
  const scopeEl = document.querySelector('input[name="exportScope"]:checked');
  if (!scopeEl) return showNotification(tr('select_export_scope'), 'warning');
  const scope = scopeEl.value;
  let from = '';
  let to = '';
  if (scope === 'custom') {
    from = document.getElementById('exportModalFrom').value || '';
    to = document.getElementById('exportModalTo').value || '';
  }
  closeExportModal();
  if (action === 'print') printTableReportFiltered(type, from, to);
  else if (action === 'excel') exportTableCSVFiltered(type, from, to);
  else if (action === 'whatsapp') sendTableWhatsAppFiltered(type, from, to);
}

function getFilteredDataForExport(tableType, from, to) {
  const en = currentLang === 'en';
  let rawData = [];
  let title = '';
  let headers = [];

  switch (tableType) {
    case 'sales':
      title = tr('sales_log');
      headers = [tr('th_invoice_number'), tr('th_date'), tr('th_customer'), tr('th_total'), tr('th_paid'), tr('th_remaining')];
      rawData = filterByPeriod(state.sales, 'date', from, to).map(s => {
        const custId = s.customer_id || s.customerId;
        const cust = state.customers.find(c => c.id === custId);
        const isCash = cust && (cust.name === 'عميل نقدي عام' || cust.name === 'Cash Customer');
        return [s.id, new Date(s.date).toLocaleDateString(en ? 'en-US' : 'ar-EG'), cust ? (isCash ? tr('cash_customer') : cust.name) : tr('cash_customer'), (Number(s.total) || 0).toFixed(2), (Number(s.paid) || 0).toFixed(2), (Number(s.remaining) || 0).toFixed(2)];
      });
      break;
    case 'products':
      title = tr('products_list');
      headers = [tr('th_name'), tr('th_barcode'), tr('th_category'), tr('th_price'), tr('th_cost'), tr('th_stock')];
      rawData = state.products.map(p => [p.name, p.barcode || '-', p.category || '-', p.price, p.cost, p.stock]);
      break;
    case 'stockMoves':
      title = tr('moves_log');
      headers = [tr('th_date'), tr('th_product'), tr('th_type'), tr('th_quantity'), tr('th_before'), tr('th_after'), tr('th_reason')];
      rawData = filterByPeriod(state.stockMoves, 'date', from, to).map(m => [new Date(m.date).toLocaleDateString(en ? 'en-US' : 'ar-EG'), m.productName || m.product_name, m.type, m.qty, m.oldStock ?? m.old_stock, m.newStock ?? m.new_stock, m.reason]);
      break;
    case 'returns':
      title = tr('returns_log');
      headers = [tr('th_date'), tr('th_invoice_number'), tr('th_item'), tr('th_quantity'), tr('th_value'), tr('return_method'), tr('th_reason')];
      rawData = filterByPeriod(state.returns, 'date', from, to).map(r => [new Date(r.date).toLocaleDateString(en ? 'en-US' : 'ar-EG'), r.saleId || r.sale_id, r.productName || r.product_name, r.qty, (Number(r.total) || 0).toFixed(2), r.refundMethod || r.refund_method || '-', r.reason]);
      break;
    case 'customers':
      title = tr('customers_list');
      headers = [tr('th_name'), tr('th_phone'), tr('th_debts')];
      rawData = state.customers.map(c => [c.name, c.phone || '-', financeCore.calcCustomerBalance(c.id).toFixed(2)]);
      break;
    case 'customerPayments':
      title = tr('collections_log');
      headers = [tr('th_date'), tr('th_customer'), tr('th_amount'), tr('th_notes')];
      rawData = filterByPeriod(state.customerPayments, 'date', from, to).map(p => [p.date, p.customerName || p.customer_name, (Number(p.amount) || 0).toFixed(2), p.notes || '-']);
      break;
    case 'suppliers':
      title = tr('suppliers_list');
      headers = [tr('th_name'), tr('th_phone'), tr('th_payables')];
      rawData = state.suppliers.map(s => [s.name, s.phone || '-', financeCore.calcSupplierBalance(s.id).toFixed(2)]);
      break;
    case 'purchases':
      title = tr('purchases_log');
      headers = [tr('th_date'), tr('th_supplier'), tr('th_product'), tr('th_quantity'), tr('th_cost'), tr('th_total')];
      rawData = filterByPeriod(state.purchases, 'date', from, to).map(p => {
        const supId = p.supplier_id || p.supplierId;
        const sup = state.suppliers.find(s => s.id === supId);
        return [new Date(p.date).toLocaleDateString(en ? 'en-US' : 'ar-EG'), sup ? sup.name : '-', p.productName || p.product_name, p.qty, p.cost, (Number(p.total) || 0).toFixed(2)];
      });
      break;
    case 'supplierPayments':
      title = tr('supplier_payments_title');
      headers = [tr('th_date'), tr('th_supplier'), tr('th_amount'), tr('th_notes')];
      rawData = filterByPeriod(state.supplierPayments, 'date', from, to).map(p => [p.date, p.supplierName || p.supplier_name, (Number(p.amount) || 0).toFixed(2), p.notes || '-']);
      break;
    case 'expenses':
      title = tr('expenses_log');
      headers = [tr('th_date'), tr('th_item_name'), tr('th_amount'), tr('th_notes')];
      rawData = filterByPeriod(state.expenses, 'date', from, to).map(e => [e.date, e.name, (Number(e.amount) || 0).toFixed(2), e.notes || '-']);
      break;
    case 'shifts':
      title = tr('shifts_log');
      headers = [tr('th_date'), tr('th_cashier'), tr('th_invoice_count'), tr('th_expected_cash'), tr('th_actual_cash'), tr('th_difference')];
      rawData = filterByPeriod(state.shifts, ['endTime', 'end_time'], from, to).map(s => {
        const endT = s.end_time || s.endTime;
        const expected = Number(s.expected_cash ?? s.expectedCash ?? s.cash_sales ?? s.cashSales ?? 0);
        return [new Date(endT).toLocaleString(en ? 'en-US' : 'ar-EG'), s.cashier_name || s.cashierName, s.saleCount || s.sale_count || 0, expected.toFixed(2), (Number(s.actual_cash ?? s.actualCash) || 0).toFixed(2), (Number(s.difference) || 0).toFixed(2)];
      });
      break;
  }
  return { title, headers, rows: rawData };
}

function printTableReportFiltered(tableType, from, to) {
  const data = getFilteredDataForExport(tableType, from, to);
  openPrintWindow(data.title, data.headers, data.rows, state.storeSettings);
}

function exportTableCSVFiltered(tableType, from, to) {
  const data = getFilteredDataForExport(tableType, from, to);
  const settings = state.storeSettings;
  let csv = '\uFEFF';
  csv += '"' + settings.name + ' - ' + data.title + '"\r\n';
  csv += '"' + tr('print_date') + ': ' + new Date().toLocaleString(currentLang === 'en' ? 'en-US' : 'ar-EG') + '"\r\n\r\n';
  csv += data.headers.map(h => '"' + h + '"').join(',') + '\r\n';
  data.rows.forEach(r => { csv += r.map(c => '"' + String(c || '').replace(/"/g, '""') + '"').join(',') + '\r\n'; });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = data.title + '-' + today() + '.csv';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 100);
  showNotification(tr('exported_excel'));
}

function sendTableWhatsAppFiltered(tableType, from, to) {
  const data = getFilteredDataForExport(tableType, from, to);
  const settings = state.storeSettings || { name: 'Matjari' };
  const esc = value => '"' + String(value == null ? '' : value).replace(/"/g, '""') + '"';
  let csv = '\uFEFF' + esc(settings.name + ' - ' + data.title) + '\r\n';
  csv += esc(tr('print_date') + ': ' + new Date().toLocaleString()) + '\r\n';
  csv += data.headers.map(esc).join(',') + '\r\n';
  data.rows.forEach(row => { csv += row.map(esc).join(',') + '\r\n'; });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (data.title || 'report').replace(/[\\/:*?"<>|]/g, '-') + '-' + today() + '.csv';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showNotification(tr('file_downloaded_wa'), 'success');
}

function openPrintWindow(title, headers, rows, settings) {
  const en = currentLang === 'en';
  const logoHTML = settings.logo ? '<img src="' + escapeHTML(settings.logo) + '" style="max-height:60px;max-width:150px">' : '';
  let headerHTML = headers.map(h => '<th>' + escapeHTML(h) + '</th>').join('');
  let bodyHTML = '';
  rows.forEach(r => { bodyHTML += '<tr>'; r.forEach(c => { bodyHTML += '<td>' + escapeHTML(c) + '</td>'; }); bodyHTML += '</tr>'; });
  if (rows.length === 0) bodyHTML = '<tr><td colspan="' + headers.length + '" style="text-align:center;padding:20px;color:#687b8b">' + tr('no_data') + '</td></tr>';
  const w = window.open('', '_blank');
  if (!w) return showNotification(tr('allow_popups'), 'warning');
  w.document.write(
    '<!DOCTYPE html><html lang="' + (en ? 'en' : 'ar') + '" dir="' + (en ? 'ltr' : 'rtl') + '"><head><meta charset="UTF-8"><title>' + escapeHTML(title) + '</title>' +
    '<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Tahoma;background:#fff;padding:20px;color:#203447}.header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #17364c;padding-bottom:15px;margin-bottom:20px}.header-info h1{margin:0 0 6px;font-size:20px;color:#17364c}.header-info p{margin:2px 0;font-size:12px;color:#687b8b}.report-title{text-align:center;font-size:18px;font-weight:800;color:#17364c;margin:15px 0;padding:10px;background:#edf3f9;border-radius:8px}table{width:100%;border-collapse:collapse;margin-top:10px}th{background:#17364c;color:#fff;padding:10px;text-align:' + (en ? 'left' : 'right') + ';font-size:12px}td{padding:8px 10px;border-bottom:1px solid #e9eef2;font-size:12px}tbody tr:nth-child(even){background:#f8fafb}.meta{margin-top:20px;text-align:center;font-size:11px;color:#687b8b;padding-top:15px;border-top:1px dashed #dce3ec}.actions{margin-top:20px;text-align:center}.actions button{padding:10px 20px;border:0;border-radius:8px;font-weight:700;cursor:pointer;background:#176b70;color:#fff}@media print{.actions{display:none}body{padding:0}}</style></head><body>' +
    '<div class="header"><div class="header-info"><h1>' + escapeHTML(settings.name) + '</h1>' +
    (settings.phone ? '<p>📞 ' + escapeHTML(settings.phone) + '</p>' : '') +
    (settings.address ? '<p>📍 ' + escapeHTML(settings.address) + '</p>' : '') +
    '</div><div>' + logoHTML + '</div></div>' +
    '<div class="report-title">' + escapeHTML(title) + '</div>' +
    '<table><thead><tr>' + headerHTML + '</tr></thead><tbody>' + bodyHTML + '</tbody></table>' +
    '<div class="meta">' + tr('records_count') + rows.length + ' | ' + tr('print_date') + ' ' + new Date().toLocaleString(en ? 'en-US' : 'ar-EG') + '</div>' +
    '<div class="actions"><button onclick="window.print()">' + tr('print_btn_text') + '</button></div>' +
    '</body></html>'
  );
  w.document.close();
}

function openExpensesDetailReport() {
  const modal = document.getElementById('expensesReportModal');
  if (modal) { setExpenseReportPeriod('currentMonth'); modal.style.display = 'flex'; }
}

function closeExpensesReportModal() {
  const modal = document.getElementById('expensesReportModal');
  if (modal) modal.style.display = 'none';
}

function setExpenseReportPeriod(period) {
  const end = today();
  const d = new Date(end + 'T12:00:00');
  let from = '';
  if (period === 'today') from = end;
  if (period === 'week') { d.setDate(d.getDate() - 6); from = d.toISOString().slice(0, 10); }
  if (period === 'month') { d.setDate(d.getDate() - 29); from = d.toISOString().slice(0, 10); }
  if (period === 'currentMonth') { const now = new Date(); from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10); }
  if (period === 'year') { const now = new Date(); from = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10); }
  document.getElementById('expReportFrom').value = from;
  document.getElementById('expReportTo').value = period === 'all' ? '' : end;
}

function printExpensesDetail() {
  const from = document.getElementById('expReportFrom').value;
  const to = document.getElementById('expReportTo').value;
  const filtered = filterByPeriod(state.expenses, 'date', from, to);
  const total = filtered.reduce((sum, e) => sum + Number(e.amount), 0);
  const en = currentLang === 'en';
  let html = `
    <html dir="${en ? 'ltr' : 'rtl'}" lang="${en ? 'en' : 'ar'}"><head><title>${tr('expense_report')}</title>
    <style>body{font-family:Tahoma;padding:20px;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #ddd;padding:8px;text-align:${en ? 'left' : 'right'};}</style>
    </head><body>
    <h2>${tr('expense_report')} (${from || tr('from_date')} - ${to || tr('to_date')})</h2>
    <h3>${tr('total_label')} ${total.toFixed(2)} ${state.storeSettings.currency}</h3>
    <table><tr><th>${tr('th_date')}</th><th>${tr('th_item_name')}</th><th>${tr('th_amount')}</th><th>${tr('th_notes')}</th></tr>
  `;
  filtered.forEach(e => { html += `<tr><td>${e.date}</td><td>${e.name}</td><td>${e.amount}</td><td>${e.notes || '-'}</td></tr>`; });
  html += `</table><script>window.onload=function(){setTimeout(function(){window.print()},300)};<\/script></body></html>`;
  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
  closeExpensesReportModal();
}

function printReportSummary() {
  const container = document.getElementById('reportCards');
  if (!container) return;
  const topContainer = document.getElementById('topProductsReportFinance');
  const topHtml = topContainer ? topContainer.innerHTML : '';
  const profitContainer = document.getElementById('productProfitReport');
  const profitHtml = profitContainer ? profitContainer.innerHTML : '';
  const detailsContainer = document.getElementById('activityDetailsReport');
  const detailsHtml = detailsContainer ? detailsContainer.innerHTML : '';
  const en = currentLang === 'en';

  const w = window.open('', '_blank');
  if (!w) return showNotification(tr('allow_popups'), 'warning');

  const printStyles = `<style>body{font-family:Tahoma,Arial,sans-serif;padding:20px;direction:${en ? 'ltr' : 'rtl'}}h2{text-align:center;margin-bottom:30px}.stat-card{border:1px solid #ddd;border-radius:8px;padding:15px;text-align:center;background:#fff;page-break-inside:avoid}.stat-card h3{margin:0 0 10px 0;font-size:14px;color:#555;border:none;padding:0}.stat-card p{margin:0;font-size:20px;font-weight:bold;color:#000}table{width:100%;border-collapse:collapse;margin-top:10px}tr{page-break-inside:avoid}th,td{border:1px solid #ddd;padding:8px;text-align:${en ? 'left' : 'right'}}th{background:#f5f5f5}.card h3{font-size:16px;border-bottom:2px solid #eee;padding-bottom:10px;margin-top:20px}.no-print,button,input,select{display:none!important}</style>`;

  w.document.write(`
    <html dir="${en ? 'ltr' : 'rtl'}" lang="${en ? 'en' : 'ar'}">
    <head><title>${tr('financial_report')} ${escapeHTML(state.storeSettings.name)}</title>${printStyles}</head>
    <body>
      <h2>${tr('financial_report')} ${escapeHTML(state.storeSettings.name)}</h2>
      <div>${container.innerHTML}</div>
      ${detailsHtml ? `<div>${detailsHtml}</div>` : ''}
      ${topHtml ? `<div style="margin-top:20px;"><h3>${tr('top_selling')}</h3>${topHtml}</div>` : ''}
      ${profitHtml ? `<div style="margin-top:20px;page-break-before:auto;"><h3>${tr('profit_section_title')}</h3>${profitHtml}</div>` : ''}
      <script>window.onload=function(){setTimeout(function(){window.print()},300)};<\/script>
    </body></html>
  `);
  w.document.close();
}
/* v7.17 - Finance Tabs Logic */
function switchExpenseTab(tabId) {
  document.querySelectorAll('#finExpenses .tab-content').forEach(el => el.style.display = 'none');
  document.querySelectorAll('#finExpenses .tab-btn').forEach(el => el.classList.remove('active'));
  
  const content = document.getElementById('tab-' + tabId);
  if (content) content.style.display = 'block';
  
  const btn = document.querySelector('#finExpenses .tab-btn[data-tab="' + tabId + '"]');
  if (btn) btn.classList.add('active');

  if (tabId === 'exp-list') renderExpenses();
}

function switchShiftTab(tabId) {
  document.querySelectorAll('#finShift .tab-content').forEach(el => el.style.display = 'none');
  document.querySelectorAll('#finShift .tab-btn').forEach(el => el.classList.remove('active'));
  
  const content = document.getElementById('tab-' + tabId);
  if (content) content.style.display = 'block';
  
  const btn = document.querySelector('#finShift .tab-btn[data-tab="' + tabId + '"]');
  if (btn) btn.classList.add('active');

  if (tabId === 'shift-close') { 
  calcExpectedShiftCash(); 
  setTimeout(() => { const el = document.getElementById('shiftActualCash'); if(el) el.focus(); }, 150);
}
}
function fillShiftCash(amount) {
  const input = document.getElementById('shiftActualCash');
  if (!input) return;
  if (amount === 'exact') {
    const expVal = document.getElementById('shiftExpectedCash').value.replace(/,/g, '').replace(/[^\d.-]/g, '');
    input.value = parseFloat(expVal).toFixed(2);
  } else {
    input.value = amount;
  }
  calculateShiftDiff();
}
/* ═══════════════════════════════════════════════════════════ */
/* v7.23.2 — Reconciliation Modal                              */
/* ═══════════════════════════════════════════════════════════ */

let _reconDonutChart = null;
let _reconSparklineChart = null;
let _reconCurrentShiftId = null;

function openReconciliationModal(shiftId) {
  const modal = document.getElementById('reconciliationModal');
  if (!modal) return;

  let targetShift = null;
  if (shiftId) {
    targetShift = (state.shifts || []).find(s => s.id === shiftId);
  } else if (state.currentShift) {
    targetShift = state.currentShift;
  } else {
    const closedShifts = (state.shifts || []).filter(s => s.end_time || s.endTime);
    targetShift = closedShifts[0] || null;
  }

  if (!targetShift) {
    return showNotification(tr('no_closed_shifts'), 'warning');
  }

  _reconCurrentShiftId = targetShift.id;
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  _renderReconciliation(targetShift);
}

function closeReconciliationModal() {
  const modal = document.getElementById('reconciliationModal');
  if (modal) modal.style.display = 'none';
  document.body.style.overflow = '';
  if (_reconDonutChart) { try { _reconDonutChart.destroy(); } catch(e){} _reconDonutChart = null; }
  if (_reconSparklineChart) { try { _reconSparklineChart.destroy(); } catch(e){} _reconSparklineChart = null; }
  _reconCurrentShiftId = null;
}

function _renderReconciliation(shift) {
  const body = document.getElementById('reconBody');
  if (!body) return;

  const cur = state.storeSettings.currency || 'ج.م';
  const fmt = n => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const isOpen = !(shift.end_time || shift.endTime);
  const sid = shift.id;

  // ── بيانات الوردية ──
  const opening = Number(shift.opening_cash ?? shift.openingCash) || 0;
  const shiftSales = (state.sales || []).filter(s => s.shift_id === sid || s.shiftId === sid);
  const cashSalesList = shiftSales.filter(s => (s.pay_method === 'cash' || s.payMethod === 'cash') && (Number(s.paid) || 0) > 0);
  const cashSales = cashSalesList.reduce((sum, s) => sum + (Number(s.paid) || 0), 0);
  const visaSales = shiftSales.filter(s => (s.pay_method === 'visa' || s.payMethod === 'visa') || (s.pay_method === 'card' || s.payMethod === 'card')).reduce((sum, s) => sum + (Number(s.paid) || 0), 0);
  const transferSales = shiftSales.filter(s => (s.pay_method === 'transfer' || s.payMethod === 'transfer')).reduce((sum, s) => sum + (Number(s.paid) || 0), 0);
  const cashCollections = (state.customerPayments || []).filter(p => (p.shift_id === sid || p.shiftId === sid) && (p.pay_method === 'cash' || p.payMethod === 'cash')).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const cashReturns = (state.returns || []).filter(r => (r.shift_id === sid || r.shiftId === sid) && (r.refund_method === 'cash' || r.refundMethod === 'cash')).reduce((sum, r) => sum + (Number(r.total) || 0), 0);
  const cashExpenses = (state.expenses || []).filter(e => (e.shift_id === sid || e.shiftId === sid) && (e.pay_method === 'cash' || e.payMethod === 'cash')).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const expectedCash = financeCore.calcShiftExpectedCash(sid);
  const actualCash = isOpen
    ? (parseFloat(document.getElementById('shiftActualCash')?.value) || 0)
    : (Number(shift.actual_cash ?? shift.actualCash) || 0);
  const difference = actualCash - expectedCash;
  const absDiff = Math.abs(difference);
  const variancePct = expectedCash > 0 ? (absDiff / expectedCash) * 100 : 0;

  // Badge
  let badgeClass = 'excellent', badgeText = tr('recon_variance_excellent');
  if (variancePct > 5) { badgeClass = 'warning'; badgeText = tr('recon_variance_warning'); }
  else if (variancePct > 1) { badgeClass = 'ok'; badgeText = tr('recon_variance_ok'); }

  const diffColorClass = difference > 0 ? 'recon-diff-positive' : (difference < 0 ? 'recon-diff-negative' : 'recon-diff-zero');
  const diffPrefix = difference > 0 ? '+' : (difference < 0 ? '−' : '');

  // ── بناء المحتوى ──
  let html = '';

  if (isOpen) {
    html += '<div class="recon-warning-banner">' + tr('recon_open_warning') + '</div>';
  }

  // معلومات الوردية
  html += '<div class="recon-shift-info">' +
    '<div class="recon-info-item"><span class="recon-info-label">' + tr('th_cashier') + '</span><span class="recon-info-value">' + escapeHTML(shift.cashier_name || shift.cashierName || '-') + '</span></div>' +
    '<div class="recon-info-item"><span class="recon-info-label">' + tr('shift_start') + '</span><span class="recon-info-value">' + new Date(shift.start_time || shift.startTime).toLocaleString(currentLang === 'en' ? 'en-US' : 'ar-EG', {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}) + '</span></div>' +
    '<div class="recon-info-item"><span class="recon-info-label">' + tr('shift_end') + '</span><span class="recon-info-value">' + (isOpen ? '—' : new Date(shift.end_time || shift.endTime).toLocaleString(currentLang === 'en' ? 'en-US' : 'ar-EG', {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})) + '</span></div>' +
  '</div>';

  // Stats cards
  html += '<div class="recon-stats-grid">' +
    '<div class="recon-stat-card"><span class="recon-stat-label">' + tr('recon_expected') + '</span><span class="recon-stat-value recon-expected">' + fmt(expectedCash) + ' ' + cur + '</span></div>' +
    '<div class="recon-stat-card"><span class="recon-stat-label">' + tr('recon_actual') + '</span><span class="recon-stat-value recon-actual">' + fmt(actualCash) + ' ' + cur + '</span></div>' +
    '<div class="recon-stat-card"><span class="recon-stat-label">' + tr('recon_difference') + '</span><span class="recon-stat-value ' + diffColorClass + '">' + diffPrefix + fmt(absDiff) + ' ' + cur + '</span></div>' +
  '</div>';

  // Badge
  html += '<div style="text-align:center;"><span class="recon-variance-badge ' + badgeClass + '">' + badgeText + ' (' + variancePct.toFixed(2) + '%)</span></div>';

  // Sparkline
  html += '<div class="recon-chart-row" style="grid-template-columns:1fr;">' +
    '<div class="recon-chart-card"><p class="recon-chart-title">' + tr('recon_sparkline_title') + '</p><div class="recon-chart-canvas-wrap"><canvas id="reconSparklineCanvas"></canvas></div></div>' +
  '</div>';

  // Donut + Breakdown
  html += '<div class="recon-chart-row">' +
    '<div class="recon-chart-card"><p class="recon-chart-title">' + tr('recon_payment_methods') + '</p><div class="recon-chart-canvas-wrap"><canvas id="reconDonutCanvas"></canvas></div></div>' +
    '<div class="recon-chart-card"><p class="recon-chart-title">' + tr('recon_drawer_breakdown') + '</p><table class="recon-breakdown-table"><tbody>' +
      '<tr><td>💵 ' + tr('shift_opening_cash') + '</td><td>' + fmt(opening) + ' ' + cur + '</td></tr>' +
      '<tr><td>🛒 ' + tr('shift_cash_sales') + ' (' + cashSalesList.length + ')</td><td>+ ' + fmt(cashSales) + ' ' + cur + '</td></tr>' +
      '<tr><td>💰 ' + tr('shift_cash_collections') + '</td><td>+ ' + fmt(cashCollections) + ' ' + cur + '</td></tr>' +
      '<tr><td>↩️ ' + tr('shift_cash_returns') + '</td><td>− ' + fmt(cashReturns) + ' ' + cur + '</td></tr>' +
      '<tr><td>📤 ' + tr('shift_cash_expenses') + '</td><td>− ' + fmt(cashExpenses) + ' ' + cur + '</td></tr>' +
      '<tr class="total"><td>= ' + tr('recon_expected') + '</td><td>' + fmt(expectedCash) + ' ' + cur + '</td></tr>' +
    '</tbody></table></div>' +
  '</div>';

  // Variance Reason (لو الفرق > 5%)
  if (variancePct > 5) {
    const existingReason = (shift.variance_reason || shift.varianceReason || '') || '';
    html += '<div class="recon-reason-box">' +
      '<label>' + tr('recon_variance_reason_label') + '</label>' +
      '<textarea id="reconVarianceReason" maxlength="200" placeholder="' + tr('recon_variance_reason_ph') + '">' + escapeHTML(existingReason) + '</textarea>' +
      '<button type="button" onclick="saveVarianceReason()">💾 ' + tr('recon_save_reason') + '</button>' +
    '</div>';
  } else {
    html += '<p style="text-align:center;font-size:12px;color:var(--text-muted);margin-top:12px;">' + tr('recon_no_reason_needed') + '</p>';
  }

  body.innerHTML = html;

  // ── رسم Charts بعد إدراج الـ HTML ──
  setTimeout(() => _renderReconCharts(cashSales, visaSales, transferSales), 50);
}

function _renderReconCharts(cashSales, visaSales, transferSales) {
  if (typeof Chart === 'undefined') return;

  // Donut
  const donutCanvas = document.getElementById('reconDonutCanvas');
  if (donutCanvas) {
    if (_reconDonutChart) { try { _reconDonutChart.destroy(); } catch(e){} }
    _reconDonutChart = new Chart(donutCanvas, {
      type: 'doughnut',
      data: {
        labels: [tr('cash_sales_label'), tr('visa_sales_label'), tr('bank_transfers_label')],
        datasets: [{
          data: [cashSales, visaSales, transferSales],
          backgroundColor: ['#176b70', '#2563eb', '#d97706'],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 8 } }
        },
        cutout: '60%'
      }
    });
  }

  // Sparkline (آخر 7 ورديات)
  const sparkCanvas = document.getElementById('reconSparklineCanvas');
  if (sparkCanvas) {
    const recent = (state.shifts || [])
      .filter(s => s.end_time || s.endTime)
      .sort((a, b) => new Date(b.end_time || b.endTime) - new Date(a.end_time || a.endTime))
      .slice(0, 7)
      .reverse();

    if (recent.length < 2) {
      sparkCanvas.parentElement.innerHTML = '<p style="text-align:center;color:var(--text-muted);font-size:12px;padding:20px;">' + tr('recon_no_shifts') + '</p>';
    } else {
      if (_reconSparklineChart) { try { _reconSparklineChart.destroy(); } catch(e){} }
      const labels = recent.map(s => new Date(s.end_time || s.endTime).toLocaleDateString(currentLang === 'en' ? 'en-US' : 'ar-EG', {month:'short', day:'numeric'}));
      const data = recent.map(s => Number(s.difference) || 0);
      _reconSparklineChart = new Chart(sparkCanvas, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            data: data,
            borderColor: '#176b70',
            backgroundColor: 'rgba(23, 107, 112, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            pointBackgroundColor: data.map(d => d >= 0 ? '#059669' : '#dc2626')
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, grid: { display: true, color: '#f1f5f9' } },
            x: { grid: { display: false } }
          }
        }
      });
    }
  }
}

async function saveVarianceReason() {
  if (!_reconCurrentShiftId) return;
  const reasonEl = document.getElementById('reconVarianceReason');
  if (!reasonEl) return;
  const reason = reasonEl.value.trim();
  if (!reason) return showNotification(tr('recon_variance_reason_ph'), 'warning');

  const shiftIdx = (state.shifts || []).findIndex(s => s.id === _reconCurrentShiftId);
  if (shiftIdx === -1) return;

  state.shifts[shiftIdx].variance_reason = reason;
  state.shifts[shiftIdx].varianceReason = reason;

  // حفظ في السيرفر عبر تحديث notes
  if (navigator.onLine && supabaseClient) {
    const ownerId = (state.role === 'employee' && state.ownerId) ? state.ownerId : state.currentUser?.id;
    try {
      const existing = state.shifts[shiftIdx].notes || '';
      const marker = '\n\n--- سبب الفرق ---\n';
      const newNotes = existing.includes(marker) 
        ? existing.split(marker)[0] + marker + reason 
        : existing + marker + reason;
      state.shifts[shiftIdx].notes = newNotes;
      await supabaseClient.from('shifts').update({ notes: newNotes }).eq('id', _reconCurrentShiftId).eq('user_id', ownerId);
    } catch (err) { console.warn('Save reason failed:', err); }
  }

  saveData();
  showNotification(tr('recon_reason_saved'), 'success');
}

function printReconciliation() {
  if (!_reconCurrentShiftId) return;
  const shift = (state.shifts || []).find(s => s.id === _reconCurrentShiftId);
  if (!shift) return;

  const cur = state.storeSettings.currency || 'ج.م';
  const fmt = n => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const sid = shift.id;

  const opening = Number(shift.opening_cash ?? shift.openingCash) || 0;
  const shiftSales = (state.sales || []).filter(s => s.shift_id === sid || s.shiftId === sid);
  const cashSales = shiftSales.filter(s => (s.pay_method === 'cash' || s.payMethod === 'cash') && (Number(s.paid) || 0) > 0).reduce((sum, s) => sum + (Number(s.paid) || 0), 0);
  const cashCollections = (state.customerPayments || []).filter(p => (p.shift_id === sid || p.shiftId === sid) && (p.pay_method === 'cash' || p.payMethod === 'cash')).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const cashReturns = (state.returns || []).filter(r => (r.shift_id === sid || r.shiftId === sid) && (r.refund_method === 'cash' || r.refundMethod === 'cash')).reduce((sum, r) => sum + (Number(r.total) || 0), 0);
  const cashExpenses = (state.expenses || []).filter(e => (e.shift_id === sid || e.shiftId === sid) && (e.pay_method === 'cash' || e.payMethod === 'cash')).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const expected = financeCore.calcShiftExpectedCash(sid);
  const actual = Number(shift.actual_cash ?? shift.actualCash) || 0;
  const diff = actual - expected;
  const isOpen = !(shift.end_time || shift.endTime);

  const w = window.open('', '_blank', 'width=800,height=700');
  if (!w) return showNotification(tr('allow_popups_print'), 'warning');

  const shop = escapeHTML(state.storeSettings.name || 'متجري');

  w.document.write('<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>' + tr('recon_title') + '</title>' +
    '<style>body{font-family:Arial,Tahoma,sans-serif;padding:24px;color:#17364c;max-width:720px;margin:auto}h1{color:#176b70;margin:0 0 16px;font-size:20px;text-align:center}h2{font-size:15px;color:#17364c;margin:20px 0 10px;border-bottom:2px solid #176b70;padding-bottom:6px}table{width:100%;border-collapse:collapse;margin:10px 0}td{padding:8px 10px;border-bottom:1px dashed #e1e8ed;font-size:13px}td:last-child{text-align:left;direction:ltr;font-weight:700}tr.total td{border-top:2px solid #176b70;border-bottom:2px solid #176b70;font-weight:900;color:#176b70;padding-top:10px;padding-bottom:10px}.banner{background:#fef3c7;border:2px solid #d97706;padding:12px;border-radius:8px;margin-bottom:16px;color:#92400e;font-weight:800;text-align:center;font-size:13px}.stats{display:flex;justify-content:space-between;gap:10px;margin:12px 0}.stat{flex:1;padding:12px;background:#f1f6f8;border-radius:8px;text-align:center}.stat-label{font-size:11px;color:#687b8b;font-weight:700}.stat-value{font-size:16px;font-weight:900;margin-top:4px;direction:ltr}@media print{body{padding:0}}</style></head><body>' +
    (isOpen ? '<div class="banner">' + tr('recon_open_warning') + '</div>' : '') +
    '<h1>' + shop + ' — ' + tr('recon_title') + '</h1>' +
    '<p style="text-align:center;font-size:12px;color:#687b8b;"><b>' + tr('th_cashier') + ':</b> ' + escapeHTML(shift.cashier_name || shift.cashierName || '-') + ' &nbsp;|&nbsp; ' + tr('shift_start') + ': ' + new Date(shift.start_time || shift.startTime).toLocaleString('ar-EG') + '</p>' +
    '<div class="stats">' +
      '<div class="stat"><div class="stat-label">' + tr('recon_expected') + '</div><div class="stat-value" style="color:#176b70;">' + fmt(expected) + ' ' + cur + '</div></div>' +
      '<div class="stat"><div class="stat-label">' + tr('recon_actual') + '</div><div class="stat-value" style="color:#2563eb;">' + fmt(actual) + ' ' + cur + '</div></div>' +
      '<div class="stat"><div class="stat-label">' + tr('recon_difference') + '</div><div class="stat-value" style="color:' + (diff < 0 ? '#dc2626' : (diff > 0 ? '#059669' : '#64748b')) + ';">' + (diff > 0 ? '+' : (diff < 0 ? '−' : '')) + fmt(Math.abs(diff)) + ' ' + cur + '</div></div>' +
    '</div>' +
    '<h2>' + tr('recon_drawer_breakdown') + '</h2>' +
    '<table><tbody>' +
      '<tr><td>💵 ' + tr('shift_opening_cash') + '</td><td>' + fmt(opening) + ' ' + cur + '</td></tr>' +
      '<tr><td>🛒 ' + tr('shift_cash_sales') + '</td><td>+ ' + fmt(cashSales) + ' ' + cur + '</td></tr>' +
      '<tr><td>💰 ' + tr('shift_cash_collections') + '</td><td>+ ' + fmt(cashCollections) + ' ' + cur + '</td></tr>' +
      '<tr><td>↩️ ' + tr('shift_cash_returns') + '</td><td>− ' + fmt(cashReturns) + ' ' + cur + '</td></tr>' +
      '<tr><td>📤 ' + tr('shift_cash_expenses') + '</td><td>− ' + fmt(cashExpenses) + ' ' + cur + '</td></tr>' +
      '<tr class="total"><td>= ' + tr('recon_expected') + '</td><td>' + fmt(expected) + ' ' + cur + '</td></tr>' +
    '</tbody></table>' +
    '<div style="text-align:center;margin-top:24px;"><button onclick="window.print()" style="padding:10px 24px;border:0;border-radius:8px;background:#176b70;color:#fff;font-weight:700;cursor:pointer;font-size:14px;">🖨️ طباعة</button></div>' +
    '<script>window.onload=function(){setTimeout(function(){window.print()},250)};<\/script></body></html>');
  w.document.close();
}