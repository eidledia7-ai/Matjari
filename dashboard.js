/* ============ لوحة التحكم والهدف والتنبيهات ============ */
/* [تعديل] الحسابات المالية تمر عبر financeCore.calcPeriodSummary
   - نستخدم تواريخ حقيقية (مش null)
   - customerDebt / supplierDue / stockValue تُحسب من state مباشرة
*/

function _getAllTimeStart() {
  return '2000-01-01';
}

function _getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

function _getCurrentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const end = now.toISOString().slice(0, 10);
  return { start, end };
}

/**
 * غلاف آمن لاستدعاء financeCore.calcPeriodSummary
 * يرجع object أو null (عشان نعمل fallback في المكان اللي بنستدعي فيه).
 */
function _safeCalcPeriodSummary(from, to) {
  try {
    if (typeof financeCore === 'undefined' ||
        typeof financeCore.calcPeriodSummary !== 'function') {
      return null;
    }
    const s = financeCore.calcPeriodSummary(from, to);
    if (!s || typeof s !== 'object') return null;
    return s;
  } catch (e) {
    console.warn('financeCore.calcPeriodSummary failed:', e);
    return null;
  }
}

function renderDashboard() {
  const cur = state.storeSettings.currency;

  // ===== الحسابات الأساسية من financeCore =====
  const allTimeFrom = _getAllTimeStart();
  const allTimeTo   = _getTodayStr();

  let netSales      = 0;
  let cogs          = 0;
  let expensesTotal = 0;
  let netProfit     = 0;

  const summary = _safeCalcPeriodSummary(allTimeFrom, allTimeTo);
  if (summary) {
    netSales      = Number(summary.net_sales)      || 0;
    cogs          = Number(summary.cogs)           || 0;
    expensesTotal = Number(summary.expenses_total) || 0;
    netProfit     = Number(summary.net_profit)     || 0;
  } else {
    // fallback: الحساب اليدوي القديم
    const totalSales = state.sales.reduce(function(sum, s) {
      return sum + (Number(s.total) || 0);
    }, 0);
    expensesTotal = state.expenses.reduce(function(sum, e) {
      return sum + (Number(e.amount) || 0);
    }, 0);

    let totalCost = 0;
    state.sales.forEach(function(s) {
      if (!s || !Array.isArray(s.items)) return;
      s.items.forEach(function(i) {
        totalCost += (Number(i.cost) || 0) * (Number(i.qty) || 0);
      });
    });

    netSales  = totalSales;
    cogs      = totalCost;
    netProfit = totalSales - totalCost - expensesTotal;
  }

  // ===== customerDebt / supplierDue / stockValue: من state مباشرة =====
  const customerDebt = state.customers.reduce(function(sum, c) {
    return sum + (Number(c.openingDebt) || 0);
  }, 0);

  const supplierDue = state.suppliers.reduce(function(sum, s) {
    return sum + (Number(s.openingDebt) || 0);
  }, 0);

  const stockValue = state.products.reduce(function(sum, p) {
    return sum + ((Number(p.stock) || 0) * (Number(p.cost) || 0));
  }, 0);

  const totalProducts = state.products.length;
  const lowStockCount = state.products.filter(function(p) {
    const min = Number.isFinite(Number(p.minStock)) ? Number(p.minStock) : 5;
    return (Number(p.stock) || 0) <= min;
  }).length;

  // ===== بطاقات الصف الأول =====
  const cardsEl = document.getElementById('dashboardCards');
  if (cardsEl) {
    cardsEl.innerHTML =
      '<div class="stat-card" style="background:linear-gradient(135deg,#c8e5d2,#a9d5bb);border-color:#8ab99f"><h3>' +
        (translations[currentLang] || translations.ar).dash_net_profit +
      '</h3><p style="color:' + (netProfit >= 0 ? '#17643a' : '#c0392b') + '">' +
        netProfit.toFixed(2) + ' ' + cur +
      '</p></div>' +
      '<div class="stat-card"><h3>' + tr('dash_net_sales') + '</h3><p>' + netSales.toFixed(2) + ' ' + cur + '</p></div>' +
      '<div class="stat-card"><h3>' + tr('dash_cost') + '</h3><p>' + cogs.toFixed(2) + ' ' + cur + '</p></div>';
  }

  // ===== بطاقات الصف الثاني =====
  const otherCards = document.getElementById('dashboardOtherCards');
  if (otherCards) {
    otherCards.innerHTML =
      '<div class="stat-card"><h3>' + (translations[currentLang] || translations.ar).dash_products + '</h3><p>' + totalProducts + '</p></div>' +
      '<div class="stat-card"><h3>' + (translations[currentLang] || translations.ar).dash_expenses + '</h3><p>' + expensesTotal.toFixed(2) + ' ' + cur + '</p></div>' +
      '<div class="stat-card"><h3>' + (translations[currentLang] || translations.ar).dash_stock_value + '</h3><p>' + stockValue.toFixed(2) + ' ' + cur + '</p></div>' +
      '<div class="stat-card"><h3>' + (translations[currentLang] || translations.ar).dash_customer_debt + '</h3><p style="color:#c0392b">' + customerDebt.toFixed(2) + ' ' + cur + '</p></div>' +
      '<div class="stat-card"><h3>' + (translations[currentLang] || translations.ar).dash_supplier_due + '</h3><p style="color:#198754">' + supplierDue.toFixed(2) + ' ' + cur + '</p></div>' +
      '<div class="stat-card"><h3>' + (translations[currentLang] || translations.ar).dash_stock_alerts + '</h3><p style="color:' + (lowStockCount > 0 ? '#c62828' : '#17643a') + '">' + lowStockCount + ' ' + (currentLang === 'en' ? 'items' : 'صنف') + '</p></div>';
  }

  renderSmartAlerts();
  renderMonthlyGoal();
  renderSalesChart();
}

