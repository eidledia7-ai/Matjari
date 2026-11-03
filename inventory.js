/* ============ المخزون والمنتجات ============ */
async function saveProduct() {
  if (window.isReadOnlyMode) return showNotification(tr('renew_sub_first'), 'error');
  if (state.role !== 'manager') return showNotification(tr('manager_only'), 'warning');

  const id = document.getElementById('productId').value;
  if (!id) {
    const lim = checkLimit('products', state.products.length);
    if (!lim.allowed) {
      return showNotification(tr('product_limit_reached'), 'warning');
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

  // ✅ v7.10.2 — ترجمة
  const editBtn = tr('edit_btn');
  const deleteBtn = tr('delete_btn');
  const quickAddTitle = tr('quick_add_btn');

  let html = '<div class="table-wrap"><table class="data-table"><thead><tr><th data-i18n="th_name">' + tr('th_name') + '</th><th data-i18n="th_barcode">' + tr('th_barcode') + '</th><th data-i18n="th_category">' + tr('th_category') + '</th><th data-i18n="th_price">' + tr('th_price') + '</th><th data-i18n="th_cost">' + tr('th_cost') + '</th><th data-i18n="th_stock">' + tr('th_stock') + '</th><th data-i18n="th_action">' + tr('th_action') + '</th></tr></thead><tbody>';
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
  if (title) title.innerText = tr('edit_btn') + ': ' + p.name;
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
  // ✅ v7.10.2 — ترجمة
  const availableLabel = tr('opt_available_label');
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

  // ✅ v7.10.2 — ترجمة كل أنواع الحركات
  const typeLabels = {
    'in':          tr('stock_movement_in'),
    'out':         tr('stock_movement_out'),
    'set':         tr('stock_movement_set'),
    'sale':        tr('stock_movement_sale'),
    'sale_cancel': tr('stock_movement_sale_cancel'),
    'return':      tr('stock_movement_return'),
    'purchase':    tr('stock_movement_purchase')
  };

  let html = '<div class="table-wrap"><table class="data-table"><thead><tr><th data-i18n="th_date">' + tr('th_date') + '</th><th data-i18n="th_product">' + tr('th_product') + '</th><th data-i18n="th_movement">' + tr('th_movement') + '</th><th data-i18n="th_quantity">' + tr('th_quantity') + '</th><th data-i18n="th_before_after">' + tr('th_before_after') + '</th><th data-i18n="th_reason">' + tr('th_reason') + '</th></tr></thead><tbody>';
  filtered.forEach(function(m) {
    const label = typeLabels[m.type] || m.type;
    const productName = m.productName || m.product_name || '-';
    const oldS = m.oldStock ?? m.old_stock ?? 0;
    const newS = m.newStock ?? m.new_stock ?? 0;
    html += '<tr>' +
      '<td>' + new Date(m.date).toLocaleString(currentLang === 'en' ? 'en-US' : 'ar-EG') + '</td>' +
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
  // ✅ v7.10.2 — ترجمة
  const invLabel = tr('opt_invoice_label');
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
      // ✅ v7.10.2 — ترجمة
      const remLabel = tr('opt_remaining_label');
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

  let shiftId;
  try {
    shiftId = await ensureOpenShift();
  } catch (e) {
    // ✅ v7.10.2 — ترجمة
    return showNotification(tr('shift_open_failed_prefix') + (e.message || ''), 'error');
  }

  if (!shiftId) {
    return showNotification(tr('shift_create_fail'), 'error');
  }

  const refundMethod = askRefundMethod(sale, item, qty);
  if (refundMethod === null) return;

  const unitPrice = Number(item.price) || 0;
  const baseReturn = unitPrice * qty;
  const saleVatRate = Number(sale.vat_rate) || 0;
  const saleVatMode = sale.vat_mode || 'inclusive';
  const vatSnap = financeCore.calcVatFromSnapshot(baseReturn, saleVatRate, saleVatMode);
  const returnValue = vatSnap.total;
  const returnVat   = vatSnap.vat_amount;

  const ownerId = (state.role === 'employee' && state.ownerId) ? state.ownerId : state.currentUser.id;
  const customerId = sale.customer_id || sale.customerId || null;

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
    vat_amount: returnVat,
    refund_method: refundMethod,
    refundMethod: refundMethod,
    shift_id: shiftId,
    shiftId: shiftId,
    customer_id: customerId,
    customerId: customerId,
    reason: reason || tr('return_reason_default'),
    date: new Date().toISOString()
  };

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
        vat_amount: newReturn.vat_amount,
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

  state.returns.unshift(newReturn);

  if (sale) {
    sale.returned_total = (Number(sale.returned_total) || 0) + returnValue;
    sale.returnedTotal = sale.returned_total;
    sale.net_total = Math.max(0, (Number(sale.total) || 0) - sale.returned_total);
    sale.netTotal = sale.net_total;
  }

  // ✅ v7.4 — تحديث فوري لرصيد العميل في الكاش
  if (refundMethod === 'credit' && customerId) {
    state.customerBalances = state.customerBalances || {};
    state.customerBalances[customerId] = (Number(state.customerBalances[customerId]) || 0) - returnValue;
  }

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
      // ✅ v7.10.2 — ترجمة
      reason: tr('return_for_invoice_prefix') + saleId
    });
  }

  if (typeof addAuditLog === 'function') {
    addAuditLog('add_return', {
      returnId: newReturn.id, saleId, qty,
      refundMethod, returnValue, vatAmount: returnVat
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

  // ✅ v7.10.2 — ترجمة
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

  // ✅ v7.10.2 — ترجمة
  const methodLabels = {
    'cash':   tr('cash_method'),
    'credit': tr('credit_method'),
    'none':   tr('none_method')
  };

  let html = '<div class="table-wrap"><table class="data-table"><thead><tr><th data-i18n="th_date">' + tr('th_date') + '</th><th data-i18n="th_invoice_number">' + tr('th_invoice_number') + '</th><th data-i18n="th_item">' + tr('th_item') + '</th><th data-i18n="th_quantity">' + tr('th_quantity') + '</th><th>' + tr('th_value') + '</th><th>' + tr('return_method') + '</th><th data-i18n="th_reason">' + tr('th_reason') + '</th></tr></thead><tbody>';
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
/* ============ v7.11a — Excel/CSV/JSON Import (Professional) ============ */
let _importState = { rows: [], valid: 0, skipped: 0, errors: 0, fileName: '' };

async function importProductsFile(event) {
  if (window.isReadOnlyMode) return showNotification(tr('renew_sub_expense'), 'error');
  if (state.role !== 'manager') return showNotification(tr('manager_only'), 'warning');
  const file = event.target.files[0]; if (!file) return;
  event.target.value = '';

  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const allowed = ['xlsx','xls','xlsm','xlsb','ods','fods','csv','tsv','txt','json'];
  if (!allowed.includes(ext)) return showNotification(tr('import_unsupported_ext'), 'error');
  if (file.size > 5 * 1024 * 1024) return showNotification(tr('import_file_too_large'), 'error');

  showLoading(tr('import_reading'));
  try {
    const rows = await _readImportFile(file, ext);
    if (!rows || !rows.length) { hideLoading(); return showNotification(tr('import_no_data'), 'warning'); }
    if (rows.length > 1000) { hideLoading(); return showNotification(tr('import_too_many_rows'), 'error'); }
    _importState = { rows, valid: 0, skipped: 0, errors: 0, fileName: file.name };
    _validateImportRows();
    hideLoading();
    _openImportModal();
  } catch (e) { hideLoading(); showNotification(tr('import_read_fail') + ' ' + e.message, 'error'); }
}

async function _readImportFile(file, ext) {
  if (ext === 'json') {
    const txt = await file.text();
    const parsed = JSON.parse(txt);
    if (!Array.isArray(parsed)) throw new Error(tr('import_json_not_array'));
    return parsed.map((o, i) => _sanitizeJsonRow(o, i));
  }
  if (ext === 'csv' || ext === 'tsv' || ext === 'txt') {
    const txt = await file.text();
    const delim = ext === 'tsv' ? '\t' : ',';
    const res = Papa.parse(txt, { header: true, skipEmptyLines: true, delimiter: delim });
    if (res.errors?.length) console.warn('CSV warnings:', res.errors);
    return res.data || [];
  }
  // Excel / ODS / FODS
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { defval: '' });
}

function _sanitizeJsonRow(obj, idx) {
  const allowed = ['name','barcode','category','price','cost','stock','min_stock'];
  const out = {};
  allowed.forEach(k => { if (obj && Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k]; });
  return out;
}

function _validateImportRows() {
  const seen = new Set();
  const existing = new Set((state.products || []).map(p => normalizeBarcode(p.barcode)).filter(Boolean));
  _importState.valid = 0; _importState.skipped = 0; _importState.errors = 0;
  _importState.rows = _importState.rows.map((raw, i) => {
    const name = String(raw.name || '').trim();
    const barcode = String(raw.barcode || '').trim();
    const category = String(raw.category || '').trim() || tr('general_cat');
    const price = Number(raw.price) || 0;
    const cost = Number(raw.cost) || 0;
    const stock = Number(raw.stock) || 0;
    const min_stock = Number(raw.min_stock) || 5;
    const nb = normalizeBarcode(barcode);
    let status = 'new', reason = '';

    if (!name || name.length < 2 || name.length > 100) { status = 'error'; reason = tr('import_err_name'); }
    else if (price < 0 || cost < 0 || stock < 0 || min_stock < 0) { status = 'error'; reason = tr('import_err_negative'); }
    else if (nb && existing.has(nb)) { status = 'skipped'; reason = tr('import_err_dup_db'); }
    else if (nb && seen.has(nb)) { status = 'skipped'; reason = tr('import_err_dup_file'); }
    else { seen.add(nb); }

    if (status === 'new') _importState.valid++;
    else if (status === 'skipped') _importState.skipped++;
    else _importState.errors++;

    return { rowNum: i + 2, name, barcode, category, price, cost, stock, min_stock, status, reason };
  });
}

function _openImportModal() {
  const m = document.getElementById('excelImportModal');
  const body = document.getElementById('importPreviewBody');
  const summary = document.getElementById('importSummary');
  if (!m || !body || !summary) return;

  summary.innerHTML =
    '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:12px;">' +
      '<span class="badge" style="background:#dcfce7;color:#166534;">✅ ' + _importState.valid + ' ' + tr('import_new') + '</span>' +
      '<span class="badge" style="background:#fef3c7;color:#92400e;">⏭️ ' + _importState.skipped + ' ' + tr('import_skipped') + '</span>' +
      '<span class="badge" style="background:#fee2e2;color:#991b1b;">❌ ' + _importState.errors + ' ' + tr('import_errors') + '</span>' +
    '</div>';

  const rowsToShow = _importState.rows.slice(0, 200);
  let html = '<div class="table-wrap" style="max-height:400px;overflow:auto;"><table class="data-table"><thead><tr>' +
    '<th>#</th><th>' + tr('th_name') + '</th><th>' + tr('th_barcode') + '</th><th>' + tr('th_price') + '</th><th>' + tr('th_stock') + '</th><th>' + tr('th_status') + '</th></tr></thead><tbody>';
  rowsToShow.forEach(r => {
    const color = r.status === 'new' ? '#dcfce7' : r.status === 'skipped' ? '#fef3c7' : '#fee2e2';
    const icon = r.status === 'new' ? '✅' : r.status === 'skipped' ? '⏭️' : '❌';
    html += '<tr style="background:' + color + '20;"><td>' + r.rowNum + '</td><td>' + escapeHTML(r.name || '—') + '</td><td>' + escapeHTML(r.barcode || '—') + '</td><td>' + r.price + '</td><td>' + r.stock + '</td><td>' + icon + ' ' + (r.reason ? escapeHTML(r.reason) : tr('import_' + r.status)) + '</td></tr>';
  });
  html += '</tbody></table></div>';
  if (_importState.rows.length > 200) html += '<p class="text-muted" style="text-align:center;padding:8px;">' + tr('import_showing_200') + '</p>';
  body.innerHTML = html;

  const btn = document.getElementById('importExecuteBtn');
  if (btn) btn.disabled = _importState.valid === 0;
  m.style.display = 'flex';
}

function closeImportModal() { const m = document.getElementById('excelImportModal'); if (m) m.style.display = 'none'; }

async function executeImport() {
  if (_importState.valid === 0) return;
  if (state.role !== 'manager') return showNotification(tr('manager_only'), 'warning');
  if (window.isReadOnlyMode) return showNotification(tr('renew_sub_expense'), 'error');

  const lim = checkLimit('products', (state.products.length || 0) + _importState.valid);
  if (!lim.allowed) { closeImportModal(); return showNotification(tr('import_limit_exceeded'), 'error'); }

  const toInsert = _importState.rows.filter(r => r.status === 'new');
  const ownerId = state.currentUser.id;
  const productsBatch = toInsert.map(r => ({
    id: uid('PRD'), user_id: ownerId, name: r.name, barcode: r.barcode,
    category: r.category, price: r.price, cost: r.cost, stock: r.stock, min_stock: r.min_stock
  }));
  const movesBatch = productsBatch.filter(p => Number(p.stock) > 0).map(p => ({
    id: uid('SM'), user_id: ownerId, product_id: p.id, product_name: p.name,
    type: 'in', qty: p.stock, old_stock: 0, new_stock: p.stock,
    reason: tr('import_reason_excel'), date: new Date().toISOString()
  }));

  const rollback = () => {
    state.products = state.products.filter(p => !productsBatch.find(b => b.id === p.id));
  };

  try {
    // محلي أولاً
    productsBatch.forEach(p => state.products.push({ id: p.id, name: p.name, barcode: p.barcode, category: p.category, price: p.price, cost: p.cost, stock: p.stock, min_stock: p.min_stock, minStock: p.min_stock }));
    movesBatch.forEach(m => state.stockMoves.unshift({ ...m, productId: m.product_id, productName: m.product_name, oldStock: 0, newStock: m.new_stock }));

    if (navigator.onLine && supabaseClient) {
      const { error: e1 } = await supabaseClient.from('products').insert(productsBatch);
      if (e1) throw e1;
      if (movesBatch.length) {
        const { error: e2 } = await supabaseClient.from('stock_moves').insert(movesBatch);
        if (e2) throw e2;
      }
    }

    if (typeof addAuditLog === 'function') addAuditLog('import_products_excel', { count: productsBatch.length, skipped: _importState.skipped, errors: _importState.errors, file: _importState.fileName });

    saveData();
    renderProducts(); renderStockMoves(); renderDashboard(); updateStockBadge();
    closeImportModal();
    showNotification(tr('import_success').replace('{n}', productsBatch.length), 'success');
    _importState = { rows: [], valid: 0, skipped: 0, errors: 0, fileName: '' };
  } catch (err) {
    rollback();
    closeImportModal();
    showNotification(tr('import_fail') + ' ' + (err.message || ''), 'error');
  }
}

function downloadImportErrors() {
  const bad = _importState.rows.filter(r => r.status !== 'new');
  if (!bad.length) return showNotification(tr('import_no_errors'), 'info');
  let csv = '\uFEFF' + '"' + tr('import_errors_report') + '"\r\n\r\n';
  csv += ['#','Name','Barcode','Reason'].map(h => '"' + h + '"').join(',') + '\r\n';
  bad.forEach(r => { csv += [r.rowNum, '"' + (r.name||'').replace(/"/g,'""') + '"', '"' + (r.barcode||'').replace(/"/g,'""') + '"', '"' + (r.reason||'').replace(/"/g,'""') + '"'].join(',') + '\r\n'; });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'import-errors-' + today() + '.csv';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function downloadImportTemplate() {
  const csv = '\uFEFF' + '"name","barcode","category","price","cost","stock","min_stock"\r\n' +
    '"منتج نموذج 1","6221030101010","عام","15.00","10.00","50","5"\r\n' +
    '"منتج نموذج 2","","مشروبات","8.00","5.00","100","10"\r\n';
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'products-template.csv';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}