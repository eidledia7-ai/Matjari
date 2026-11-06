/* ============ قفل التطبيق عند انتهاء الاشتراك ============ */
function enforceSubscriptionBlock() {
  const existing = document.getElementById('subscriptionBlock');
  if (existing) existing.remove();
  const oldBanner = document.getElementById('readOnlyBanner');
  if (oldBanner) oldBanner.remove();
  document.body.style.overflow = '';

  const sub = state.subscription || {};
  let endDate = null;
  if (sub.plan === 'trial' && sub.trial_ends_at) endDate = new Date(sub.trial_ends_at).getTime();
  else if (sub.expires_at) endDate = new Date(sub.expires_at).getTime();

  const now = Date.now();
  const isActive = sub.status === 'active' && (!endDate || endDate > now);
  window.isReadOnlyMode = !isActive;

  if (isActive) { document.body.style.paddingTop = '0'; return; }

  const banner = document.createElement('div');
  banner.id = 'readOnlyBanner';
  banner.style.cssText = 'position:fixed; top:0; left:0; right:0; background:#ef4444; color:#fff; text-align:center; padding:12px; z-index:99999; font-weight:bold; font-size:14px; box-shadow:0 4px 10px rgba(0,0,0,0.2); display:flex; justify-content:center; align-items:center; gap:10px; flex-wrap:wrap;';
  banner.innerHTML = `
    <span>⚠️ ${tr('sub_expired_banner')}</span>
    <button onclick="showPage('settSubscription')" style="background:#fff; color:#ef4444; border:none; padding:6px 15px; border-radius:20px; font-weight:bold; cursor:pointer; font-family:inherit; font-size:13px;">${tr('sub_renew_now_btn')}</button>
    <button onclick="this.parentElement.remove(); document.body.style.paddingTop='0';" style="background:transparent; border:none; color:#fff; cursor:pointer; font-size:18px; padding:0 5px;">✕</button>
  `;
  document.body.prepend(banner);
  document.body.style.paddingTop = '50px';
}

/* ============ إضافة كمية سريعة للمخزون ============ */
async function quickAddStock(id) {
  if (state.role !== 'manager') return showNotification(tr('manager_only'), 'warning');
  if (window.isReadOnlyMode) return showNotification(tr('renew_sub_first'), 'error');

  const prod = state.products.find(p => p.id === id);
  if (!prod) return;

  const promptMsg = tr('quick_add_prompt_template').replace('{name}', prod.name).replace('{stock}', prod.stock);
  const qtyInput = prompt(promptMsg);
  if (qtyInput === null) return;
  const qty = parseInt(qtyInput);
  if (isNaN(qty) || qty <= 0) return showNotification(tr('invalid_qty_zero'), 'error');

  const oldStock = prod.stock;
  prod.stock += qty;
  const ownerId = (state.role === 'employee' && state.ownerId) ? state.ownerId : state.currentUser.id;

  if (navigator.onLine && supabaseClient) {
    await supabaseClient.from('products').update({ stock: prod.stock }).eq('id', prod.id);
  }

  const moveObj = {
    id: uid('SM'), user_id: ownerId, product_id: prod.id, product_name: prod.name,
    type: 'in', qty: qty, old_stock: oldStock, new_stock: prod.stock,
    reason: tr('quick_add_reason'), date: new Date().toISOString()
  };
  state.stockMoves.unshift({ id: moveObj.id, date: moveObj.date, product_id: prod.id, productId: prod.id, product_name: prod.name, productName: prod.name, type: 'in', qty, old_stock: oldStock, oldStock: oldStock, new_stock: prod.stock, newStock: prod.stock, reason: moveObj.reason });

  if (navigator.onLine && supabaseClient) {
    await supabaseClient.from('stock_moves').insert(moveObj);
  }

  if (typeof addAuditLog === 'function') {
    addAuditLog('quick_add_stock', { productId: prod.id, qty: qty }, prod.id);
  }

  saveData();
refreshCurrentPage();
showNotification(tr('quick_add_success_template').replace('{qty}', qty).replace('{name}', prod.name), 'success');
}

