/* ============ لوحة التحكم والهدف والتنبيهات ============ */

function _getAllTimeStart() {
  return '2000-01-01';
}

function _getTodayStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function _getCurrentMonthRange() {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = now;
  
  const sy = startDate.getFullYear();
  const sm = String(startDate.getMonth() + 1).padStart(2, '0');
  const sd = String(startDate.getDate()).padStart(2, '0');
  
  const ey = endDate.getFullYear();
  const em = String(endDate.getMonth() + 1).padStart(2, '0');
  const ed = String(endDate.getDate()).padStart(2, '0');
  
  return { start: `${sy}-${sm}-${sd}`, end: `${ey}-${em}-${ed}` };
}

function _safeCalcPeriodSummary(from, to) {
  try {
    if (typeof financeCore === 'undefined' || typeof financeCore.calcPeriodSummary !== 'function') return null;
    const s = financeCore.calcPeriodSummary(from, to);
    if (!s || typeof s !== 'object') return null;
    return s;
  } catch (e) {
    console.warn('financeCore.calcPeriodSummary failed:', e);
    return null;
  }
}

function _safeCustomerBalance(custId) {
  try {
    if (typeof financeCore === 'undefined' || typeof financeCore.calcCustomerBalance !== 'function') return null;
    const v = financeCore.calcCustomerBalance(custId);
    return Number.isFinite(Number(v)) ? Number(v) : 0;
  } catch (e) {
    console.warn('calcCustomerBalance failed:', e);
    return null;
  }
}

function _safeSupplierBalance(supId) {
  try {
    if (typeof financeCore === 'undefined' || typeof financeCore.calcSupplierBalance !== 'function') return null;
    const v = financeCore.calcSupplierBalance(supId);
    return Number.isFinite(Number(v)) ? Number(v) : 0;
  } catch (e) {
    console.warn('calcSupplierBalance failed:', e);
    return null;
  }
}

function renderDashboard() {
  const cur = currencyLabel();
  const todayStr = _getTodayStr();
  
  // 1. حساب مبيعات اليوم
  let todaySales = 0, todayProfit = 0;
  const summary = _safeCalcPeriodSummary(todayStr, todayStr);
  if (summary) {
    todaySales = Number(summary.net_sales) || 0;
    todayProfit = Number(summary.net_profit) || 0;
  } else {
    todaySales = state.sales.filter(s => (s.date||'').split('T')[0] === todayStr).reduce((sum, s) => sum + (Number(s.total)||0), 0);
  }

  // 2. الرقم الكبير (يوجه لسجل المبيعات)
  const bigEl = document.getElementById('homeBigNumber');
  if (bigEl) {
    bigEl.innerHTML = `
      <div class="big-card" onclick="showPage('salesLog')">
        <div class="big-title">${tr('dash_net_sales')} (اليوم) <span>➔</span></div>
        <div class="big-value">${todaySales.toFixed(2)} <span style="font-size:20px;">${cur}</span></div>
        <div class="big-sub">صافي الربح: ${todayProfit.toFixed(2)} ${cur}</div>
      </div>
    `;
  }

  // 3. حساب الأرقام للإحصائيات السريعة
  const customerDebt = state.customers.reduce((sum, c) => {
    if (c.name === 'عميل نقدي عام' || c.name === 'Cash Customer') return sum;
    const bal = _safeCustomerBalance(c.id);
    return sum + (bal === null ? (Number(c.openingDebt ?? c.opening_debt) || 0) : Math.max(0, bal));
  }, 0);

  const supplierDue = state.suppliers.reduce((sum, s) => {
    const bal = _safeSupplierBalance(s.id);
    return sum + (bal === null ? (Number(s.openingDebt ?? s.opening_debt) || 0) : Math.max(0, bal));
  }, 0);

  const totalProducts = state.products.length;
  const lowStockCount = state.products.filter(p => (Number(p.stock)||0) <= (Number(p.minStock||p.min_stock)||5)).length;

  // 4. الكروت القابلة للنقر
  const otherCards = document.getElementById('dashboardOtherCards');
  if (otherCards) {
    const cardStyle = 'padding:12px; cursor:pointer; transition:transform 0.1s;';
    const activeEffect = `onmousedown="this.style.transform='scale(0.95)'" onmouseup="this.style.transform='scale(1)'" onmouseleave="this.style.transform='scale(1)'"`;
    
    otherCards.innerHTML = `
      <div class="stat-card" style="${cardStyle}" onclick="showPage('partCustomers')" ${activeEffect}>
        <h3 style="font-size:12px; display:flex; justify-content:space-between;">${tr('dash_customer_debt')} <span>➔</span></h3>
        <p style="font-size:16px;color:#c0392b">${customerDebt.toFixed(2)}</p>
      </div>
      
      <div class="stat-card" style="${cardStyle}" onclick="showPage('partSuppliers')" ${activeEffect}>
        <h3 style="font-size:12px; display:flex; justify-content:space-between;">${tr('dash_supplier_due')} <span>➔</span></h3>
        <p style="font-size:16px;color:#198754">${supplierDue.toFixed(2)}</p>
      </div>
      
      <div class="stat-card" style="${cardStyle}" onclick="showPage('invProducts')" ${activeEffect}>
        <h3 style="font-size:12px; display:flex; justify-content:space-between;">${tr('dash_stock_alerts')} <span>➔</span></h3>
        <p style="font-size:16px;color:${lowStockCount>0?'#c62828':'#17643a'}">${lowStockCount} ${tr('items_word')}</p>
      </div>
      
      <div class="stat-card" style="${cardStyle}" onclick="showPage('invProducts')" ${activeEffect}>
        <h3 style="font-size:12px; display:flex; justify-content:space-between;">${tr('dash_products')} <span>➔</span></h3>
        <p style="font-size:16px;">${totalProducts}</p>
      </div>
    `;
  }

  // 5. استدعاء باقي الدوال القديمة (لم نلمسها)
  renderSmartAlerts();
  renderMonthlyGoal();
  renderSalesChart();
  renderDashboardTopProducts();
}

