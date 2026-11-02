/* ============ مقارنة الفترات ============ */
function onCompareTypeChange() {
  const type = document.getElementById('compareType').value;
  const customDiv = document.getElementById('compareCustomPeriods');
  if (customDiv) customDiv.style.display = (type === 'custom') ? 'block' : 'none';
}

function _getLocalDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getCompareRanges() {
  const type = document.getElementById('compareType').value;
  const now = new Date();
  
  if (type === 'monthVsPrev') {
    const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    return {
      labelA: tr('compare_period_current_month'), labelB: tr('compare_period_prev_month'),
      fromA: _getLocalDateStr(currentStart), toA: _getLocalDateStr(now),
      fromB: _getLocalDateStr(prevStart), toB: _getLocalDateStr(prevEnd)
    };
  }
  
  if (type === 'monthVsYear') {
    const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearAgoStart = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    const yearAgoEnd = new Date(now.getFullYear() - 1, now.getMonth() + 1, 0);
    return {
      labelA: tr('compare_period_current_month'), labelB: tr('compare_period_same_month_last_year'),
      fromA: _getLocalDateStr(currentStart), toA: _getLocalDateStr(now),
      fromB: _getLocalDateStr(yearAgoStart), toB: _getLocalDateStr(yearAgoEnd)
    };
  }
  
  return {
    labelA: tr('period_1'), labelB: tr('period_2'),
    fromA: document.getElementById('compareAFrom').value, toA: document.getElementById('compareATo').value,
    fromB: document.getElementById('compareBFrom').value, toB: document.getElementById('compareBTo').value
  };
}

function calcPeriodStats(from, to) {
  try {
    if (typeof financeCore === 'undefined' || typeof financeCore.calcPeriodSummary !== 'function') {
      return { totalSales: 0, netProfit: 0, count: 0 };
    }
    const summary = financeCore.calcPeriodSummary(from, to);
    return {
      totalSales: Number(summary.gross_sales) || 0,
      netProfit: Number(summary.net_profit) || 0,
      count: Number(summary.invoices_count) || 0
    };
  } catch (e) {
    console.warn('calcPeriodStats error:', e);
    return { totalSales: 0, netProfit: 0, count: 0 };
  }
}

function renderComparison() {
  const ranges = getCompareRanges();
  const statsA = calcPeriodStats(ranges.fromA, ranges.toA);
  const statsB = calcPeriodStats(ranges.fromB, ranges.toB);
  const cur = state.storeSettings.currency || 'ج.م';

  const container = document.getElementById('compareResult');
  if (!container) return;

  const diffSales = statsA.totalSales - statsB.totalSales;
  let pctSales = 0;
  let isNewSales = false;

  if (statsB.totalSales === 0 && statsA.totalSales > 0) {
    isNewSales = true;
    pctSales = 100;
  } else if (statsB.totalSales > 0) {
    pctSales = (diffSales / statsB.totalSales) * 100;
  }

  const diffCount = statsA.count - statsB.count;
  const pctCount = statsB.count > 0 ? (diffCount / statsB.count) * 100 : 0;

  const diffProfit = statsA.netProfit - statsB.netProfit;
  const pctProfit = statsB.netProfit !== 0 ? (diffProfit / Math.abs(statsB.netProfit)) * 100 : 0;

  function getDeltaClass(diff) {
    if (diff > 0) return 'delta-up';
    if (diff < 0) return 'delta-down';
    return 'delta-flat';
  }

  function formatPct(pct) {
    return (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%';
  }

  // ✅ v7.10.2 — إزالة anti-pattern (regex غريب)
  const titleText = tr('compare_title');
  
  let pctSalesText = formatPct(pctSales);
  // ✅ v7.10.2 — ترجمة
  let salesStatusText = diffSales >= 0 ? tr('compare_up') : tr('compare_down');
  if (isNewSales) {
    pctSalesText = '100%';
    salesStatusText = tr('compare_new_sales');
  }

  container.innerHTML =
    '<div class="card mt-20">' +
      '<h3>📋 ' + escapeHTML(titleText) + '</h3>' +
      '<div class="table-wrap">' +
        '<table class="data-table compare-table">' +
          '<thead><tr>' +
            '<th>' + tr('compare_col_indicator') + '</th>' +
            '<th>' + escapeHTML(ranges.labelA) + '</th>' +
            '<th>' + escapeHTML(ranges.labelB) + '</th>' +
            '<th>' + tr('compare_col_difference') + '</th>' +
            '<th>' + tr('th_percentage') + '</th>' +
          '</tr></thead>' +
          '<tbody>' +
            '<tr>' +
              '<td class="label-cell"><b>' + tr('compare_sales') + '</b></td>' +
              '<td>' + statsA.totalSales.toFixed(2) + ' ' + cur + '</td>' +
              '<td>' + statsB.totalSales.toFixed(2) + ' ' + cur + '</td>' +
              '<td class="' + getDeltaClass(diffSales) + '">' + diffSales.toFixed(2) + ' ' + cur + '</td>' +
              '<td class="' + getDeltaClass(diffSales) + '">' + pctSalesText + '</td>' +
            '</tr>' +
            '<tr>' +
              '<td class="label-cell"><b>' + tr('compare_indicator_invoices') + '</b></td>' +
              '<td>' + statsA.count + '</td>' +
              '<td>' + statsB.count + '</td>' +
              '<td class="' + getDeltaClass(diffCount) + '">' + diffCount + '</td>' +
              '<td class="' + getDeltaClass(diffCount) + '">' + formatPct(pctCount) + '</td>' +
            '</tr>' +
            '<tr>' +
              '<td class="label-cell"><b>' + tr('dash_net_profit') + '</b></td>' +
              '<td>' + statsA.netProfit.toFixed(2) + ' ' + cur + '</td>' +
              '<td>' + statsB.netProfit.toFixed(2) + ' ' + cur + '</td>' +
              '<td class="' + getDeltaClass(diffProfit) + '">' + diffProfit.toFixed(2) + ' ' + cur + '</td>' +
              '<td class="' + getDeltaClass(diffProfit) + '">' + formatPct(pctProfit) + '</td>' +
            '</tr>' +
          '</tbody>' +
        '</table>' +
      '</div>' +
      '<div class="compare-summary mt-15" style="padding:12px;background:#f0f6f7;border-radius:8px;font-size:13px">' +
        '<b>' + tr('compare_summary_label') + '</b> ' +
        '<span class="' + getDeltaClass(diffSales) + '">' + salesStatusText + '</span>' +
        (isNewSales
          ? ' ' + tr('compare_no_prev_sales')
          : ' ' + tr('compare_sales_change_template').replace('{pct}', Math.abs(pctSales).toFixed(1)).replace('{period}', ranges.labelB)) +
      '</div>' +
    '</div>';
}

function printComparisonReport() { window.print(); }