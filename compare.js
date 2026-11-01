/* ============ مقارنة الفترات ============ */
function onCompareTypeChange() {
  const type = document.getElementById('compareType').value;
  const customDiv = document.getElementById('compareCustomPeriods');
  if (customDiv) customDiv.style.display = (type === 'custom') ? 'block' : 'none';
}

// ✅ [إصلاح] دالة للتعامل مع التوقيت المحلي
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
      labelA: 'الشهر الحالي', labelB: 'الشهر السابق',
      fromA: _getLocalDateStr(currentStart), toA: _getLocalDateStr(now),
      fromB: _getLocalDateStr(prevStart), toB: _getLocalDateStr(prevEnd)
    };
  }
  
  if (type === 'monthVsYear') {
    const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearAgoStart = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    const yearAgoEnd = new Date(now.getFullYear() - 1, now.getMonth() + 1, 0);
    return {
      labelA: 'الشهر الحالي', labelB: 'نفس الشهر (سنة سابقة)',
      fromA: _getLocalDateStr(currentStart), toA: _getLocalDateStr(now),
      fromB: _getLocalDateStr(yearAgoStart), toB: _getLocalDateStr(yearAgoEnd)
    };
  }
  
  return {
    labelA: 'الفترة الأولى', labelB: 'الفترة الثانية',
    fromA: document.getElementById('compareAFrom').value, toA: document.getElementById('compareATo').value,
    fromB: document.getElementById('compareBFrom').value, toB: document.getElementById('compareBTo').value
  };
}

// ✅ [إصلاح جذري] استخدام financeCore بدلاً من الحساب اليدوي
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

  const dict = translations[currentLang] || translations.ar;
  const titleText = (dict.compare_title || 'نتائج المقارنة').replace(/^[^\w\u0600-\u06FF]+/, '').trim();
  
  let pctSalesText = formatPct(pctSales);
  let salesStatusText = diffSales >= 0 ? 'ارتفاعاً' : 'انخفاضاً';
  if (isNewSales) {
    pctSalesText = '100%';
    salesStatusText = 'مبيعات جديدة';
  }

  container.innerHTML =
    '<div class="card mt-20">' +
      '<h3>📋 ' + escapeHTML(titleText) + '</h3>' +
      '<div class="table-wrap">' +
        '<table class="data-table compare-table">' +
          '<thead><tr>' +
            '<th>المؤشر</th>' +
            '<th>' + escapeHTML(ranges.labelA) + '</th>' +
            '<th>' + escapeHTML(ranges.labelB) + '</th>' +
            '<th>الفرق</th>' +
            '<th>النسبة</th>' +
          '</tr></thead>' +
          '<tbody>' +
            '<tr>' +
              '<td class="label-cell"><b>المبيعات</b></td>' +
              '<td>' + statsA.totalSales.toFixed(2) + ' ' + cur + '</td>' +
              '<td>' + statsB.totalSales.toFixed(2) + ' ' + cur + '</td>' +
              '<td class="' + getDeltaClass(diffSales) + '">' + diffSales.toFixed(2) + ' ' + cur + '</td>' +
              '<td class="' + getDeltaClass(diffSales) + '">' + pctSalesText + '</td>' +
            '</tr>' +
            '<tr>' +
              '<td class="label-cell"><b>عدد الفواتير</b></td>' +
              '<td>' + statsA.count + '</td>' +
              '<td>' + statsB.count + '</td>' +
              '<td class="' + getDeltaClass(diffCount) + '">' + diffCount + '</td>' +
              '<td class="' + getDeltaClass(diffCount) + '">' + formatPct(pctCount) + '</td>' +
            '</tr>' +
            '<tr>' +
              '<td class="label-cell"><b>صافي الربح</b></td>' +
              '<td>' + statsA.netProfit.toFixed(2) + ' ' + cur + '</td>' +
              '<td>' + statsB.netProfit.toFixed(2) + ' ' + cur + '</td>' +
              '<td class="' + getDeltaClass(diffProfit) + '">' + diffProfit.toFixed(2) + ' ' + cur + '</td>' +
              '<td class="' + getDeltaClass(diffProfit) + '">' + formatPct(pctProfit) + '</td>' +
            '</tr>' +
          '</tbody>' +
        '</table>' +
      '</div>' +
      '<div class="compare-summary mt-15" style="padding:12px;background:#f0f6f7;border-radius:8px;font-size:13px">' +
        '<b>ملخص المقارنة:</b> أظهرت الفترة الأولى (' + escapeHTML(ranges.labelA) + ') ' +
        '<span class="' + getDeltaClass(diffSales) + '">' + salesStatusText + '</span>' +
        (isNewSales ? ' (لم تكن هناك مبيعات في الفترة السابقة).' : ' في المبيعات بنسبة ' + Math.abs(pctSales).toFixed(1) + '% مقارنة بـ (' + escapeHTML(ranges.labelB) + ').') +
      '</div>' +
    '</div>';
}

// ✅ [إصلاح] حذفنا printReportSummary من هنا لأنها موجودة في finance.js بشكل أفضل
function printComparisonReport() { window.print(); }
