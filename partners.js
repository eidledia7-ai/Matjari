/* ============ العملاء ============ */
async function saveCustomer() {
  if (window.isReadOnlyMode) return showNotification(tr('renew_sub_first'), 'error');
  if (state.role !== 'manager') return showNotification(tr('manager_only'), 'warning');

  const id = document.getElementById('customerId').value;
  const name = document.getElementById('customerName').value.trim();
  const phone = document.getElementById('customerPhone').value.trim();
  const rawDebt = parseFloat(document.getElementById('customerOpeningDebt').value);
  const openingDebt = Number.isFinite(rawDebt) && rawDebt >= 0 ? rawDebt : 0;

  if (!name) return showNotification(tr('customer_name_req'), 'error');

  const ownerId = (state.role === 'employee' && state.ownerId) ? state.ownerId : state.currentUser.id;
  const customerId = id || uid('CUST');
  const preservedPoints = id ? (state.customers.find(c => c.id === id)?.points || 0) : 0;

  // Part 2: payload يطابق ما يتوقعه _executeOp('insert_customer') في sync-queue.js
  const payload = {
    id: customerId, user_id: ownerId, name: name, phone: phone,
    opening_debt: openingDebt, points: preservedPoints
  };

  // Part 2: Half-Commit Precondition — enqueue أولاً
  // لو الـ queue ممتلئ → null → نوقف قبل أي state mutation
  const opId = enqueueSyncOperation('insert_customer', payload, customerId);
  if (opId === null) return;

  // Part 2: state mutation بعد enqueue ناجح
  if (id) {
    // Edit — الكائن موجود، flag-marking اتعمل جوّه enqueueSyncOperation على نفس الـ reference
    const c = state.customers.find(function(item) { return item.id === id; });
    if (c) {
      c.name = name; c.phone = phone;
      c.openingDebt = openingDebt; c.opening_debt = openingDebt;
    }
  } else {
    // Create — الكائن مش موجود وقت الـ enqueue، فالعلم صريح في الـ push
    state.customers.push({
      id: customerId, name: name, phone: phone,
      openingDebt: openingDebt, opening_debt: openingDebt, points: 0,
      _pendingUpload: true
    });
  }

  if (typeof addAuditLog === 'function') {
    addAuditLog(id ? 'edit_customer' : 'add_customer', { customerId, name }, customerId);
  }

  saveData();
  ['customerId', 'customerName', 'customerPhone'].forEach(function(i) {
    const el = document.getElementById(i);
    if (el) el.value = '';
  });
  const d = document.getElementById('customerOpeningDebt');
  if (d) d.value = 0;
  renderCustomers();
  showNotification(tr('customer_saved'));
}

function renderCustomers() {
  const container = document.getElementById('customersTable');
  if (!container) return;

  const searchEl = document.getElementById('customerSearch');
  const search = (searchEl ? searchEl.value : '').toLowerCase();

  const filtered = state.customers.filter(function(c) {
    return (c.name || '').toLowerCase().indexOf(search) !== -1 ||
      (c.phone || '').indexOf(search) !== -1;
  });

  const paySel = document.getElementById('customerPaymentCustomer');
  if (paySel) {
    const currentVal = paySel.value;
    paySel.innerHTML = '';
    state.customers.forEach(function(c) {
      const isCashCustomer = c.name === 'عميل نقدي عام' || c.name === 'Cash Customer';
      // ✅ v7.10.2 — إزالة anti-pattern
      const displayName = isCashCustomer ? tr('cash_customer') : c.name;
      const debtLabel = tr('debt_prefix');
      const realDebt = financeCore.calcCustomerBalance(c.id);
      paySel.innerHTML += '<option value="' + c.id + '">' + escapeHTML(displayName) + debtLabel + realDebt.toFixed(2) + ')</option>';
    });
    if (currentVal) paySel.value = currentVal;
  }

  if (filtered.length === 0) {
    container.innerHTML = '<p class="text-muted">' + tr('no_customers') + '</p>';
    return;
  }

  let html = '<div class="table-wrap"><table class="data-table"><thead><tr><th data-i18n="th_name">' + tr('th_name') + '</th><th data-i18n="th_phone">' + tr('th_phone') + '</th><th data-i18n="th_debts">' + tr('th_debts') + '</th><th data-i18n="th_action">' + tr('th_action') + '</th></tr></thead><tbody>';
  filtered.forEach(function(c) {
    const debtVal = financeCore.calcCustomerBalance(c.id);
    const debtClass = debtVal > 0 ? 'red-text' : '';
    // ✅ v7.10.2 — ترجمة
    const stmtBtn = tr('statement_btn');
    const delBtn = tr('delete_btn');
    const stmtTitle = tr('statement_btn');
    const delTitle = tr('delete_btn');

    html += '<tr>' +
      '<td>' + escapeHTML(c.name) + '</td>' +
      '<td>' + escapeHTML(c.phone || '-') + '</td>' +
      '<td class="' + debtClass + '"><b>' + debtVal.toFixed(2) + '</b></td>' +
      '<td style="white-space:nowrap;">' +
        '<button class="small-btn primary" onclick="showCustomerStatement(\'' + c.id + '\')" title="' + stmtTitle + '">' + stmtBtn + '</button>' +
        '<button class="small-btn red" onclick="deleteCustomer(\'' + c.id + '\')" title="' + delTitle + '">🗑️ ' + delBtn + '</button>' +
      '</td>' +
      '</tr>';
  });
  html += '</tbody></table></div>';
  container.innerHTML = html;
}

