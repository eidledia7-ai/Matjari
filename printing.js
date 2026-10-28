/* ============ الفاتورة والطباعة والـ QR ============ */
async function generateQRData(sale) {
  try {
    const profile = state.storeSettings;
    const data = JSON.stringify({
      id: sale.id,
      shop: profile.name || 'متجري',
      date: sale.date,
      total: sale.total
    });
    if (typeof QRCode !== 'undefined') {
      return await QRCode.toDataURL(data, { width: 130, margin: 1 });
    }
    return '';
  } catch (e) { return ''; }
}

function printInvoiceById(id) {
  const s = state.sales.find(function(x) { return x.id === id; });
  if (!s) return showNotification('الفاتورة غير موجودة', 'error');
  printInvoice(s);
}

async function printInvoice(sale) {
  if (!sale) return;
  const cust = state.customers.find(c => c.id === sale.customerId);
  const settings = state.storeSettings || {};

  // نفتح النافذة الأول قبل أي await عشان مايتبلوكش
  const w = window.open('', '_blank');
  if (!w) return showNotification(currentLang === 'en' ? 'Please allow pop-ups to print the invoice.' : 'اسمح بالنوافذ المنبثقة لطباعة الفاتورة', 'warning');

  const qrDataUrl = await generateQRData(sale);

  const currency = escapeHTML(settings.currency || '');
  const currencyLabel = currency ? ` ${currency}` : '';
  const shopName = escapeHTML(settings.name || (currentLang === 'en' ? 'My Store' : 'متجري'));
  const phone = escapeHTML(settings.phone || settings.storePhone || '-');
  const address = escapeHTML(settings.address || settings.storeAddress || '-');
  const customerName = escapeHTML(cust ? cust.name : (currentLang === 'en' ? 'Cash Customer' : 'عميل نقدي'));
  const dateText = new Date(sale.date).toLocaleString(currentLang === 'en' ? 'en-US' : 'ar-EG');
  const subtotal = (sale.items || []).reduce((sum, i) => sum + Number(i.qty || 0) * Number(i.price || 0), 0);
  const discount = Number(sale.discount || sale.discountAmount || 0);
  const paid = Number(sale.paid || 0);
  const total = Number(sale.total || 0);
  const remaining = Math.max(0, total - paid);
  const paymentMethod = sale.payMethod || sale.paymentMethod || 'cash';
  const cashier = escapeHTML(sale.cashier || sale.cashierName || (state.currentUser && (state.currentUser.email || state.currentUser.user_metadata?.name)) || '—');
  const en = currentLang === 'en';

  // ترجمة طريقة الدفع
  const payLabels = {
    cash: en ? 'Cash' : 'نقدي',
    card: en ? 'Card' : 'بطاقة',
    credit: en ? 'Credit' : 'آجل',
    wallet: en ? 'Wallet' : 'محفظة'
  };
  const payText = payLabels[paymentMethod] || paymentMethod;

  // حماية اللوجو بدل escapeHTML
  const logo = settings.logo;
  const safeLogo = typeof logo === 'string' && (logo.startsWith('http') || logo.startsWith('data:image/')) ? logo : '';

  const labels = en ? {invoice:'Invoice',date:'Date',customer:'Customer',item:'Item',qty:'Qty',price:'Price',total:'Total',subtotal:'Subtotal',discount:'Discount',net:'Net Total',paid:'Paid',remaining:'Remaining',payment:'Payment Method',cashier:'Cashier',thanks:'Thank you for shopping with us!'} : {invoice:'رقم الفاتورة',date:'التاريخ',customer:'العميل',item:'الصنف',qty:'الكمية',price:'السعر',total:'الإجمالي',subtotal:'الإجمالي قبل الخصم',discount:'الخصم',net:'الصافي',paid:'المدفوع',remaining:'المتبقي',payment:'طريقة الدفع',cashier:'الكاشير',thanks:'شكراً لتعاملكم معنا!'};

  w.document.write(`<!DOCTYPE html><html lang="${en?'en':'ar'}" dir="${en?'ltr':'rtl'}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${labels.invoice} ${escapeHTML(sale.id)}</title><style>
  *{box-sizing:border-box}body{font-family:Tahoma,Arial,sans-serif;margin:0;padding:22px;background:#f3f6f8;color:#203447}.invoice{max-width:760px;margin:auto;background:white;padding:28px;border:1px solid #dce5ec;border-top:7px solid #176b70;border-radius:12px}.head{text-align:center;border-bottom:2px solid #e1e8ed;padding-bottom:16px}.head h1{color:#17364c;margin:0 0 8px}.muted{color:#687b8b;font-size:13px}.meta{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:18px 0}.meta div{padding:11px;background:#f1f6f8;border-radius:8px}.meta b{display:block;color:#176b70;margin-bottom:4px}table{width:100%;border-collapse:collapse;margin:14px 0}th{background:#17364c;color:white}th,td{padding:11px;border:1px solid #dce5ec;text-align:${en?'left':'right'}}tbody tr:nth-child(even){background:#f7fafb}.totals{margin-${en?'left':'right'}:auto;max-width:340px}.totals p{display:flex;justify-content:space-between;margin:7px 0;padding:5px}.net{font-size:23px;font-weight:bold;color:#176b70;border-top:2px solid #176b70;padding-top:12px!important}.footer{text-align:center;border-top:1px solid #dce5ec;margin-top:20px;padding-top:16px}.footer img{width:115px;height:115px}.thanks{font-weight:bold;color:#176b70;margin:10px}@media print{body{padding:0;background:#fff}.invoice{border:0;border-top:6px solid #176b70;border-radius:0;max-width:none;padding:10px;box-shadow:none}@page{margin:10mm}}@media(max-width:520px){.meta{grid-template-columns:1fr}.invoice{padding:14px}}
  </style></head><body><main class="invoice"><header class="head">${safeLogo ? `<img src="${safeLogo}" alt="logo" style="max-width:90px;max-height:70px;object-fit:contain">` : ''}<h1>${shopName}</h1><div>${en?'Phone':'الهاتف'}: ${phone} &nbsp; | &nbsp; ${en?'Address':'العنوان'}: ${address}</div></header><section class="meta"><div><b>${labels.invoice}</b>${escapeHTML(sale.id)}</div><div><b>${labels.date}</b>${dateText}</div><div><b>${labels.customer}</b>${customerName}</div></section><table><thead><tr><th>${labels.item}</th><th>${labels.qty}</th><th>${labels.price}</th><th>${labels.total}</th></tr></thead><tbody>${(sale.items||[]).map(i=>`<tr><td>${escapeHTML(i.name||'')}</td><td>${Number(i.qty||0)}</td><td>${Number(i.price||0).toFixed(2)}${currencyLabel}</td><td>${(Number(i.qty||0)*Number(i.price||0)).toFixed(2)}${currencyLabel}</td></tr>`).join('')}</tbody></table><section class="totals"><p><span>${labels.subtotal}</span><b>${subtotal.toFixed(2)}${currencyLabel}</b></p><p><span>${labels.discount}</span><b>${discount.toFixed(2)}${currencyLabel}</b></p><p class="net"><span>${labels.net}</span><span>${total.toFixed(2)}${currencyLabel}</span></p><p><span>${labels.paid}</span><b>${paid.toFixed(2)}${currencyLabel}</b></p><p><span>${labels.remaining}</span><b>${remaining.toFixed(2)}${currencyLabel}</b></p><p><span>${labels.payment}</span><b>${escapeHTML(payText)}</b></p></section><footer class="footer">${qrDataUrl?`<img src="${qrDataUrl}" alt="QR Code">`:''}<p class="thanks">${labels.thanks}</p><p>${labels.cashier}: <b>${cashier}</b></p></footer></main><script>window.onload=function(){setTimeout(function(){window.print()},250)}<\/script></body></html>`);
  w.document.close();
}

