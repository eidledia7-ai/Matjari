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
function renderMonthlyGoal() {
  const container = document.getElementById('monthlyGoalCard');
  if (!container) return;
  const goal = parseFloat(state.storeSettings.monthlyGoal) || 0;
  const cur = state.storeSettings.currency || 'ج.م';
  const fmt = n => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // لا هدف محدد
  if (goal <= 0) {
    container.innerHTML =
      '<div class="goal-card">' +
        '<div class="monthly-goal-empty">' +
          '<p>' + tr('monthly_goal_empty') + '</p>' +
          '<button type="button" class="btn primary" onclick="_openMonthlyGoalEdit()" style="padding:10px 24px;">' + tr('monthly_goal_set_btn') + '</button>' +
        '</div>' +
        '<div id="monthlyGoalEditBox" style="display:none;">' +
          '<div class="monthly-goal-input-row">' +
            '<input type="number" id="monthlyGoalInput" min="0" step="any" placeholder="50000" />' +
            '<button type="button" class="mg-save" onclick="_saveMonthlyGoal()">' + tr('monthly_goal_save') + '</button>' +
            '<button type="button" class="mg-cancel" onclick="_cancelMonthlyGoalEdit()">' + tr('monthly_goal_cancel') + '</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    return;
  }

  // فيه هدف — نحسب التقدم
  const range = _getCurrentMonthRange();
  let actualSales = 0;
  const monthSummary = _safeCalcPeriodSummary(range.start, range.end);
  if (monthSummary) actualSales = Number(monthSummary.net_sales) || 0;

  const percent = Math.min(100, (actualSales / goal * 100));
  const remaining = Math.max(0, goal - actualSales);
  const achieved = percent >= 100;

  // "محتاج X في اليوم" — بناءً على أيام الشهر المتبقية
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = Math.max(1, lastDay - now.getDate() + 1);
  const dailyNeeded = remaining > 0 ? remaining / daysLeft : 0;

  let html = '<div class="goal-card">' +
    '<h3 style="display:flex;justify-content:space-between;align-items:center;">' +
      '<span>🎯 ' + tr('monthly_goal_title') + ' <span class="goal-badge on-track">' + percent.toFixed(1) + '%</span></span>' +
      '<button type="button" class="monthly-goal-edit-btn" onclick="_openMonthlyGoalEdit()">' + tr('monthly_goal_edit') + '</button>' +
    '</h3>' +
    '<div class="goal-header"><div class="goal-values">' +
      '<div class="goal-value"><div class="label">' + tr('monthly_goal_sales') + '</div><div class="value">' + fmt(actualSales) + ' ' + cur + '</div></div>' +
      '<div class="goal-value"><div class="label">' + tr('monthly_goal_target') + '</div><div class="value">' + fmt(goal) + ' ' + cur + '</div></div>' +
      '<div class="goal-value"><div class="label">' + tr('monthly_goal_remaining') + '</div><div class="value">' + fmt(remaining) + ' ' + cur + '</div></div>' +
    '</div></div>' +
    '<div class="goal-bar-container"><div class="goal-bar" style="width:' + percent + '%"></div></div>';

  if (achieved) {
    html += '<div class="monthly-goal-achieved">' + tr('monthly_goal_achieved') + '</div>';
  } else if (dailyNeeded > 0) {
    html += '<div class="monthly-goal-daily-needed">' + tr('monthly_goal_daily_needed').replace('{amount}', fmt(dailyNeeded)).replace('{cur}', cur) + '</div>';
  }

  html += '<div id="monthlyGoalEditBox" style="display:none;">' +
    '<div class="monthly-goal-input-row">' +
      '<input type="number" id="monthlyGoalInput" min="0" step="any" value="' + goal + '" />' +
      '<button type="button" class="mg-save" onclick="_saveMonthlyGoal()">' + tr('monthly_goal_save') + '</button>' +
      '<button type="button" class="mg-cancel" onclick="_cancelMonthlyGoalEdit()">' + tr('monthly_goal_cancel') + '</button>' +
    '</div>' +
  '</div>' +
  '</div>';

  container.innerHTML = html;
}

function _openMonthlyGoalEdit() {
  const box = document.getElementById('monthlyGoalEditBox');
  if (!box) return;
  box.style.display = 'block';
  const inp = document.getElementById('monthlyGoalInput');
  if (inp) { inp.focus(); inp.select(); }
}

function _cancelMonthlyGoalEdit() {
  const box = document.getElementById('monthlyGoalEditBox');
  if (box) box.style.display = 'none';
}