async function deleteCustomer(id) {
  if (state.role !== 'manager') return showNotification(tr('manager_only'), 'warning');

  const cust = state.customers.find(c => c.id === id);
  if (cust && (cust.name === 'عميل نقدي عام' || cust.name === 'Cash Customer')) {
    return showNotification(tr('cannot_delete_cash_cust'), 'warning');
  }
  if (state.customers.length <= 1) return showNotification(tr('cannot_delete_last_cust'), 'warning');

  const realDebt = financeCore.calcCustomerBalance(id);
  if (realDebt > 0) {
    const confirmMsg = tr('cust_has_debt_1') + realDebt.toFixed(2) + tr('cust_has_debt_2');
    if (!confirm(confirmMsg)) return;
  } else {
    if (!confirm(tr('msg_delete_customer'))) return;
  }

  if (navigator.onLine && supabaseClient) {
    await supabaseClient.from('customers').delete().eq('id', id);
  }

  if (cust && typeof addAuditLog === 'function') {
    addAuditLog('delete_customer', { customerId: cust.id, name: cust.name }, cust.id);
  }

  state.customers = state.customers.filter(function(c) { return c.id !== id; });
  saveData();
  renderCustomers();
  showNotification(tr('deleted'));
}

async function recordCustomerPayment() {
  if (window.isReadOnlyMode) return showNotification(tr('renew_sub_expense'), 'error');
  if (state.role !== 'manager') return showNotification(tr('manager_only'), 'warning');

  const customerId = document.getElementById('customerPaymentCustomer').value;
  const amount = parseFloat(document.getElementById('customerPaymentAmount').value);
  const date = document.getElementById('customerPaymentDate').value || today();
  const notes = document.getElementById('customerPaymentNotes').value.trim();

  if (!customerId || !Number.isFinite(amount) || amount <= 0) return showNotification(tr('invalid_amount'), 'error');

  const cust = state.customers.find(function(c) { return c.id === customerId; });
  if (!cust) return showNotification(tr('cust_not_found'), 'error');

  const currentDebt = financeCore.calcCustomerBalance(customerId);

  if (amount > currentDebt) {
    if (!confirm(tr('amount_exceeds_debt'))) return;
  }

  const ownerId = (state.role === 'employee' && state.ownerId) ? state.ownerId : state.currentUser.id;

  let currentShiftId = null;
  if (state.currentShift) {
    currentShiftId = state.currentShift.id;
  } else {
    const openShift = (state.shifts || []).find(s => !s.end_time && !s.endTime);
    if (openShift) currentShiftId = openShift.id;
  }

  const paymentId = uid('CP');

  // Part 2: payload يطابق _executeOp('insert_customer_payment')
  const payload = {
    id: paymentId, user_id: ownerId, customer_id: customerId, customer_name: cust.name,
    amount: amount, date: date, notes: notes, shift_id: currentShiftId, pay_method: 'cash'
  };

  // Part 2: Half-Commit Precondition — enqueue أولاً
  const opId = enqueueSyncOperation('insert_customer_payment', payload, paymentId);
  if (opId === null) return;

  // Part 2: state mutation بعد enqueue ناجح
  state.customerPayments.unshift({
    id: paymentId, customer_id: customerId, customerId: customerId,
    customer_name: cust.name, customerName: cust.name, amount: amount, date: date, notes: notes,
    shift_id: currentShiftId, shiftId: currentShiftId, pay_method: 'cash', payMethod: 'cash',
    _pendingUpload: true
  });

  if (typeof addAuditLog === 'function') {
    addAuditLog('record_customer_payment', { paymentId: paymentId, amount, customerId }, paymentId);
  }

  // ✅ v7.4 — تحديث فوري لرصيد العميل في الكاش (safe update)
  if (customerId) {
    state.customerBalances = state.customerBalances || {};
    state.customerBalances[customerId] = (Number(state.customerBalances[customerId]) || 0) - amount;
  }

  saveData();
  document.getElementById('customerPaymentAmount').value = '';
  document.getElementById('customerPaymentNotes').value = '';
  refreshCurrentPage();
  showNotification(tr('payment_success'));
}