function sendInvoiceWhatsApp(saleId) {
  if (!canUse('whatsapp')) {
    return upgradePrompt(currentLang === 'en' ? 'WhatsApp invoices' : 'فواتير الواتساب');
  }
  const sale = state.sales.find(function(s) { return s.id === saleId; });
  if (!sale) return showNotification('الفاتورة غير موجودة', 'error');

  const cust = state.customers.find(function(c) { return c.id === sale.customerId; });
  const custName = cust ? cust.name : 'عميل نقدي';

  const settings = state.storeSettings || {};
  const storeName = settings.name || 'متجري';
  const currency = settings.currency || 'ج.م';

  // قيم آمنة ضد undefined
  const items = Array.isArray(sale.items) ? sale.items : [];
  const total = Number(sale.total || 0);
  const paid = Number(sale.paid || 0);
  const remaining = Math.max(0, total - paid);

  let message = `أهلاً ${custName}،\n`;
  message += `شكراً لتعاملك مع ${storeName}.\n\n`;
  message += `تفاصيل فاتورتك رقم (${sale.id}):\n`;

  items.forEach(function(item) {
    const qty = Number(item.qty || 0);
    const price = Number(item.price || 0);
    message += `- ${item.name} × ${qty} = ${(price * qty).toFixed(2)} ${currency}\n`;
  });

  message += `\nالإجمالي: ${total.toFixed(2)} ${currency}\n`;
  message += `المدفوع: ${paid.toFixed(2)} ${currency}\n`;
  if (remaining > 0) {
    message += `المتبقي (دين): ${remaining.toFixed(2)} ${currency}\n`;
  }
  message += `\nنتمنى لك يوماً سعيداً! 🌟`;

  // كود الدولة قابل للتخصيص من الإعدادات
  const countryCode = settings.countryCode || '20';
  const phone = cust && cust.phone && cust.phone !== '-' ? cust.phone.replace(/\D/g, '') : '';
  const finalPhone = phone.startsWith('0') ? countryCode + phone.substring(1) : phone;

  const whatsappUrl = `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank');
}

/* ============ الوضع الليلي ============ */
function toggleDarkMode() {
  const isDark = document.body.classList.toggle('dark-mode');
  localStorage.setItem('matjari_dark', isDark ? '1' : '0');
  const btn = document.getElementById('settingsDarkModeBtn');
  if (btn) btn.textContent = isDark ? (currentLang === 'en' ? '☀️ Switch to Light Mode' : '☀️ التبديل للوضع النهاري') : (currentLang === 'en' ? '🌙 Switch to Dark Mode' : '🌙 التبديل للوضع الليلي');
  showNotification(isDark ? (currentLang === 'en' ? 'Dark mode enabled' : '🌙 الوضع الليلي مُفعّل') : (currentLang === 'en' ? 'Light mode enabled' : '☀️ الوضع النهاري مُفعّل'), 'info');
}

function applySavedDarkMode() {
  if (localStorage.getItem('matjari_dark') === '1') {
    document.body.classList.add('dark-mode');
  }
}

/* ============ تحديثات التطبيق ============ */
async function checkForUpdates() {
  if (!('serviceWorker' in navigator)) {
    return showNotification(currentLang === 'en' ? 'This browser does not support auto-update.' : 'المتصفح لا يدعم التحديث التلقائي', 'info');
  }
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return showNotification(currentLang === 'en' ? 'No service worker registered.' : 'لا يوجد Service Worker مسجّل', 'warning');
    await reg.update();
    if (reg.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
      showNotification(currentLang === 'en' ? 'Update ready, reloading...' : 'التحديث جاهز، جارٍ إعادة التحميل...', 'info');
    } else {
      showNotification(currentLang === 'en' ? '✅ App is up to date' : '✅ التطبيق محدّث');
    }
  } catch (e) {
    showNotification(currentLang === 'en' ? 'Update failed' : 'تعذر التحديث', 'error');
  }
}

async function clearAppCache() {
  if (!confirm(tr('msg_clear_cache'))) return;
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.active) {
        const channel = new MessageChannel();
        reg.active.postMessage({ type: 'CLEAR_CACHES' }, [channel.port2]);
        await new Promise(function(resolve) {
          let done = false;
          channel.port1.onmessage = function() { if (!done) { done = true; resolve(); } };
          setTimeout(function() { if (!done) { done = true; resolve(); } }, 1500);
        });
      }
    }
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(names.map(function(n) { return caches.delete(n); }));
    }
  } catch (e) {
    console.warn('Clear cache error:', e);
  }
  location.reload();
}

/* ============ طباعة الباركود ============ */
function openBarcodePrintModal() {
  if (state.role !== 'manager') return showNotification('هذه العملية للمدير فقط', 'warning');
  if (state.products.length === 0) return showNotification(tr('notify_no_products'), 'warning');

  const modal = document.getElementById('barcodePrintModal');
  if (!modal) return;
  const list = document.getElementById('barcodeProductList');
  let html = '';
  state.products.forEach(p => {
    html += '<label style="display:flex;align-items:center;gap:8px;padding:8px;border-bottom:1px solid #e9eef2;cursor:pointer">' +
      '<input type="checkbox" class="barcode-product-cb" value="' + p.id + '" checked>' +
      '<span><b>' + escapeHTML(p.name) + '</b> — ' + escapeHTML(p.barcode || 'بدون باركود') + '</span></label>';
  });
  list.innerHTML = html;
  modal.style.display = 'flex';
}

function closeBarcodePrintModal() {
  const modal = document.getElementById('barcodePrintModal');
  if (modal) modal.style.display = 'none';
}

function barcodeSelectAll(checked) {
  document.querySelectorAll('.barcode-product-cb').forEach(cb => { cb.checked = checked; });
}

async function printBarcodeLabels() {
  const copies = parseInt(document.getElementById('barcodeCopies').value) || 1;
  const size = document.getElementById('barcodeSize').value || 'medium';
  const type = document.getElementById('barcodeType').value || 'qr';

  const selectedIds = Array.from(document.querySelectorAll('.barcode-product-cb:checked')).map(cb => cb.value);
  if (!selectedIds.length) return showNotification(tr('notify_select_one_product'), 'warning');

  const selectedProducts = state.products.filter(p => selectedIds.includes(p.id));
  const totalLabels = selectedProducts.length * copies;
  if (totalLabels > 300) {
    if (!confirm('عدد الملصقات كبير (' + totalLabels + ' ملصق). هل تريد المتابعة؟')) return;
  }

  closeBarcodePrintModal();

  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) return showNotification('يرجى السماح بالنوافذ المنبثقة للطباعة', 'warning');

  let labelsHtml = '';

  for (const prod of selectedProducts) {
    const rawBarcode = prod.barcode ? prod.barcode.trim() : prod.id;
    let code128Svg = '';
    let qrDataUrl = '';

    if (type === 'code128' || type === 'both') {
      const container = document.createElement('div');
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      container.appendChild(svg);
      try {
        JsBarcode(svg, rawBarcode, { format: 'CODE128', width: 2, height: 40, displayValue: true, fontSize: 12 });
        code128Svg = svg.outerHTML;
      } catch (e) {
        code128Svg = '<span>' + escapeHTML(rawBarcode) + '</span>';
      }
    }

    if (type === 'qr' || type === 'both') {
      try {
        qrDataUrl = await QRCode.toDataURL(rawBarcode, { width: 100, margin: 1 });
      } catch (e) {
        qrDataUrl = '';
      }
    }

    for (let i = 0; i < copies; i++) {
      labelsHtml += '<div class="barcode-label">';
      labelsHtml += '<div class="label-name">' + escapeHTML(prod.name) + '</div>';
      labelsHtml += '<div class="label-price">' + prod.price + ' ' + escapeHTML(state.storeSettings.currency || 'ج.م') + '</div>';

      if (type === 'code128') {
        labelsHtml += '<div class="barcode-render">' + code128Svg + '</div>';
      } else if (type === 'qr') {
        if (qrDataUrl) labelsHtml += '<img src="' + qrDataUrl + '" alt="QR">';
      } else if (type === 'both') {
        labelsHtml += '<div class="both-render">';
        if (qrDataUrl) labelsHtml += '<img src="' + qrDataUrl + '" alt="QR">';
        labelsHtml += '<div class="barcode-render">' + code128Svg + '</div>';
        labelsHtml += '</div>';
      }
      labelsHtml += '</div>';
    }
  }

  const cssUrl = new URL('style.css', location.href).href;

  printWindow.document.write(
    '<!DOCTYPE html><html lang="' + (currentLang === 'ar' ? 'ar' : 'en') + '" dir="' + (currentLang === 'ar' ? 'rtl' : 'ltr') + '">' +
    '<head><meta charset="UTF-8"><title>' + (currentLang === 'en' ? 'Barcode Labels' : 'ملصقات الباركود') + '</title>' +
    '<link rel="stylesheet" href="' + cssUrl + '">' +
    '<style>body{margin:0;padding:10px;background:#fff}@media print{body{padding:0}@page{margin:8mm}}</style></head>' +
    '<body><div class="barcode-sheet size-' + size + '">' + labelsHtml + '</div>' +
    '<script>window.onload=function(){setTimeout(function(){window.print()},300)};<\/script>' +
    '</body></html>'
  );
  printWindow.document.close();
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
  closeExpensesReportModal();
  window.print();
}

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
  const totalSales = sales.reduce((sum, s) => sum + s.total, 0);
  let totalCost = 0;
  sales.forEach(s => s.items.forEach(i => totalCost += (i.cost || 0) * i.qty));
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  return { totalSales, netProfit: totalSales - totalCost - totalExpenses, count: sales.length };
}

function renderComparison() {
  const ranges = getCompareRanges();
  const statsA = calcPeriodStats(ranges.fromA, ranges.toA);
  const statsB = calcPeriodStats(ranges.fromB, ranges.toB);
  const cur = state.storeSettings.currency;

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

/* ============ إدارة الموظفين (Edge Function) ============ */
// ملاحظة: كلمة المرور '123456' مؤقتة للموظف عند الدعوة، ويجب عليه تغييرها فور أول دخول.
async function inviteStaff() {
  const email = document.getElementById('staffEmail').value.trim();
  if (!email) return showNotification('أدخل إيميل الموظف', 'error');

  const { count } = await supabaseClient
    .from('shop_user_roles')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', state.currentUser.id);

  const lim = checkLimit('users', count || 0);
  if (!lim.allowed) {
    return showNotification(
      currentLang === 'en'
        ? 'User limit reached (' + lim.max + '). Upgrade your plan.'
        : 'وصلت لحد المستخدمين (' + lim.max + '). رقّي باقتك.',
      'warning'
    );
  }

const defaultPassword = prompt('أدخل كلمة مرور مؤقتة للموظف (6 أحرف على الأقل):');
if (!defaultPassword || defaultPassword.length < 6) {
  return showNotification('يجب إدخال كلمة مرور من 6 أحرف على الأقل', 'error');
}

  showLoading('جارٍ إنشاء الحساب...');
  try {
    const session = await supabaseClient.auth.getSession();
    const token = session.data.session?.access_token || SUPABASE_KEY; 

    const { data, error } = await supabaseClient.functions.invoke('invite-staff', {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_KEY
      },
      body: {
        email: email,
        owner_id: state.currentUser.id,
        password: defaultPassword
      }
    });

    if (error) throw error;
    if (data && data.error) throw new Error(data.error);

    // إظهار الباسورد والإيميل في Alert
    alert(`Account Created!\nEmail: ${email}\nPassword: ${defaultPassword}`);
    
    document.getElementById('staffEmail').value = '';
    loadStaffList();
} catch (e) {
  let msg = 'تعذر إنشاء الحساب: ';
  const errMsg = (e.message || '').toLowerCase();
  
  // لو الإيميل موجود بالفعل
  if (errMsg.includes('already') || errMsg.includes('exists') || errMsg.includes('duplicate')) {
    msg = 'هذا الإيميل مسجل بالفعل في النظام (حتى لو تم إلغاء تنشيطه). يرجى استخدام إيميل جديد.';
  } else {
    msg += (e.message || 'خطأ غير معروف');
  }
  
  showNotification(msg, 'error');
  console.error(e);
} finally {
  hideLoading();
}
}
async function loadStaffList() {
  const container = document.getElementById('staffList');
  if (!container) return;

  try {
    const { data, error } = await supabaseClient
      .from('shop_user_roles')
      .select('user_id, role, owner_id, email') 
      .eq('owner_id', state.currentUser.id)
      .order('email', { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) {
      container.innerHTML = '<p class="text-muted">لا يوجد موظفين مسجلين حتى الآن.</p>';
      return;
    }

    let html = '<div class="table-wrap"><table class="data-table"><thead><tr><th>إيميل الموظف</th><th>الرتبة</th><th>الإجراءات</th></tr></thead><tbody>';
    
    data.forEach(staff => {
      html += '<tr>' +
        '<td><b>' + escapeHTML(staff.email || staff.user_id) + '</b></td>' +
        '<td><span class="badge" style="background:#e0e0e0; padding:4px 8px; border-radius:4px;">' + escapeHTML(staff.role) + '</span></td>' +
        '<td><button class="small-btn red" onclick="deactivateStaff(\'' + staff.user_id + '\')">إلغاء التنشيط</button></td>' +
        '</tr>';
    });
    
    html += '</tbody></table></div>';
    container.innerHTML = html;

  } catch (e) {
    container.innerHTML = '<p class="text-red">تعذر تحميل قائمة الموظفين.</p>';
    console.error(e);
  }
}

// [دالة جديدة] إلغاء تنشيط موظف: حذف سطره من shop_user_roles بشرط أن يكون تابعاً للمدير الحالي
async function deactivateStaff(userId) {
  if (state.role !== 'manager') return showNotification('هذه العملية للمدير فقط', 'warning');
  if (!userId) return;
  if (!confirm('هل أنت متأكد من إلغاء تنشيط هذا الموظف؟')) return;

  showLoading('جارٍ إلغاء التنشيط...');
  try {
    const { error } = await supabaseClient
      .from('shop_user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('owner_id', state.currentUser.id);

    if (error) throw error;

    showNotification('تم إلغاء تنشيط الموظف ✅', 'success');
    await loadStaffList();
  } catch (e) {
    showNotification('تعذر إلغاء التنشيط: ' + (e.message || ''), 'error');
  } finally {
    hideLoading();
  }
}
/* ============ صفحة الاشتراك ============ */
function renderSubscriptionPage() {
  const container = document.getElementById('subscriptionContent');
  if (!container) return;

  const sub = state.subscription || {};
  const en = currentLang === 'en';
  const cur = state.storeSettings.currency || 'ج.م';

  // حساب الأيام المتبقية
  let endDate = null;
  if (sub.plan === 'trial' && sub.trial_ends_at) endDate = new Date(sub.trial_ends_at).getTime();
  else if (sub.expires_at) endDate = new Date(sub.expires_at).getTime();

  const now = Date.now();
  const daysLeft = endDate ? Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24))) : 0;
  const isActive = sub.status === 'active' && (!endDate || endDate > now);

  const planNames = {
    trial: en ? 'Free Trial' : 'تجربة مجانية',
    starter: en ? 'Starter' : 'البداية',
    growth: en ? 'Growth' : 'النمو',
    pro: en ? 'Pro' : 'الاحترافي'
  };
  const planName = planNames[sub.plan] || sub.plan || 'Trial';

  // شريط تقدم (14 يوم trial)
  let progressPercent = 0;
  if (sub.plan === 'trial' && endDate) {
    const startTime = endDate - (14 * 24 * 60 * 60 * 1000);
    progressPercent = Math.min(100, Math.max(0, ((now - startTime) / (endDate - startTime)) * 100));
  }

  const plans = [
    {
      id: 'starter',
      name: tr('plan_starter'),
      price: 299,
      yearly: 2990,
      features: en
        ? ['1 user', '1 branch', 'Up to 500 products', 'Basic reports', 'WhatsApp support']
        : ['مستخدم واحد', 'فرع واحد', 'حتى 500 منتج', 'تقارير أساسية', 'دعم واتساب']
    },
    {
      id: 'growth',
      name: tr('plan_growth'),
      price: 699,
      yearly: 6990,
      popular: true,
      features: en
        ? ['3 users', '3 branches', 'Up to 3,000 products', 'Advanced reports', 'Priority WhatsApp', 'WhatsApp invoices ✅']
        : ['3 مستخدمين', '3 فروع', 'حتى 3,000 منتج', 'تقارير متقدمة', 'واتساب أولوية', 'فاتورة واتساب ✅']
    },
    {
      id: 'pro',
      name: tr('plan_pro'),
      price: 1499,
      yearly: 14990,
      features: en
        ? ['Unlimited users', 'Unlimited branches', 'Unlimited products', 'All reports + export', 'Account manager', 'API access']
        : ['مستخدمين غير محدود', 'فروع غير محدودة', 'منتجات غير محدودة', 'كل التقارير + تصدير', 'مدير حساب مخصص', 'API']
    }
  ];

  let html = '';

  // === كارت الحالة ===
  html += '<div class="card">';
  html += '<h3>' + tr('current_status_title') + '</h3>';
  html += '<div class="sub-status-grid">';

  html += '<div class="stat-card ' + (isActive ? 'active' : 'expired') + '">';
  html += '<h3>' + tr('current_plan') + '</h3><p>' + planName + '</p></div>';

  html += '<div class="stat-card ' + (isActive ? 'active' : 'expired') + '">';
  html += '<h3>' + tr('th_status') + '</h3><p>' + (isActive ? tr('active_status') : tr('expired_status')) + '</p></div>';

  if (endDate) {
    html += '<div class="stat-card">';
    html += '<h3>' + tr('days_remaining') + '</h3><p>' + daysLeft + ' ' + tr('days_word') + '</p></div>';

    html += '<div class="stat-card">';
    html += '<h3>' + tr('expires_on') + '</h3><p style="font-size:14px">' + new Date(endDate).toLocaleDateString(en ? 'en-US' : 'ar-EG') + '</p></div>';
  }

  html += '</div>';

  if (sub.plan === 'trial' && endDate && isActive) {
    html += '<div class="sub-progress-wrap mt-15">';
    html += '<div class="sub-progress-label">' + tr('trial_progress') + ' — ' + daysLeft + ' / 14 ' + tr('days_word') + '</div>';
    html += '<div class="sub-progress-bar"><div class="sub-progress-fill" style="width:' + progressPercent + '%"></div></div>';
    html += '</div>';
  }

  html += '</div>';

  // === الخطط المتاحة ===
  html += '<div class="card mt-20">';
  html += '<h3>' + tr('available_plans') + '</h3>';
  html += '<div class="plans-grid">';

  plans.forEach(plan => {
    const isCurrent = sub.plan === plan.id;
    html += '<div class="plan-card' + (plan.popular ? ' popular' : '') + (isCurrent ? ' current' : '') + '" onclick="showPlanDetail(\'' + plan.id + '\', \'subscription\')" style="cursor:pointer">';
    if (plan.popular) html += '<div class="plan-badge">' + tr('most_popular') + '</div>';
    if (isCurrent) html += '<div class="plan-badge current-badge">' + tr('your_current_plan') + '</div>';
    html += '<h4>' + plan.name + '</h4>';
    html += '<div class="plan-price"><span class="price-amount">' + plan.price + '</span><span class="price-currency">' + cur + '</span><span class="price-period">/' + tr('per_month') + '</span></div>';
    html += '<div class="plan-yearly">' + tr('or_text') + ' ' + plan.yearly + ' ' + cur + ' / ' + tr('per_year') + '</div>';
    html += '<ul class="plan-features">';
    plan.features.forEach(f => { html += '<li>✓ ' + f + '</li>'; });
    html += '</ul>';
    if (isCurrent) {
      html += '<button class="btn grey w-100" disabled>' + tr('your_current_plan') + '</button>';
    } else {
      html += '<button class="btn green w-100" onclick="showNotification(\'' + tr('payment_coming_soon') + '\', \'info\')">' + tr('upgrade_now') + '</button>';
    }
    html += '</div>';
  });

  html += '</div></div>';

  html += '<div class="notice info mt-20">💳 <b>' + tr('payment_coming_soon') + '</b> ' + tr('payment_coming_desc') + '</div>';

  container.innerHTML = html;
}
/* ============ صفحة الهبوط للزوار ============ */
function renderLandingView() {
  const container = document.getElementById('landingView');
  if (!container) return;

  const en = currentLang === 'en';
  const cur = state.storeSettings.currency || 'ج.م';

  let plansHtml = '';
  PLANS.forEach(plan => {
    plansHtml += '<div class="landing-plan-card' + (plan.popular ? ' popular' : '') + '">';
    if (plan.popular) plansHtml += '<div class="landing-popular-badge">الأكثر شعبية ⭐</div>';
    plansHtml += '<h4>' + (en ? plan.name_en : plan.name_ar) + '</h4>';
    plansHtml += '<div class="landing-plan-price"><span>' + plan.price + '</span> ' + cur + ' / شهر</div>';
    plansHtml += '<button class="landing-btn-primary" style="margin-top:20px; padding: 12px 20px; font-size: 15px; width: 100%; box-shadow: none;" onclick="showAuthView(\'signup\')">اشترك الآن ←</button>';
    plansHtml += '</div>';
  });

  container.innerHTML = `
    <div class="landing-hero">
      <div class="landing-badge">🚀 النظام رقم 1 لإدارة المحلات</div>
      <h1 class="landing-title">سيبك من الدفاتر والورق.<br><span class="text-gradient">محلك وحساباته في جيبك.</span></h1>
      <p class="landing-subtitle">نظام الكاشير الأسهل في مصر. بيع، اطبع فاتورتك، وابعت للعميل واتساب في ثانية. واعرف أرباحك الحقيقية في أي وقت.</p>
      
      <div class="landing-cta-group">
        <button class="landing-btn-primary" onclick="showAuthView('signup')">
          ابدأ 14 يوم مجاناً ←
        </button>
        <span class="landing-trust-text">✅ لن نطلب منك أي بيانات دفع الآن</span>
      </div>
    </div>

    <!-- محاكاة شكل التطبيق -->
    <div class="landing-mockup-wrap">
      <div class="landing-mockup-phone">
        <div class="landing-mockup-header">💳 الدفع الآمن</div>
        <div class="landing-mockup-body">
          <div class="mockup-line"></div>
          <div class="mockup-line short"></div>
          <div class="mockup-box">فاتورة رقم #1092<br><b>150.00 ج.م</b></div>
          <div class="mockup-btn">تأكيد البيع</div>
        </div>
      </div>
      <!-- أيقونات طايرة -->
      <div class="floating-icon icon-1">📦</div>
      <div class="floating-icon icon-2">📈</div>
      <div class="floating-icon icon-3">💬</div>
    </div>

    <!-- قسم مشاكل التاجر (جديد) -->
    <div style="background: #fff; padding: 40px 20px; text-align: center; border-bottom: 1px solid #e2e8f0;">
      <h2 style="font-size: 28px; font-weight: 900; color: #0f172a; margin-bottom: 24px;">هل تعاني من هذه المشاكل في محلك؟</h2>
      <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 16px; max-width: 900px; margin: 0 auto;">
        <div style="background: #fef2f2; color: #991b1b; padding: 16px 24px; border-radius: 12px; font-weight: 700; flex: 1; min-width: 250px; border: 1px solid #fecaca;">❌ بتتعب في حصر مخزونك وبتكتشف إن فيه بضاعة ضايعة؟</div>
        <div style="background: #fef2f2; color: #991b1b; padding: 16px 24px; border-radius: 12px; font-weight: 700; flex: 1; min-width: 250px; border: 1px solid #fecaca;">❌ العملاء اللي عليهم ديون بيتوهوا منك ومش فاكرهم؟</div>
        <div style="background: #fef2f2; color: #991b1b; padding: 16px 24px; border-radius: 12px; font-weight: 700; flex: 1; min-width: 250px; border: 1px solid #fecaca;">❌ بتبيع طول اليوم ومش عارف صافي ربحك الحقيقي كام؟</div>
      </div>
    </div>

    <!-- قسم المميزات (محدث) -->
    <div class="landing-features">
      <div class="landing-feature-card">
        <div class="feat-icon" style="background:#eff6ff; color:#2563eb;">⚡</div>
        <h3>كاشير بيطير</h3>
        <p>امسح الباركود واطبع الفاتورة في ثانية. مفيش طوابير وهتخلص زباين أسرع.</p>
      </div>
      <div class="landing-feature-card">
        <div class="feat-icon" style="background:#ecfdf5; color:#059669;">📦</div>
        <h3>مخزنك في أمان</h3>
        <p>هيعرفك فوراً إيه اللي خلص، وهينبهك قبل ما تخلص، عشان مبيعاتك متقفش.</p>
      </div>
      <div class="landing-feature-card">
        <div class="feat-icon" style="background:#fffbeb; color:#d97706;">💎</div>
        <h3>رجع عميلك تاني</h3>
        <p>نظام نقاط ذكي بيخلي العميل بيشتري منك إنت بس، عشان يستفيد بخصمه.</p>
      </div>
      <div class="landing-feature-card">
        <div class="feat-icon" style="background:#fef2f2; color:#dc2626;">📈</div>
        <h3>اعرف ربحك صح</h3>
        <p>تقارير بتوريك التكلفة والمصروفات وصافي الربح، عشان تاخد قرارات صح لمحلك.</p>
      </div>
    </div>

    <div class="landing-pricing-section">
      <h2>خطط تناسب كل تاجر</h2>
      <div class="landing-plans-grid">
        ${plansHtml}
      </div>
    </div>

    <div class="landing-footer-cta">
      <h2>جاهز تطور تجارتك؟</h2>
      <p>انضم لمئات التجار اللي بيديروا محلاتهم بذكاء وأمان تام.</p>
      <button class="landing-btn-primary" onclick="showAuthView('signup')">أنشئ حسابك المجاني الآن</button>
    </div>
  `;
}

function showLandingView() {
  const landing = document.getElementById('landingView');
  if (landing) landing.style.display = 'block';
  const auth = document.getElementById('authView');
  if (auth) auth.style.display = 'none';
  renderLandingView();
}

function showAuthView(mode) {
  const landing = document.getElementById('landingView');
  if (landing) landing.style.display = 'none';
  const auth = document.getElementById('authView');
  if (auth) auth.style.display = 'block';

  const rb = document.getElementById('recoveryPanel');
  if (rb) rb.style.display = 'none';
  const lb = document.getElementById('loginButtons');
  if (lb) lb.style.display = 'block';

  if (mode === 'signup') {
    setAuthMessage(currentLang === 'en'
      ? 'Fill in your info, then click "✨ Create Account ✨" below'
      : 'املأ بياناتك ثم اضغط "✨ إنشاء حساب جديد ✨" بالأسفل');
  } else {
    setAuthMessage('');
  }

  setTimeout(() => {
    const email = document.getElementById('authEmail');
    if (email) email.focus();
  }, 100);
}

/* ============ قفل التطبيق عند انتهاء الاشتراك ============ */
function enforceSubscriptionBlock() {
  // 1. مسح أي شاشة قفل قديمة أو شريط قديم
  const existing = document.getElementById('subscriptionBlock');
  if (existing) existing.remove();
  
  const oldBanner = document.getElementById('readOnlyBanner');
  if (oldBanner) oldBanner.remove();
  
  document.body.style.overflow = ''; // إرجاع السكرول

  const sub = state.subscription || {};
  let endDate = null;
  if (sub.plan === 'trial' && sub.trial_ends_at) endDate = new Date(sub.trial_ends_at).getTime();
  else if (sub.expires_at) endDate = new Date(sub.expires_at).getTime();

  const now = Date.now();
  const isActive = sub.status === 'active' && (!endDate || endDate > now);
  
  // حفظ حالة الاشتراك في متغير عام عشان نستخدمه في منع الحفظ
  window.isReadOnlyMode = !isActive; 

  if (isActive) {
    document.body.style.paddingTop = '0'; // تصفير المسافة لو الاشتراك سليم
    return;
  }

  // 2. عمل الشريط الأحمر التحذيري
  const en = currentLang === 'en';
  const banner = document.createElement('div');
  banner.id = 'readOnlyBanner';
  banner.style.cssText = 'position:fixed; top:0; left:0; right:0; background:#ef4444; color:#fff; text-align:center; padding:12px; z-index:99999; font-weight:bold; font-size:14px; box-shadow:0 4px 10px rgba(0,0,0,0.2); display:flex; justify-content:center; align-items:center; gap:10px; flex-wrap:wrap;';
  
  banner.innerHTML = `
    <span>⚠️ ${en ? 'Subscription expired. Read-Only mode.' : 'اشتراكك منتهي. أنت الآن في وضع القراءة فقط (لا يمكنك البيع أو التعديل).'}</span>
    <button onclick="showPage('settSubscription')" style="background:#fff; color:#ef4444; border:none; padding:6px 15px; border-radius:20px; font-weight:bold; cursor:pointer; font-family:inherit; font-size:13px;">
      ${en ? 'Renew Now' : 'جدد الآن'}
    </button>
    <button onclick="this.parentElement.remove(); document.body.style.paddingTop='0';" style="background:transparent; border:none; color:#fff; cursor:pointer; font-size:18px; padding:0 5px;">✕</button>
  `;
  
  document.body.prepend(banner);
  document.body.style.paddingTop = '50px'; // عشان الشريط ميداريش الهيدر
}

async function startSubscription(planId) {
  const plan = PLANS.find(p => p.id === planId);
  if (!plan) return;
  
  showLoading(currentLang === 'en' ? 'Connecting to payment...' : 'جارٍ الاتصال ببوابة الدفع...');

  try {
    // 1. الاتصال بدالة Supabase وتمرير الـ userId
    const { data, error } = await supabaseClient.functions.invoke('create-payment', {
      body: {
        amount: plan.price,
        planId: planId,
        userEmail: state.currentUser ? state.currentUser.email : '',
        userName: 'Customer',
        userId: state.currentUser ? state.currentUser.id : '' // 🚨 السطر الجديد المهم جداً
      }
    });

    if (error) throw error;
    if (!data || !data.token) throw new Error('لم يتم استلام توكن الدفع');

    hideLoading();

    // 2. عرض شاشة الدفع (Iframe) جوه التطبيق
    const iframeId = '1090930'; 
    const iframeUrl = `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${data.token}`;

    const oldModal = document.getElementById('paymobIframeModal');
    if (oldModal) oldModal.remove();

    const modal = document.createElement('div');
    modal.id = 'paymobIframeModal';
    modal.className = 'modal-overlay';
    modal.style.zIndex = '9999999'; 
    modal.innerHTML = `
      <div class="modal-card" style="max-width: 600px; width: 100%; padding: 0; overflow: hidden; height: 85vh;">
        <div style="padding: 15px; background: #17364c; color: white; display: flex; justify-content: space-between; align-items: center;">
          <h3 style="margin: 0; color: white;">💳 ${currentLang === 'en' ? 'Secure Payment' : 'الدفع الآمن'}</h3>
          <button onclick="document.getElementById('paymobIframeModal').remove()" style="background: transparent; border: none; color: white; font-size: 20px; cursor: pointer;">✕</button>
        </div>
        <iframe src="${iframeUrl}" width="100%" height="100%" style="border: none;"></iframe>
      </div>
    `;
    document.body.appendChild(modal);

  } catch (err) {
    hideLoading();
    showNotification((currentLang === 'en' ? 'Error: ' : 'خطأ: ') + err.message, 'error');
  }
}
/* ============ عرض تفاصيل باقة ============ */
function showPlanDetail(planId, context) {
  const plan = PLANS.find(p => p.id === planId);
  if (!plan) return;

  const en = currentLang === 'en';
  const cur = state.storeSettings.currency || 'ج.م';
  const dict = translations[currentLang] || translations.ar;

  const old = document.getElementById('planDetailModal');
  if (old) old.remove();

  const names = { starter: en ? 'Starter' : 'البداية', growth: en ? 'Growth' : 'النمو', pro: en ? 'Pro' : 'الاحترافي' };
  const icons = { starter: '🚀', growth: '⭐', pro: '👑' };
  const subtitles = {
    starter: en ? 'Perfect to get started' : 'مناسبة للبداية والاحتياج الأساسي',
    growth:  en ? 'Best for growing shops' : 'الأفضل للمحلات النامية',
    pro:     en ? 'For large stores & chains' : 'للمحلات الكبيرة والسلاسل'
  };

  const includesText = planId === 'growth'
    ? (en ? '✅ Everything in Starter +' : '✅ كل مميزات البداية +')
    : planId === 'pro'
    ? (en ? '✅ Everything in Growth +' : '✅ كل مميزات النمو +')
    : (en ? 'This plan includes:' : 'هذه الباقة تشمل:');

  let featuresHtml = '';
  PLAN_FEATURES.forEach(f => {
    const val = f.values[planId];
    let icon, text, cls;
    if (val === true)  { icon = '✅'; text = en ? f.label_en : f.label_ar; cls = 'pd-on'; }
    else if (val === false) { icon = '❌'; text = en ? f.label_en : f.label_ar; cls = 'pd-off'; }
    else { icon = '✓'; text = (en ? f.label_en : f.label_ar) + ': <b>' + val + '</b>'; cls = 'pd-on'; }
    featuresHtml += '<li class="' + cls + '"><span class="pd-fi">' + icon + '</span><span>' + text + '</span></li>';
  });

  const ctaHtml = context === 'landing'
    ? '<button class="btn green w-100 pd-cta" onclick="hidePlanDetail(); showAuthView(\'signup\')">' + dict.start_free_trial + '</button>'
    : '<button class="btn green w-100 pd-cta" onclick="hidePlanDetail(); startSubscription(\'' + planId + '\')">' + dict.subscribe_now + ' — ' + plan.price + ' ' + cur + '/' + dict.per_month + '</button>';

  const modal = document.createElement('div');
  modal.id = 'planDetailModal';
  modal.className = 'plan-detail-overlay';
  modal.setAttribute('onclick', 'if(event.target===this)hidePlanDetail()');
  modal.innerHTML =
    '<div class="plan-detail-card pd-theme-' + planId + '">' +
      '<button class="pd-close" onclick="hidePlanDetail()">✕</button>' +
      (plan.popular ? '<div class="pd-popular-badge">⭐ ' + dict.most_popular + '</div>' : '') +
      '<div class="pd-hero">' +
        '<div class="pd-icon">' + icons[planId] + '</div>' +
        '<h2 class="pd-name">' + names[planId] + '</h2>' +
        '<p class="pd-subtitle">' + subtitles[planId] + '</p>' +
      '</div>' +
      '<div class="pd-price-block">' +
        '<div class="pd-price"><span class="pd-amount">' + plan.price + '</span><span class="pd-cur">' + cur + '</span><span class="pd-period">/' + dict.per_month + '</span></div>' +
        '<div class="pd-yearly">' + (en ? 'or ' : 'أو ') + '<b>' + plan.yearly + ' ' + cur + '</b>/' + dict.per_year +
          '<span class="pd-save-badge">' + (en ? 'Save 2 months' : 'وفّر شهرين') + '</span></div>' +
      '</div>' +
      '<div class="pd-divider"></div>' +
      '<div class="pd-includes">' + includesText + '</div>' +
      '<ul class="pd-features">' + featuresHtml + '</ul>' +
      ctaHtml +
      '<div class="pd-trust">' +
        '<span>🔒 ' + (en ? 'Secure' : 'دفع آمن') + '</span>' +
        '<span>↩️ ' + (en ? '7-day guarantee' : 'ضمان 7 أيام') + '</span>' +
        '<span>📞 ' + (en ? '24/7 support' : 'دعم 24/7') + '</span>' +
      '</div>' +
    '</div>';

  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';
}

function hidePlanDetail() {
  const m = document.getElementById('planDetailModal');
  if (m) m.remove();
  if (!document.getElementById('subscriptionBlock')) {
    document.body.style.overflow = '';
  }
}
/* ============ نظام تعليق الفواتير (Hold Sale) ============ */
function updateHeldCartsCount() {
  const badge = document.getElementById('heldCartsCount');
  if (badge) badge.innerText = state.heldCarts ? state.heldCarts.length : 0;
}

function holdCurrentSale() {
  if (state.cart.length === 0) {
    return showNotification('السلة فارغة، لا يوجد ما يتم تعليقه', 'warning');
  }

  const custId = document.getElementById('saleCustomer').value;
  const cust = state.customers.find(c => c.id === custId);

  const heldSale = {
    id: uid('HOLD'),
    time: new Date().toISOString(),
    cart: JSON.parse(JSON.stringify(state.cart)),
    customerId: custId,
    customerName: cust ? cust.name : 'عميل نقدي',
    discount: document.getElementById('saleDiscount').value || 0,
    discountType: document.getElementById('saleDiscountType').value,
    notes: document.getElementById('saleNotes').value || ''
  };

  if (!state.heldCarts) state.heldCarts = [];
  state.heldCarts.unshift(heldSale);

  clearCart();
  updateHeldCartsCount();
  saveData();
  showNotification('تم تعليق الفاتورة بنجاح ✅', 'success');
}

function openHeldCartsModal() {
  const modal = document.getElementById('heldCartsModal');
  if (!modal) return;
  modal.style.display = 'flex';
  renderHeldCartsList();
}

function closeHeldCartsModal() {
  const modal = document.getElementById('heldCartsModal');
  if (modal) modal.style.display = 'none';
}

function renderHeldCartsList() {
  const container = document.getElementById('heldCartsList');
  if (!container) return;

  if (!state.heldCarts || state.heldCarts.length === 0) {
    container.innerHTML = '<p class="text-muted text-center">لا توجد فواتير معلقة حالياً.</p>';
    return;
  }

  let html = '';
  state.heldCarts.forEach(sale => {
    const date = new Date(sale.time).toLocaleTimeString(currentLang === 'en' ? 'en-US' : 'ar-EG');
    const total = sale.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    
    html += `
      <div style="background:var(--bg-body); border:1px solid var(--border); border-radius:8px; padding:12px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
        <div>
          <div style="font-weight:bold; color:var(--text-main);">${escapeHTML(sale.customerName)} <span style="font-size:12px; color:var(--text-muted);">(${date})</span></div>
          <div style="font-size:13px; color:var(--text-muted); margin-top:4px;">${sale.cart.length} أصناف - الإجمالي: <b>${total.toFixed(2)} ${state.storeSettings.currency}</b></div>
        </div>
        <div style="display:flex; gap:5px;">
          <button class="small-btn green" onclick="resumeHeldSale('${sale.id}')">استرجاع</button>
          <button class="small-btn red" onclick="deleteHeldSale('${sale.id}')">حذف</button>
        </div>
      </div>
    `;
  });
  container.innerHTML = html;
}

function resumeHeldSale(id) {
  if (state.cart.length > 0) {
    if (!confirm('السلة الحالية بها أصناف. هل تريد تعليقها أولاً واسترجاع الفاتورة المحددة؟')) {
      return;
    }
    holdCurrentSale();
  }

  const index = state.heldCarts.findIndex(s => s.id === id);
  if (index === -1) return;
  
  const sale = state.heldCarts[index];
  
  state.cart = sale.cart;
  document.getElementById('saleCustomer').value = sale.customerId;
  document.getElementById('saleDiscount').value = sale.discount;
  document.getElementById('saleDiscountType').value = sale.discountType;
  document.getElementById('saleNotes').value = sale.notes;

  state.heldCarts.splice(index, 1);
  
  closeHeldCartsModal();
  renderCart();
  updateHeldCartsCount();
  saveData();
  showNotification('تم استرجاع الفاتورة بنجاح ✅', 'success');
}

function deleteHeldSale(id) {
  if (!confirm('هل أنت متأكد من حذف هذه الفاتورة المعلقة نهائياً؟')) return;
  state.heldCarts = state.heldCarts.filter(s => s.id !== id);
  renderHeldCartsList();
  updateHeldCartsCount();
  saveData();
  showNotification('تم حذف الفاتورة المعلقة', 'info');
}
/* ============ إضافة كمية سريعة للمخزون ============ */
function quickAddStock(id) {
  if (state.role !== 'manager') return showNotification('هذه العملية للمدير فقط', 'warning');
  if (window.isReadOnlyMode) return showNotification('جدد اشتراكك أولاً لإضافة منتجات', 'error');
  
  const prod = state.products.find(p => p.id === id);
  if (!prod) return;

  // استخدام شاشة الإدخال السريعة (Prompt) عشان ننجز ومنبوظش الشكل
  const qtyInput = prompt('إضافة كمية للمنتج: "' + prod.name + '"\n\nالمخزون الحالي: ' + prod.stock + '\n\nأدخل الكمية اللي هتضيفها (مثال: 10):');
  
  if (qtyInput === null) return; // لو داس إلغاء
  const qty = parseInt(qtyInput);
  
  if (isNaN(qty) || qty <= 0) {
    return showNotification('أدخل رقم صحيح أكبر من صفر', 'error');
  }

  const oldStock = prod.stock;
  prod.stock += qty;

  // تسجيل الحركة في سجل المخزون
  state.stockMoves.unshift({
    id: uid('SM'), date: new Date().toISOString(),
    productId: prod.id, productName: prod.name,
    type: 'in', qty: qty, oldStock: oldStock, newStock: prod.stock,
    reason: 'إضافة سريعة من قائمة المنتجات'
  });

  saveData();
  renderProducts();
  renderStockMoves();
  renderDashboard();
  updateStockBadge();
  showNotification('تم إضافة ' + qty + ' قطعة لمخزون "' + prod.name + '" ✅', 'success');
}
/* ============ مصروفات الدرج ============ */
function openDrawerExpenseModal() {
  if (window.isReadOnlyMode) return showNotification('جدد اشتراكك أولاً', 'error');
  if (!state.currentShift) {
    return showNotification('لا توجد وردية مفتوحة حالياً. ابدأ بيع أولاً.', 'warning');
  }
  document.getElementById('drawerExpenseAmount').value = '';
  document.getElementById('drawerExpenseReason').value = '';
  document.getElementById('drawerExpenseModal').style.display = 'flex';
}

function saveDrawerExpense() {
  const amount = parseFloat(document.getElementById('drawerExpenseAmount').value);
  const reason = document.getElementById('drawerExpenseReason').value.trim();

  if (isNaN(amount) || amount <= 0 || !reason) {
    return showNotification('أدخل مبلغاً صحيحاً وسبباً للمصروف', 'error');
  }

  // 1. تسجيله في جدول المصروفات العام (عشان يخصم من الربح)
  state.expenses.unshift({
    id: uid('EXP'),
    name: 'مصروف وردية: ' + reason,
    amount: amount,
    date: today(),
    notes: 'تم سحبه من درج الكاشير أثناء الوردية'
  });

  // 2. حفظه في الوردية الحالية (عشان نخصمه من الكاش المتوقع)
  if (!state.currentShift.drawerExpenses) state.currentShift.drawerExpenses = [];
  state.currentShift.drawerExpenses.push({ amount: amount, reason: reason, time: new Date().toISOString() });

  // 3. تحديث الكاش المتوقع
  calcExpectedShiftCash();
  
  saveData();
  renderExpenses(); // تحديث صفحة المصروفات
  document.getElementById('drawerExpenseModal').style.display = 'none';
  showNotification('تم تسجيل المصروف وخصمه من الدرج ✅', 'success');
}
/* ============ تذكير العملاء بالديون ============ */
function sendDebtReminder(customerId) {
  const cust = state.customers.find(c => c.id === customerId);
  if (!cust) return showNotification('العميل غير موجود', 'error');
  
  if (!cust.openingDebt || cust.openingDebt <= 0) {
    return showNotification('هذا العميل ليس عليه أي ديون', 'info');
  }

  const storeName = state.storeSettings.name || 'متجري';
  const currency = state.storeSettings.currency || 'ج.م';
  
  const message = `أهلاً ${cust.name}،\n\n` +
                  `تذكير ودود بخصوص حسابكم معنا في "${storeName}".\n` +
                  `المبلغ المتبقي: ${cust.openingDebt.toFixed(2)} ${currency}.\n\n` +
                  `شاكرين تعاملكم معنا، ونتمنى لكم يوماً سعيداً! 🌟`;

  // تجهيز رقم الموبايل
  const countryCode = state.storeSettings.countryCode || '20';
  const phone = cust.phone && cust.phone !== '-' ? cust.phone.replace(/\D/g, '') : '';
  const finalPhone = phone.startsWith('0') ? countryCode + phone.substring(1) : phone;

  // لو مفيش رقم، نفتح واتساب عادي
  const whatsappUrl = phone ? `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}` : `https://wa.me/?text=${encodeURIComponent(message)}`;
  
  window.open(whatsappUrl, '_blank');
}
function printThermalInvoice(saleId) {
  const sale = state.sales.find(s => s.id === saleId);
  if (!sale) return showNotification('الفاتورة غير موجودة', 'error');

  const settings = state.storeSettings || {};
  const cust = state.customers.find(c => c.id === sale.customerId);
  const custName = cust ? cust.name : 'عميل نقدي';
  const cur = settings.currency || 'ج.م';

  const oldFrame = document.getElementById('thermalPrintFrame');
if (oldFrame) oldFrame.remove();

const iframe = document.createElement('iframe');
iframe.id = 'thermalPrintFrame';
iframe.style.position = 'fixed';
iframe.style.bottom = '0';
iframe.style.right = '0';
iframe.style.width = '0';
iframe.style.height = '0';
iframe.style.border = '0';
document.body.appendChild(iframe);

const win = iframe.contentWindow;

  let itemsHtml = (sale.items || []).map(i => `
    <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
      <div style="flex:1; text-align:right;">${escapeHTML(i.name)}<br><small>${i.qty} × ${i.price.toFixed(2)}</small></div>
      <div style="text-align:left;">${(i.qty * i.price).toFixed(2)}</div>
    </div>
  `).join('');

  win.document.write(`
    <!DOCTYPE html><html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>فاتورة حرارية</title>
      <style>
        @page { margin: 0; size: 80mm auto; }
        body { 
          width: 72mm; margin: 0 auto; padding: 5px; 
          font-family: 'Cairo', Tahoma, sans-serif; font-size: 12px; color: #000;
        }
        .text-center { text-align: center; }
        .dashed-line { border-top: 1px dashed #000; margin: 8px 0; }
        .bold { font-weight: 900; }
        table { width: 100%; border-collapse: collapse; }
      </style>
    </head>
    <body>
      <div class="text-center">
        <h2 style="margin:0 0 5px 0;">${escapeHTML(settings.name || 'متجري')}</h2>
        <div>${escapeHTML(settings.phone || '')}</div>
      </div>
      <div class="dashed-line"></div>
      <div>رقم الفاتورة: ${sale.id}</div>
      <div>التاريخ: ${new Date(sale.date).toLocaleString('ar-EG')}</div>
      <div>العميل: ${escapeHTML(custName)}</div>
      <div class="dashed-line"></div>
       ${itemsHtml}
      <div class="dashed-line"></div>
      ${sale.discount > 0 ? `
        <div style="display:flex; justify-content:space-between;">
          <span>الإجمالي قبل الخصم:</span><span>${sale.subtotal.toFixed(2)} ${cur}</span>
        </div>
        <div style="display:flex; justify-content:space-between; color:red;">
          <span>الخصم:</span><span>- ${sale.discount.toFixed(2)} ${cur}</span>
        </div>
      ` : ''}
      <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:14px;">
        <span>الصافي:</span><span>${sale.total.toFixed(2)} ${cur}</span>
      </div>
      <div style="display:flex; justify-content:space-between;">
        <span>المدفوع:</span><span>${sale.paid.toFixed(2)} ${cur}</span>
      </div>
      ${sale.remaining > 0 ? `<div style="display:flex; justify-content:space-between;"><span>المتبقي:</span><span>${sale.remaining.toFixed(2)} ${cur}</span></div>` : ''}
      <div class="dashed-line"></div>
      <div class="text-center bold" style="margin-top:10px;">شكراً لتعاملكم معنا!</div>
      <script>window.onload=function(){setTimeout(function(){window.print()},300)};<\/script>
    </body></html>
  `);
  win.document.close();
  setTimeout(() => { iframe.remove(); }, 5000);
}
/* ============ استيراد المنتجات من CSV ============ */
function importProductsCSV(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (state.role !== 'manager') return showNotification('للمدير فقط', 'error');

  const reader = new FileReader();
  reader.onload = function(e) {
    const text = e.target.result;
    const lines = text.split('\n');
    let addedCount = 0;

    lines.forEach((line, index) => {
      // تخطي أول سطر (العناوين) والسطور الفاضية
      if (index === 0 || !line.trim()) return;
      
      const cols = line.split(',');
      if (cols.length >= 5) {
        const name = cols[0].trim();
        const barcode = cols[1].trim();
        const price = parseFloat(cols[2]) || 0;
        const cost = parseFloat(cols[3]) || 0;
        const stock = parseInt(cols[4]) || 0;

        if (name) {
          state.products.push({
            id: uid('PRD'),
            name: name,
            barcode: barcode,
            category: 'عام',
            price: price,
            cost: cost,
            stock: stock,
            minStock: 5
          });
          addedCount++;
        }
      }
    });

    if (addedCount > 0) {
      saveData();
      renderProducts();
      showNotification('تم استيراد ' + addedCount + ' منتج بنجاح ✅');
    } else {
      showNotification('لم يتم العثور على بيانات صالحة في الملف', 'warning');
    }
    event.target.value = ''; // تفريغ الحقل
  };
  reader.readAsText(file);
}
function toggleActionMenu(event, id) {
  event.stopPropagation(); // عشان ميقفلش القائمة فوراً
  const menu = document.getElementById('menu-' + id);
  const isShowing = menu.classList.contains('show');
  
  // اقفل أي قائمة تانية مفتوحة
  document.querySelectorAll('.action-dropdown-menu').forEach(m => m.classList.remove('show'));
  
  // افتح القائمة الحالية لو كانت مقفولة
  if (!isShowing) menu.classList.add('show');
}

