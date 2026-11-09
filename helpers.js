
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


  const moveObj = {
    id: uid('SM'), user_id: ownerId, product_id: prod.id, product_name: prod.name,
    type: 'in', qty: qty, old_stock: oldStock, new_stock: prod.stock,
    reason: tr('quick_add_reason'), date: new Date().toISOString()
  };
  state.stockMoves.unshift({ id: moveObj.id, date: moveObj.date, product_id: prod.id, productId: prod.id, product_name: prod.name, productName: prod.name, type: 'in', qty, old_stock: oldStock, oldStock: oldStock, new_stock: prod.stock, newStock: prod.stock, reason: moveObj.reason });

enqueueSyncOperation('adjust_stock', {
  id: moveObj.id, product_id: prod.id, product_name: prod.name,
  qty: qty, old_stock: oldStock, new_stock: prod.stock,
  reason: moveObj.reason, date: moveObj.date
}, moveObj.id);

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