function renderCustomerPayments() {
  const container = document.getElementById('customerPaymentsTable');
  if (!container) return;
  if (state.customerPayments.length === 0) {
    container.innerHTML = '<p class="text-muted">' + tr('no_collections') + '</p>';
    return;
  }
  let html = '<div class="table-wrap"><table class="data-table"><thead><tr><th data-i18n="th_date">' + tr('th_date') + '</th><th data-i18n="th_customer">' + tr('th_customer') + '</th><th data-i18n="th_amount">' + tr('th_amount') + '</th><th data-i18n="th_notes">' + tr('th_notes') + '</th></tr></thead><tbody>';
  state.customerPayments.forEach(function(p) {
    const custName = p.customerName || p.customer_name || '-';
    html += '<tr>' +
      '<td>' + escapeHTML(p.date) + '</td>' +
      '<td>' + escapeHTML(custName) + '</td>' +
      '<td><b>' + (Number(p.amount) || 0).toFixed(2) + '</b></td>' +
      '<td>' + escapeHTML(p.notes || '-') + '</td>' +
      '</tr>';
  });
  html += '</tbody></table></div>';
  container.innerHTML = html;
}

/* ============ الموردون والمشتريات ============ */
async function saveSupplier() {
  if (state.role !== 'manager') return showNotification(tr('manager_only'), 'warning');

  const id = document.getElementById('supplierId').value;
  const name = document.getElementById('supplierName').value.trim();
  const phone = document.getElementById('supplierPhone').value.trim();
  const rawDebt = parseFloat(document.getElementById('supplierOpeningDebt').value);
  const openingDebt = Number.isFinite(rawDebt) && rawDebt >= 0 ? rawDebt : 0;

  if (!name) return showNotification(tr('supplier_name_req'), 'error');

  const ownerId = (state.role === 'employee' && state.ownerId) ? state.ownerId : state.currentUser.id;
  const supplierId = id || uid('SUP');

  const newSupplier = {
    id: supplierId, user_id: ownerId, name: name, phone: phone, opening_debt: openingDebt
  };

  if (id) {
    const s = state.suppliers.find(function(item) { return item.id === id; });
    if (s) { s.name = name; s.phone = phone; s.openingDebt = openingDebt; s.opening_debt = openingDebt; }
  } else {
    state.suppliers.push({ id: supplierId, name: name, phone: phone, openingDebt: openingDebt, opening_debt: openingDebt });
  }

  if (navigator.onLine && supabaseClient) {
    const { error } = await supabaseClient.from('suppliers').upsert(newSupplier, { onConflict: 'id' });
    if (error) {
      console.warn('Supplier upload failed:', error);
      return showNotification(tr('supplier_save_fail') + error.message, 'error');
    }
  }

  if (typeof addAuditLog === 'function') {
    addAuditLog(id ? 'edit_supplier' : 'add_supplier', { supplierId, name }, supplierId);
  }

  saveData();
  clearSupplierForm();
  renderSuppliers();
  showNotification(tr('supplier_saved'));
}

