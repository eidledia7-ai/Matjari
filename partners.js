/* ============ العملاء ============ */
async function saveCustomer() {
  if (window.isReadOnlyMode) return showNotification('جدد اشتراكك أولاً لإضافة عملاء', 'error');
  if (state.role !== 'manager') return showNotification('هذه العملية للمدير فقط', 'warning');

  const id = document.getElementById('customerId').value;
  const name = document.getElementById('customerName').value.trim();
  const phone = document.getElementById('customerPhone').value.trim();
  const rawDebt = parseFloat(document.getElementById('customerOpeningDebt').value);
  const openingDebt = Number.isFinite(rawDebt) && rawDebt >= 0 ? rawDebt : 0;

  if (!name) return showNotification('اسم العميل مطلوب', 'error');

  const ownerId = state.currentUser.id;
  const customerId = id || uid('CUST');
  
  const newCustomer = {
    id: customerId,
    user_id: ownerId,
    name: name,
    phone: phone,
    opening_debt: openingDebt,
    points: id ? (state.customers.find(c => c.id === id)?.points || 0) : 0
  };

  if (id) {
    const c = state.customers.find(function(item) { return item.id === id; });
    if (c) {
      c.name = name; c.phone = phone; c.openingDebt = openingDebt;
    }
  } else {
    state.customers.push({ id: customerId, name: name, phone: phone, openingDebt: openingDebt, points: 0 });
  }

  // الرفع للسيرفر
  if (navigator.onLine && supabaseClient) {
    const { error } = await supabaseClient.from('customers').upsert(newCustomer, { onConflict: 'id' });
    if (error) console.warn('Customer upload failed:', error);
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
  showNotification('تم حفظ العميل ✅');
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
      const displayName = isCashCustomer ? (translations[currentLang] || translations.ar).cash_customer : c.name;
      const debtLabel = currentLang === 'en' ? ' (Debt: ' : ' (دين: ';
      paySel.innerHTML += '<option value="' + c.id + '">' + escapeHTML(displayName) + debtLabel + (Number(c.openingDebt) || 0).toFixed(2) + ')</option>';
    });
    if (currentVal) paySel.value = currentVal;
  }

  if (filtered.length === 0) {
    container.innerHTML = '<p class="text-muted">لا يوجد عملاء.</p>';
    return;
  }

  let html = '<div class="table-wrap"><table class="data-table"><thead><tr><th data-i18n="th_name">الاسم</th><th data-i18n="th_phone">الهاتف</th><th data-i18n="th_debts">الديون</th><th data-i18n="th_action">إجراء</th></tr></thead><tbody>';
  filtered.forEach(function(c) {
    const debtVal = Number(c.openingDebt) || 0;
    const debtClass = debtVal > 0 ? 'red-text' : '';
    html += '<tr>' +
      '<td>' + escapeHTML(c.name) + '</td>' +
      '<td>' + escapeHTML(c.phone || '-') + '</td>' +
      '<td class="' + debtClass + '"><b>' + debtVal.toFixed(2) + '</b></td>' +
      '<td style="white-space:nowrap;">' +
        '<button class="small-btn primary" onclick="showCustomerStatement(\'' + c.id + '\')" title="كشف حساب">📄 كشف</button>' +
        '<button class="small-btn red" onclick="deleteCustomer(\'' + c.id + '\')" title="حذف">🗑️</button>' +
      '</td>' +
      '</tr>';
  });
  html += '</tbody></table></div>';
  container.innerHTML = html;
}

