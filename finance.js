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
  const newExpense = { id: uid('EXP'), user_id: ownerId, name: name, amount: amount, date: date, notes: notes };

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
  const current = state.currentShift;
  const shift = current || state.shifts[0] || null;
  const startTime = shift ? new Date(shift.startTime).getTime() : 0;
  const endTime = shift && shift.endTime ? new Date(shift.endTime).getTime() : Date.now();
  const sales = state.sales.filter(function(s) { const time = new Date(s.date).getTime(); return time >= startTime && time <= endTime; });
  const totalSales = sales.reduce(function(sum, sale) { return sum + (Number(sale.total) || 0); }, 0);
  const cashSales = sales.filter(function(sale) { return (sale.payMethod || sale.paymentMethod) === 'cash'; }).reduce(function(sum, sale) { return sum + (Number(sale.paid) || 0); }, 0);
  const visaSales = sales.filter(function(sale) { return (sale.payMethod || sale.paymentMethod) === 'visa'; }).reduce(function(sum, sale) { return sum + (Number(sale.paid) || 0); }, 0);
  const transferSales = sales.filter(function(sale) { return (sale.payMethod || sale.paymentMethod) === 'transfer'; }).reduce(function(sum, sale) { return sum + (Number(sale.paid) || 0); }, 0);
  const actualCash = current ? (parseFloat(document.getElementById('shiftActualCash').value) || 0) : (Number(shift && shift.actualCash) || 0);

  let drawerExpensesTotal = 0;
  if (current) {
    if (Array.isArray(current.drawerExpenses)) {
      drawerExpensesTotal = current.drawerExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
    } else if (typeof current.drawerExpenses === 'number') {
      drawerExpensesTotal = current.drawerExpenses;
    }
  } else if (shift) {
    drawerExpensesTotal = Number(shift.drawerExpenses) || 0;
  }
  const expectedCash = Math.max(0, cashSales - drawerExpensesTotal);
  const difference = actualCash - expectedCash;

  const en = currentLang === 'en';
  const labels = en ? {title:'Shift Report',shift:'Shift',cashier:'Cashier',start:'Start',end:'End',invoice:'Invoice',date:'Date',customer:'Customer',payment:'Payment',total:'Total',paid:'Paid',summary:'Summary',count:'Invoice Count',sales:'Total Sales',cash:'Cash Sales',visa:'Visa Sales',transfer:'Transfer Sales',drawerExpenses:'Drawer Expenses',expected:'Expected Cash',actual:'Actual Cash',difference:'Difference',thanks:'Generated by Matjari'} : {title:'تقرير الوردية',shift:'الوردية',cashier:'الكاشير',start:'بداية الوردية',end:'نهاية الوردية',invoice:'رقم الفاتورة',date:'التاريخ',customer:'العميل',payment:'طريقة الدفع',total:'الإجمالي',paid:'المدفوع',summary:'الملخص',count:'عدد الفواتير',sales:'مجموع المبيعات',cash:'مبيعات كاش',visa:'مبيعات فيزا',transfer:'مبيعات تحويل',drawerExpenses:'مصروفات الدرج',expected:'الكاش المتوقع',actual:'النقدية الفعلية',difference:'الفرق',thanks:'صادر من متجري'};
  const currency = escapeHTML(state.storeSettings.currency || 'ج.م');
  const shop = escapeHTML(state.storeSettings.name || (en ? 'My Store' : 'متجري'));
  const rows = sales.map(function(sale) {
    const customer = state.customers.find(function(c) { return c.id === sale.customerId; });
    return '<tr><td>' + escapeHTML(sale.id) + '</td><td>' + escapeHTML(new Date(sale.date).toLocaleString(en ? 'en-US' : 'ar-EG')) + '</td><td>' + escapeHTML(customer ? customer.name : (en ? 'Cash Customer' : 'عميل نقدي')) + '</td><td>' + escapeHTML(sale.payMethod || sale.paymentMethod || '-') + '</td><td>' + (Number(sale.total) || 0).toFixed(2) + ' ' + currency + '</td><td>' + (Number(sale.paid) || 0).toFixed(2) + ' ' + currency + '</td></tr>';
  }).join('');
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) return showNotification(en ? 'Allow pop-ups to print the report.' : 'اسمح بالنوافذ المنبثقة لطباعة التقرير.', 'warning');
  win.document.write('<!doctype html><html lang="' + (en?'en':'ar') + '" dir="' + (en?'ltr':'rtl') + '"><head><meta charset="utf-8"><title>' + labels.title + '</title><style>body{font-family:Arial,Tahoma,sans-serif;padding:24px;color:#17364c}h1{color:#176b70}table{width:100%;border-collapse:collapse;margin:18px 0}th{background:#17364c;color:white}th,td{padding:9px;border:1px solid #ccd7df;text-align:' + (en?'left':'right') + '} .summary{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.summary div{padding:12px;background:#f0f6f7;border-radius:8px} @media print{button{display:none}}</style></head><body><h1>' + shop + ' — ' + labels.title + '</h1><p>' + labels.shift + ': ' + escapeHTML(shift ? shift.name || shift.cashierName || shift.id : (en?'Current shift':'الوردية الحالية')) + '</p><p>' + labels.cashier + ': ' + escapeHTML(shift ? shift.cashierName || shift.name || '-' : '-') + '</p><p>' + labels.start + ': ' + (shift ? escapeHTML(new Date(shift.startTime).toLocaleString(en?'en-US':'ar-EG')) : '-') + ' &nbsp; ' + labels.end + ': ' + escapeHTML(new Date(endTime).toLocaleString(en?'en-US':'ar-EG')) + '</p><h2>' + labels.summary + '</h2><section class="summary"><div>' + labels.count + ': <b>' + sales.length + '</b></div><div>' + labels.sales + ': <b>' + totalSales.toFixed(2) + ' ' + currency + '</b></div><div>' + labels.cash + ': <b>' + cashSales.toFixed(2) + ' ' + currency + '</b></div><div>' + labels.visa + ': <b>' + visaSales.toFixed(2) + ' ' + currency + '</b></div><div>' + labels.transfer + ': <b>' + transferSales.toFixed(2) + ' ' + currency + '</b></div><div>' + labels.drawerExpenses + ': <b>' + drawerExpensesTotal.toFixed(2) + ' ' + currency + '</b></div><div>' + labels.expected + ': <b>' + expectedCash.toFixed(2) + ' ' + currency + '</b></div><div>' + labels.actual + ': <b>' + actualCash.toFixed(2) + ' ' + currency + '</b></div><div>' + labels.difference + ': <b>' + difference.toFixed(2) + ' ' + currency + '</b></div></section><table><thead><tr><th>' + labels.invoice + '</th><th>' + labels.date + '</th><th>' + labels.customer + '</th><th>' + labels.payment + '</th><th>' + labels.total + '</th><th>' + labels.paid + '</th></tr></thead><tbody>' + rows + '</tbody></table><p>' + labels.thanks + '</p><button onclick="window.print()">' + (en?'Print':'طباعة') + '</button><script>window.onload=function(){setTimeout(function(){window.print()},250)}<\/script></body></html>');
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
  if (!scopeEl) return showNotification('اختر نطاق التصدير أولاً', 'warning');
  const scope = scopeEl.value;
  let from = '';
  let to = '';

  if (scope === 'custom') {
    from = document.getElementById('exportModalFrom').value || '';
    to = document.getElementById('exportModalTo').value || '';
  }

  closeExportModal();

  if (action === 'print') {
    printTableReportFiltered(type, from, to);
  } else if (action === 'excel') {
    exportTableCSVFiltered(type, from, to);
  } else if (action === 'whatsapp') {
    sendTableWhatsAppFiltered(type, from, to);
  }
}

