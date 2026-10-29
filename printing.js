/* ============ الفاتورة والطباعة والـ QR ============ */
async function generateQRData(sale) {
  try {
    const profile = state.storeSettings;
    const data = JSON.stringify({ id: sale.id, shop: profile.name || 'متجري', date: sale.date, total: sale.total });
    if (typeof QRCode !== 'undefined') return await QRCode.toDataURL(data, { width: 130, margin: 1 });
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

  const w = window.open('', '_blank');
  if (!w) return showNotification(currentLang === 'en' ? 'Please allow pop-ups.' : 'اسمح بالنوافذ المنبثقة', 'warning');

  const qrDataUrl = await generateQRData(sale);
  const currency = escapeHTML(settings.currency || '');
  const currencyLabel = currency ? ` ${currency}` : '';
  const shopName = escapeHTML(settings.name || (currentLang === 'en' ? 'My Store' : 'متجري'));
  const phone = escapeHTML(settings.phone || settings.storePhone || '-');
  const address = escapeHTML(settings.address || settings.storeAddress || '-');
  const customerName = escapeHTML(cust ? cust.name : (currentLang === 'en' ? 'Cash Customer' : 'عميل نقدي'));
  const dateText = new Date(sale.date).toLocaleString(currentLang === 'en' ? 'en-US' : 'ar-EG');
  const subtotal = (sale.items || []).reduce((sum, i) => sum + Number(i.qty || 0) * Number(i.price || 0), 0);
  const discount = Number(sale.discount || 0);
  const paid = Number(sale.paid || 0);
  const total = Number(sale.total || 0);
  const remaining = Math.max(0, total - paid);
  const cashier = escapeHTML(sale.cashier || (state.currentUser && state.currentUser.email) || '—');
  const en = currentLang === 'en';

  const payLabels = { cash: en ? 'Cash' : 'نقدي', card: en ? 'Card' : 'بطاقة', credit: en ? 'Credit' : 'آجل', wallet: en ? 'Wallet' : 'محفظة', visa: en ? 'Visa' : 'فيزا', transfer: en ? 'Transfer' : 'تحويل' };
  const payText = payLabels[sale.payMethod] || sale.payMethod || '-';

  const safeLogo = typeof settings.logo === 'string' && (settings.logo.startsWith('http') || settings.logo.startsWith('data:image/')) ? settings.logo : '';
  const labels = en ? {invoice:'Invoice',date:'Date',customer:'Customer',item:'Item',qty:'Qty',price:'Price',total:'Total',subtotal:'Subtotal',discount:'Discount',net:'Net Total',paid:'Paid',remaining:'Remaining',payment:'Payment Method',cashier:'Cashier',thanks:'Thank you!'} : {invoice:'رقم الفاتورة',date:'التاريخ',customer:'العميل',item:'الصنف',qty:'الكمية',price:'السعر',total:'الإجمالي',subtotal:'الإجمالي قبل الخصم',discount:'الخصم',net:'الصافي',paid:'المدفوع',remaining:'المتبقي',payment:'طريقة الدفع',cashier:'الكاشير',thanks:'شكراً لتعاملكم معنا!'};

  w.document.write(`<!DOCTYPE html><html lang="${en?'en':'ar'}" dir="${en?'ltr':'rtl'}"><head><meta charset="UTF-8"><title>${labels.invoice} ${escapeHTML(sale.id)}</title><style>*{box-sizing:border-box}body{font-family:Tahoma,Arial;margin:0;padding:22px;background:#f3f6f8;color:#203447}.invoice{max-width:760px;margin:auto;background:white;padding:28px;border:1px solid #dce5ec;border-top:7px solid #176b70;border-radius:12px}.head{text-align:center;border-bottom:2px solid #e1e8ed;padding-bottom:16px}.head h1{color:#17364c;margin:0 0 8px}.meta{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:18px 0}.meta div{padding:11px;background:#f1f6f8;border-radius:8px}.meta b{display:block;color:#176b70;margin-bottom:4px}table{width:100%;border-collapse:collapse;margin:14px 0}th{background:#17364c;color:white}th,td{padding:11px;border:1px solid #dce5ec;text-align:${en?'left':'right'}}tbody tr:nth-child(even){background:#f7fafb}.totals{margin-${en?'left':'right'}:auto;max-width:340px}.totals p{display:flex;justify-content:space-between;margin:7px 0;padding:5px}.net{font-size:23px;font-weight:bold;color:#176b70;border-top:2px solid #176b70;padding-top:12px!important}.footer{text-align:center;border-top:1px solid #dce5ec;margin-top:20px;padding-top:16px}@media print{body{padding:0;background:#fff}.invoice{border:0;border-top:6px solid #176b70;border-radius:0;max-width:none;padding:10px;box-shadow:none}}</style></head><body><main class="invoice"><header class="head">${safeLogo ? `<img src="${safeLogo}" style="max-width:90px;max-height:70px">` : ''}<h1>${shopName}</h1><div>${phone} | ${address}</div></header><section class="meta"><div><b>${labels.invoice}</b>${escapeHTML(sale.id)}</div><div><b>${labels.date}</b>${dateText}</div><div><b>${labels.customer}</b>${customerName}</div></section><table><thead><tr><th>${labels.item}</th><th>${labels.qty}</th><th>${labels.price}</th><th>${labels.total}</th></tr></thead><tbody>${(sale.items||[]).map(i=>`<tr><td>${escapeHTML(i.name||'')}</td><td>${Number(i.qty||0)}</td><td>${Number(i.price||0).toFixed(2)}${currencyLabel}</td><td>${(Number(i.qty||0)*Number(i.price||0)).toFixed(2)}${currencyLabel}</td></tr>`).join('')}</tbody></table><section class="totals"><p><span>${labels.subtotal}</span><b>${subtotal.toFixed(2)}${currencyLabel}</b></p><p><span>${labels.discount}</span><b>${discount.toFixed(2)}${currencyLabel}</b></p><p class="net"><span>${labels.net}</span><span>${total.toFixed(2)}${currencyLabel}</span></p><p><span>${labels.paid}</span><b>${paid.toFixed(2)}${currencyLabel}</b></p><p><span>${labels.remaining}</span><b>${remaining.toFixed(2)}${currencyLabel}</b></p><p><span>${labels.payment}</span><b>${escapeHTML(payText)}</b></p></section><footer class="footer">${qrDataUrl?`<img src="${qrDataUrl}" style="width:115px;height:115px">`:''}<p>${labels.cashier}: <b>${cashier}</b></p></footer></main><script>window.onload=function(){setTimeout(function(){window.print()},250)}<\/script></body></html>`);
  w.document.close();
}

function sendInvoiceWhatsApp(saleId) {
  const planToCheck = state.role === 'employee' ? state.ownerPlan : (state.subscription ? state.subscription.plan : 'trial');
  const cleanPlan = String(planToCheck || 'trial').toLowerCase().trim();
  const limits = { trial: { whatsapp: false }, starter: { whatsapp: false }, growth: { whatsapp: true }, pro: { whatsapp: true } };
  
  if (!limits[cleanPlan] || !limits[cleanPlan].whatsapp) {
    return upgradePrompt(currentLang === 'en' ? 'WhatsApp invoices' : 'فواتير الواتساب');
  }

  const sale = state.sales.find(function(s) { return s.id === saleId; });
  if (!sale) return showNotification('الفاتورة غير موجودة', 'error');

  const cust = state.customers.find(function(c) { return c.id === sale.customerId; });
  const custName = cust ? cust.name : 'عميل نقدي';
  const settings = state.storeSettings || {};
  const storeName = settings.name || 'متجري';
  const currency = settings.currency || 'ج.م';
  const items = Array.isArray(sale.items) ? sale.items : [];
  const total = Number(sale.total || 0);
  const paid = Number(sale.paid || 0);
  const remaining = Math.max(0, total - paid);

  let message = `أهلاً ${custName}،\nشكراً لتعاملك مع ${storeName}.\n\nتفاصيل فاتورتك رقم (${sale.id}):\n`;
  items.forEach(function(item) {
    message += `- ${item.name} × ${Number(item.qty)} = ${(Number(item.price) * Number(item.qty)).toFixed(2)} ${currency}\n`;
  });
  message += `\nالإجمالي: ${total.toFixed(2)} ${currency}\nالمدفوع: ${paid.toFixed(2)} ${currency}\n`;
  if (remaining > 0) message += `المتبقي (دين): ${remaining.toFixed(2)} ${currency}\n`;
  message += `\nنتمنى لك يوماً سعيداً! 🌟`;

  const countryCode = settings.countryCode || '20';
  const phone = cust && cust.phone && cust.phone !== '-' ? cust.phone.replace(/\D/g, '') : '';
  const finalPhone = phone.startsWith('0') ? countryCode + phone.substring(1) : phone;
  window.open(`https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`, '_blank');
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
  iframe.style.cssText = 'position:fixed;bottom:0;right:0;width:0;height:0;border:0;';
  document.body.appendChild(iframe);
  const win = iframe.contentWindow;

  let itemsHtml = (sale.items || []).map(i => `
    <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
      <div style="flex:1; text-align:right;">${escapeHTML(i.name)}<br><small>${i.qty} × ${Number(i.price).toFixed(2)}</small></div>
      <div style="text-align:left;">${(i.qty * i.price).toFixed(2)}</div>
    </div>
  `).join('');

  const subtotal = Number(sale.subtotal || 0);
  const discount = Number(sale.discount || 0);
  const total = Number(sale.total || 0);

  win.document.write(`
    <!DOCTYPE html><html dir="rtl" lang="ar">
    <head><meta charset="UTF-8"><title>فاتورة</title>
      <style>@page{margin:0;size:80mm auto;}body{width:72mm;margin:0 auto;padding:5px;font-family:'Cairo',Tahoma;font-size:12px;color:#000;}.text-center{text-align:center;}.dashed-line{border-top:1px dashed #000;margin:8px 0;}.bold{font-weight:900;}</style>
    </head><body>
      <div class="text-center"><h2 style="margin:0 0 5px 0;">${escapeHTML(settings.name || 'متجري')}</h2><div>${escapeHTML(settings.phone || '')}</div></div>
      <div class="dashed-line"></div>
      <div>رقم الفاتورة: ${sale.id}</div><div>التاريخ: ${new Date(sale.date).toLocaleString('ar-EG')}</div><div>العميل: ${escapeHTML(custName)}</div>
      <div class="dashed-line"></div>${itemsHtml}<div class="dashed-line"></div>
      <div style="display:flex; justify-content:space-between;"><span>الإجمالي قبل الخصم:</span><span>${subtotal.toFixed(2)} ${cur}</span></div>
      ${discount > 0 ? `<div style="display:flex; justify-content:space-between; color:red;"><span>الخصم:</span><span>- ${discount.toFixed(2)} ${cur}</span></div>` : ''}
      <div style="display:flex; justify-content:space-between; font-weight:bold;"><span>الإجمالي:</span><span>${total.toFixed(2)} ${cur}</span></div>
      <div style="display:flex; justify-content:space-between;"><span>المدفوع:</span><span>${Number(sale.paid || 0).toFixed(2)} ${cur}</span></div>
      ${Number(sale.remaining || 0) > 0 ? `<div style="display:flex; justify-content:space-between;"><span>المتبقي:</span><span>${Number(sale.remaining).toFixed(2)} ${cur}</span></div>` : ''}
      <div class="dashed-line"></div><div class="text-center bold" style="margin-top:10px;">شكراً لتعاملكم معنا!</div>
      <script>window.onload=function(){setTimeout(function(){window.print()},300)};<\/script>
    </body></html>
  `);
  win.document.close();
  setTimeout(() => { iframe.remove(); }, 5000);
}