/* ============ المخزون والمنتجات ============ */
async function saveProduct() {
  if (window.isReadOnlyMode) return showNotification(tr('renew_sub_first'), 'error');
  if (state.role !== 'manager') return showNotification(tr('manager_only'), 'warning');

  const id = document.getElementById('productId').value;
  if (!id) {
    const lim = checkLimit('products', state.products.length);
    if (!lim.allowed) {
      return showNotification(currentLang === 'en' ? 'Product limit reached. Upgrade your plan.' : 'وصلت لحد المنتجات. رقّي باقتك.', 'warning');
    }
  }

  const name = document.getElementById('productName').value.trim();
  const barcode = document.getElementById('productBarcode').value.trim();
  const category = document.getElementById('productCategory').value.trim();
  const price = parseFloat(document.getElementById('productPrice').value) || 0;
  const cost = parseFloat(document.getElementById('productCost').value) || 0;
  const stock = parseInt(document.getElementById('productStock').value) || 0;
  const minStock = parseInt(document.getElementById('productMin').value) || 5;

  if (!name) return showNotification(tr('product_name_req'), 'error');

  const dup = state.products.find(p => p.id !== id && barcode && normalizeBarcode(p.barcode) === normalizeBarcode(barcode));
  if (dup) return showNotification(tr('barcode_used') + dup.name, 'error');

  const ownerId = (state.role === 'employee' && state.ownerId) ? state.ownerId : state.currentUser.id;
  const productData = {
    id: id || uid('PRD'), user_id: ownerId, name, barcode, category, price, cost, stock, min_stock: minStock
  };

  if (id) {
    const prod = state.products.find(function(p) { return p.id === id; });
    if (prod) {
      prod.name = name; prod.barcode = barcode; prod.category = category;
      prod.price = price; prod.cost = cost; prod.minStock = minStock; prod.min_stock = minStock;
      productData.stock = prod.stock;
    }
  } else {
    state.products.push({ id: productData.id, name, barcode, category, price, cost, stock, minStock, min_stock: minStock });
  }

  if (navigator.onLine && supabaseClient) {
    const { error } = await supabaseClient.from('products').upsert(productData, { onConflict: 'id' });
    if (error) {
      console.warn('Product upload failed:', error);
      return showNotification(tr('product_save_fail') + error.message, 'error');
    }
  }

  if (typeof addAuditLog === 'function') {
    addAuditLog(id ? 'edit_product' : 'add_product', { productId: productData.id, name }, productData.id);
  }

  saveData();
  clearProductForm();
  renderProducts();
  renderDashboard();
  updateStockBadge();
  showNotification(tr('product_saved'));
}