function getFilteredDataForExport(tableType, from, to) {
  let rawData = [];
  let title = '';
  let headers = [];

  switch (tableType) {
    case 'sales':
      title = 'سجل المبيعات';
      headers = ['رقم', 'التاريخ', 'العميل', 'الإجمالي', 'المدفوع', 'المتبقي'];
      rawData = filterByPeriod(state.sales, 'date', from, to).map(s => {
        const cust = state.customers.find(c => c.id === s.customerId);
        return [s.id, new Date(s.date).toLocaleDateString(currentLang === 'en' ? 'en-US' : 'ar-EG'), cust ? ((cust.name === 'عميل نقدي عام' || cust.name === 'Cash Customer') ? (translations[currentLang] || translations.ar).cash_customer : cust.name) : ((translations[currentLang] || translations.ar).cash_customer), (Number(s.total) || 0).toFixed(2), (Number(s.paid) || 0).toFixed(2), (Number(s.remaining) || 0).toFixed(2)];
      });
      break;
    case 'products':
      title = 'قائمة المنتجات';
      headers = ['الاسم', 'الباركود', 'التصنيف', 'السعر', 'التكلفة', 'المخزون'];
      rawData = state.products.map(p => [p.name, p.barcode || '-', p.category || '-', p.price, p.cost, p.stock]);
      break;
    case 'stockMoves':
      title = 'حركات المخزون';
      headers = ['التاريخ', 'المنتج', 'النوع', 'الكمية', 'قبل', 'بعد', 'السبب'];
      rawData = filterByPeriod(state.stockMoves, 'date', from, to).map(m => [new Date(m.date).toLocaleDateString(currentLang === 'en' ? 'en-US' : 'ar-EG'), m.productName, m.type, m.qty, m.oldStock, m.newStock, m.reason]);
      break;
    case 'returns':
      title = 'المرتجعات';
      headers = ['التاريخ', 'الفاتورة', 'الصنف', 'الكمية', 'السبب'];
      rawData = filterByPeriod(state.returns, 'date', from, to).map(r => [new Date(r.date).toLocaleDateString(currentLang === 'en' ? 'en-US' : 'ar-EG'), r.saleId, r.productName, r.qty, r.reason]);
      break;
    case 'customers':
      title = 'قائمة العملاء';
      headers = ['الاسم', 'الهاتف', 'الديون'];
      rawData = state.customers.map(c => [c.name, c.phone || '-', (Number(c.openingDebt) || 0).toFixed(2)]);
      break;
    case 'customerPayments':
      title = 'تحصيلات العملاء';
      headers = ['التاريخ', 'العميل', 'المبلغ', 'ملاحظات'];
      rawData = filterByPeriod(state.customerPayments, 'date', from, to).map(p => [p.date, p.customerName, (Number(p.amount) || 0).toFixed(2), p.notes || '-']);
      break;
    case 'suppliers':
      title = 'قائمة الموردين';
      headers = ['الاسم', 'الهاتف', 'المستحقات'];
      rawData = state.suppliers.map(s => [s.name, s.phone || '-', (Number(s.openingDebt) || 0).toFixed(2)]);
      break;
    case 'purchases':
      title = 'المشتريات';
      headers = ['التاريخ', 'المورد', 'المنتج', 'الكمية', 'التكلفة', 'الإجمالي'];
      rawData = filterByPeriod(state.purchases, 'date', from, to).map(p => {
        const sup = state.suppliers.find(s => s.id === p.supplierId);
        return [new Date(p.date).toLocaleDateString(currentLang === 'en' ? 'en-US' : 'ar-EG'), sup ? sup.name : '-', p.productName, p.qty, p.cost, (Number(p.total) || 0).toFixed(2)];
      });
      break;
    case 'supplierPayments':
      title = tr('supplier_payments_title');
      headers = ['التاريخ', 'المورد', 'المبلغ', 'ملاحظات'];
      rawData = filterByPeriod(state.supplierPayments, 'date', from, to).map(p => [p.date, p.supplierName, (Number(p.amount) || 0).toFixed(2), p.notes || '-']);
      break;
    case 'expenses':
      title = 'المصروفات';
      headers = ['التاريخ', 'البند', 'المبلغ', 'ملاحظات'];
      rawData = filterByPeriod(state.expenses, 'date', from, to).map(e => [e.date, e.name, (Number(e.amount) || 0).toFixed(2), e.notes || '-']);
      break;
    case 'shifts':
      title = 'سجل الورديات';
      headers = ['التاريخ', 'الكاشير', 'عدد الفواتير', 'الكاش المتوقع', 'الفعلي', 'الفرق'];
      rawData = filterByPeriod(state.shifts, 'endTime', from, to).map(s => [new Date(s.endTime).toLocaleString(currentLang === 'en' ? 'en-US' : 'ar-EG'), s.cashierName, s.saleCount, (Number(s.cashSales) || 0).toFixed(2), (Number(s.actualCash) || 0).toFixed(2), (Number(s.difference) || 0).toFixed(2)]);
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
  csv += '"تاريخ التصدير: ' + new Date().toLocaleString(currentLang === 'en' ? 'en-US' : 'ar-EG') + '"\r\n\r\n';
  csv += data.headers.map(h => '"' + h + '"').join(',') + '\r\n';
  data.rows.forEach(r => {
    csv += r.map(c => '"' + String(c || '').replace(/"/g, '""') + '"').join(',') + '\r\n';
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = data.title + '-' + today() + '.csv';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 100);
  showNotification('تم تصدير ملف Excel ✅');
}

function sendTableWhatsAppFiltered(tableType, from, to) {
  const data = getFilteredDataForExport(tableType, from, to);
  const settings = state.storeSettings || { name: 'Matjari' };
  const esc = value => '"' + String(value == null ? '' : value).replace(/"/g, '""') + '"';
  let csv = '\uFEFF' + esc(settings.name + ' - ' + data.title) + '\r\n';
  csv += esc((currentLang === 'en' ? 'Export date: ' : 'تاريخ التصدير: ') + new Date().toLocaleString()) + '\r\n';
  csv += data.headers.map(esc).join(',') + '\r\n';
  data.rows.forEach(row => { csv += row.map(esc).join(',') + '\r\n'; });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (data.title || 'report').replace(/[\\/:*?"<>|]/g, '-') + '-' + today() + '.csv';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showNotification(currentLang === 'en' ? 'File downloaded. You can now share it on WhatsApp.' : 'تم تنزيل الملف، يمكنك الآن مشاركته على واتساب', 'success');
}

function openPrintWindow(title, headers, rows, settings) {
  const logoHTML = settings.logo
    ? '<img src="' + escapeHTML(settings.logo) + '" style="max-height:60px;max-width:150px">'
    : '';

  let headerHTML = headers.map(h => '<th>' + escapeHTML(h) + '</th>').join('');
  let bodyHTML = '';
  rows.forEach(r => {
    bodyHTML += '<tr>';
    r.forEach(c => { bodyHTML += '<td>' + escapeHTML(c) + '</td>'; });
    bodyHTML += '</tr>';
  });

  if (rows.length === 0) {
    bodyHTML = '<tr><td colspan="' + headers.length + '" style="text-align:center;padding:20px;color:#687b8b">لا توجد بيانات</td></tr>';
  }

  const w = window.open('', '_blank');
  if (!w) return showNotification('اسمح بالنوافذ المنبثقة', 'warning');

  w.document.write(
    '<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>' + escapeHTML(title) + '</title>' +
    '<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Tahoma;background:#fff;padding:20px;color:#203447}' +
    '.header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #17364c;padding-bottom:15px;margin-bottom:20px}' +
    '.header-info h1{margin:0 0 6px;font-size:20px;color:#17364c}.header-info p{margin:2px 0;font-size:12px;color:#687b8b}' +
    '.report-title{text-align:center;font-size:18px;font-weight:800;color:#17364c;margin:15px 0;padding:10px;background:#edf3f9;border-radius:8px}' +
    'table{width:100%;border-collapse:collapse;margin-top:10px}th{background:#17364c;color:#fff;padding:10px;text-align:right;font-size:12px}' +
    'td{padding:8px 10px;border-bottom:1px solid #e9eef2;font-size:12px}tbody tr:nth-child(even){background:#f8fafb}' +
    '.meta{margin-top:20px;text-align:center;font-size:11px;color:#687b8b;padding-top:15px;border-top:1px dashed #dce3ec}' +
    '.actions{margin-top:20px;text-align:center}.actions button{padding:10px 20px;border:0;border-radius:8px;font-weight:700;cursor:pointer;background:#176b70;color:#fff}' +
    '@media print{.actions{display:none}body{padding:0}}</style></head><body>' +
    '<div class="header"><div class="header-info"><h1>' + escapeHTML(settings.name) + '</h1>' +
    (settings.phone ? '<p>📞 ' + escapeHTML(settings.phone) + '</p>' : '') +
    (settings.address ? '<p>📍 ' + escapeHTML(settings.address) + '</p>' : '') +
    '</div><div>' + logoHTML + '</div></div>' +
    '<div class="report-title">' + escapeHTML(title) + '</div>' +
    '<table><thead><tr>' + headerHTML + '</tr></thead><tbody>' + bodyHTML + '</tbody></table>' +
    '<div class="meta">عدد السجلات: ' + rows.length + ' | تاريخ الطباعة: ' + new Date().toLocaleString(currentLang === 'en' ? 'en-US' : 'ar-EG') + '</div>' +
    '<div class="actions"><button onclick="window.print()">🖨️ طباعة</button></div>' +
    '</body></html>'
  );
  w.document.close();
}

/* ============ تقرير المصروفات التفصيلي ============ */
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

/* ============ طباعة التقرير المالي ============ */
function printReportSummary() {
  const container = document.getElementById('reportCards');
  if (!container) return;
  
  const topContainer = document.getElementById('topProductsReportFinance');
  const topHtml = topContainer ? topContainer.innerHTML : '';

  const detailsContainer = document.getElementById('activityDetailsReport');
  const detailsHtml = detailsContainer ? detailsContainer.innerHTML : '';

  const w = window.open('', '_blank');
  
  const printStyles = `
    <style>
      body { font-family: Tahoma, Arial, sans-serif; padding: 20px; direction: rtl; }
      h2 { text-align: center; margin-bottom: 30px; }
      .grid-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
      .stat-card { border: 1px solid #ddd; border-radius: 8px; padding: 15px; text-align: center; background: #fff; page-break-inside: avoid; }
      .stat-card h3 { margin: 0 0 10px 0; font-size: 14px; color: #555; border: none; padding: 0;}
      .stat-card p { margin: 0; font-size: 20px; font-weight: bold; color: #000; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; page-break-inside: auto; }
      tr { page-break-inside: avoid; page-break-after: auto; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
      th { background: #f5f5f5; }
      .card h3 { font-size: 16px; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-top: 20px;}
      .no-print, button, input, select { display: none !important; }
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
