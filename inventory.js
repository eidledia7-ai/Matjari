/* ============ المخزون والمنتجات ============ */
async function saveProduct() {
  if (window.isReadOnlyMode) return showNotification('جدد اشتراكك أولاً لإضافة منتجات', 'error');
  if (state.role !== 'manager') return showNotification('هذه العملية للمدير فقط', 'warning');

  const id = document.getElementById('productId').value;
  if (!id) {
    const lim = checkLimit('products', state.products.length);
    if (!lim.allowed) {
      return showNotification(
        currentLang === 'en' ? 'Product limit reached.' : 'وصلت لحد المنتجات. رقّي باقتك.',
        'warning'
      );
    }
  }
  
  const name = document.getElementById('productName').value.trim();
  const barcode = document.getElementById('productBarcode').value.trim();
  const category = document.getElementById('productCategory').value.trim();
  const price = parseFloat(document.getElementById('productPrice').value) || 0;
  const cost = parseFloat(document.getElementById('productCost').value) || 0;
  const stock = parseInt(document.getElementById('productStock').value) || 0;
  const minStock = parseInt(document.getElementById('productMin').value) || 5;

  if (!name) return showNotification('اسم المنتج مطلوب', 'error');

  const dup = state.products.find(p => p.id !== id && barcode && normalizeBarcode(p.barcode) === normalizeBarcode(barcode));
  if (dup) return showNotification('الباركود مستخدم للمنتج: ' + dup.name, 'error');

  const ownerId = state.currentUser.id;
  const productData = {
    id: id || uid('PRD'),
    user_id: ownerId,
    name: name,
    barcode: barcode,
    category: category,
    price: price,
    cost: cost,
    stock: stock,
    min_stock: minStock
  };

  if (id) {
    const prod = state.products.find(function(p) { return p.id === id; });
    if (prod) {
      prod.name = name;
      prod.barcode = barcode;
      prod.category = category;
      prod.price = price;
      prod.cost = cost;
      prod.minStock = minStock;
      // ملاحظة: المخزون مش بيتم تعديله هنا، بيتعدل من حركة المخزون أو البيع
      productData.stock = prod.stock; 
    }
  } else {
    state.products.push({ id: productData.id, name, barcode, category, price, cost, stock, minStock });
  }

  // الرفع للسيرفر
  if (navigator.onLine && supabaseClient) {
    const { error } = await supabaseClient.from('products').upsert(productData, { onConflict: 'id' });
    if (error) console.warn('Product upload failed:', error);
  }

  if (typeof addAuditLog === 'function') {
    addAuditLog(id ? 'edit_product' : 'add_product', { productId: productData.id, name }, productData.id);
  }

  saveData();
  clearProductForm();
  renderProducts();
  renderDashboard();
  updateStockBadge();
  showNotification('تم حفظ المنتج ✅');
}