function clearProductForm() {
  ['productId', 'productName', 'productBarcode', 'productCategory', 'productPrice', 'productCost', 'productStock'].forEach(function(id) {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const min = document.getElementById('productMin');
  if (min) min.value = 5;
  const title = document.getElementById('productFormTitle');
  if (title) title.innerText = tr('add_product_title');
}

function renderProducts() {
  const container = document.getElementById('productsTable');
  if (!container) return;

  const searchEl = document.getElementById('productSearch');
  const search = (searchEl ? searchEl.value : '').toLowerCase();

  const filtered = state.products.filter(function(p) {
    return (p.name || '').toLowerCase().indexOf(search) !== -1 ||
      (p.barcode && String(p.barcode).indexOf(search) !== -1) ||
      (p.category && p.category.toLowerCase().indexOf(search) !== -1);
  });

  if (filtered.length === 0) {
    container.innerHTML = '<p class="text-muted">' + tr('empty_products') + '</p>';
    return;
  }

  const editBtn = currentLang === 'en' ? 'Edit' : 'تعديل';
  const deleteBtn = currentLang === 'en' ? 'Delete' : 'حذف';
  const quickAddTitle = currentLang === 'en' ? 'Quick Add' : 'إضافة كمية سريعة';

  let html = '<div class="table-wrap"><table class="data-table"><thead><tr><th data-i18n="th_name">الاسم</th><th data-i18n="th_barcode">الباركود</th><th data-i18n="th_category">التصنيف</th><th data-i18n="th_price">السعر</th><th data-i18n="th_cost">التكلفة</th><th data-i18n="th_stock">المخزن</th><th data-i18n="th_action">إجراء</th></tr></thead><tbody>';
  filtered.forEach(function(p) {
    const isLow = Number(p.stock) <= Number(p.minStock || p.min_stock || 5);
    html += '<tr' + (isLow ? ' style="background:#fff4d9"' : '') + '>' +
      '<td>' + escapeHTML(p.name) + (isLow ? ' ⚠️' : '') + '</td>' +
      '<td>' + escapeHTML(p.barcode || '-') + '</td>' +
      '<td>' + escapeHTML(p.category || '-') + '</td>' +
      '<td>' + (Number(p.price) || 0) + '</td>' +
      '<td>' + (Number(p.cost) || 0) + '</td>' +
      '<td><b>' + (Number(p.stock) || 0) + '</b></td>' +
      '<td>' +
       '<button class="small-btn green" onclick="quickAddStock(\'' + p.id + '\')" title="' + quickAddTitle + '">+</button>' +
'<button class="small-btn primary" onclick="editProduct(\'' + p.id + '\')">' + editBtn + '</button>' +
'<button class="small-btn red" onclick="deleteProduct(\'' + p.id + '\')">' + deleteBtn + '</button>' +
      '</td>' +
      '</tr>';
  });
  html += '</tbody></table></div>';
  container.innerHTML = html;
}

function editProduct(id) {
  if (state.role !== 'manager') return showNotification(tr('manager_only'), 'warning');
  const p = state.products.find(function(item) { return item.id === id; });
  if (!p) return;
  document.getElementById('productId').value = p.id;
  document.getElementById('productName').value = p.name || '';
  document.getElementById('productBarcode').value = p.barcode || '';
  document.getElementById('productCategory').value = p.category || '';
  document.getElementById('productPrice').value = p.price || 0;
  document.getElementById('productCost').value = p.cost || 0;
  document.getElementById('productStock').value = p.stock || 0;
  document.getElementById('productMin').value = p.minStock || p.min_stock || 5;
  const title = document.getElementById('productFormTitle');
  if (title) title.innerText = (currentLang === 'en' ? 'Edit: ' : 'تعديل: ') + p.name;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteProduct(id) {
  if (state.role !== 'manager') return showNotification(tr('manager_only'), 'warning');
  const prod = state.products.find(function(p) { return p.id === id; });
  if (!prod) return;

  const salesCount = state.sales.reduce(function (count, s) {
    if (!s.items) return count;
    return count + (s.items.some(function (i) { return i.id === id; }) ? 1 : 0);
  }, 0);

  if (salesCount > 0) {
    const msg = tr('product_in_invoices_1') + salesCount + tr('product_in_invoices_2');
    if (!confirm(msg)) return;
  } else {
    if (!confirm(tr('msg_delete_product'))) return;
  }

  if (navigator.onLine && supabaseClient) {
    await supabaseClient.from('products').delete().eq('id', id);
  }

  if (typeof addAuditLog === 'function') {
    addAuditLog('delete_product', { productId: prod.id, name: prod.name }, prod.id);
  }

  state.products = state.products.filter(function(p) { return p.id !== id; });
  saveData();
  renderProducts();
  renderDashboard();
  updateStockBadge();
  showNotification(tr('product_deleted'));
}

function populateAdjustDropdown() {
  const sel = document.getElementById('adjustProduct');
  if (!sel) return;
  sel.innerHTML = '<option value="">' + tr('opt_select_product') + '</option>';
  const availableLabel = currentLang === 'en' ? ' (Available: ' : ' (المتوفر: ';
  state.products.forEach(function(p) {
    sel.innerHTML += '<option value="' + p.id + '">' + escapeHTML(p.name) + availableLabel + (Number(p.stock) || 0) + ')</option>';
  });
}

async function saveStockAdjustment() {
  if (state.role !== 'manager') return showNotification(tr('manager_only'), 'warning');

  const prodId = document.getElementById('adjustProduct').value;
  const type = document.getElementById('adjustType').value;
  const qty = parseInt(document.getElementById('adjustQty').value);
  const reason = document.getElementById('adjustReason').value.trim();

  if (!prodId || isNaN(qty) || qty < 0 || !reason) return showNotification(tr('complete_move_data'), 'error');

  const prod = state.products.find(function(p) { return p.id === prodId; });
  if (!prod) return;

  if (type === 'out' && qty > prod.stock) return showNotification(tr('qty_exceeds_stock_1') + prod.stock + tr('qty_exceeds_stock_2'), 'error');

  const oldStock = Number(prod.stock) || 0;
  let newStock = oldStock;
  if (type === 'in') newStock = oldStock + qty;
  if (type === 'out') newStock = Math.max(0, oldStock - qty);
  if (type === 'set') newStock = qty;

  if (newStock === oldStock) return showNotification(tr('qty_same'), 'info');

  prod.stock = newStock;
  const ownerId = (state.role === 'employee' && state.ownerId) ? state.ownerId : state.currentUser.id;
  const moveId = uid('SM');
  const moveDate = new Date().toISOString();

  state.stockMoves.unshift({
    id: moveId, date: moveDate, product_id: prod.id, productId: prod.id,
    product_name: prod.name, productName: prod.name,
    type: type, qty: Math.abs(newStock - oldStock),
    old_stock: oldStock, oldStock: oldStock,
    new_stock: newStock, newStock: newStock,
    reason: reason
  });

  if (navigator.onLine && supabaseClient) {
    await supabaseClient.from('products').update({ stock: newStock }).eq('id', prodId);
    await supabaseClient.from('stock_moves').insert({
      id: moveId, user_id: ownerId, product_id: prod.id, product_name: prod.name,
      type: type, qty: Math.abs(newStock - oldStock), old_stock: oldStock, new_stock: newStock,
      reason: reason, date: moveDate
    });
  }

  if (typeof addAuditLog === 'function') {
    addAuditLog('stock_adjustment', { productId: prod.id, newStock: newStock, reason: reason }, prod.id);
  }

  saveData();
  document.getElementById('adjustQty').value = '';
  document.getElementById('adjustReason').value = '';
  renderStockMoves();
  renderProducts();
  renderDashboard();
  updateStockBadge();
  showNotification(tr('move_saved'));
}

function renderStockMoves() {
  const container = document.getElementById('stockMovesTable');
  if (!container) return;

  const searchEl = document.getElementById('moveSearch');
  const search = (searchEl ? searchEl.value : '').toLowerCase();

  const filtered = state.stockMoves.filter(function(m) {
    return (m.productName || m.product_name || '').toLowerCase().indexOf(search) !== -1 ||
           (m.reason || '').toLowerCase().indexOf(search) !== -1;
  });

  if (filtered.length === 0) {
    container.innerHTML = '<p class="text-muted">' + tr('empty_stock_moves') + '</p>';
    return;
  }

  const en = currentLang === 'en';
  const typeLabels = {
    'in': en ? 'Add (+)' : 'إضافة (+)', 
    'out': en ? 'Deduct (-)' : 'خصم (-)', 
    'set': en ? 'Set (=)' : 'ضبط (=)',
    'sale': en ? 'Sale (-)' : 'بيع (-)', 
    'sale_cancel': en ? 'Sale Cancel (+)' : 'إلغاء بيع (+)',
    'return': en ? 'Return (+)' : 'مرتجع (+)', 
    'purchase': en ? 'Purchase (+)' : 'مشتريات (+)'
  };

  let html = '<div class="table-wrap"><table class="data-table"><thead><tr><th data-i18n="th_date">التاريخ</th><th data-i18n="th_product">المنتج</th><th data-i18n="th_movement">الحركة</th><th data-i18n="th_quantity">الكمية</th><th data-i18n="th_before_after">قبل ➔ بعد</th><th data-i18n="th_reason">السبب</th></tr></thead><tbody>';
  filtered.forEach(function(m) {
    const label = typeLabels[m.type] || m.type;
    const productName = m.productName || m.product_name || '-';
    const oldS = m.oldStock ?? m.old_stock ?? 0;
    const newS = m.newStock ?? m.new_stock ?? 0;
    html += '<tr>' +
      '<td>' + new Date(m.date).toLocaleString(en ? 'en-US' : 'ar-EG') + '</td>' +
      '<td>' + escapeHTML(productName) + '</td>' +
      '<td>' + label + '</td>' +
      '<td>' + m.qty + '</td>' +
      '<td>' + oldS + ' ➔ ' + newS + '</td>' +
      '<td>' + escapeHTML(m.reason || '') + '</td>' +
      '</tr>';
  });
  html += '</tbody></table></div>';
  container.innerHTML = html;
}

/* ============ المرتجعات ============ */
function populateReturnDropdowns() {
  const saleSel = document.getElementById('returnSale');
  if (!saleSel) return;
  saleSel.innerHTML = '<option value="">' + tr('opt_select_invoice') + '</option>';
  const invLabel = currentLang === 'en' ? 'Invoice: ' : 'فاتورة: ';
  state.sales.forEach(function(s) {
    saleSel.innerHTML += '<option value="' + s.id + '">' + invLabel + s.id + ' (' + (Number(s.total) || 0).toFixed(2) + ' ' + state.storeSettings.currency + ')</option>';
  });
}

function updateReturnProducts() {
  const saleId = document.getElementById('returnSale').value;
  const prodSel = document.getElementById('returnProduct');
  if (!prodSel) return;
  prodSel.innerHTML = '<option value="">' + tr('opt_select_item') + '</option>';
  const sale = state.sales.find(function(s) { return s.id === saleId; });
  if (!sale || !sale.items) return;

  sale.items.forEach(function(i) {
    const alreadyReturned = state.returns
      .filter(function(r) {
        const rSale = r.saleId || r.sale_id;
        const rProd = r.productId || r.product_id;
        return rSale === saleId && rProd === i.id;
      })
      .reduce(function(sum, r) { return sum + (Number(r.qty) || 0); }, 0);
    const remaining = i.qty - alreadyReturned;
    if (remaining > 0) {
      const remLabel = currentLang === 'en' ? ' (Remaining: ' : ' (متبقي: ';
      prodSel.innerHTML += '<option value="' + i.id + '">' + escapeHTML(i.name) + remLabel + remaining + ')</option>';
    }
  });
}

async function saveReturn() {
  if (state.role === 'employee') {
    const perms = state.storeSettings.permissions || {};
    if (!perms.canReturn) return showNotification(tr('manager_only'), 'warning');
  }
  if (window.isReadOnlyMode) return showNotification(tr('renew_sub_first'), 'error');

  const saleId = document.getElementById('returnSale').value;
  const prodId = document.getElementById('returnProduct').value;
  const qty = parseInt(document.getElementById('returnQty').value) || 1;
  const reason = document.getElementById('returnReason').value.trim();

  if (!saleId || !prodId) return showNotification(tr('notify_select_sale_item'), 'error');
  if (qty < 1) return showNotification(tr('invalid_qty'), 'error');

  const sale = state.sales.find(function(s) { return s.id === saleId; });
  const item = sale ? sale.items.find(function(i) { return i.id === prodId; }) : null;
  if (!item) return showNotification(tr('item_not_found'), 'error');

  const alreadyReturned = state.returns
    .filter(function(r) {
      const rSale = r.saleId || r.sale_id;
      const rProd = r.productId || r.product_id;
      return rSale === saleId && rProd === prodId;
    })
    .reduce(function(sum, r) { return sum + (Number(r.qty) || 0); }, 0);

  if (qty > item.qty - alreadyReturned) return showNotification(tr('qty_exceeds_remaining'), 'error');

  // 1) ضمان وردية مفتوحة
  let shiftId;
  try {
    shiftId = await ensureOpenShift();
  } catch (e) {
    return showNotification((currentLang === 'en' ? 'Failed to open shift: ' : 'تعذر فتح وردية: ') + (e.message || ''), 'error');
  }

  // ✅ [إصلاح جذري] لو الوردية مش موجودة (فشل الحفظ في السيرفر)، نمنع المرتجع
  if (!shiftId) {
    return showNotification(tr('shift_create_fail'), 'error');
  }

  // 2) تحديد طريقة الاسترداد (cash/credit)
  const refundMethod = askRefundMethod(sale, item, qty);
  if (refundMethod === null) return;

  // 3) حساب قيمة المرتجع
  const unitPrice = Number(item.price) || 0;
  const returnValue = unitPrice * qty;
  const ownerId = (state.role === 'employee' && state.ownerId) ? state.ownerId : state.currentUser.id;
  const customerId = sale.customer_id || sale.customerId || null;

  // 4) بناء كائن المرتجع
  const newReturn = {
    id: uid('RET'),
    user_id: ownerId,
    sale_id: saleId,
    saleId: saleId,
    product_id: prodId,
    productId: prodId,
    product_name: item.name,
    productName: item.name,
    qty: qty,
    price: unitPrice,
    total: returnValue,
    refund_method: refundMethod,
    refundMethod: refundMethod,
    shift_id: shiftId,
    shiftId: shiftId,
    customer_id: customerId,
    customerId: customerId,
    reason: reason || tr('return_reason_default'),
    date: new Date().toISOString()
  };

  // 5) الحفظ في Supabase (الـ trigger handle_return_full هيعمل الباقي)
  if (navigator.onLine && supabaseClient) {
    try {
      const { error: retErr } = await supabaseClient.from('returns').insert({
        id: newReturn.id,
        user_id: ownerId,
        sale_id: newReturn.sale_id,
        product_id: newReturn.product_id,
        product_name: newReturn.product_name,
        qty: newReturn.qty,
        price: newReturn.price,
        total: newReturn.total,
        refund_method: newReturn.refund_method,
        shift_id: newReturn.shift_id,
        customer_id: newReturn.customer_id,
        reason: newReturn.reason,
        date: newReturn.date
      });
      if (retErr) throw retErr;
    } catch (err) {
      console.error('Return upload failed:', err);
      return showNotification(tr('return_save_fail') + err.message, 'error');
    }
  }

  // 6) التحديث المحلي
  state.returns.unshift(newReturn);

  // ⚠️ ملاحظة: remaining = total - paid (GENERATED COLUMN) — لا يتغير بالمرتجع
  // فقط returned_total و net_total يتحدثوا
  if (sale) {
    sale.returned_total = (Number(sale.returned_total) || 0) + returnValue;
    sale.returnedTotal = sale.returned_total;
    sale.net_total = Math.max(0, (Number(sale.total) || 0) - sale.returned_total);
    sale.netTotal = sale.net_total;
    // remaining لا يتغير — total - paid لم يتغيرا
  }

  // تحديث المخزون محلياً
  const prod = state.products.find(function(p) { return p.id === prodId; });
  if (prod) {
    const before = Number(prod.stock) || 0;
    prod.stock = before + qty;

    state.stockMoves.unshift({
      id: uid('SM'), date: new Date().toISOString(),
      product_id: prod.id, productId: prod.id,
      product_name: prod.name, productName: prod.name,
      type: 'return', qty: qty,
      old_stock: before, oldStock: before,
      new_stock: prod.stock, newStock: prod.stock,
      reason: (currentLang === 'en' ? 'Return for Invoice ' : 'مرتجع فاتورة ') + saleId
    });
  }

  if (typeof addAuditLog === 'function') {
    addAuditLog('add_return', {
      returnId: newReturn.id, saleId, qty,
      refundMethod, returnValue
    }, newReturn.id);
  }

  saveData();

  document.getElementById('returnQty').value = 1;
  document.getElementById('returnReason').value = '';

  renderReturns();
  renderProducts();
  renderStockMoves();
  renderDashboard();
  renderSales();
  renderCustomers();
  updateStockBadge();

  const methodText = refundMethod === 'credit' ? tr('refund_credit') : tr('refund_cash');
  showNotification(tr('return_success_1') + methodText + tr('return_success_2'), 'success');
}

function renderReturns() {
  const container = document.getElementById('returnsTable');
  if (!container) return;
  if (state.returns.length === 0) {
    container.innerHTML = '<p class="text-muted">' + tr('no_returns') + '</p>';
    return;
  }

  const methodLabels = {
    'cash': tr('cash_method'),
    'credit': tr('credit_method'),
    'none': tr('none_method')
  };

  let html = '<div class="table-wrap"><table class="data-table"><thead><tr><th data-i18n="th_date">التاريخ</th><th data-i18n="th_invoice_number">رقم الفاتورة</th><th data-i18n="th_item">الصنف</th><th data-i18n="th_quantity">الكمية</th><th>' + tr('th_value') + '</th><th>' + tr('return_method') + '</th><th data-i18n="th_reason">السبب</th></tr></thead><tbody>';
  state.returns.forEach(function(r) {
    const saleId = r.saleId || r.sale_id;
    const productName = r.productName || r.product_name;
    const total = Number(r.total) || 0;
    const method = r.refundMethod || r.refund_method || 'none';
    html += '<tr>' +
      '<td>' + new Date(r.date).toLocaleString(currentLang === 'en' ? 'en-US' : 'ar-EG') + '</td>' +
      '<td>' + escapeHTML(saleId) + '</td>' +
      '<td>' + escapeHTML(productName) + '</td>' +
      '<td>' + r.qty + '</td>' +
      '<td>' + total.toFixed(2) + ' ' + state.storeSettings.currency + '</td>' +
      '<td>' + (methodLabels[method] || method) + '</td>' +
      '<td>' + escapeHTML(r.reason) + '</td>' +
      '</tr>';
  });
  html += '</tbody></table></div>';
  container.innerHTML = html;
}