async function deleteCustomer(id) {
  if (state.role !== 'manager') return showNotification('هذه العملية للمدير فقط', 'warning');
  if (state.customers.length <= 1) return showNotification('لا يمكن حذف آخر عميل', 'warning');

  const cust = state.customers.find(function(c) { return c.id === id; });
  if (cust && (Number(cust.openingDebt) || 0) > 0) {
    const debt = Number(cust.openingDebt) || 0;
    const confirmMsg = currentLang === 'en'
      ? 'This customer has an outstanding debt of ' + debt.toFixed(2) + '. Delete anyway?'
      : 'هذا العميل عليه ديون ' + debt.toFixed(2) + '. هل تريد الحذف؟ ستفقد قيمة الدين نهائياً.';
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
  showNotification('تم الحذف');
}

async function recordCustomerPayment() {
  if (window.isReadOnlyMode) return showNotification('جدد اشتراكك أولاً لإتمام العملية', 'error');
  if (state.role !== 'manager') return showNotification('هذه العملية للمدير فقط', 'warning');

  const customerId = document.getElementById('customerPaymentCustomer').value;
  const amount = parseFloat(document.getElementById('customerPaymentAmount').value);
  const date = document.getElementById('customerPaymentDate').value || today();
  const notes = document.getElementById('customerPaymentNotes').value.trim();

  if (!customerId || !Number.isFinite(amount) || amount <= 0) return showNotification('أدخل مبلغاً صحيحاً', 'error');

  const cust = state.customers.find(function(c) { return c.id === customerId; });
  if (!cust) return showNotification('العميل غير موجود', 'error');

  const currentDebt = Number(cust.openingDebt) || 0;

  if (amount > currentDebt) {
    if (!confirm('المبلغ أكبر من الدين. تسجيل الفرق كرصيد دائن؟')) return;
    cust.openingDebt = currentDebt - amount;
  } else {
    cust.openingDebt = Math.max(0, currentDebt - amount);
  }

  const ownerId = state.currentUser.id;
  const newPayment = {
    id: uid('CP'), user_id: ownerId, customer_id: customerId, customer_name: cust.name,
    amount: amount, date: date, notes: notes
  };
  state.customerPayments.unshift({ id: newPayment.id, customerId, customerName: cust.name, amount, date, notes });

  // الرفع للسيرفر
  if (navigator.onLine && supabaseClient) {
    await supabaseClient.from('customer_payments').insert(newPayment);
    await supabaseClient.from('customers').update({ opening_debt: cust.openingDebt }).eq('id', customerId);
  }

  if (typeof addAuditLog === 'function') {
    addAuditLog('record_customer_payment', { paymentId: newPayment.id, amount, customerId }, newPayment.id);
  }

  saveData();
  document.getElementById('customerPaymentAmount').value = '';
  document.getElementById('customerPaymentNotes').value = '';
  renderCustomers();
  renderCustomerPayments();
  showNotification('تم تسجيل التحصيل ✅');
}

function renderCustomerPayments() {
  const container = document.getElementById('customerPaymentsTable');
  if (!container) return;
  if (state.customerPayments.length === 0) {
    container.innerHTML = '<p class="text-muted">لا توجد تحصيلات مسجلة.</p>';
    return;
  }
  let html = '<div class="table-wrap"><table class="data-table"><thead><tr><th data-i18n="th_date">التاريخ</th><th data-i18n="th_customer">العميل</th><th data-i18n="th_amount">المبلغ</th><th data-i18n="th_notes">ملاحظات</th></tr></thead><tbody>';
  state.customerPayments.forEach(function(p) {
    html += '<tr>' +
      '<td>' + escapeHTML(p.date) + '</td>' +
      '<td>' + escapeHTML(p.customerName) + '</td>' +
      '<td><b>' + (Number(p.amount) || 0).toFixed(2) + '</b></td>' +
      '<td>' + escapeHTML(p.notes || '-') + '</td>' +
      '</tr>';
  });
  html += '</tbody></table></div>';
  container.innerHTML = html;
}

/* ============ الموردون والمشتريات ============ */
async function saveSupplier() {
  if (state.role !== 'manager') return showNotification('هذه العملية للمدير فقط', 'warning');

  const id = document.getElementById('supplierId').value;
  const name = document.getElementById('supplierName').value.trim();
  const phone = document.getElementById('supplierPhone').value.trim();
  const rawDebt = parseFloat(document.getElementById('supplierOpeningDebt').value);
  const openingDebt = Number.isFinite(rawDebt) && rawDebt >= 0 ? rawDebt : 0;

  if (!name) return showNotification('اسم المورد مطلوب', 'error');

  const ownerId = state.currentUser.id;
  const supplierId = id || uid('SUP');

  const newSupplier = {
    id: supplierId, user_id: ownerId, name: name, phone: phone, opening_debt: openingDebt
  };

  if (id) {
    const s = state.suppliers.find(function(item) { return item.id === id; });
    if (s) { s.name = name; s.phone = phone; s.openingDebt = openingDebt; }
  } else {
    state.suppliers.push({ id: supplierId, name: name, phone: phone, openingDebt: openingDebt });
  }

  // الرفع للسيرفر
  if (navigator.onLine && supabaseClient) {
    const { error } = await supabaseClient.from('suppliers').upsert(newSupplier, { onConflict: 'id' });
    if (error) console.warn('Supplier upload failed:', error);
  }

  if (typeof addAuditLog === 'function') {
    addAuditLog(id ? 'edit_supplier' : 'add_supplier', { supplierId, name }, supplierId);
  }

  saveData();
  clearSupplierForm();
  renderSuppliers();
  showNotification('تم حفظ المورد ✅');
}

function editSupplier(id) {
  if (state.role !== 'manager') return showNotification('هذه العملية للمدير فقط', 'warning');
  const s = state.suppliers.find(function(item) { return item.id === id; });
  if (!s) return;
  document.getElementById('supplierId').value = s.id;
  document.getElementById('supplierName').value = s.name || '';
  document.getElementById('supplierPhone').value = s.phone || '';
  document.getElementById('supplierOpeningDebt').value = Number(s.openingDebt) || 0;
  const title = document.getElementById('supplierFormTitle');
  if (title) title.innerText = 'تعديل مورد: ' + s.name;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function clearSupplierForm() {
  ['supplierId', 'supplierName', 'supplierPhone', 'supplierOpeningDebt'].forEach(function(id) {
    const el = document.getElementById(id);
    if (el) el.value = (id === 'supplierOpeningDebt') ? 0 : '';
  });
  const title = document.getElementById('supplierFormTitle');
  if (title) title.innerText = 'إضافة مورد';
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
      suppPaySel.innerHTML += '<option value="' + s.id + '">' + escapeHTML(s.name) + (currentLang === 'en' ? ' (Payables: ' : ' (له مستحقات: ') + (Number(s.openingDebt) || 0).toFixed(2) + ')</option>';
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
    container.innerHTML = '<p class="text-muted">لا يوجد موردون.</p>';
    return;
  }

  let html = '<div class="table-wrap"><table class="data-table"><thead><tr><th data-i18n="th_name">الاسم</th><th data-i18n="th_phone">الهاتف</th><th data-i18n="th_payables">المستحقات (له فلوس)</th><th data-i18n="th_action">إجراء</th></tr></thead><tbody>';
  state.suppliers.forEach(function(s) {
    const debtVal = Number(s.openingDebt) || 0;
    const debtClass = debtVal > 0 ? 'green-text' : '';
    html += '<tr>' +
      '<td>' + escapeHTML(s.name) + '</td>' +
      '<td>' + escapeHTML(s.phone || '-') + '</td>' +
      '<td class="' + debtClass + '"><b>' + debtVal.toFixed(2) + '</b></td>' +
      '<td>' +
        '<button class="small-btn primary" onclick="editSupplier(\'' + s.id + '\')">تعديل</button>' +
        '<button class="small-btn red" onclick="deleteSupplier(\'' + s.id + '\')">حذف</button>' +
      '</td>' +
      '</tr>';
  });
  html += '</tbody></table></div>';
  container.innerHTML = html;
}

async function deleteSupplier(id) {
  if (state.role !== 'manager') return showNotification('هذه العملية للمدير فقط', 'warning');

  const sup = state.suppliers.find(function(s) { return s.id === id; });
  if (sup && (Number(sup.openingDebt) || 0) > 0) {
    const debt = Number(sup.openingDebt) || 0;
    const confirmMsg = currentLang === 'en'
      ? 'You owe this supplier ' + debt.toFixed(2) + '. Delete anyway?'
      : 'عليك مستحقات لهذا المورد ' + debt.toFixed(2) + '. هل تريد الحذف؟ ستفقد قيمة المستحقات نهائياً.';
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
  showNotification('تم الحذف');
}

function calcPurchaseTotal() {
  const qty = parseFloat(document.getElementById('purchaseQty').value) || 0;
  const cost = parseFloat(document.getElementById('purchaseCost').value) || 0;
  const total = qty * cost;
  const totEl = document.getElementById('purchaseTotal');
  if (totEl) totEl.value = total.toFixed(2);
}

async function savePurchase() {
  if (window.isReadOnlyMode) return showNotification('جدد اشتراكك أولاً لإتمام العملية', 'error');
  if (state.role !== 'manager') return showNotification('هذه العملية للمدير فقط', 'warning');

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
  if (qty < 1 || cost < 0) return showNotification('الكمية أو التكلفة غير صحيحة', 'error');

  const ownerId = state.currentUser.id;
  let targetProdId = prodId;
  let targetProdName = '';
  let newProductData = null;

  // 1. تجهيز المنتج (موجود أو جديد)
  if (prodId) {
    const p = state.products.find(function(item) { return item.id === prodId; });
    if (p) {
      p.stock += qty;
      p.cost = cost;
      targetProdName = p.name;
      
      if (navigator.onLine && supabaseClient) {
        await supabaseClient.from('products').update({ stock: p.stock, cost: cost }).eq('id', p.id);
      }
      await supabaseClient.from('stock_moves').insert({
  id: uid('SM'), user_id: ownerId, product_id: p.id, product_name: p.name,
  type: 'in', qty: qty, old_stock: p.stock - qty, new_stock: p.stock,
  reason: 'مشتريات', date: new Date().toISOString()
});
state.stockMoves.unshift({ id: uid('SM'), date: new Date().toISOString(), productId: p.id, productName: p.name, type: 'in', qty: qty, oldStock: p.stock - qty, newStock: p.stock, reason: 'مشتريات' });
    }
  } else if (newName) {
    targetProdId = uid('PRD');
    newProductData = { id: targetProdId, user_id: ownerId, name: newName, barcode: '', category: 'عام', price: purchaseSalePrice, cost: cost, stock: qty, min_stock: 5 };
    
    state.products.push({ id: targetProdId, name: newName, barcode: '', category: 'عام', price: purchaseSalePrice, cost: cost, stock: qty, minStock: 5 });
    targetProdName = newName;

    // [إصلاح] رفع المنتج الجديد للسيرفر فوراً عشان يظهر في صفحة المنتجات
    if (navigator.onLine && supabaseClient) {
      await supabaseClient.from('products').insert(newProductData);
    }
    if (navigator.onLine && supabaseClient) {
  await supabaseClient.from('stock_moves').insert({
    id: uid('SM'), user_id: ownerId, product_id: targetProdId, product_name: targetProdName,
    type: 'in', qty: qty, old_stock: 0, new_stock: qty,
    reason: 'منتج جديد - مشتريات', date: new Date().toISOString()
  });
  state.stockMoves.unshift({ id: uid('SM'), date: new Date().toISOString(), productId: targetProdId, productName: targetProdName, type: 'in', qty: qty, oldStock: 0, newStock: qty, reason: 'منتج جديد - مشتريات' });
}
  } else {
    return showNotification(tr('notify_select_product_name'), 'error');
  }

  const total = qty * cost;
  const remaining = Math.max(0, total - paid);

  // 2. تحديث مديونية المورد
  if (remaining > 0) {
    const sup = state.suppliers.find(function(s) { return s.id === supplierId; });
    if (sup) {
      sup.openingDebt = (Number(sup.openingDebt) || 0) + remaining;
      if (navigator.onLine && supabaseClient) {
        await supabaseClient.from('suppliers').update({ opening_debt: sup.openingDebt }).eq('id', sup.id);
      }
    }
  }

  // 3. تسجيل الفاتورة
  const newPurchase = {
    id: uid('PUR'), user_id: ownerId, supplier_id: supplierId, product_id: targetProdId, product_name: targetProdName,
    qty: qty, cost: cost, total: total, paid: paid, remaining: remaining, date: new Date().toISOString()
  };
  state.purchases.unshift({ id: newPurchase.id, date: newPurchase.date, supplierId, productId: targetProdId, productName: targetProdName, qty, cost, total, paid, remaining });

  if (navigator.onLine && supabaseClient) {
    await supabaseClient.from('purchases').insert(newPurchase);
  }

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
  renderSuppliers();
  renderPurchases();
  renderProducts();
  renderStockMoves();
  updateStockBadge();
  showNotification('تم تسجيل المشتريات ✅');
}

function renderPurchases() {
  const container = document.getElementById('purchasesTable');
  if (!container) return;
  if (state.purchases.length === 0) {
    container.innerHTML = '<p class="text-muted">لا توجد مشتريات.</p>';
    return;
  }
  let html = '<div class="table-wrap"><table class="data-table"><thead><tr><th data-i18n="th_date">التاريخ</th><th data-i18n="th_supplier">المورد</th><th data-i18n="th_product">المنتج</th><th data-i18n="th_quantity">الكمية</th><th data-i18n="th_cost">التكلفة</th><th data-i18n="th_total">الإجمالي</th><th data-i18n="th_remaining">المتبقي</th><th data-i18n="th_action">إجراء</th></tr></thead><tbody>';
  state.purchases.forEach(function(p) {
    const sup = state.suppliers.find(function(s) { return s.id === p.supplierId; });
    const totalNum = Number(p.total) || 0;
    const remainingNum = Number(p.remaining) || 0;
    html += '<tr>' +
      '<td>' + new Date(p.date).toLocaleString(currentLang === 'en' ? 'en-US' : 'ar-EG') + '</td>' +
      '<td>' + escapeHTML(sup ? sup.name : '-') + '</td>' +
      '<td>' + escapeHTML(p.productName) + '</td>' +
      '<td>' + p.qty + '</td>' +
      '<td>' + p.cost + '</td>' +
      '<td>' + totalNum.toFixed(2) + '</td>' +
      '<td class="' + (remainingNum > 0 ? 'red-text' : '') + '">' + remainingNum.toFixed(2) + '</td>' +
      '<td><button class="small-btn red" onclick="safeDeleteRecord(\'purchase\', \'' + p.id + '\')">حذف خطأ</button></td>' +
      '</tr>';
  });
  html += '</tbody></table></div>';
  container.innerHTML = html;
}

async function recordSupplierPayment() {
  if (state.role !== 'manager') return showNotification('هذه العملية للمدير فقط', 'warning');

  const supplierId = document.getElementById('supplierPaymentSupplier').value;
  const amount = parseFloat(document.getElementById('supplierPaymentAmount').value);
  const date = document.getElementById('supplierPaymentDate').value || today();
  const notes = document.getElementById('supplierPaymentNotes').value.trim();

  if (!supplierId || !Number.isFinite(amount) || amount <= 0) return showNotification(tr('notify_select_supplier_amount'), 'error');

  const sup = state.suppliers.find(function(s) { return s.id === supplierId; });
  if (!sup) return showNotification('المورد غير موجود', 'error');

  sup.openingDebt = Math.max(0, (Number(sup.openingDebt) || 0) - amount);

  const ownerId = state.currentUser.id;
  const newPayment = {
    id: uid('SUPP'), user_id: ownerId, supplier_id: supplierId, supplier_name: sup.name,
    amount: amount, date: date, notes: notes
  };
  state.supplierPayments.unshift({ id: newPayment.id, supplierId, supplierName: sup.name, amount, date, notes });

  if (navigator.onLine && supabaseClient) {
    await supabaseClient.from('supplier_payments').insert(newPayment);
    await supabaseClient.from('suppliers').update({ opening_debt: sup.openingDebt }).eq('id', supplierId);
  }

  if (typeof addAuditLog === 'function') {
    addAuditLog('record_supplier_payment', { paymentId: newPayment.id, amount, supplierId }, newPayment.id);
  }

  saveData();
  document.getElementById('supplierPaymentAmount').value = '';
  document.getElementById('supplierPaymentNotes').value = '';
  renderSuppliers();
  renderSupplierPayments();
  showNotification('تم تسجيل السداد للمورد بنجاح ✅');
}

function renderSupplierPayments() {
  const container = document.getElementById('supplierPaymentsTable');
  if (!container) return;
  if (state.supplierPayments.length === 0) {
    container.innerHTML = '<p class="text-muted">لا توجد مدفوعات للموردين مسجلة.</p>';
    return;
  }
  let html = '<div class="table-wrap"><table class="data-table"><thead><tr><th data-i18n="th_date">التاريخ</th><th data-i18n="th_supplier">المورد</th><th data-i18n="th_amount_paid">المبلغ المدفوع</th><th data-i18n="th_notes">ملاحظات</th></tr></thead><tbody>';
  state.supplierPayments.forEach(function(p) {
    html += '<tr>' +
      '<td>' + escapeHTML(p.date) + '</td>' +
      '<td>' + escapeHTML(p.supplierName) + '</td>' +
      '<td><b>' + (Number(p.amount) || 0).toFixed(2) + '</b></td>' +
      '<td>' + escapeHTML(p.notes || '-') + '</td>' +
      '</tr>';
  });
  html += '</tbody></table></div>';
  container.innerHTML = html;
}