function editSupplier(id) {
  if (state.role !== 'manager') return showNotification(tr('manager_only'), 'warning');
  const s = state.suppliers.find(function(item) { return item.id === id; });
  if (!s) return;
  document.getElementById('supplierId').value = s.id;
  document.getElementById('supplierName').value = s.name || '';
  document.getElementById('supplierPhone').value = s.phone || '';
  document.getElementById('supplierOpeningDebt').value = Number(s.openingDebt ?? s.opening_debt) || 0;
  const title = document.getElementById('supplierFormTitle');
  if (title) title.innerText = tr('edit_supplier_prefix') + s.name;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function clearSupplierForm() {
  ['supplierId', 'supplierName', 'supplierPhone', 'supplierOpeningDebt'].forEach(function(id) {
    const el = document.getElementById(id);
    if (el) el.value = (id === 'supplierOpeningDebt') ? 0 : '';
  });
  const title = document.getElementById('supplierFormTitle');
  if (title) title.innerText = tr('add_supplier');
}

function renderSuppliers() {
  const container = document.getElementById('suppliersTable');
  if (!container) return;

  const purSupSel = document.getElementById('purchaseSupplier');
  if (purSupSel) {
    const curVal = purSupSel.value;
    purSupSel.innerHTML = '<option value="">' + tr('opt_select_supplier') + '</option>';
    state.suppliers.forEach(function(s) {
      purSupSel.innerHTML += '<option value="' + s.id + '">' + escapeHTML(s.name) + '</option>';
    });
    if (curVal) purSupSel.value = curVal;
  }

  const suppPaySel = document.getElementById('supplierPaymentSupplier');
  if (suppPaySel) {
    const curVal = suppPaySel.value;
    suppPaySel.innerHTML = '<option value="">' + tr('opt_select_supplier') + '</option>';
    state.suppliers.forEach(function(s) {
      const realBalance = financeCore.calcSupplierBalance(s.id);
      suppPaySel.innerHTML += '<option value="' + s.id + '">' + escapeHTML(s.name) + tr('payables_prefix') + realBalance.toFixed(2) + tr('payables_prefix_end') + '</option>';
    });
    if (curVal) suppPaySel.value = curVal;
  }

  const purProdSel = document.getElementById('purchaseProduct');
  if (purProdSel) {
    const curVal = purProdSel.value;
    purProdSel.innerHTML = '<option value="">' + tr('opt_select_existing_product') + '</option>';
    state.products.forEach(function(p) {
      purProdSel.innerHTML += '<option value="' + p.id + '">' + escapeHTML(p.name) + '</option>';
    });
    if (curVal) purProdSel.value = curVal;
  }

  if (state.suppliers.length === 0) {
    container.innerHTML = '<p class="text-muted">' + tr('no_suppliers') + '</p>';
    return;
  }

  // ✅ v7.10.2 — ترجمة
  const editBtn = tr('edit_btn');
  const deleteBtn = tr('delete_btn');

  let html = '<div class="table-wrap"><table class="data-table"><thead><tr><th data-i18n="th_name">' + tr('th_name') + '</th><th data-i18n="th_phone">' + tr('th_phone') + '</th><th data-i18n="th_payables">' + tr('th_payables') + '</th><th data-i18n="th_action">' + tr('th_action') + '</th></tr></thead><tbody>';
  state.suppliers.forEach(function(s) {
    const debtVal = financeCore.calcSupplierBalance(s.id);
    const debtClass = debtVal > 0 ? 'green-text' : '';
    html += '<tr>' +
      '<td>' + escapeHTML(s.name) + '</td>' +
      '<td>' + escapeHTML(s.phone || '-') + '</td>' +
      '<td class="' + debtClass + '"><b>' + debtVal.toFixed(2) + '</b></td>' +
      '<td>' +
        '<button class="small-btn primary" onclick="editSupplier(\'' + s.id + '\')">' + editBtn + '</button>' +
        '<button class="small-btn red" onclick="deleteSupplier(\'' + s.id + '\')">' + deleteBtn + '</button>' +
      '</td>' +
      '</tr>';
  });
  html += '</tbody></table></div>';
  container.innerHTML = html;
}

async function deleteSupplier(id) {
  if (state.role !== 'manager') return showNotification(tr('manager_only'), 'warning');

  const sup = state.suppliers.find(function(s) { return s.id === id; });

  const realBalance = financeCore.calcSupplierBalance(id);
  if (realBalance > 0) {
    const confirmMsg = tr('owe_supplier_1') + realBalance.toFixed(2) + tr('owe_supplier_2');
    if (!confirm(confirmMsg)) return;
  } else {
    if (!confirm(tr('msg_delete_supplier'))) return;
  }

  if (navigator.onLine && supabaseClient) {
    await supabaseClient.from('suppliers').delete().eq('id', id);
  }

  if (sup && typeof addAuditLog === 'function') {
    addAuditLog('delete_supplier', { supplierId: sup.id, name: sup.name }, sup.id);
  }

  state.suppliers = state.suppliers.filter(function(s) { return s.id !== id; });
  saveData();
  renderSuppliers();
  showNotification(tr('deleted'));
}

function calcPurchaseTotal() {
  const qty = parseFloat(document.getElementById('purchaseQty').value) || 0;
  const cost = parseFloat(document.getElementById('purchaseCost').value) || 0;
  const total = qty * cost;
  const totEl = document.getElementById('purchaseTotal');
  if (totEl) totEl.value = total.toFixed(2);
}

async function savePurchase() {
  if (window.isReadOnlyMode) return showNotification(tr('renew_sub_expense'), 'error');
  if (state.role !== 'manager') return showNotification(tr('manager_only'), 'warning');

  const supplierId = document.getElementById('purchaseSupplier').value;
  const prodId = document.getElementById('purchaseProduct').value;
  const newName = document.getElementById('purchaseNewName').value.trim();
  const qty = parseInt(document.getElementById('purchaseQty').value) || 1;
  const cost = parseFloat(document.getElementById('purchaseCost').value) || 0;
  const purchasePriceInput = document.getElementById('purchasePrice');
  const salePriceEntered = purchasePriceInput && purchasePriceInput.value.trim() !== '' ? parseFloat(purchasePriceInput.value) : cost;
  const purchaseSalePrice = Number.isFinite(salePriceEntered) && salePriceEntered >= 0 ? salePriceEntered : cost;
  const paid = parseFloat(document.getElementById('purchasePaid').value) || 0;

  if (!supplierId) return showNotification(tr('notify_select_supplier'), 'error');
  if (qty < 1 || cost < 0) return showNotification(tr('invalid_qty_cost'), 'error');

  const ownerId = (state.role === 'employee' && state.ownerId) ? state.ownerId : state.currentUser.id;
  let targetProdId = prodId;
  let targetProdName = '';
  let newProductData = null;

  if (prodId) {
    const p = state.products.find(function(item) { return item.id === prodId; });
    if (p) {
      const oldStock = Number(p.stock) || 0;
      const oldCost = Number(p.cost) || 0;
      let newCost = cost;
      if ((oldStock + qty) > 0) {
        newCost = ((oldStock * oldCost) + (qty * cost)) / (oldStock + qty);
      }
      p.stock = oldStock + qty;
      p.cost = newCost;
      targetProdName = p.name;

      state.stockMoves.unshift({
        id: uid('SM'), date: new Date().toISOString(),
        product_id: p.id, productId: p.id,
        product_name: p.name, productName: p.name,
        type: 'purchase', qty: qty,
        old_stock: oldStock, oldStock: oldStock,
        new_stock: p.stock, newStock: p.stock,
        reason: tr('purchases_type')
      });
    }
  } else if (newName) {
    targetProdId = uid('PRD');
    newProductData = {
      id: targetProdId, user_id: ownerId, name: newName, barcode: '',
      category: tr('general_cat'), price: purchaseSalePrice, cost: cost,
      stock: 0, min_stock: 5
    };

    state.products.push({
      id: targetProdId, name: newName, barcode: '', category: tr('general_cat'),
      price: purchaseSalePrice, cost: cost, stock: qty, minStock: 5, min_stock: 5
    });
    targetProdName = newName;

    state.stockMoves.unshift({
      id: uid('SM'), date: new Date().toISOString(),
      product_id: targetProdId, productId: targetProdId,
      product_name: targetProdName, productName: targetProdName,
      type: 'purchase', qty: qty,
      old_stock: 0, oldStock: 0,
      new_stock: qty, newStock: qty,
      reason: tr('new_prod_purchase_reason')
    });
  } else {
    return showNotification(tr('select_prod_name_err'), 'error');
  }

  const total = qty * cost;
  const remaining = Math.max(0, total - paid);

  const newPurchase = {
    id: uid('PUR'), user_id: ownerId, supplier_id: supplierId,
    product_id: targetProdId, product_name: targetProdName,
    qty: qty, cost: cost, total: total, paid: paid, remaining: remaining,
    date: new Date().toISOString()
  };

  state.purchases.unshift({
    id: newPurchase.id, date: newPurchase.date,
    supplier_id: supplierId, supplierId: supplierId,
    product_id: targetProdId, productId: targetProdId,
    product_name: targetProdName, productName: targetProdName,
    qty: qty, cost: cost, total: total, paid: paid, remaining: remaining
  });

 if (newProductData) {
  enqueueSyncOperation('insert_product', newProductData, newProductData.id);
}
enqueueSyncOperation('insert_purchase', {
  id: newPurchase.id, supplier_id: newPurchase.supplier_id,
  product_id: newPurchase.product_id, product_name: newPurchase.product_name,
  qty: newPurchase.qty, cost: newPurchase.cost, total: newPurchase.total,
  paid: newPurchase.paid, remaining: newPurchase.remaining, date: newPurchase.date
}, newPurchase.id);

  if (typeof addAuditLog === 'function') {
    addAuditLog('add_purchase', { purchaseId: newPurchase.id, total }, newPurchase.id);
  }

  saveData();
document.getElementById('purchaseNewName').value = '';
document.getElementById('purchaseQty').value = 1;
document.getElementById('purchaseCost').value = '';
if (purchasePriceInput) purchasePriceInput.value = '';
document.getElementById('purchaseTotal').value = '0.00';
document.getElementById('purchasePaid').value = 0;
refreshCurrentPage();
showNotification(tr('purchase_success'));
}

function renderPurchases() {
  const container = document.getElementById('purchasesTable');
  if (!container) return;
  if (state.purchases.length === 0) {
    container.innerHTML = '<p class="text-muted">' + tr('no_purchases') + '</p>';
    return;
  }
  const delErrBtn = tr('delete_err_btn');

  let html = '<div class="table-wrap"><table class="data-table"><thead><tr><th data-i18n="th_date">' + tr('th_date') + '</th><th data-i18n="th_supplier">' + tr('th_supplier') + '</th><th data-i18n="th_product">' + tr('th_product') + '</th><th data-i18n="th_quantity">' + tr('th_quantity') + '</th><th data-i18n="th_cost">' + tr('th_cost') + '</th><th data-i18n="th_total">' + tr('th_total') + '</th><th data-i18n="th_remaining">' + tr('th_remaining') + '</th><th data-i18n="th_action">' + tr('th_action') + '</th></tr></thead><tbody>';
  state.purchases.forEach(function(p) {
    const supId = p.supplier_id || p.supplierId;
    const sup = state.suppliers.find(function(s) { return s.id === supId; });
    const productName = p.product_name || p.productName;
    const totalNum = Number(p.total) || 0;
    const remainingNum = Number(p.remaining) || 0;
    html += '<tr>' +
      '<td>' + new Date(p.date).toLocaleString(currentLang === 'en' ? 'en-US' : 'ar-EG') + '</td>' +
      '<td>' + escapeHTML(sup ? sup.name : '-') + '</td>' +
      '<td>' + escapeHTML(productName) + '</td>' +
      '<td>' + p.qty + '</td>' +
      '<td>' + p.cost + '</td>' +
      '<td>' + totalNum.toFixed(2) + '</td>' +
      '<td class="' + (remainingNum > 0 ? 'red-text' : '') + '">' + remainingNum.toFixed(2) + '</td>' +
      '<td><button class="small-btn red" onclick="safeDeleteRecord(\'purchase\', \'' + p.id + '\')">' + delErrBtn + '</button></td>' +
      '</tr>';
  });
  html += '</tbody></table></div>';
  container.innerHTML = html;
}

async function recordSupplierPayment() {
  // Part 2: isReadOnlyMode check — كان مفقود (مخالف للمقدس #2) — أُضيف ضمن نطاق الـ 3 دوال
  if (window.isReadOnlyMode) return showNotification(tr('renew_sub_expense'), 'error');
  if (state.role !== 'manager') return showNotification(tr('manager_only'), 'warning');

  const supplierId = document.getElementById('supplierPaymentSupplier').value;
  const amount = parseFloat(document.getElementById('supplierPaymentAmount').value);
  const date = document.getElementById('supplierPaymentDate').value || today();
  const notes = document.getElementById('supplierPaymentNotes').value.trim();

  if (!supplierId || !Number.isFinite(amount) || amount <= 0) return showNotification(tr('notify_select_supplier_amount'), 'error');

  const sup = state.suppliers.find(function(s) { return s.id === supplierId; });
  if (!sup) return showNotification(tr('supplier_not_found'), 'error');

  const ownerId = (state.role === 'employee' && state.ownerId) ? state.ownerId : state.currentUser.id;
  const paymentId = uid('SUPP');

  // Part 2: payload يطابق _executeOp('insert_supplier_payment')
  const payload = {
    id: paymentId, user_id: ownerId, supplier_id: supplierId,
    supplier_name: sup.name, amount: amount, date: date, notes: notes
  };

  // Part 2: Half-Commit Precondition — enqueue أولاً
  const opId = enqueueSyncOperation('insert_supplier_payment', payload, paymentId);
  if (opId === null) return;

  // Part 2: state mutation بعد enqueue ناجح
  state.supplierPayments.unshift({
    id: paymentId, supplier_id: supplierId, supplierId: supplierId,
    supplier_name: sup.name, supplierName: sup.name,
    amount: amount, date: date, notes: notes,
    _pendingUpload: true
  });

  if (typeof addAuditLog === 'function') {
    addAuditLog('record_supplier_payment', { paymentId: paymentId, amount, supplierId }, paymentId);
  }

  saveData();
  document.getElementById('supplierPaymentAmount').value = '';
  document.getElementById('supplierPaymentNotes').value = '';
  renderSuppliers();
  renderSupplierPayments();
  showNotification(tr('supplier_payment_success'));
}

function renderSupplierPayments() {
  const container = document.getElementById('supplierPaymentsTable');
  if (!container) return;
  if (state.supplierPayments.length === 0) {
    container.innerHTML = '<p class="text-muted">' + tr('no_supplier_payments') + '</p>';
    return;
  }
  let html = '<div class="table-wrap"><table class="data-table"><thead><tr><th data-i18n="th_date">' + tr('th_date') + '</th><th data-i18n="th_supplier">' + tr('th_supplier') + '</th><th data-i18n="th_amount_paid">' + tr('th_amount_paid') + '</th><th data-i18n="th_notes">' + tr('th_notes') + '</th></tr></thead><tbody>';
  state.supplierPayments.forEach(function(p) {
    const supName = p.supplierName || p.supplier_name || '-';
    html += '<tr>' +
      '<td>' + escapeHTML(p.date) + '</td>' +
      '<td>' + escapeHTML(supName) + '</td>' +
      '<td><b>' + (Number(p.amount) || 0).toFixed(2) + '</b></td>' +
      '<td>' + escapeHTML(p.notes || '-') + '</td>' +
      '</tr>';
  });
  html += '</tbody></table></div>';
  container.innerHTML = html;
}
/* v7.16 - Partner Tabs Logic */
function switchCustomerTab(tabId) {
  document.querySelectorAll('#partCustomers .tab-content').forEach(el => el.style.display = 'none');
  document.querySelectorAll('#partCustomers .tab-btn').forEach(el => el.classList.remove('active'));
  
  const content = document.getElementById('tab-' + tabId);
  if (content) content.style.display = 'block';
  
  const btn = document.querySelector('#partCustomers .tab-btn[data-tab="' + tabId + '"]');
  if (btn) btn.classList.add('active');

  if (tabId === 'cust-list') renderCustomers();
  if (tabId === 'cust-col') renderCustomerPayments();
}

function switchSupplierTab(tabId) {
  document.querySelectorAll('#partSuppliers .tab-content').forEach(el => el.style.display = 'none');
  document.querySelectorAll('#partSuppliers .tab-btn').forEach(el => el.classList.remove('active'));
  
  const content = document.getElementById('tab-' + tabId);
  if (content) content.style.display = 'block';
  
  const btn = document.querySelector('#partSuppliers .tab-btn[data-tab="' + tabId + '"]');
  if (btn) btn.classList.add('active');

  if (tabId === 'supp-list') renderSuppliers();
  if (tabId === 'supp-purchases') renderPurchases();
  if (tabId === 'supp-payments') renderSupplierPayments();
}