async function _saveMonthlyGoal() {
  if (state.role !== 'manager') return showNotification(tr('manager_only'), 'warning');
  const inp = document.getElementById('monthlyGoalInput');
  if (!inp) return;
  const newGoal = parseFloat(inp.value) || 0;

  state.storeSettings.monthlyGoal = newGoal;

  // حفظ في السيرفر — حقل واحد بس عشان ما نلمسش باقي الإعدادات
  if (navigator.onLine && supabaseClient) {
    const ownerId = state.currentUser.id;
    try {
      await supabaseClient.from('store_settings').update({ 
        monthly_goal: newGoal, 
        updated_at: new Date().toISOString() 
      }).eq('user_id', ownerId);
    } catch (e) { console.warn('Monthly goal save failed:', e); }
  }

  if (typeof addAuditLog === 'function') {
    addAuditLog('save_monthly_goal', { goal: newGoal });
  }

  saveData();
  _cancelMonthlyGoalEdit();
  renderMonthlyGoal();
  showNotification(tr('monthly_goal_saved'), 'success');
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
async function renderDashboard() {
  const cur = currencyLabel();
  const todayStr = _getTodayStr();
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

  // 1. Skeleton للرقم الكبير
  _renderBigNumberSkeleton(cur);

  // 2. جرب RPC
  let todaySummary = null, ySummary = null;
  let fromRPC = false;
  if (navigator.onLine && supabaseClient) {
    try {
      const results = await Promise.all([
        financeCore.getPeriodSummary(todayStr, todayStr),
        financeCore.getPeriodSummary(yesterdayStr, yesterdayStr)
      ]);
      todaySummary = results[0];
      ySummary = results[1];
      fromRPC = true;
    } catch (e) {
      console.warn('RPC failed, using local fallback:', e);
    }
  }

  // 3. Fallback محلي
  if (!todaySummary) todaySummary = _safeCalcPeriodSummary(todayStr, todayStr) || {};
  if (!ySummary) ySummary = _safeCalcPeriodSummary(yesterdayStr, yesterdayStr) || {};

  // 4. عرض Big Number
  _renderBigNumberUI(todaySummary, ySummary, cur, fromRPC);

  // 5. باقي العناصر (متزامنة عادي)
  _renderDashboardRest(cur, todaySummary);
}

function _renderBigNumberSkeleton(cur) {
  const bigEl = document.getElementById('homeBigNumber');
  if (!bigEl) return;
  bigEl.innerHTML = `
    <div class="big-card">
      <div class="big-title">${tr('dash_net_sales')} (اليوم)</div>
      <div class="big-value" style="background: rgba(255,255,255,0.15); border-radius: 8px; min-height: 50px; color: transparent;">0.00</div>
      <div class="big-sub" style="opacity: 0.5;">${tr('loading_short')}</div>
    </div>
  `;
}

function _renderBigNumberUI(todaySummary, ySummary, cur, fromRPC) {
  const todaySales = Number(todaySummary.net_sales) || 0;
  const todayProfit = Number(todaySummary.net_profit) || 0;
  const todayInvoices = Number(todaySummary.invoices_count) || 0;
  const yesterdaySales = Number(ySummary.net_sales) || 0;

  let trendHtml = '';
  if (yesterdaySales > 0) {
    const diff = ((todaySales - yesterdaySales) / yesterdaySales) * 100;
    if (diff > 0) {
      trendHtml = `<div style="font-size:12px; margin-top:8px; color:#a7f3d0;">${tr('dash_trend_higher')} ${diff.toFixed(1)}%</div>`;
    } else if (diff < 0) {
      trendHtml = `<div style="font-size:12px; margin-top:8px; color:#fca5a5;">${tr('dash_trend_lower')} ${Math.abs(diff).toFixed(1)}%</div>`;
    } else {
      trendHtml = `<div style="font-size:12px; margin-top:8px; color:#cbd5e1;">${tr('dash_trend_same')}</div>`;
    }
  }

  const limitBadge = (!fromRPC && state.salesDataLimited)
    ? ' <span class="data-limited-badge" style="background:rgba(255,255,255,0.2);color:#fff;" title="' + tr('data_limited_hint') + '">⚠️</span>'
    : '';

  const bigEl = document.getElementById('homeBigNumber');
  if (bigEl) {
    bigEl.innerHTML = `
      <div class="big-card" onclick="showPage('salesLog')">
        <div class="big-title">${tr('dash_net_sales')} (اليوم)${limitBadge} <span>⬅️</span></div>
        <div class="big-value">${todaySales.toFixed(2)} <span style="font-size:20px;">${cur}</span></div>
        <div class="big-sub">${tr('dash_net_profit')}: ${todayProfit.toFixed(2)} ${cur}</div>
        ${trendHtml}
      </div>
    `;
  }
}

function _renderDashboardRest(cur, todaySummary) {
  const todayInvoices = Number(todaySummary.invoices_count) || 0;

  const customerDebt = state.customers.reduce((sum, c) => {
    if (c.name === 'عميل نقدي عام' || c.name === 'Cash Customer') return sum;
    const bal = _safeCustomerBalance(c.id);
    return sum + (bal === null ? (Number(c.openingDebt ?? c.opening_debt) || 0) : Math.max(0, bal));
  }, 0);

  const supplierDue = state.suppliers.reduce((sum, s) => {
    const bal = _safeSupplierBalance(s.id);
    return sum + (bal === null ? (Number(s.openingDebt ?? s.opening_debt) || 0) : Math.max(0, bal));
  }, 0);

  const lowStockCount = state.products.filter(p => (Number(p.stock)||0) <= (Number(p.minStock||p.min_stock)||5)).length;

  const otherCards = document.getElementById('dashboardOtherCards');
  if (otherCards) {
    const cardStyle = 'padding:14px; cursor:pointer; transition:transform 0.1s; display:flex; flex-direction:column; justify-content:space-between;';
    const activeEffect = `onmousedown="this.style.transform='scale(0.95)'" onmouseup="this.style.transform='scale(1)'" onmouseleave="this.style.transform='scale(1)'"`;
    
    otherCards.innerHTML = `
      <div class="stat-card" style="${cardStyle}" onclick="showPage('partCustomers')" ${activeEffect}>
        <h3 style="font-size:13px; display:flex; justify-content:space-between;">${tr('dash_customer_debt')} <span>⬅️</span></h3>
        <p style="font-size:18px;color:#c0392b;margin:5px 0 0 0;">${customerDebt.toFixed(2)}</p>
      </div>
      
      <div class="stat-card" style="${cardStyle}" onclick="showPage('partSuppliers')" ${activeEffect}>
        <h3 style="font-size:13px; display:flex; justify-content:space-between;">${tr('dash_supplier_due')} <span>⬅️</span></h3>
        <p style="font-size:18px;color:#198754;margin:5px 0 0 0;">${supplierDue.toFixed(2)}</p>
      </div>
      
      <div class="stat-card" style="${cardStyle}" onclick="showPage('invProducts')" ${activeEffect}>
        <h3 style="font-size:13px; display:flex; justify-content:space-between;">${tr('dash_stock_alerts')} <span>⬅️</span></h3>
        <p style="font-size:18px;color:${lowStockCount>0?'#c62828':'#17643a'};margin:5px 0 0 0;">${lowStockCount}</p>
      </div>
      
      <div class="stat-card" style="${cardStyle}" onclick="showPage('salesLog')" ${activeEffect}>
        <h3 style="font-size:13px; display:flex; justify-content:space-between;">${tr('dash_today_invoices')} <span>⬅️</span></h3>
        <p style="font-size:18px;color:#176b70;margin:5px 0 0 0;">${todayInvoices}</p>
      </div>
    `;
  }

  renderSmartAlerts();
  renderMonthlyGoal();
  renderSalesChart();
  renderDashboardTopProducts();
}

function renderSmartAlerts() {
  const container = document.getElementById('smartAlerts');
  if (!container) return;

  let alerts = [];
  
  const lowStock = state.products.filter(p => (Number(p.stock)||0) <= (Number(p.minStock||p.min_stock)||5));
  if (lowStock.length > 0) {
    // إصلاح اللغة
    const word = lowStock.length === 1 ? "منتج قارب على النفاذ" : "منتجات قاربت على النفاذ";
    alerts.push({
      type: 'danger', icon: '📦',
      title: `⚠️ يوجد ${lowStock.length} ${word}`,
      subtitle: tr('review_inventory'),
      actionText: tr('view_inventory'),
      actionPage: 'invProducts',
      color: '#c0392b', bg: '#fef2f2'
    });
  }

  const totalDebt = state.customers.reduce((sum, c) => sum + Math.max(0, _safeCustomerBalance(c.id) || 0), 0);
  if (totalDebt > 0) {
    alerts.push({
      type: 'warning', icon: '💰',
      title: tr('alert_debts_title'),
      subtitle: tr('alert_debts_sub'),
      actionText: tr('alert_debts_btn'),
      actionPage: 'partCustomers',
      color: '#d97706', bg: '#fffbeb'
    });
  }

  if (state.currentShift) {
    alerts.push({
      type: 'info', icon: '🕒',
      title: tr('alert_shift_title'),
      subtitle: tr('alert_shift_sub'),
      actionText: tr('alert_shift_btn'),
      actionPage: 'finShift',
      color: '#2563eb', bg: '#eff6ff'
    });
  }

  if (alerts.length === 0) {
    container.innerHTML = '';
    return;
  }

  let html = '<div style="display:flex; flex-direction:column; gap:8px;">';
  alerts.forEach(function(a) {
    html += `
      <div class="smart-alert" style="display:flex; align-items:center; justify-content:space-between; padding:10px 14px; background:${a.bg}; border-radius:10px; border-right:4px solid ${a.color}; gap:10px; box-shadow:0 2px 4px rgba(0,0,0,0.02);">
        <div style="display:flex; align-items:center; gap:10px; flex:1;">
          <span style="font-size:20px;">${a.icon}</span>
          <div>
            <div style="font-weight:800; color:${a.color}; font-size:12px; line-height:1.3;">${a.title}</div>
            <div style="font-size:10px; color:#64748b; margin-top:2px;">${a.subtitle}</div>
          </div>
        </div>
        <button class="alert-action" style="display:inline-flex; align-items:center; justify-content:center; padding:6px 12px; font-size:11px; font-weight:bold; color:#fff; background:${a.color}; border:none; border-radius:6px; cursor:pointer; white-space:nowrap; flex-shrink:0;" onclick="showPage('${a.actionPage}')">${a.actionText}</button>
      </div>
    `;
  });
  html += '</div>';
  container.innerHTML = html;
}