function clearProductForm() {
  ['productId', 'productName', 'productBarcode', 'productCategory', 'productPrice', 'productCost', 'productStock'].forEach(function(id) {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const min = document.getElementById('productMin');
  if (min) min.value = 5;
  const title = document.getElementById('productFormTitle');
  if (title) title.innerText = 'إضافة منتج جديد';
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
    container.innerHTML = '<p class="text-muted">لا توجد منتجات.</p>';
    return;
  }

  let html = '<div class="table-wrap"><table class="data-table"><thead><tr><th data-i18n="th_name">الاسم</th><th data-i18n="th_barcode">الباركود</th><th data-i18n="th_category">التصنيف</th><th data-i18n="th_price">السعر</th><th data-i18n="th_cost">التكلفة</th><th data-i18n="th_stock">المخزن</th><th data-i18n="th_action">إجراء</th></tr></thead><tbody>';
  filtered.forEach(function(p) {
    const isLow = Number(p.stock) <= Number(p.minStock || 5);
    html += '<tr' + (isLow ? ' style="background:#fff4d9"' : '') + '>' +
      '<td>' + escapeHTML(p.name) + (isLow ? ' ⚠️' : '') + '</td>' +
      '<td>' + escapeHTML(p.barcode || '-') + '</td>' +
      '<td>' + escapeHTML(p.category || '-') + '</td>' +
      '<td>' + (Number(p.price) || 0) + '</td>' +
      '<td>' + (Number(p.cost) || 0) + '</td>' +
      '<td><b>' + (Number(p.stock) || 0) + '</b></td>' +
      '<td>' +
       '<button class="small-btn green" onclick="quickAddStock(\'' + p.id + '\')" title="إضافة كمية سريعة">+</button>' +
'<button class="small-btn primary" onclick="editProduct(\'' + p.id + '\')">تعديل</button>' +
'<button class="small-btn red" onclick="deleteProduct(\'' + p.id + '\')">حذف</button>' +
      '</td>' +
      '</tr>';
  });
  html += '</tbody></table></div>';
  container.innerHTML = html;
}

function editProduct(id) {
  if (state.role !== 'manager') return showNotification('هذه العملية للمدير فقط', 'warning');
  const p = state.products.find(function(item) { return item.id === id; });
  if (!p) return;
  document.getElementById('productId').value = p.id;
  document.getElementById('productName').value = p.name || '';
  document.getElementById('productBarcode').value = p.barcode || '';
  document.getElementById('productCategory').value = p.category || '';
  document.getElementById('productPrice').value = p.price || 0;
  document.getElementById('productCost').value = p.cost || 0;
  document.getElementById('productStock').value = p.stock || 0;
  document.getElementById('productMin').value = p.minStock || 5;
  const title = document.getElementById('productFormTitle');
  if (title) title.innerText = 'تعديل: ' + p.name;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteProduct(id) {
  if (state.role !== 'manager') return showNotification('هذه العملية للمدير فقط', 'warning');
  const prod = state.products.find(function(p) { return p.id === id; });
  if (!prod) return;

  const salesCount = state.sales.reduce(function (count, s) {
    if (!s.items) return count;
    return count + (s.items.some(function (i) { return i.id === id; }) ? 1 : 0);
  }, 0);

  if (salesCount > 0) {
    const msg = currentLang === 'en'
      ? 'Product in ' + salesCount + ' invoices. Continue?'
      : 'هذا المنتج موجود في ' + salesCount + ' فاتورة. هل تريد المتابعة؟';
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
  showNotification('تم حذف المنتج');
}

function populateAdjustDropdown() {
  const sel = document.getElementById('adjustProduct');
  if (!sel) return;
  sel.innerHTML = '<option value="">' + tr('opt_select_product') + '</option>';
  state.products.forEach(function(p) {
    sel.innerHTML += '<option value="' + p.id + '">' + escapeHTML(p.name) + ' (المتوفر: ' + (Number(p.stock) || 0) + ')</option>';
  });
}

async function saveStockAdjustment() {
  if (state.role !== 'manager') return showNotification('هذه العملية للمدير فقط', 'warning');

  const prodId = document.getElementById('adjustProduct').value;
  const type = document.getElementById('adjustType').value;
  const qty = parseInt(document.getElementById('adjustQty').value);
  const reason = document.getElementById('adjustReason').value.trim();

  if (!prodId || isNaN(qty) || qty < 0 || !reason) return showNotification('أكمل بيانات الحركة والسبب', 'error');

  const prod = state.products.find(function(p) { return p.id === prodId; });
  if (!prod) return;

  if (type === 'out' && qty > prod.stock) {
    return showNotification('الكمية أكبر من المخزون المتاح (' + prod.stock + ')', 'error');
  }

  const oldStock = prod.stock;
  let newStock = oldStock;
  if (type === 'in') newStock = oldStock + qty;
  if (type === 'out') newStock = Math.max(0, oldStock - qty);
  if (type === 'set') newStock = qty;

  if (newStock === oldStock) return showNotification('الكمية مطابقة للحالية', 'info');

  prod.stock = newStock;
  state.stockMoves.unshift({
    id: uid('SM'), date: new Date().toISOString(), productId: prod.id, productName: prod.name,
    type: type, qty: Math.abs(newStock - oldStock), oldStock: oldStock, newStock: newStock, reason: reason
  });

  // تحديث المنتج في السيرفر
  if (navigator.onLine && supabaseClient) {
    await supabaseClient.from('products').update({ stock: newStock }).eq('id', prodId);
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
  showNotification('تم تسجيل الحركة ✅');
}

function renderStockMoves() {
  const container = document.getElementById('stockMovesTable');
  if (!container) return;

  const searchEl = document.getElementById('moveSearch');
  const search = (searchEl ? searchEl.value : '').toLowerCase();

  const filtered = state.stockMoves.filter(function(m) {
    return (m.productName || '').toLowerCase().indexOf(search) !== -1 ||
      (m.reason || '').toLowerCase().indexOf(search) !== -1;
  });

  if (filtered.length === 0) {
    container.innerHTML = '<p class="text-muted">لا توجد حركات مسجلة.</p>';
    return;
  }

  let html = '<div class="table-wrap"><table class="data-table"><thead><tr><th data-i18n="th_date">التاريخ</th><th data-i18n="th_product">المنتج</th><th data-i18n="th_movement">الحركة</th><th data-i18n="th_quantity">الكمية</th><th data-i18n="th_before_after">قبل ➔ بعد</th><th data-i18n="th_reason">السبب</th></tr></thead><tbody>';
  filtered.forEach(function(m) {
    const label = m.type === 'in' ? 'إضافة (+)' : (m.type === 'out' ? 'خصم (-)' : 'ضبط (=)');
    html += '<tr>' +
      '<td>' + new Date(m.date).toLocaleString(currentLang === 'en' ? 'en-US' : 'ar-EG') + '</td>' +
      '<td>' + escapeHTML(m.productName) + '</td>' +
      '<td>' + label + '</td>' +
      '<td>' + m.qty + '</td>' +
      '<td>' + m.oldStock + ' ➔ ' + m.newStock + '</td>' +
      '<td>' + escapeHTML(m.reason) + '</td>' +
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
  
  // للموظف: يعرض الفواتير اللي هو عملها (أو كل فواتير المدير)
  state.sales.forEach(function(s) {
    saleSel.innerHTML += '<option value="' + s.id + '">فاتورة: ' + s.id + ' (' + (Number(s.total) || 0).toFixed(2) + ')</option>';
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
      .filter(function(r) { return r.saleId === saleId && r.productId === i.id; })
      .reduce(function(sum, r) { return sum + r.qty; }, 0);
    const remaining = i.qty - alreadyReturned;
    if (remaining > 0) {
      prodSel.innerHTML += '<option value="' + i.id + '">' + escapeHTML(i.name) + ' (متبقي: ' + remaining + ')</option>';
    }
  });
}

async function saveReturn() {
  if (state.role === 'employee') {
    const perms = state.storeSettings.permissions || {};
    if (!perms.canReturn) {
      return showNotification('هذه العملية للمدير فقط (الموظف غير مسموح له بتسجيل مرتجع)', 'warning');
    }
  }

  const saleId = document.getElementById('returnSale').value;
  const prodId = document.getElementById('returnProduct').value;
  const qty = parseInt(document.getElementById('returnQty').value) || 1;
  const reason = document.getElementById('returnReason').value.trim();

  if (!saleId || !prodId) return showNotification(tr('notify_select_sale_item'), 'error');
  if (qty < 1) return showNotification('كمية غير صحيحة', 'error');

  const sale = state.sales.find(function(s) { return s.id === saleId; });
  const item = sale ? sale.items.find(function(i) { return i.id === prodId; }) : null;
  if (!item) return showNotification('الصنف غير موجود', 'error');

  const alreadyReturned = state.returns
    .filter(function(r) { return r.saleId === saleId && r.productId === prodId; })
    .reduce(function(sum, r) { return sum + r.qty; }, 0);

  if (qty > item.qty - alreadyReturned) return showNotification('الكمية أكبر من المتبقي', 'error');

  const ownerId = (state.role === 'employee' && state.ownerId) ? state.ownerId : state.currentUser.id;
  const returnObj = {
    id: uid('RET'), date: new Date().toISOString(),
    saleId: saleId, productId: prodId, productName: item.name, qty: qty, reason: reason || 'غير محدد'
  };

  // 1. الحفظ في السيرفر
  if (navigator.onLine && supabaseClient) {
    const { error } = await supabaseClient.from('returns').insert({
      id: returnObj.id, user_id: ownerId, sale_id: returnObj.saleId,
      product_id: returnObj.productId, product_name: returnObj.productName,
      qty: returnObj.qty, reason: returnObj.reason, date: returnObj.date
    });
    if (error) console.warn('Return upload failed:', error);
  }

  // 2. التحديث المحلي
  state.returns.unshift(returnObj);
  const prod = state.products.find(function(p) { return p.id === prodId; });
  if (prod) prod.stock += qty; // التريجر في السيرفر بيعمل ده أوتوماتيك، هنا بنعمله في الواجهة

  if (typeof addAuditLog === 'function') {
    addAuditLog('add_return', { returnId: returnObj.id, saleId, qty }, returnObj.id);
  }

  saveData();
  document.getElementById('returnQty').value = 1;
  document.getElementById('returnReason').value = '';
  renderReturns();
  renderProducts();
  renderStockMoves();
  renderDashboard();
  updateStockBadge();
  showNotification('تم تسجيل المرتجع ✅');
}

function renderReturns() {
  const container = document.getElementById('returnsTable');
  if (!container) return;
  if (state.returns.length === 0) {
    container.innerHTML = '<p class="text-muted">لا توجد مرتجعات.</p>';
    return;
  }
  let html = '<div class="table-wrap"><table class="data-table"><thead><tr><th data-i18n="th_date">التاريخ</th><th data-i18n="th_invoice_number">رقم الفاتورة</th><th data-i18n="th_item">الصنف</th><th data-i18n="th_quantity">الكمية</th><th data-i18n="th_reason">السبب</th></tr></thead><tbody>';
  state.returns.forEach(function(r) {
    html += '<tr>' +
      '<td>' + new Date(r.date).toLocaleString(currentLang === 'en' ? 'en-US' : 'ar-EG') + '</td>' +
      '<td>' + escapeHTML(r.saleId) + '</td>' +
      '<td>' + escapeHTML(r.productName) + '</td>' +
      '<td>' + r.qty + '</td>' +
      '<td>' + escapeHTML(r.reason) + '</td>' +
      '</tr>';
  });
  html += '</tbody></table></div>';
  container.innerHTML = html;
}