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

  const ownerId = (state.role === 'employee' && state.ownerId) ? state.ownerId : state.currentUser.id;
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
      c.name = name;
      c.phone = phone;
      c.openingDebt = openingDebt;
      c.opening_debt = openingDebt;
    }
  } else {
    state.customers.push({
      id: customerId, name: name, phone: phone,
      openingDebt: openingDebt, opening_debt: openingDebt, points: 0
    });
  }

  if (navigator.onLine && supabaseClient) {
    const { error } = await supabaseClient.from('customers').upsert(newCustomer, { onConflict: 'id' });
    if (error) {
      console.warn('Customer upload failed:', error);
      return showNotification('تعذر حفظ العميل: ' + error.message, 'error');
    }
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

  // قائمة اختيار العميل في التحصيل (بتعرض الدين الحقيقي)
  const paySel = document.getElementById('customerPaymentCustomer');
  if (paySel) {
    const currentVal = paySel.value;
    paySel.innerHTML = '';
    state.customers.forEach(function(c) {
      const isCashCustomer = c.name === 'عميل نقدي عام' || c.name === 'Cash Customer';
      const displayName = isCashCustomer ? (translations[currentLang] || translations.ar).cash_customer : c.name;
      const debtLabel = currentLang === 'en' ? ' (Debt: ' : ' (دين: ';
      // الدين الحقيقي من financeCore (openingDebt + sales.remaining - payments - returns.credit)
      const realDebt = financeCore.calcCustomerBalance(c.id);
      paySel.innerHTML += '<option value="' + c.id + '">' + escapeHTML(displayName) + debtLabel + realDebt.toFixed(2) + ')</option>';
    });
    if (currentVal) paySel.value = currentVal;
  }

  if (filtered.length === 0) {
    container.innerHTML = '<p class="text-muted">لا يوجد عملاء.</p>';
    return;
  }

  let html = '<div class="table-wrap"><table class="data-table"><thead><tr><th data-i18n="th_name">الاسم</th><th data-i18n="th_phone">الهاتف</th><th data-i18n="th_debts">الديون</th><th data-i18n="th_action">إجراء</th></tr></thead><tbody>';
  filtered.forEach(function(c) {
    // الدين الحقيقي من financeCore
    const debtVal = financeCore.calcCustomerBalance(c.id);
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

  const cust = state.customers.find(c => c.id === id);
  if (cust && (cust.name === 'عميل نقدي عام' || cust.name === 'Cash Customer')) {
    return showNotification('لا يمكن حذف العميل النقدي العام', 'warning');
  }

  if (state.customers.length <= 1) return showNotification('لا يمكن حذف آخر عميل', 'warning');

  // استخدام الدين الحقيقي في تحذير الحذف
  const realDebt = financeCore.calcCustomerBalance(id);
  if (realDebt > 0) {
    const confirmMsg = currentLang === 'en'
      ? 'This customer has an outstanding debt of ' + realDebt.toFixed(2) + '. Delete anyway?'
      : 'هذا العميل عليه ديون ' + realDebt.toFixed(2) + '. هل تريد الحذف؟ ستفقد قيمة الدين نهائياً.';
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

  // الدين الحقيقي من financeCore
  const currentDebt = financeCore.calcCustomerBalance(customerId);

  if (amount > currentDebt) {
    if (!confirm('المبلغ أكبر من الدين. تسجيل الفرق كرصيد دائن؟')) return;
  }

  // ملاحظة: لا نعدل openingDebt — الدين بيتحسب من sales.remaining - payments - returns.credit
  const ownerId = (state.role === 'employee' && state.ownerId) ? state.ownerId : state.currentUser.id;

  // ربط الدفعة بالوردية الحالية (لو فيه)
  let currentShiftId = null;
  if (state.currentShift) {
    currentShiftId = state.currentShift.id;
  } else {
    const openShift = (state.shifts || []).find(s => !s.end_time && !s.endTime);
    if (openShift) currentShiftId = openShift.id;
  }

  const newPayment = {
    id: uid('CP'),
    user_id: ownerId,
    customer_id: customerId,
    customer_name: cust.name,
    amount: amount,
    date: date,
    notes: notes,
    shift_id: currentShiftId,
    pay_method: 'cash'
  };

  // التحديث المحلي (camel + snake للتوافقية)
  state.customerPayments.unshift({
    id: newPayment.id,
    customer_id: customerId,
    customerId: customerId,
    customer_name: cust.name,
    customerName: cust.name,
    amount: amount,
    date: date,
    notes: notes,
    shift_id: currentShiftId,
    shiftId: currentShiftId,
    pay_method: 'cash',
    payMethod: 'cash'
  });

  if (navigator.onLine && supabaseClient) {
    const { error } = await supabaseClient.from('customer_payments').insert(newPayment);
    if (error) {
      console.warn('Payment upload failed:', error);
      return showNotification('تعذر حفظ التحصيل: ' + error.message, 'error');
    }
  }

  if (typeof addAuditLog === 'function') {
    addAuditLog('record_customer_payment', { paymentId: newPayment.id, amount, customerId }, newPayment.id);
  }

  saveData();
  document.getElementById('customerPaymentAmount').value = '';
  document.getElementById('customerPaymentNotes').value = '';
  renderCustomers();
  renderCustomerPayments();
  renderDashboard();

  if (typeof calcExpectedShiftCash === 'function') calcExpectedShiftCash();

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
  if (state.role !== 'manager') return showNotification('هذه العملية للمدير فقط', 'warning');

  const id = document.getElementById('supplierId').value;
  const name = document.getElementById('supplierName').value.trim();
  const phone = document.getElementById('supplierPhone').value.trim();
  const rawDebt = parseFloat(document.getElementById('supplierOpeningDebt').value);
  const openingDebt = Number.isFinite(rawDebt) && rawDebt >= 0 ? rawDebt : 0;

  if (!name) return showNotification('اسم المورد مطلوب', 'error');

  const ownerId = (state.role === 'employee' && state.ownerId) ? state.ownerId : state.currentUser.id;
  const supplierId = id || uid('SUP');

  const newSupplier = {
    id: supplierId, user_id: ownerId, name: name, phone: phone, opening_debt: openingDebt
  };

  if (id) {
    const s = state.suppliers.find(function(item) { return item.id === id; });
    if (s) {
      s.name = name;
      s.phone = phone;
      s.openingDebt = openingDebt;
      s.opening_debt = openingDebt;
    }
  } else {
    state.suppliers.push({ id: supplierId, name: name, phone: phone, openingDebt: openingDebt, opening_debt: openingDebt });
  }

  if (navigator.onLine && supabaseClient) {
    const { error } = await supabaseClient.from('suppliers').upsert(newSupplier, { onConflict: 'id' });
    if (error) {
      console.warn('Supplier upload failed:', error);
      return showNotification('تعذر حفظ المورد: ' + error.message, 'error');
    }
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
  document.getElementById('supplierOpeningDebt').value = Number(s.openingDebt ?? s.opening_debt) || 0;
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

  // قائمة اختيار المورد في المشتريات
  const purSupSel = document.getElementById('purchaseSupplier');
  if (purSupSel) {
    const curVal = purSupSel.value;
    purSupSel.innerHTML = '<option value="">' + tr('opt_select_supplier') + '</option>';
    state.suppliers.forEach(function(s) {
      purSupSel.innerHTML += '<option value="' + s.id + '">' + escapeHTML(s.name) + '</option>';
    });
    if (curVal) purSupSel.value = curVal;
  }

  // قائمة اختيار المورد في السداد (بتعرض المستحقات الحقيقية)
  const suppPaySel = document.getElementById('supplierPaymentSupplier');
  if (suppPaySel) {
    const curVal = suppPaySel.value;
    suppPaySel.innerHTML = '<option value="">' + tr('opt_select_supplier') + '</option>';
    state.suppliers.forEach(function(s) {
      // المستحقات الحقيقية من financeCore
      const realBalance = financeCore.calcSupplierBalance(s.id);
      suppPaySel.innerHTML += '<option value="' + s.id + '">' + escapeHTML(s.name) + (currentLang === 'en' ? ' (Payables: ' : ' (له مستحقات: ') + realBalance.toFixed(2) + ')</option>';
    });
    if (curVal) suppPaySel.value = curVal;
  }

  // قائمة اختيار المنتج في المشتريات
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
    // المستحقات الحقيقية من financeCore
    const debtVal = financeCore.calcSupplierBalance(s.id);
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

  // استخدام الرصيد الحقيقي في تحذير الحذف
  const realBalance = financeCore.calcSupplierBalance(id);
  if (realBalance > 0) {
    const confirmMsg = currentLang === 'en'
      ? 'You owe this supplier ' + realBalance.toFixed(2) + '. Delete anyway?'
      : 'عليك مستحقات لهذا المورد ' + realBalance.toFixed(2) + '. هل تريد الحذف؟ ستفقد قيمة المستحقات نهائياً.';
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

  const ownerId = (state.role === 'employee' && state.ownerId) ? state.ownerId : state.currentUser.id;
  let targetProdId = prodId;
  let targetProdName = '';
  let newProductData = null;

  // ⚠️ ملاحظة مهمة: الـ trigger handle_purchase بيعمل:
  // 1) زيادة products.stock
  // 2) حساب weighted average cost
  // 3) إضافة stock_moves entry
  // عشان منعملش double-counting، إحنا هنرفع المنتج للسيرفر بالبيانات الأصلية
  // (من غير ما نضيف qty في stock) والـ trigger هيضيفها.
  // لكن في الـ state المحلي، إحنا بنضيف qty عشان الأوفلاين.

  if (prodId) {
    const p = state.products.find(function(item) { return item.id === prodId; });
    if (p) {
      const oldStock = Number(p.stock) || 0;
      const oldCost = Number(p.cost) || 0;
      let newCost = cost;
      if ((oldStock + qty) > 0) {
        newCost = ((oldStock * oldCost) + (qty * cost)) / (oldStock + qty);
      }

      // التحديث المحلي (للأوفلاين والسرعة)
      p.stock = oldStock + qty;
      p.cost = newCost;
      targetProdName = p.name;

      // ملاحظة: بنعمل update للمنتج في السيرفر بالـ cost الجديد بس (مش stock)
      // الـ trigger handle_purchase هيزود stock تلقائياً
      if (navigator.onLine && supabaseClient) {
        await supabaseClient.from('products').update({ cost: newCost }).eq('id', p.id);
      }

      // إضافة حركة مخزون محلياً (الـ trigger بيضيفها في السيرفر تلقائياً)
      state.stockMoves.unshift({
        id: uid('SM'), date: new Date().toISOString(),
        product_id: p.id, productId: p.id,
        product_name: p.name, productName: p.name,
        type: 'purchase', qty: qty,
        old_stock: oldStock, oldStock: oldStock,
        new_stock: p.stock, newStock: p.stock,
        reason: 'مشتريات'
      });
    }
  } else if (newName) {
    // منتج جديد — بنعمله الأول عشان الـ trigger يقدر يعمل عليه update
    targetProdId = uid('PRD');
    newProductData = {
      id: targetProdId, user_id: ownerId, name: newName, barcode: '',
      category: 'عام', price: purchaseSalePrice, cost: cost,
      stock: 0, min_stock: 5
    };

    // التحديث المحلي
    state.products.push({
      id: targetProdId, name: newName, barcode: '', category: 'عام',
      price: purchaseSalePrice, cost: cost, stock: qty, minStock: 5, min_stock: 5
    });
    targetProdName = newName;

    // بنرفع المنتج للسيرفر بـ stock=0، والـ trigger هيضيف qty
    if (navigator.onLine && supabaseClient) {
      await supabaseClient.from('products').insert(newProductData);
    }

    // إضافة حركة مخزون محلياً
    state.stockMoves.unshift({
      id: uid('SM'), date: new Date().toISOString(),
      product_id: targetProdId, productId: targetProdId,
      product_name: targetProdName, productName: targetProdName,
      type: 'purchase', qty: qty,
      old_stock: 0, oldStock: 0,
      new_stock: qty, newStock: qty,
      reason: 'منتج جديد - مشتريات'
    });
  } else {
    return showNotification(tr('notify_select_product_name'), 'error');
  }

  const total = qty * cost;
  const remaining = Math.max(0, total - paid);

  // ملاحظة: لا نعدل sup.openingDebt — الرصيد بيتحسب من purchases.remaining - supplier_payments
  // (financeCore.calcSupplierBalance و get_supplier_balance RPC بيعملوا ده)

  const newPurchase = {
    id: uid('PUR'),
    user_id: ownerId,
    supplier_id: supplierId,
    product_id: targetProdId,
    product_name: targetProdName,
    qty: qty,
    cost: cost,
    total: total,
    paid: paid,
    remaining: remaining,
    date: new Date().toISOString()
  };

  state.purchases.unshift({
    id: newPurchase.id,
    date: newPurchase.date,
    supplier_id: supplierId,
    supplierId: supplierId,
    product_id: targetProdId,
    productId: targetProdId,
    product_name: targetProdName,
    productName: targetProdName,
    qty: qty,
    cost: cost,
    total: total,
    paid: paid,
    remaining: remaining
  });

  if (navigator.onLine && supabaseClient) {
    const { error } = await supabaseClient.from('purchases').insert(newPurchase);
    if (error) {
      console.warn('Purchase upload failed:', error);
      return showNotification('تعذر حفظ المشتريات: ' + error.message, 'error');
    }
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
  renderDashboard();
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

  // ملاحظة: لا نعدل openingDebt — الرصيد بيتحسب من purchases.remaining - supplier_payments
  const ownerId = (state.role === 'employee' && state.ownerId) ? state.ownerId : state.currentUser.id;

  const newPayment = {
    id: uid('SUPP'),
    user_id: ownerId,
    supplier_id: supplierId,
    supplier_name: sup.name,
    amount: amount,
    date: date,
    notes: notes
  };

  state.supplierPayments.unshift({
    id: newPayment.id,
    supplier_id: supplierId,
    supplierId: supplierId,
    supplier_name: sup.name,
    supplierName: sup.name,
    amount: amount,
    date: date,
    notes: notes
  });

  if (navigator.onLine && supabaseClient) {
    const { error } = await supabaseClient.from('supplier_payments').insert(newPayment);
    if (error) {
      console.warn('Supplier payment upload failed:', error);
      return showNotification('تعذر حفظ السداد: ' + error.message, 'error');
    }
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