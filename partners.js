/* ============ العملاء ============ */
function saveCustomer() {
  if (window.isReadOnlyMode) return showNotification('جدد اشتراكك أولاً لإضافة عملاء', 'error');
 
  if (state.role !== 'manager') return showNotification('هذه العملية للمدير فقط', 'warning');

  const id = document.getElementById('customerId').value;
  const name = document.getElementById('customerName').value.trim();
  const phone = document.getElementById('customerPhone').value.trim();
  const rawDebt = parseFloat(document.getElementById('customerOpeningDebt').value);
  // [إصلاح] تحقق من السالب و NaN
  const openingDebt = Number.isFinite(rawDebt) && rawDebt >= 0 ? rawDebt : 0;

  if (!name) return showNotification('اسم العميل مطلوب', 'error');

  if (id) {
    // [إصلاح حرج] تعديل عميل موجود: منلمسش الديون إلا لو المستخدم عدلها صراحة
    const c = state.customers.find(function(item) { return item.id === id; });
    if (c) {
      const oldDebt = Number(c.openingDebt) || 0;
      c.name = name;
      c.phone = phone;
      // نحدّث الدين فقط لو الحقل اتغير عن القيمة القديمة
      // (الحقل بيبدأ بقيمة الدين الحالية في الـ UI، فلو المستخدم ملمسوش، القيمة هتكون نفسها)
      if (openingDebt !== oldDebt && openingDebt >= 0) {
        c.openingDebt = openingDebt;
        if (typeof addAuditLog === 'function') {
          addAuditLog('edit_customer_debt', {
            customerId: c.id,
            customerName: name,
            oldDebt: oldDebt,
            newDebt: openingDebt
          }, c.id);
        }
      }
      if (typeof addAuditLog === 'function') {
        addAuditLog('edit_customer', { customerId: c.id, customerName: name }, c.id);
      }
    }
  } else {
    const newCust = { id: uid('CUST'), name: name, phone: phone, openingDebt: openingDebt };
    state.customers.push(newCust);
    // [إصلاح البند 5] سجل إضافة عميل
    if (typeof addAuditLog === 'function') {
      addAuditLog('add_customer', {
        customerId: newCust.id,
        customerName: newCust.name,
        openingDebt: newCust.openingDebt
      }, newCust.id);
    }
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
      // [إصلاح] Number() بدل .toFixed المباشر
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

function deleteCustomer(id) {
  if (state.role !== 'manager') return showNotification('هذه العملية للمدير فقط', 'warning');
  if (state.customers.length <= 1) return showNotification('لا يمكن حذف آخر عميل', 'warning');

  const cust = state.customers.find(function(c) { return c.id === id; });
  // [إصلاح حرج] منع حذف عميل عليه ديون — تحذير صريح
  if (cust && (Number(cust.openingDebt) || 0) > 0) {
    const debt = Number(cust.openingDebt) || 0;
    const confirmMsg = currentLang === 'en'
      ? 'This customer has an outstanding debt of ' + debt.toFixed(2) + '. Are you sure you want to delete? The debt will be lost.'
      : 'هذا العميل عليه ديون ' + debt.toFixed(2) + ' جنيه. هل أنت متأكد من الحذف؟ ستفقد قيمة الدين نهائياً.';
    if (!confirm(confirmMsg)) return;
  } else {
    if (!confirm(tr('msg_delete_customer'))) return;
  }

  // [إصلاح البند 5] سجل حذف عميل
  if (cust && typeof addAuditLog === 'function') {
    addAuditLog('delete_customer', {
      customerId: cust.id,
      customerName: cust.name,
      phone: cust.phone,
      outstandingDebt: Number(cust.openingDebt) || 0
    }, cust.id);
  }

  state.customers = state.customers.filter(function(c) { return c.id !== id; });
  saveData();
  renderCustomers();
  showNotification('تم الحذف');
}

function recordCustomerPayment() {
if (window.isReadOnlyMode) return showNotification('جدد اشتراكك أولاً لإتمام العملية', 'error');
  if (state.role !== 'manager') return showNotification('هذه العملية للمدير فقط', 'warning');

  const customerId = document.getElementById('customerPaymentCustomer').value;
  const amount = parseFloat(document.getElementById('customerPaymentAmount').value);
  const date = document.getElementById('customerPaymentDate').value || today();
  const notes = document.getElementById('customerPaymentNotes').value.trim();

  // [إصلاح] حماية من Infinity و NaN
  if (!customerId || !Number.isFinite(amount) || amount <= 0) return showNotification('أدخل مبلغاً صحيحاً', 'error');

  const cust = state.customers.find(function(c) { return c.id === customerId; });
  if (!cust) return showNotification('العميل غير موجود', 'error');

  const currentDebt = Number(cust.openingDebt) || 0;

  if (amount > currentDebt) {
    if (!confirm('المبلغ أكبر من الدين. تسجيل الفرق كرصيد دائن؟')) return;
    const diff = amount - currentDebt;
    cust.openingDebt = currentDebt - amount;
    showNotification('تم الخصم. الفرق رصيد دائن: ' + diff.toFixed(2), 'info');
  } else {
    cust.openingDebt = Math.max(0, currentDebt - amount);
  }

  const newPayment = {
    id: uid('CP'), customerId: customerId, customerName: cust.name,
    amount: amount, date: date, notes: notes
  };
  state.customerPayments.unshift(newPayment);

  // [إصلاح البند 5] سجل تحصيل دفعة
  if (typeof addAuditLog === 'function') {
    addAuditLog('record_customer_payment', {
      paymentId: newPayment.id,
      customerId: customerId,
      customerName: cust.name,
      amount: amount,
      debtBefore: currentDebt,
      debtAfter: Number(cust.openingDebt) || 0
    }, newPayment.id);
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
    // [إصلاح] Number() بدل .toFixed المباشر
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
function saveSupplier() {
  if (state.role !== 'manager') return showNotification('هذه العملية للمدير فقط', 'warning');

  const id = document.getElementById('supplierId').value;
  const name = document.getElementById('supplierName').value.trim();
  const phone = document.getElementById('supplierPhone').value.trim();
  const rawDebt = parseFloat(document.getElementById('supplierOpeningDebt').value);
  // [إصلاح] تحقق من السالب و NaN
  const openingDebt = Number.isFinite(rawDebt) && rawDebt >= 0 ? rawDebt : 0;

  if (!name) return showNotification('اسم المورد مطلوب', 'error');

  if (id) {
    const s = state.suppliers.find(function(item) { return item.id === id; });
    if (s) {
      const oldDebt = Number(s.openingDebt) || 0;
      s.name = name;
      s.phone = phone;
      if (openingDebt !== oldDebt && openingDebt >= 0) {
        s.openingDebt = openingDebt;
        if (typeof addAuditLog === 'function') {
          addAuditLog('edit_supplier_debt', {
            supplierId: s.id,
            supplierName: name,
            oldDebt: oldDebt,
            newDebt: openingDebt
          }, s.id);
        }
      }
      if (typeof addAuditLog === 'function') {
        addAuditLog('edit_supplier', { supplierId: s.id, supplierName: name }, s.id);
      }
    }
  } else {
    const newSup = { id: uid('SUP'), name: name, phone: phone, openingDebt: openingDebt };
    state.suppliers.push(newSup);
    // [إصلاح البند 5] سجل إضافة مورد
    if (typeof addAuditLog === 'function') {
      addAuditLog('add_supplier', {
        supplierId: newSup.id,
        supplierName: newSup.name,
        openingDebt: newSup.openingDebt
      }, newSup.id);
    }
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

function deleteSupplier(id) {
  if (state.role !== 'manager') return showNotification('هذه العملية للمدير فقط', 'warning');

  const sup = state.suppliers.find(function(s) { return s.id === id; });
  // [إصلاح حرج] منع حذف مورد عليه مستحقات
  if (sup && (Number(sup.openingDebt) || 0) > 0) {
    const debt = Number(sup.openingDebt) || 0;
    const confirmMsg = currentLang === 'en'
      ? 'You owe this supplier ' + debt.toFixed(2) + '. Delete anyway? The payable will be lost.'
      : 'عليك مستحقات لهذا المورد ' + debt.toFixed(2) + ' جنيه. هل تريد الحذف؟ ستفقد قيمة المستحقات نهائياً.';
    if (!confirm(confirmMsg)) return;
  } else {
    if (!confirm(tr('msg_delete_supplier'))) return;
  }

  // [إصلاح البند 5] سجل حذف مورد
  if (sup && typeof addAuditLog === 'function') {
    addAuditLog('delete_supplier', {
      supplierId: sup.id,
      supplierName: sup.name,
      phone: sup.phone,
      outstandingDebt: Number(sup.openingDebt) || 0
    }, sup.id);
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

function savePurchase() {
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

  let targetProdId = prodId;
  let targetProdName = '';

  if (prodId) {
    const p = state.products.find(function(item) { return item.id === prodId; });
    if (p) {
      const before = p.stock;
      p.stock += qty;
      p.cost = cost;
      targetProdName = p.name;
      state.stockMoves.unshift({
        id: uid('SM'), date: new Date().toISOString(),
        productId: p.id, productName: p.name,
        type: 'in', qty: qty, oldStock: before, newStock: p.stock,
        reason: 'مشتريات'
      });
    }
  } else if (newName) {
    const newProd = { id: uid('PRD'), name: newName, barcode: '', category: 'عام', price: purchaseSalePrice, cost: cost, stock: qty, minStock: 5 };
    state.products.push(newProd);
    targetProdId = newProd.id;
    targetProdName = newProd.name;
    state.stockMoves.unshift({
      id: uid('SM'), date: new Date().toISOString(),
      productId: newProd.id, productName: newProd.name,
      type: 'in', qty: qty, oldStock: 0, newStock: qty,
      reason: 'منتج جديد - مشتريات'
    });
  } else {
    return showNotification(tr('notify_select_product_name'), 'error');
  }

  const total = qty * cost;
  const remaining = Math.max(0, total - paid);

  if (remaining > 0) {
    const sup = state.suppliers.find(function(s) { return s.id === supplierId; });
    if (sup) sup.openingDebt = (Number(sup.openingDebt) || 0) + remaining;
  }

  const newPurchase = {
    id: uid('PUR'), date: new Date().toISOString(),
    supplierId: supplierId, productId: targetProdId, productName: targetProdName,
    qty: qty, cost: cost, total: total, paid: paid, remaining: remaining
  };
  state.purchases.unshift(newPurchase);

  // [إصلاح البند 5] سجل تسجيل مشتريات
  if (typeof addAuditLog === 'function') {
    addAuditLog('add_purchase', {
      purchaseId: newPurchase.id,
      supplierId: supplierId,
      productId: targetProdId,
      productName: targetProdName,
      qty: qty,
      cost: cost,
      total: total,
      paid: paid,
      remaining: remaining
    }, newPurchase.id);
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
    // [إصلاح] Number() بدل .toFixed المباشر
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

function recordSupplierPayment() {
  if (state.role !== 'manager') return showNotification('هذه العملية للمدير فقط', 'warning');

  const supplierId = document.getElementById('supplierPaymentSupplier').value;
  const amount = parseFloat(document.getElementById('supplierPaymentAmount').value);
  const date = document.getElementById('supplierPaymentDate').value || today();
  const notes = document.getElementById('supplierPaymentNotes').value.trim();

  // [إصلاح] حماية من Infinity و NaN
  if (!supplierId || !Number.isFinite(amount) || amount <= 0) return showNotification(tr('notify_select_supplier_amount'), 'error');

  const sup = state.suppliers.find(function(s) { return s.id === supplierId; });
  if (!sup) return showNotification('المورد غير موجود', 'error');

  const debtBefore = Number(sup.openingDebt) || 0;
  sup.openingDebt = Math.max(0, debtBefore - amount);

  const newPayment = {
    id: uid('SUPP'), supplierId: supplierId, supplierName: sup.name,
    amount: amount, date: date, notes: notes
  };
  state.supplierPayments.unshift(newPayment);

  // [إصلاح البند 5] سجل سداد مورد
  if (typeof addAuditLog === 'function') {
    addAuditLog('record_supplier_payment', {
      paymentId: newPayment.id,
      supplierId: supplierId,
      supplierName: sup.name,
      amount: amount,
      debtBefore: debtBefore,
      debtAfter: Number(sup.openingDebt) || 0
    }, newPayment.id);
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
    // [إصلاح] Number() بدل .toFixed المباشر
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