/* ============ تذكير العملاء بالديون ============ */
function sendDebtReminder(customerId) {
  const cust = state.customers.find(c => c.id === customerId);
  if (!cust) return showNotification(tr('cust_not_found'), 'error');

  let debt = 0;
  try {
    if (typeof financeCore !== 'undefined' && typeof financeCore.calcCustomerBalance === 'function') {
      debt = Number(financeCore.calcCustomerBalance(customerId)) || 0;
    } else {
      debt = Number(cust.opening_debt ?? cust.openingDebt) || 0;
    }
  } catch (e) {
    debt = Number(cust.opening_debt ?? cust.openingDebt) || 0;
  }

  if (debt <= 0) return showNotification(tr('debt_no_debts_message'), 'info');

  const storeName = state.storeSettings.name || 'متجري';
  const currency = state.storeSettings.currency || 'ج.م';

  const message = tr('debt_reminder_template')
    .replace('{name}', cust.name)
    .replace('{store}', storeName)
    .replace('{amount}', debt.toFixed(2))
    .replace('{currency}', currency);

  const countryCode = state.storeSettings.countryCode || '20';
  const phone = cust.phone && cust.phone !== '-' ? cust.phone.replace(/\D/g, '') : '';
  const finalPhone = phone.startsWith('0') ? countryCode + phone.substring(1) : phone;
  const whatsappUrl = phone ? `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}` : `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank');
}

/* ============ كشف حساب العميل ============ */
let activeStatementCustomerId = null;

function getStatementData(custId) {
  const cust = state.customers.find(c => c.id === custId);
  if (!cust) return null;

  let transactions = [];
  state.sales.filter(s => (s.customer_id === custId || s.customerId === custId)).forEach(s => {
    if (Number(s.remaining) > 0) {
      transactions.push({ date: s.date, desc: tr('invoice_hash') + s.id, debit: Number(s.remaining), credit: 0 });
    }
  });
  state.customerPayments.filter(p => (p.customer_id === custId || p.customerId === custId)).forEach(p => {
    transactions.push({ date: p.date, desc: tr('collection_payment'), debit: 0, credit: Number(p.amount) });
  });
  (state.returns || []).filter(r => (r.customer_id === custId || r.customerId === custId) && r.refund_method === 'credit').forEach(r => {
    transactions.push({ date: r.date, desc: tr('return_hash') + r.id, debit: 0, credit: Number(r.total) || 0 });
  });

  transactions.sort((a, b) => new Date(a.date) - new Date(b.date));
  let totalDebit = transactions.reduce((sum, t) => sum + t.debit, 0);
  let totalCredit = transactions.reduce((sum, t) => sum + t.credit, 0);
  const opening = Number(cust.opening_debt ?? cust.openingDebt) || 0;
  let currentDebt = opening + totalDebit - totalCredit;

  return { cust, transactions, initialBalance: opening, currentDebt };
}

function showCustomerStatement(custId) {
  activeStatementCustomerId = custId;
  const data = getStatementData(custId);
  if (!data) return;

  const { cust, transactions, initialBalance, currentDebt } = data;
  const cur = state.storeSettings.currency || 'ج.م';

  document.getElementById('statementCustName').innerText = cust.name;

  let html = '<div class="table-wrap"><table class="data-table"><thead><tr><th>' + tr('th_date') + '</th><th>' + tr('statement_description_label') + '</th><th>' + tr('statement_debit_label') + '</th><th>' + tr('statement_credit_label') + '</th><th>' + tr('th_balance') + '</th></tr></thead><tbody>';

  let runningBalance = initialBalance;
  html += `<tr><td>-</td><td>${tr('prev_balance')}</td><td>-</td><td>-</td><td><b>${runningBalance.toFixed(2)}</b></td></tr>`;

  transactions.forEach(t => {
    runningBalance += t.debit;
    runningBalance -= t.credit;
    html += `<tr><td>${new Date(t.date).toLocaleDateString(currentLang === 'en' ? 'en-US' : 'ar-EG')}</td><td>${escapeHTML(t.desc)}</td><td>${t.debit > 0 ? t.debit.toFixed(2) : '-'}</td><td>${t.credit > 0 ? t.credit.toFixed(2) : '-'}</td><td><b>${runningBalance.toFixed(2)}</b></td></tr>`;
  });

  html += `<tr style="background:#fef2f2;"><td colspan="4" style="text-align:left;"><b>${tr('final_balance')}</b></td><td><b class="red-text">${currentDebt.toFixed(2)} ${cur}</b></td></tr>`;
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
  const en = currentLang === 'en';

  const win = window.open('', '_blank');
  if (!win) return showNotification(tr('allow_popups'), 'warning');

  let rows = '';
  let runningBalance = initialBalance;
  rows += `<tr><td>-</td><td>${tr('prev_balance')}</td><td>-</td><td>-</td><td>${runningBalance.toFixed(2)}</td></tr>`;

  transactions.forEach(t => {
    runningBalance += t.debit;
    runningBalance -= t.credit;
    rows += `<tr><td>${new Date(t.date).toLocaleDateString(en ? 'en-US' : 'ar-EG')}</td><td>${escapeHTML(t.desc)}</td><td>${t.debit > 0 ? t.debit.toFixed(2) : '-'}</td><td>${t.credit > 0 ? t.credit.toFixed(2) : '-'}</td><td>${runningBalance.toFixed(2)}</td></tr>`;
  });

  win.document.write(`
    <!DOCTYPE html><html dir="${en ? 'ltr' : 'rtl'}" lang="${en ? 'en' : 'ar'}"><head><meta charset="UTF-8"><title>${tr('statement_title')} - ${escapeHTML(cust.name)}</title>
    <style>body{font-family:Tahoma,Arial;padding:20px;} h1,h2{text-align:center;color:#17364c;} table{width:100%;border-collapse:collapse;margin-top:20px;} th,td{border:1px solid #ccc;padding:10px;text-align:${en ? 'left' : 'right'};} th{background:#f8fafc;} .total{font-weight:bold;background:#fef2f2;}</style>
    </head><body>
    <h1>${escapeHTML(storeName)}</h1>
    <h2>${tr('statement_title')} ${escapeHTML(cust.name)}</h2>
    <table><thead><tr><th>${tr('th_date')}</th><th>${tr('statement_description_label')}</th><th>${tr('statement_debit_label')}</th><th>${tr('statement_credit_label')}</th><th>${tr('th_balance')}</th></tr></thead>
    <tbody>${rows}<tr class="total"><td colspan="4" style="text-align:${en ? 'right' : 'left'};">${tr('final_balance')}</td><td>${currentDebt.toFixed(2)} ${cur}</td></tr></tbody></table>
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

  const prevBalanceBlock = initialBalance !== 0
    ? tr('wa_statement_prev_balance').replace('{amount}', initialBalance.toFixed(2)).replace('{currency}', cur) + '\n'
    : '';

  const recentTransactions = transactions.slice(-5).reverse();
  const transactionsText = recentTransactions.map(t => {
    if (t.debit > 0) return tr('wa_statement_invoice_line').replace('{amount}', t.debit.toFixed(2)).replace('{currency}', cur);
    if (t.credit > 0) return tr('wa_statement_payment_line').replace('{amount}', t.credit.toFixed(2)).replace('{currency}', cur);
    return '';
  }).filter(Boolean).join('\n');

  const message = tr('wa_statement_template')
    .replace('{name}', cust.name)
    .replace('{store}', storeName)
    .replace('{prev_balance_block}', prevBalanceBlock)
    .replace('{transactions}', transactionsText)
    .replace('{current}', currentDebt.toFixed(2))
    .replace('{currency}', cur);

  const countryCode = state.storeSettings.countryCode || '20';
  const phone = cust.phone && cust.phone !== '-' ? cust.phone.replace(/\D/g, '') : '';
  const finalPhone = phone.startsWith('0') ? countryCode + phone.substring(1) : phone;
  const whatsappUrl = phone ? `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}` : `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank');
}

/* ============ استيراد المنتجات من CSV ============ */
async function importProductsCSV(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (state.role !== 'manager') return showNotification(tr('manager_only'), 'error');

  const reader = new FileReader();
  reader.onload = async function(e) {
    const text = e.target.result;
    const lines = text.split('\n');
    let addedCount = 0;
    const newProductsToUpload = [];
    const ownerId = state.currentUser.id;

    lines.forEach((line, index) => {
      if (index === 0 || !line.trim()) return;
      const cols = line.split(',');
      if (cols.length >= 5) {
        const name = cols[0].trim();
        const barcode = cols[1].trim();
        const price = parseFloat(cols[2]) || 0;
        const cost = parseFloat(cols[3]) || 0;
        const stock = parseInt(cols[4]) || 0;
        if (name) {
          const newProd = {
            id: uid('PRD'), user_id: ownerId, name: name, barcode: barcode,
            category: tr('general_cat'), price: price, cost: cost, stock: stock, min_stock: 5
          };
          state.products.push({
            id: newProd.id, name: newProd.name, barcode: newProd.barcode,
            category: newProd.category, price: newProd.price, cost: newProd.cost,
            stock: newProd.stock, min_stock: newProd.min_stock, minStock: newProd.min_stock
          });
          newProductsToUpload.push(newProd);
          addedCount++;
        }
      }
    });

    if (addedCount > 0) {
      if (navigator.onLine && supabaseClient) {
        await supabaseClient.from('products').insert(newProductsToUpload);
      }
      if (typeof addAuditLog === 'function') addAuditLog('import_products_csv', { count: addedCount });
      saveData();
      renderProducts();
      showNotification(tr('csv_success') + addedCount + tr('csv_success_end'));
    } else {
      showNotification(tr('csv_no_data'), 'warning');
    }
    event.target.value = '';
  };
  reader.readAsText(file);
}

/* ============ قائمة خيارات الفاتورة ============ */
function toggleActionMenu(event, id) {
  event.stopPropagation();
  const menu = document.getElementById('menu-' + id);
  if (!menu) return;
  const isShowing = menu.classList.contains('show');
  document.querySelectorAll('.action-dropdown-menu').forEach(m => m.classList.remove('show'));
  if (!isShowing) menu.classList.add('show');
}

document.addEventListener('click', function() {
  document.querySelectorAll('.action-dropdown-menu').forEach(m => m.classList.remove('show'));
});

function initiateReturnFromSale(saleId) {
  document.querySelectorAll('.action-dropdown-menu').forEach(m => m.classList.remove('show'));
  showPage('invReturns');
  setTimeout(() => {
    const saleSel = document.getElementById('returnSale');
    if (saleSel) {
      saleSel.value = saleId;
      updateReturnProducts();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, 150);
}

/* ============ مودال التأكيد المخصص ============ */
function showCustomConfirm(title, message, onConfirm) {
  const modalHtml = `
    <div id="customConfirmModal" class="modal-overlay" style="display:flex; z-index:100000;">
      <div class="modal-card" style="max-width:400px; text-align:center;">
        <h3 style="color:var(--danger); margin-bottom:10px;">${title}</h3>
        <p style="margin-bottom:20px;">${message}</p>
        <div class="btn-group" style="justify-content:center;">
          <button class="btn red" id="confirmBtn">${tr('confirm_btn')}</button>
          <button class="btn grey" id="cancelBtn">${tr('cancel_btn')}</button>
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