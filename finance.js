/* ============ المصروفات ============ */
async function saveExpense() {
  if (window.isReadOnlyMode) return showNotification('جدد اشتراكك أولاً لإتمام العملية', 'error');
  if (state.role !== 'manager') return showNotification('هذه العملية للمدير فقط', 'warning');

  const name = document.getElementById('expenseName').value.trim();
  const amount = parseFloat(document.getElementById('expenseAmount').value);
  const date = document.getElementById('expenseDate').value || today();
  const notes = document.getElementById('expenseNotes').value.trim();

  if (!name || isNaN(amount) || amount <= 0) return showNotification('أدخل البند والمبلغ بشكل صحيح', 'error');

  const ownerId = state.currentUser.id;
  const newExpense = { 
    id: uid('EXP'), 
    user_id: ownerId, 
    name: name, 
    amount: amount, 
    date: date, 
    notes: notes 
  };

  // الرفع للسيرفر
  if (navigator.onLine && supabaseClient) {
    const { error } = await supabaseClient.from('expenses').insert(newExpense);
    if (error) console.warn('Expense upload failed:', error);
  }

  state.expenses.unshift({ id: newExpense.id, name, amount, date, notes });

  if (typeof addAuditLog === 'function') {
    addAuditLog('add_expense', { id: newExpense.id, name, amount }, newExpense.id);
  }

  saveData();
  document.getElementById('expenseName').value = '';
  document.getElementById('expenseAmount').value = '';
  document.getElementById('expenseNotes').value = '';
  renderExpenses();
  renderDashboard();
  showNotification('تم حفظ المصروف ✅');
}

function renderExpenses() {
  const container = document.getElementById('expensesTable');
  if (!container) return;
  if (state.expenses.length === 0) {
    container.innerHTML = '<p class="text-muted">لا توجد مصروفات.</p>';
    return;
  }
  let html = '<div class="table-wrap"><table class="data-table"><thead><tr><th data-i18n="th_date">التاريخ</th><th data-i18n="th_item_name">البند</th><th data-i18n="th_amount">المبلغ</th><th data-i18n="th_notes">ملاحظات</th><th data-i18n="th_action">إجراء</th></tr></thead><tbody>';
  state.expenses.forEach(function(e) {
    html += '<tr>' +
      '<td>' + escapeHTML(e.date) + '</td>' +
      '<td>' + escapeHTML(e.name) + '</td>' +
      '<td><b>' + Number(e.amount || 0).toFixed(2) + '</b></td>' +
      '<td>' + escapeHTML(e.notes || '-') + '</td>' +
      '<td><button class="small-btn red" onclick="safeDeleteRecord(\'expense\', \'' + e.id + '\')">حذف خطأ</button></td>' +
      '</tr>';
  });
  html += '</tbody></table></div>';
  container.innerHTML = html;
}

/* ============ التقارير ============ */
function filterByPeriod(items, dateField, from, to) {
  return items.filter(function(item) {
    const d = (item[dateField] || '').split('T')[0];
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  });
}