// اقفل القائمة لو المستخدم دوس في أي مكان في الشاشة
document.addEventListener('click', function() {
  document.querySelectorAll('.action-dropdown-menu').forEach(m => m.classList.remove('show'));
});
/* ============ سجل النشاط (Audit Log) ============ */
function addAuditLog(action, details) {
  const userEmail = state.currentUser ? state.currentUser.email : 'غير معروف';
  const role = state.role === 'manager' ? 'مدير' : 'موظف';
  const logEntry = {
    id: uid('LOG'),
    date: new Date().toISOString(),
    userEmail: userEmail,
    role: role,
    action: action,
    details: details
  };
  if (!state.auditLogs) state.auditLogs = [];
  state.auditLogs.unshift(logEntry);
  if (state.auditLogs.length > 500) state.auditLogs.pop(); // الاحتفاظ بآخر 500 حركة فقط
  saveData();
}

function renderAuditLogs() {
  const container = document.getElementById('auditLogTable');
  if (!container) return;
  
  if (!state.auditLogs || state.auditLogs.length === 0) {
    container.innerHTML = '<p class="text-muted">لا توجد سجلات نشاط حتى الآن.</p>';
    return;
  }
  
  let html = '<div class="table-wrap"><table class="data-table"><thead><tr><th>التاريخ</th><th>المستخدم</th><th>الرتبة</th><th>الإجراء</th><th>التفاصيل</th></tr></thead><tbody>';
  state.auditLogs.forEach(log => {
    html += `<tr>
      <td>${new Date(log.date).toLocaleString('ar-EG')}</td>
      <td>${escapeHTML(log.userEmail)}</td>
      <td>${log.role}</td>
      <td><b>${escapeHTML(log.action)}</b></td>
      <td>${escapeHTML(log.details)}</td>
    </tr>`;
  });
  html += '</tbody></table></div>';
  container.innerHTML = html;
}
function initiateReturnFromSale(saleId) {
  // 1. إغلاق قائمة الخيارات لو مفتوحة
  document.querySelectorAll('.action-dropdown-menu').forEach(m => m.classList.remove('show'));
  
  // 2. الانتقال لصفحة المرتجعات
  showPage('invReturns');
  
  // 3. مهلة صغيرة عشان القائمة تتحدث وبعدين نختار الفاتورة
  setTimeout(() => {
    const saleSel = document.getElementById('returnSale');
    if (saleSel) {
      saleSel.value = saleId;
      updateReturnProducts(); // تحديث قائمة المنتجات
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, 150);
}
/* ============ كشف حساب العميل ============ */
let activeStatementCustomerId = null;

function getStatementData(custId) {
  const cust = state.customers.find(c => c.id === custId);
  if (!cust) return null;

  let transactions = [];
  
  // 1. الفواتير (الديون)
  state.sales.filter(s => s.customerId === custId).forEach(s => {
    if (s.remaining > 0) {
      transactions.push({ date: s.date, desc: 'فاتورة رقم ' + s.id, debit: s.remaining, credit: 0 });
    }
  });

  // 2. التحصيلات (المدفوعات)
  state.customerPayments.filter(p => p.customerId === custId).forEach(p => {
    transactions.push({ date: p.date, desc: 'دفعة (تحصيل)', debit: 0, credit: p.amount });
  });

  // ترتيب حسب التاريخ
  transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

  // حساب الرصيد الافتتاحي
  let totalDebit = transactions.reduce((sum, t) => sum + t.debit, 0);
  let totalCredit = transactions.reduce((sum, t) => sum + t.credit, 0);
  let currentDebt = cust.openingDebt || 0;
  let initialBalance = currentDebt - totalDebit + totalCredit;

  return { cust, transactions, initialBalance, currentDebt };
}

function showCustomerStatement(custId) {
  activeStatementCustomerId = custId;
  const data = getStatementData(custId);
  if (!data) return;

  const { cust, transactions, initialBalance, currentDebt } = data;
  const cur = state.storeSettings.currency || 'ج.م';

  document.getElementById('statementCustName').innerText = cust.name;

  let html = '<div class="table-wrap"><table class="data-table"><thead><tr><th>التاريخ</th><th>البيان</th><th>عليه (مدين)</th><th>له (دائن)</th><th>الرصيد</th></tr></thead><tbody>';
  
  let runningBalance = initialBalance;
  html += `<tr><td>-</td><td>رصيد سابق</td><td>-</td><td>-</td><td><b>${runningBalance.toFixed(2)}</b></td></tr>`;

  transactions.forEach(t => {
    runningBalance += t.debit;
    runningBalance -= t.credit;
    html += `<tr>
      <td>${new Date(t.date).toLocaleDateString('ar-EG')}</td>
      <td>${escapeHTML(t.desc)}</td>
      <td>${t.debit > 0 ? t.debit.toFixed(2) : '-'}</td>
      <td>${t.credit > 0 ? t.credit.toFixed(2) : '-'}</td>
      <td><b>${runningBalance.toFixed(2)}</b></td>
    </tr>`;
  });

  html += `<tr style="background:#fef2f2;"><td colspan="4" style="text-align:left;"><b>الرصيد النهائي المتبقي:</b></td><td><b class="red-text">${currentDebt.toFixed(2)} ${cur}</b></td></tr>`;
  html += '</tbody></table></div>';

  document.getElementById('statementContent').innerHTML = html;
  document.getElementById('customerStatementModal').style.display = 'flex';
}

function printCustomerStatement() {
  if (!activeStatementCustomerId) return;
  const data = getStatementData(activeStatementCustomerId);
  if (!data) return;

  const { cust, transactions, initialBalance, currentDebt } = data;
  const cur = state.storeSettings.currency || 'ج.م';
  const storeName = state.storeSettings.name || 'متجري';

  const win = window.open('', '_blank');
  if (!win) return showNotification('اسمح بالنوافذ المنبثقة للطباعة', 'warning');

  let rows = '';
  let runningBalance = initialBalance;
  rows += `<tr><td>-</td><td>رصيد سابق</td><td>-</td><td>-</td><td>${runningBalance.toFixed(2)}</td></tr>`;

  transactions.forEach(t => {
    runningBalance += t.debit;
    runningBalance -= t.credit;
    rows += `<tr>
      <td>${new Date(t.date).toLocaleDateString('ar-EG')}</td>
      <td>${escapeHTML(t.desc)}</td>
      <td>${t.debit > 0 ? t.debit.toFixed(2) : '-'}</td>
      <td>${t.credit > 0 ? t.credit.toFixed(2) : '-'}</td>
      <td>${runningBalance.toFixed(2)}</td>
    </tr>`;
  });

  win.document.write(`
    <!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>كشف حساب - ${escapeHTML(cust.name)}</title>
    <style>body{font-family:Tahoma,Arial;padding:20px;} h1,h2{text-align:center;color:#17364c;} table{width:100%;border-collapse:collapse;margin-top:20px;} th,td{border:1px solid #ccc;padding:10px;text-align:right;} th{background:#f8fafc;} .total{font-weight:bold;background:#fef2f2;}</style>
    </head><body>
    <h1>${escapeHTML(storeName)}</h1>
    <h2>كشف حساب العميل: ${escapeHTML(cust.name)}</h2>
    <table><thead><tr><th>التاريخ</th><th>البيان</th><th>عليه (مدين)</th><th>له (دائن)</th><th>الرصيد</th></tr></thead>
    <tbody>${rows}<tr class="total"><td colspan="4" style="text-align:left;">الرصيد النهائي المتبقي:</td><td>${currentDebt.toFixed(2)} ${cur}</td></tr></tbody></table>
    <script>window.onload=function(){setTimeout(function(){window.print()},300)};<\/script>
    </body></html>
  `);
  win.document.close();
}
function sendCustomerStatementWhatsApp() {
  if (!activeStatementCustomerId) return;
  const data = getStatementData(activeStatementCustomerId);
  if (!data) return;

  const { cust, transactions, initialBalance, currentDebt } = data;
  const cur = state.storeSettings.currency || 'ج.م';
  const storeName = state.storeSettings.name || 'متجري';

  let message = `أهلاً ${cust.name}،\n`;
  message += `كشف حسابكم في "${storeName}":\n\n`;
  
  // السطر الجديد ده (عرض الرصيد السابق)
  if (initialBalance !== 0) {
    message += `🔹 رصيد سابق: ${initialBalance.toFixed(2)} ${cur}\n`;
  }
  
  message += `🔹 الحركات الأخيرة:\n`;
  
  // بنعرض آخر 5 حركات بس عشان الرسالة متبقاش طويلة أوي
  const recentTransactions = transactions.slice(-5).reverse();
  recentTransactions.forEach(t => {
    if (t.debit > 0) message += `- فاتورة بـ ${t.debit.toFixed(2)} ${cur}\n`;
    if (t.credit > 0) message += `- دفعة بـ ${t.credit.toFixed(2)} ${cur}\n`;
  });

  message += `\n💰 الرصيد الحالي المتبقي: *${currentDebt.toFixed(2)} ${cur}*\n\n`;
  message += `شاكرين تعاملكم معنا! 🌟`;

  const countryCode = state.storeSettings.countryCode || '20';
  const phone = cust.phone && cust.phone !== '-' ? cust.phone.replace(/\D/g, '') : '';
  const finalPhone = phone.startsWith('0') ? countryCode + phone.substring(1) : phone;

  const whatsappUrl = phone ? `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}` : `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank');
}
/* ============ مودال التأكيد المخصص ============ */
function showCustomConfirm(title, message, onConfirm) {
  const modalHtml = `
    <div id="customConfirmModal" class="modal-overlay" style="display:flex; z-index:100000;">
      <div class="modal-card" style="max-width:400px; text-align:center;">
        <h3 style="color:var(--danger); margin-bottom:10px;">${title}</h3>
        <p style="margin-bottom:20px;">${message}</p>
        <div class="btn-group" style="justify-content:center;">
          <button class="btn red" id="confirmBtn">تأكيد</button>
          <button class="btn grey" id="cancelBtn">إلغاء</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  document.getElementById('confirmBtn').onclick = () => {
    document.getElementById('customConfirmModal').remove();
    onConfirm();
  };
  document.getElementById('cancelBtn').onclick = () => {
    document.getElementById('customConfirmModal').remove();
  };
}