// ✅ v7.9.2 - دالة عرض الأكثر مبيعاً (صافي الكمية) في الصفحة الرئيسية
function renderDashboardTopProducts() {
  const container = document.getElementById('topProductsReport');
  if (!container) return;

  const allTimeFrom = _getAllTimeStart();
  const allTimeTo = _getTodayStr();

  let top = [];
  if (typeof financeCore !== 'undefined' && typeof financeCore.calcProductProfitReport === 'function') {
    const allProfitData = financeCore.calcProductProfitReport(allTimeFrom, allTimeTo);
    top = allProfitData
      .filter(p => Number(p.net_qty) > 0)
      .sort((a, b) => Number(b.net_qty) - Number(a.net_qty))
      .slice(0, 5);
  }

  if (top.length === 0) {
    container.innerHTML = '<p class="text-muted text-center" style="padding: 20px;">' + tr('no_period_sales') + '</p>';
    return;
  }

  const fmt = (num) => Number(num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  let html = '<div class="table-wrap"><table class="data-table"><thead><tr>' +
    '<th>#</th>' +
    '<th data-i18n="th_product">' + tr('th_product') + '</th>' +
    '<th>' + tr('profit_net_qty') + '</th>' +
    '<th>' + tr('profit_net_revenue') + '</th>' +
    '</tr></thead><tbody>';
  top.forEach(function(t, i) {
    html += '<tr>' +
      '<td>' + (i + 1) + '</td>' +
      '<td>' + escapeHTML(t.product_name) + '</td>' +
      '<td><b>' + t.net_qty + '</b></td>' +
      '<td>' + fmt(t.net_revenue_ex_vat) + '</td>' +
      '</tr>';
  });
  html += '</tbody></table></div>';
  container.innerHTML = html;
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
      title: tr('low_stock_notif_1') + lowStock.length + tr('low_stock_notif_2'),
      subtitle: tr('review_inventory'),
      actionText: tr('view_inventory'),
      actionPage: 'invProducts'
    });
  }

  if (alerts.length === 0) {
    container.innerHTML = '';
    return;
  }

  let html = '<div class="card"><h3>' + tr('smart_alerts') + '</h3>';
  alerts.forEach(function(a) {
    html += '<div class="smart-alert ' + a.type + '">' +
      '<span class="alert-icon">' + a.icon + '</span>' +
      '<div class="alert-content"><div class="alert-title">' + a.title + '</div><div class="alert-subtitle">' + a.subtitle + '</div></div>' +
    '<button class="btn primary" style="padding: 8px 16px; font-size: 13px; color: white; background: #176b70; border: none; border-radius: 6px; cursor: pointer; width: auto; white-space: nowrap;" data-page="' + a.actionPage + '" onclick="showPage(this.dataset.page)">' + a.actionText + '</button>'  +
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
    '<h3>🎯 ' + tr('monthly_goal_title') + ' <span class="goal-badge on-track">' + percent.toFixed(1) + '%</span></h3>' +
    '<div class="goal-header"><div class="goal-values">' +
    '<div class="goal-value"><div class="label">' + tr('monthly_goal_sales') + '</div><div class="value">' + actualSales.toFixed(2) + ' ' + cur + '</div></div>' +
    '<div class="goal-value"><div class="label">' + tr('monthly_goal_target') + '</div><div class="value">' + goal.toFixed(2) + ' ' + cur + '</div></div>' +
    '<div class="goal-value"><div class="label">' + tr('monthly_goal_remaining') + '</div><div class="value">' + remaining.toFixed(2) + ' ' + cur + '</div></div>' +
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
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    days.push(`${y}-${m}-${day}`);
  }

  const data = days.map(function(day) {
    const daySummary = _safeCalcPeriodSummary(day, day);
    if (daySummary) {
      return Number(daySummary.net_sales) || 0;
    }
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
        label: tr('compare_sales'),
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