function renderReports() {
  const from = (document.getElementById('reportFrom') || {}).value || '';
  const to = (document.getElementById('reportTo') || {}).value || '';

  const filteredSales = filterByPeriod(state.sales, 'date', from, to);
  const filteredExpenses = filterByPeriod(state.expenses, 'date', from, to);
  const filteredReturns = filterByPeriod(state.returns, 'date', from, to);

  const fmt = (num) => Number(num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const totalSales = filteredSales.reduce(function(sum, s) { return sum + Number(s.total || 0); }, 0);
  const totalDiscount = filteredSales.reduce(function(sum, s) { return sum + Number(s.discount || 0); }, 0);

  let totalCost = 0;
  filteredSales.forEach(function(s) {
    if (s.items && Array.isArray(s.items)) {
      s.items.forEach(function(i) { totalCost += (Number(i.cost) || 0) * (Number(i.qty) || 0); });
    }
  });

  const totalExpenses = filteredExpenses.reduce(function(sum, e) { return sum + Number(e.amount || 0); }, 0);
  const netProfit = totalSales - totalCost - totalExpenses;
  const avgInvoice = filteredSales.length > 0 ? totalSales / filteredSales.length : 0;

  const cardsContainer = document.getElementById('reportCards');
  if (cardsContainer) {
    cardsContainer.innerHTML =
      '<div class="stat-card"><h3>' + (translations[currentLang] || translations.ar).dash_total_sales + '</h3><p>' + fmt(totalSales) + ' ' + state.storeSettings.currency + '</p></div>' +
      '<div class="stat-card"><h3>عدد الفواتير</h3><p>' + filteredSales.length + '</p></div>' +
      '<div class="stat-card"><h3>متوسط الفاتورة</h3><p>' + fmt(avgInvoice) + ' ' + state.storeSettings.currency + '</p></div>' +
      '<div class="stat-card"><h3>' + tr('total_cost') + '</h3><p>' + fmt(totalCost) + ' ' + state.storeSettings.currency + '</p></div>' +
      '<div class="stat-card"><h3>' + (translations[currentLang] || translations.ar).dash_expenses + '</h3><p>' + fmt(totalExpenses) + ' ' + state.storeSettings.currency + '</p></div>' +
      '<div class="stat-card" style="background:linear-gradient(135deg,#c8e5d2,#a9d5bb);border-color:#8ab99f">' +
      '<h3>' + (translations[currentLang] || translations.ar).dash_net_profit + '</h3>' +
      '<p style="color:' + (netProfit >= 0 ? '#17643a' : '#c0392b') + '">' + fmt(netProfit) + ' ' + state.storeSettings.currency + '</p>' +
      '</div>';
  }

  const daily = document.getElementById('dailyReport');
  if (daily) {
    daily.innerHTML =
      '<p>عدد الفواتير: <b>' + filteredSales.length + '</b></p>' +
      '<p>' + tr('total_discounts') + ': <b>' + fmt(totalDiscount) + ' ' + state.storeSettings.currency + '</b></p>' +
      '<p>عدد المرتجعات: <b>' + filteredReturns.length + '</b></p>' +
      '<p>عدد المصروفات: <b>' + filteredExpenses.length + '</b></p>';
  }

  const cashSales = filteredSales.filter(s => s.payMethod === 'cash').reduce((sum, s) => sum + Number(s.paid || 0), 0);
  const cardSales = filteredSales.filter(s => s.payMethod === 'visa' || s.payMethod === 'card').reduce((sum, s) => sum + Number(s.paid || 0), 0);
  const transferSales = filteredSales.filter(s => s.payMethod === 'transfer').reduce((sum, s) => sum + Number(s.paid || 0), 0);
  const debtSales = filteredSales.reduce((sum, s) => sum + Number(s.remaining || 0), 0);

  const customerTotals = {};
  filteredSales.forEach(s => {
    if (s.customerId) {
      const custName = state.customers.find(c => c.id === s.customerId)?.name || 'نقدي';
      if (custName !== 'عميل نقدي عام') {
        customerTotals[custName] = (customerTotals[custName] || 0) + Number(s.total || 0);
      }
    }
  });
  const topCustomers = Object.entries(customerTotals).sort((a, b) => b[1] - a[1]).slice(0, 5);

  let detailsHtml = `
    <div class="grid-2 mt-20">
      <div class="card">
        <h3>💵 تفاصيل طرق الدفع</h3>
        <table class="data-table">
          <tbody>
            <tr><td>💵 مبيعات كاش</td><td><b>${fmt(cashSales)}</b></td></tr>
            <tr><td>💳 مبيعات فيزا</td><td><b>${fmt(cardSales)}</b></td></tr>
            <tr><td>📲 تحويلات بنكية</td><td><b>${fmt(transferSales)}</b></td></tr>
            <tr style="background:#fef2f2"><td>⚠️ ديون (متبقي في الفواتير)</td><td><b class="red-text">${fmt(debtSales)}</b></td></tr>
          </tbody>
        </table>
      </div>
      
      <div class="card">
        <h3>🏆 أفضل العملاء في الفترة</h3>
        ${topCustomers.length > 0 ? `
        <table class="data-table">
          <tbody>
            ${topCustomers.map((c, idx) => `
              <tr>
                <td>${idx + 1}. ${escapeHTML(c[0])}</td>
                <td><b>${fmt(c[1])}</b> ${state.storeSettings.currency}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ` : '<p class="text-muted text-center" style="padding: 20px;">لا توجد مبيعات لعملاء مسجلين في هذه الفترة.</p>'}
      </div>
    </div>
  `;

  let activityContainer = document.getElementById('activityDetailsReport');
  if (activityContainer) {
    activityContainer.innerHTML = detailsHtml;
  }

  // [إصلاح] الأكثر مبيعاً
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
      topContainer.innerHTML = '<p class="text-muted text-center" style="padding: 20px;">لا توجد مبيعات مسجلة في هذه الفترة.</p>';
    } else {
      let html = '<div class="table-wrap"><table class="data-table"><thead><tr><th>#</th><th data-i18n="th_product">المنتج</th><th data-i18n="th_quantity">الكمية</th><th data-i18n="th_value">القيمة</th></tr></thead><tbody>';
      top.forEach(function(t, i) {
        html += '<tr><td>' + (i + 1) + '</td><td>' + escapeHTML(t.name) + '</td><td><b>' + t.qty + '</b></td><td>' + fmt(t.total) + '</td></tr>';
      });
      html += '</tbody></table></div>';
      topContainer.innerHTML = html;
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
  if (period === 'currentMonth') {
    const now = new Date();
    from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  }
  if (period === 'year') {
    const now = new Date();
    from = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
  }

  document.getElementById('reportFrom').value = from;
  document.getElementById('reportTo').value = end;
  renderReports();
}

function clearReportPeriod() {
  document.getElementById('reportFrom').value = '';
  document.getElementById('reportTo').value = '';
  renderReports();
}

/* ============ الورديات ============ */
function calcExpectedShiftCash() {
  const shift = state.currentShift;
  if (!shift) {
    const el = document.getElementById('shiftExpectedCash');
    if (el) el.value = '0.00 ' + state.storeSettings.currency;
    calculateShiftDiff();
    return;
  }

  const shiftStart = new Date(shift.startTime).getTime();
  let cashSales = 0;
  state.sales.forEach(function(s) {
    const saleTime = new Date(s.date).getTime();
    if (saleTime >= shiftStart && s.payMethod === 'cash') {
      cashSales += Number(s.paid || 0);
    }
  });

  let drawerExpensesTotal = 0;
  if (shift.drawerExpenses) {
    if (Array.isArray(shift.drawerExpenses)) {
       drawerExpensesTotal = shift.drawerExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
    } else if (typeof shift.drawerExpenses === 'number') {
       drawerExpensesTotal = shift.drawerExpenses;
    }
  }
  
  const expectedCash = Math.max(0, cashSales - drawerExpensesTotal);

  const el = document.getElementById('shiftExpectedCash');
  if (el) el.value = expectedCash.toFixed(2) + ' ' + state.storeSettings.currency;
  
  calculateShiftDiff();
}

function calculateShiftDiff() {
  const expEl = document.getElementById('shiftExpectedCash');
  const actEl = document.getElementById('shiftActualCash');
  const diffEl = document.getElementById('shiftDifference');
  if (!expEl || !actEl || !diffEl) return;

  const expected = parseFloat(expEl.value) || 0;
  const actual = parseFloat(actEl.value) || 0;
  const diff = actual - expected;

  if (diff < 0) {
    diffEl.value = diff.toFixed(2) + ' ' + state.storeSettings.currency + ' (عجز ⚠️)';
    diffEl.style.color = '#c62828';
  } else if (diff > 0) {
    diffEl.value = diff.toFixed(2) + ' ' + state.storeSettings.currency + ' (زيادة 🟢)';
    diffEl.style.color = '#2e7d32';
  } else {
    diffEl.value = '0.00 ' + state.storeSettings.currency + ' (مطابق ✅)';
    diffEl.style.color = '#17643a';
  }
}

async function closeShift() {
  if (state.role !== 'manager') return showNotification('هذه العملية للمدير فقط', 'warning');

  const cashierName = (document.getElementById('shiftCashierName').value || '').trim();
  if (!cashierName) return showNotification('اكتب اسم الكاشير', 'error');

  const actualCash = parseFloat(document.getElementById('shiftActualCash').value) || 0;
  const notes = (document.getElementById('shiftNotes').value || '').trim();

  if (!state.currentShift) {
    state.currentShift = {
      id: uid('SHIFT'), name: cashierName, cashierName: cashierName, startTime: new Date().toISOString()
    };
  }

  const shiftStart = new Date(state.currentShift.startTime).getTime();
  const shiftSales = state.sales.filter(function(s) {
    return new Date(s.date).getTime() >= shiftStart;
  });

  const cashSales = shiftSales
  .filter(function(s) { return s.payMethod === 'cash'; })
  .reduce(function(sum, s) { return sum + Number(s.paid || 0); }, 0);

  const totalSales = shiftSales.reduce(function(sum, s) { return sum + Number(s.total || 0); }, 0);

  let drawerExpensesTotal = 0;
  if (Array.isArray(state.currentShift.drawerExpenses)) {
    drawerExpensesTotal = state.currentShift.drawerExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  } else if (typeof state.currentShift.drawerExpenses === 'number') {
    drawerExpensesTotal = state.currentShift.drawerExpenses;
  }

  const expectedCash = Math.max(0, cashSales - drawerExpensesTotal);
  const drawerListSnapshot = Array.isArray(state.currentShift.drawerExpenses) ? state.currentShift.drawerExpenses.slice() : [];

  const closedShift = {
    id: state.currentShift.id, name: cashierName, cashierName: cashierName,
    startTime: state.currentShift.startTime, endTime: new Date().toISOString(),
    saleCount: shiftSales.length, totalSales: totalSales, cashSales: cashSales, 
    drawerExpenses: drawerExpensesTotal, drawerExpensesList: drawerListSnapshot,
    actualCash: actualCash, difference: actualCash - expectedCash, notes: notes
  };

  const ownerId = state.currentUser.id;

  // الرفع للسيرفر
  if (navigator.onLine && supabaseClient) {
    await supabaseClient.from('shifts').insert({
      id: closedShift.id, user_id: ownerId, cashier_name: cashierName, start_time: closedShift.startTime,
      end_time: closedShift.endTime, actual_cash: actualCash, difference: closedShift.difference, notes: notes
    });
  }

  state.shifts.unshift(closedShift);
  state.currentShift = null;

  if (typeof addAuditLog === 'function') {
    addAuditLog('close_shift', {
      shiftId: closedShift.id, cashierName: closedShift.cashierName, cashSales: cashSales,
      drawerExpenses: drawerExpensesTotal, actualCash: actualCash, difference: closedShift.difference
    }, closedShift.id);
  }

  saveData();
  document.getElementById('shiftCashierName').value = '';
  document.getElementById('shiftActualCash').value = '';
  document.getElementById('shiftDifference').value = '';
  document.getElementById('shiftNotes').value = '';

  calcExpectedShiftCash();
  renderShifts();
  showNotification('تم إغلاق الوردية وحفظها ✅');
}

function renderShifts() {
  const container = document.getElementById('shiftsTable');
  if (!container) return;
  if (state.shifts.length === 0) {
    container.innerHTML = '<p class="text-muted">لا توجد ورديات مغلقة.</p>';
    return;
  }
  let html = '<div class="table-wrap"><table class="data-table"><thead><tr><th data-i18n="th_date">التاريخ</th><th data-i18n="th_cashier">الكاشير</th><th data-i18n="th_invoice_count">عدد الفواتير</th><th data-i18n="th_expected_cash">الكاش المتوقع</th><th data-i18n="th_actual_cash">الكاش الفعلي</th><th data-i18n="th_difference">الفرق</th></tr></thead><tbody>';
  state.shifts.forEach(function(s) {
    const diffClass = s.difference < 0 ? 'red-text' : (s.difference > 0 ? 'green-text' : '');
    html += '<tr>' +
      '<td>' + new Date(s.endTime).toLocaleString(currentLang === 'en' ? 'en-US' : 'ar-EG') + '</td>' +
      '<td>' + escapeHTML(s.cashierName) + '</td>' +
      '<td>' + s.saleCount + '</td>' +
      '<td>' + Number(s.cashSales || 0).toFixed(2) + '</td>' +
      '<td>' + Number(s.actualCash || 0).toFixed(2) + '</td>' +
      '<td class="' + diffClass + '"><b>' + Number(s.difference || 0).toFixed(2) + '</b></td>' +
      '</tr>';
  });
  html += '</tbody></table></div>';
  container.innerHTML = html;
}

function printShiftReport() {
  // ... نفس كود الطباعة القديم
}

/* ============ خيارات التصدير والطباعة ============ */
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
  // ... نفس كود التصدير القديم
}

function getFilteredDataForExport(tableType, from, to) {
  // ... نفس كود التصدير القديم
}

function printTableReportFiltered(tableType, from, to) {
  // ... نفس كود التصدير القديم
}

function exportTableCSVFiltered(tableType, from, to) {
  // ... نفس كود التصدير القديم
}

function sendTableWhatsAppFiltered(tableType, from, to) {
  // ... نفس كود التصدير القديم
}

function openPrintWindow(title, headers, rows, settings) {
  // ... نفس كود التصدير القديم
}

/* ============ [إضافة] تقرير المصروفات التفصيلي ============ */
function openExpensesDetailReport() {
  const modal = document.getElementById('expensesReportModal');
  if (modal) {
    setExpenseReportPeriod('currentMonth');
    modal.style.display = 'flex';
  }
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
  if (period === 'currentMonth') {
    const now = new Date();
    from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  }
  if (period === 'year') {
    const now = new Date();
    from = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
  }
  document.getElementById('expReportFrom').value = from;
  document.getElementById('expReportTo').value = period === 'all' ? '' : end;
}

function printExpensesDetail() {
  const from = document.getElementById('expReportFrom').value;
  const to = document.getElementById('expReportTo').value;
  
  const filtered = filterByPeriod(state.expenses, 'date', from, to);
  const total = filtered.reduce((sum, e) => sum + Number(e.amount), 0);

  let html = `
    <html dir="rtl"><head><title>تقرير المصروفات</title>
    <style>body{font-family:Tahoma;padding:20px;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #ddd;padding:8px;text-align:right;}</style>
    </head><body>
    <h2>تقرير المصروفات (${from || 'البداية'} - ${to || 'النهاية'})</h2>
    <h3>الإجمالي: ${total.toFixed(2)} ${state.storeSettings.currency}</h3>
    <table><tr><th>التاريخ</th><th>البند</th><th>المبلغ</th><th>ملاحظات</th></tr>
  `;
  
  filtered.forEach(e => {
    html += `<tr><td>${e.date}</td><td>${e.name}</td><td>${e.amount}</td><td>${e.notes || '-'}</td></tr>`;
  });
  html += `</table><script>window.onload=function(){setTimeout(function(){window.print()},300)};<\/script></body></html>`;

  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
  closeExpensesReportModal();
}

/* ============ [إصلاح] طباعة تقرير التقارير ============ */
function printReportSummary() {
  const container = document.getElementById('reportCards');
  if (!container) return;
  
  const topContainer = document.getElementById('topProductsReportFinance');
  const topHtml = topContainer ? topContainer.innerHTML : '';

  const detailsContainer = document.getElementById('activityDetailsReport');
  const detailsHtml = detailsContainer ? detailsContainer.innerHTML : '';

  const w = window.open('', '_blank');
  
  // بنجهز ستايل مخصص للطباعة يخفي الأزرار
  const printStyles = `
    <style>
      body { font-family: Tahoma, Arial, sans-serif; padding: 20px; direction: rtl; }
      h2 { text-align: center; margin-bottom: 30px; }
      .grid-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
      .stat-card { border: 1px solid #ddd; border-radius: 8px; padding: 15px; text-align: center; background: #fff; }
      .stat-card h3 { margin: 0 0 10px 0; font-size: 14px; color: #555; border: none; padding: 0;}
      .stat-card p { margin: 0; font-size: 20px; font-weight: bold; color: #000; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
      th { background: #f5f5f5; }
      .card h3 { font-size: 16px; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-top: 20px;}
    </style>
  `;

  w.document.write(`
    <html dir="rtl">
    <head><title>تقرير مالي - ${escapeHTML(state.storeSettings.name)}</title>${printStyles}</head>
    <body>
      <h2>التقرير المالي - ${escapeHTML(state.storeSettings.name)}</h2>
      
      <div>${container.innerHTML}</div>
      
      ${detailsHtml ? `<div>${detailsHtml}</div>` : ''}
      
      ${topHtml ? `<div style="margin-top: 20px;"><h3>الأكثر مبيعاً</h3>${topHtml}</div>` : ''}
      
      <script>window.onload=function(){setTimeout(function(){window.print()},300)};<\/script>
    </body>
    </html>
  `);
  w.document.close();
}