function renderSmartAlerts() {
  const container = document.getElementById('smartAlerts');
  if (!container) return;

  let alerts = [];
  const lowStock = state.products.filter(function(p) {
    const min = Number.isFinite(Number(p.minStock)) ? Number(p.minStock) : 5;
    return (Number(p.stock) || 0) <= min;
  });

  if (lowStock.length > 0) {
    alerts.push({
      type: 'danger', icon: '📦',
      title: currentLang === 'en'
        ? '⚠️ ' + lowStock.length + ' products reached the alert level'
        : '⚠️ ' + lowStock.length + ' منتج وصل لحد التنبيه',
      subtitle: currentLang === 'en' ? 'Review inventory and reorder' : 'راجع المخزون وأعد الطلب',
      actionText: currentLang === 'en' ? 'View Inventory' : 'عرض المخزون',
      actionPage: 'invProducts'
    });
  }

  if (alerts.length === 0) {
    container.innerHTML = '';
    return;
  }

  let html = '<div class="card"><h3>' + (currentLang === 'en' ? '🔔 Smart Alerts' : '🔔 تنبيهات ذكية') + '</h3>';
  alerts.forEach(function(a) {
    html += '<div class="smart-alert ' + a.type + '">' +
      '<span class="alert-icon">' + a.icon + '</span>' +
      '<div class="alert-content"><div class="alert-title">' + a.title + '</div><div class="alert-subtitle">' + a.subtitle + '</div></div>' +
      '<button class="alert-action" data-page="' + a.actionPage + '" onclick="showPage(this.dataset.page)">' + a.actionText + '</button>' +
      '</div>';
  });
  html += '</div>';
  container.innerHTML = html;
}

function renderMonthlyGoal() {
  const container = document.getElementById('monthlyGoalCard');
  if (!container) return;
  const goal = parseFloat(state.storeSettings.monthlyGoal) || 0;
  if (goal <= 0) { container.innerHTML = ''; return; }

  const range = _getCurrentMonthRange();
  let actualSales = 0;

  const monthSummary = _safeCalcPeriodSummary(range.start, range.end);
  if (monthSummary) {
    actualSales = Number(monthSummary.net_sales) || 0;
  } else {
    // fallback
    const monthSales = state.sales.filter(function(s) {
      const d = (s.date || '').split('T')[0];
      return d >= range.start && d <= range.end;
    });
    actualSales = monthSales.reduce(function(sum, s) {
      return sum + (Number(s.total) || 0);
    }, 0);
  }

  const percent   = Math.min(100, (actualSales / goal * 100));
  const remaining = Math.max(0, goal - actualSales);
  const cur       = state.storeSettings.currency;

  container.innerHTML =
    '<div class="goal-card">' +
    '<h3>🎯 هدف المبيعات الشهري <span class="goal-badge on-track">' + percent.toFixed(1) + '%</span></h3>' +
    '<div class="goal-header"><div class="goal-values">' +
    '<div class="goal-value"><div class="label">المبيعات</div><div class="value">' + actualSales.toFixed(2) + ' ' + cur + '</div></div>' +
    '<div class="goal-value"><div class="label">الهدف</div><div class="value">' + goal.toFixed(2) + ' ' + cur + '</div></div>' +
    '<div class="goal-value"><div class="label">المتبقي</div><div class="value">' + remaining.toFixed(2) + ' ' + cur + '</div></div>' +
    '</div></div>' +
    '<div class="goal-bar-container"><div class="goal-bar" style="width: ' + percent + '%"></div></div>' +
    '</div>';
}

function renderSalesChart() {
  const container = document.getElementById('salesChart');
  if (!container || typeof Chart === 'undefined') return;

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }

  const data = days.map(function(day) {
    const daySummary = _safeCalcPeriodSummary(day, day);
    if (daySummary) {
      return Number(daySummary.net_sales) || 0;
    }
    // fallback
    return state.sales
      .filter(function(s) { return (s.date || '').split('T')[0] === day; })
      .reduce(function(sum, s) { return sum + (Number(s.total) || 0); }, 0);
  });

  const labels = days.map(function(day) {
    const d = new Date(day + 'T12:00:00');
    return d.toLocaleDateString(currentLang === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'short' });
  });

  if (salesChartInstance) {
    try { salesChartInstance.destroy(); } catch (e) { console.warn('Chart destroy failed', e); }
    salesChartInstance = null;
  }

  const canvas = document.createElement('canvas');
  container.innerHTML = '';
  container.appendChild(canvas);

  salesChartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: currentLang === 'en' ? 'Sales' : 'المبيعات',
        data: data,
        borderColor: '#147d80',
        backgroundColor: 'rgba(20, 125, 128, 0.15)',
        borderWidth: 3,
        fill: true,
        tension: 0.35,
        pointBackgroundColor: '#176b70',
        pointRadius: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true },
        x: { grid: { display: false } }
      }
    }
  });
}