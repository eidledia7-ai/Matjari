/* ============ مقارنة الفترات ============ */
function onCompareTypeChange() {
  const type = document.getElementById('compareType').value;
  const customDiv = document.getElementById('compareCustomPeriods');
  if (customDiv) customDiv.style.display = (type === 'custom') ? 'block' : 'none';
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
      fromA: currentStart.toISOString().slice(0, 10), toA: now.toISOString().slice(0, 10),
      fromB: prevStart.toISOString().slice(0, 10), toB: prevEnd.toISOString().slice(0, 10)
    };
  }
  if (type === 'monthVsYear') {
    const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearAgoStart = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    const yearAgoEnd = new Date(now.getFullYear() - 1, now.getMonth() + 1, 0);
    return {
      labelA: 'الشهر الحالي', labelB: 'نفس الشهر (سنة سابقة)',
      fromA: currentStart.toISOString().slice(0, 10), toA: now.toISOString().slice(0, 10),
      fromB: yearAgoStart.toISOString().slice(0, 10), toB: yearAgoEnd.toISOString().slice(0, 10)
    };
  }
  return {
    labelA: 'الفترة الأولى', labelB: 'الفترة الثانية',
    fromA: document.getElementById('compareAFrom').value, toA: document.getElementById('compareATo').value,
    fromB: document.getElementById('compareBFrom').value, toB: document.getElementById('compareBTo').value
  };
}

function calcPeriodStats(from, to) {
  const sales = filterByPeriod(state.sales, 'date', from, to);
  const expenses = filterByPeriod(state.expenses, 'date', from, to);
  // [إصلاح] Number() + حماية items null
  const totalSales = sales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  let totalCost = 0;
  sales.forEach(s => {
    if (!s || !Array.isArray(s.items)) return;
    s.items.forEach(i => { totalCost += (Number(i.cost) || 0) * (Number(i.qty) || 0); });
  });
  const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  return { totalSales, netProfit: totalSales - totalCost - totalExpenses, count: sales.length };
}

function renderComparison() {
  const ranges = getCompareRanges();
  const statsA = calcPeriodStats(ranges.fromA, ranges.toA);
  const statsB = calcPeriodStats(ranges.fromB, ranges.toB);
  // [إصلاح] default currency
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
  const pctProfit = statsB.netProfit > 0 ? (diffProfit / statsB.netProfit) * 100 : 0;

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
              '<td class="' + getDeltaClass(diffSales) + '">' + formatPct(pctSales) + '</td>' +
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
        '<span class="' + getDeltaClass(diffSales) + '">' + (diffSales >= 0 ? 'ارتفاعاً' : 'انخفاضاً') + '</span>' +
       (isNewSales ? ' (لم تكن هناك مبيعات في الفترة السابقة).' : ' في المبيعات بنسبة ' + Math.abs(pctSales).toFixed(1) + '% مقارنة بـ (' + escapeHTML(ranges.labelB) + ').') +
      '</div>' +
    '</div>';
}

function printComparisonReport() { window.print(); }
function printReportSummary() { window.print(); }