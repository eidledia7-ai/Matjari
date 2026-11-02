/* ============ 2. المبيعات ============ */

let _pcSearchTimer = null;
let _activeCategory = '';

function populateSalesDropdowns() {
  const prodSelect = document.getElementById('saleProduct');
  const custSelect = document.getElementById('saleCustomer');

  if (prodSelect) {
    prodSelect.innerHTML = '<option value="">' + tr('opt_select_product') + '</option>';
    state.products.forEach(function(p) {
      prodSelect.innerHTML += '<option value="' + p.id + '">' + escapeHTML(p.name) + '</option>';
    });
  }

  if (custSelect) {
    custSelect.innerHTML = '';
    if (!state.customers || !state.customers.length) {
      state.customers = [{ id: 'CASH-CUSTOMER', name: (translations[currentLang] || translations.ar).cash_customer, phone: '-', openingDebt: 0 }];
    }
    state.customers.forEach(function(c) {
      const isCashCustomer = c.name === 'عميل نقدي عام' || c.name === 'Cash Customer';
      const displayName = isCashCustomer ? (translations[currentLang] || translations.ar).cash_customer : c.name;
      const pointsWord = currentLang === 'en' ? 'points' : 'نقطة';
      const pointsLabel = (c.points && c.points > 0) ? ' (💎 ' + c.points + ' ' + pointsWord + ')' : '';
      custSelect.innerHTML += '<option value="' + c.id + '">' + escapeHTML(displayName) + pointsLabel + '</option>';
    });
  }

  renderCategoryChips();
  renderProductGrid();
  bindProductSearch();
  renderCart();
}

function addToCartById(prodId, qty) {
  if (!prodId) return showNotification(tr('notify_select_product'), 'error');
  qty = parseInt(qty) || 1;

  const product = state.products.find(function(p) { return p.id === prodId; });
  if (!product) return;
  if (qty > product.stock) {
    playSound && playSound('error');
    _flashCart && _flashCart('error');
    return showNotification(tr('qty_exceeds_stock_1') + product.stock + tr('qty_exceeds_stock_2'), 'error');
  }

  const existing = state.cart.find(function(item) { return item.id === product.id; });
  if (existing) {
    if (existing.qty + qty > product.stock) {
      playSound && playSound('error');
      _flashCart && _flashCart('error');
      return showNotification(tr('qty_exceeds_stock_1') + product.stock + tr('qty_exceeds_stock_2'), 'error');
    }
    existing.qty += qty;
  } else {
    state.cart.push({ id: product.id, name: product.name, price: Number(product.price), cost: Number(product.cost), qty: qty });
  }

  state.selectedCartIndex = state.cart.length - 1;
  playBeep && playBeep(true);
  playSound && playSound('add');
  _flashCart && _flashCart('add');
  renderCart();
  clearTimeout(window._gridRefreshTimer);
window._gridRefreshTimer = setTimeout(() => {
  if (typeof renderProductGrid === 'function') renderProductGrid();
}, 150);
  
  const activeId = document.activeElement ? document.activeElement.id : '';
  if (activeId !== 'productSearchInput') {
    refocusCashierInput && refocusCashierInput();
  }
}

function addToCartManual() {
  const prodIdEl = document.getElementById('saleProduct');
  const qtyEl = document.getElementById('saleQty');
  const prodId = prodIdEl ? prodIdEl.value : null;
  const qty = qtyEl ? parseInt(qtyEl.value) : 1;
  addToCartById(prodId, qty);
  if (qtyEl) qtyEl.value = 1;
}

function renderProductGrid() {
  const grid = document.getElementById('productGrid');
  const empty = document.getElementById('productGridEmpty');
  if (!grid) return;
  
  const scrollPos = grid.scrollTop;

  const searchEl = document.getElementById('productSearchInput');
  const search = (searchEl ? searchEl.value : '').trim().toLowerCase();

  const filtered = (state.products || []).filter(function(p) {
    if (_activeCategory) {
      const cat = (p.category || '').trim();
      if (cat !== _activeCategory) return false;
    }
    if (!search) return true;
    return (p.name || '').toLowerCase().indexOf(search) !== -1
        || (p.barcode && String(p.barcode).indexOf(search) !== -1)
        || (p.category && p.category.toLowerCase().indexOf(search) !== -1);
  });

  if (filtered.length === 0) {
    grid.innerHTML = '';
    if (empty) empty.style.display = 'flex';
    return;
  }
  if (empty) empty.style.display = 'none';

  const cur = state.storeSettings.currency || 'ج.م';

  grid.innerHTML = filtered.map(function(p) {
    const stock = Number(p.stock) || 0;
    const price = Number(p.price) || 0;
    const isOut = stock <= 0;
    const isLow = !isOut && stock <= (Number(p.minStock ?? p.min_stock) || 5);
    const stockCls = isOut ? 'zero' : (isLow ? 'low' : '');
    const stockLabel = isOut ? '0' : stock;

    return '<div class="product-card' + (isOut ? ' out-of-stock' : '') + '" ' +
      'tabindex="0" ' +
      'data-product-id="' + p.id + '" ' +
      'onclick="handleProductClick(event, \'' + p.id + '\')" ' +
      'onkeydown="if(event.key===\'Enter\'){handleProductClick(event, \'' + p.id + '\')}">' +
      '<span class="pc-stock ' + stockCls + '">' + stockLabel + '</span>' +
      '<div class="pc-name">' + escapeHTML(p.name) + '</div>' +
      '<div class="pc-price">' + price.toFixed(2) + ' ' + cur + '</div>' +
    '</div>';
  }).join('');
  
  grid.scrollTop = scrollPos;
}

function handleProductClick(e, productId) {
  const card = e.currentTarget;
  const product = state.products.find(p => p.id === productId);
  if (!product || Number(product.stock) <= 0) {
    playSound && playSound('error');
    return showNotification(tr('qty_exceeds_stock_1') + 0 + tr('qty_exceeds_stock_2'), 'error');
  }
  flyToCart(card);
  addToCartById(productId, 1);
}

function renderCategoryChips() {
  const bar = document.getElementById('productCategoriesBar');
  if (!bar) return;
  const cats = Array.from(new Set((state.products || []).map(p => (p.category || '').trim()).filter(Boolean)));

  let html = '<button class="cat-chip' + (_activeCategory === '' ? ' active' : '') + '" data-cat="" onclick="selectCategory(\'\', this)">' + tr('cat_all') + '</button>';
  cats.forEach(function(c) {
    html += '<button class="cat-chip' + (_activeCategory === c ? ' active' : '') + '" data-cat="' + escapeHTML(c) + '" onclick="selectCategory(' + JSON.stringify(c).replace(/"/g, '&quot;') + ', this)">' + escapeHTML(c) + '</button>';
  });
  bar.innerHTML = html;
}

function selectCategory(cat, el) {
  _activeCategory = cat || '';
  document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
  if (el) el.classList.add('active');
  renderProductGrid();
  refocusCashierInput && refocusCashierInput();
}

function bindProductSearch() {
  const input = document.getElementById('productSearchInput');
  if (!input || input._bound) return;
  input._bound = true;
  input.addEventListener('input', function() {
    clearTimeout(_pcSearchTimer);
    _pcSearchTimer = setTimeout(renderProductGrid, 200);
  });
}

function flyToCart(sourceEl) {
  if (!sourceEl) return;
  const target = document.getElementById('cartArea') || document.getElementById('mobileCartBar');
  if (!target) return;
  try {
    const s = sourceEl.getBoundingClientRect();
    const t = target.getBoundingClientRect();
    const dot = document.createElement('div');
    dot.className = 'flying-item';
    dot.style.left = (s.left + s.width / 2 - 15) + 'px';
    dot.style.top = (s.top + s.height / 2 - 15) + 'px';
    document.body.appendChild(dot);
    requestAnimationFrame(() => {
      dot.style.left = (t.left + t.width / 2 - 15) + 'px';
      dot.style.top = (t.top + 20) + 'px';
      dot.style.opacity = '0.3';
      dot.style.transform = 'scale(0.4)';
    });
    setTimeout(() => dot.remove(), 550);
  } catch (e) {}
}

function updateMobileCartBar() {
  const count = state.cart.reduce((s, i) => s + (Number(i.qty) || 0), 0);
  const total = state.cart.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.qty) || 0), 0);
  const cur = state.storeSettings.currency || 'ج.م';

  const cntEl = document.getElementById('mobileCartCount');
  const totEl = document.getElementById('mobileCartTotal');
  const hdrCnt = document.getElementById('cartItemCount');

  if (cntEl) cntEl.textContent = count;
  if (totEl) totEl.textContent = total.toFixed(2) + ' ' + cur;
  if (hdrCnt) hdrCnt.textContent = count + ' ' + (count === 1 ? (currentLang === 'en' ? 'item' : 'صنف') : (currentLang === 'en' ? 'items' : 'صنف'));
}

function openMobileCart() {
  const cart = document.getElementById('cartArea');
  const bd = document.getElementById('mobileCartBackdrop');
  if (cart) cart.classList.add('open');
  if (bd) bd.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeMobileCart() {
  const cart = document.getElementById('cartArea');
  const bd = document.getElementById('mobileCartBackdrop');
  if (cart) {
    cart.classList.remove('open');
    cart.style.transform = '';
    cart.style.transition = '';
  }
  if (bd) bd.classList.remove('show');
  document.body.style.overflow = '';
}
function renderCart() {
  const container = document.getElementById('cartTable');
  if (!container) return;

  const custId = document.getElementById('saleCustomer')?.value || '';
  const cust = state.customers.find(c => c.id === custId);
  const pointsGroup = document.getElementById('pointsRedeemGroup');
  const pointsInput = document.getElementById('salePointsUsed');
  const pointsLabel = document.getElementById('custAvailPoints');

  let availablePoints = (cust && cust.points) ? Number(cust.points) : 0;
  let pointValue = state.storeSettings.pointValue || 0;

  if (pointsGroup) {
    if (availablePoints > 0 && pointValue > 0 && cust && cust.name !== 'عميل نقدي عام') {
      pointsGroup.style.display = 'flex';
      if (pointsLabel) pointsLabel.innerText = availablePoints;
      if (pointsInput) pointsInput.setAttribute('max', availablePoints);
    } else {
      pointsGroup.style.display = 'none';
      if (pointsInput) pointsInput.value = 0;
    }
  }

  if (state.cart.length === 0) {
    container.innerHTML =
      '<div class="empty-state cart-empty-state">' +
        '<div class="empty-icon">🛒</div>' +
        '<h3>' + tr('cart_empty_title') + '</h3>' +
        '<p>' + tr('cart_empty_msg') + '</p>' +
      '</div>';
    const t = document.getElementById('cartTotal');
    if (t) t.innerText = '0.00 ' + state.storeSettings.currency;
    updateMobileCartBar();
    return;
  }

  let html = '<div class="table-wrap"><table class="data-table"><thead><tr>' +
    '<th data-i18n="th_item">' + tr('th_item') + '</th>' +
    '<th data-i18n="th_price">' + tr('th_price') + '</th>' +
    '<th data-i18n="th_quantity">' + tr('th_quantity') + '</th>' +
    '<th data-i18n="th_total">' + tr('th_total') + '</th>' +
    '<th data-i18n="th_action">' + tr('th_action') + '</th>' +
    '</tr></thead><tbody>';

  let subtotal = 0;
  state.cart.forEach(function(item, idx) {
    const tot = item.price * item.qty;
    subtotal += tot;
    const isSelected = (state.selectedCartIndex === idx);
    html += '<tr class="cart-row' + (isSelected ? ' cart-row-selected' : '') + '" ' +
      'data-cart-idx="' + idx + '" ' +
      'onclick="selectCartRow(' + idx + ')" style="cursor:pointer;">' +
      '<td>' + escapeHTML(item.name) + '</td>' +
      '<td>' + item.price + '</td>' +
      '<td><input type="number" min="1" value="' + item.qty + '" style="width:60px" onclick="event.stopPropagation()" onchange="updateCartQty(' + idx + ', this.value)"></td>' +
      '<td>' + tot.toFixed(2) + '</td>' +
      '<td><button class="small-btn red" onclick="event.stopPropagation();removeFromCart(' + idx + ')">' + tr('delete_btn') + '</button></td>' +
      '</tr>';
  });
  html += '</tbody></table></div>';
  container.innerHTML = html;

  const discVal = parseFloat(document.getElementById('saleDiscount')?.value) || 0;
  const discType = document.getElementById('saleDiscountType')?.value || 'fixed';
  let discountAmount = discType === 'percent' ? (subtotal * discVal / 100) : discVal;
  discountAmount = Math.min(Math.max(0, discountAmount), subtotal);
  if (state.role === 'employee') {
    const perms = state.storeSettings.permissions || {};
    if (!perms.canDiscount) discountAmount = 0;
  }

  let pointsUsed = pointsInput ? (parseInt(pointsInput.value) || 0) : 0;
  if (!Number.isFinite(pointsUsed) || pointsUsed < 0) pointsUsed = 0;
  if (pointsUsed > availablePoints) { pointsUsed = availablePoints; pointsInput.value = pointsUsed; }
  const pointsDiscount = Math.max(0, Math.min(pointsUsed * pointValue, subtotal - discountAmount));

  const base = Math.max(0, subtotal - discountAmount - pointsDiscount);
  const vat = financeCore.calcVatForSale(base);
  const finalTotal = vat.total;

  const t = document.getElementById('cartTotal');
  if (t) {
    let totalText = finalTotal.toFixed(2) + ' ' + state.storeSettings.currency;
    if (pointsDiscount > 0) {
      const pDiscLabel = currentLang === 'en' ? 'Points: -' : 'نقاط: -';
      totalText += ' (' + pDiscLabel + pointsDiscount.toFixed(2) + ')';
    }
    if (vat.vat_amount > 0) {
      const vatLabel = currentLang === 'en' ? 'VAT' : 'ضريبة';
      totalText += ' [' + vatLabel + ': ' + vat.vat_amount.toFixed(2) + ']';
    }
    t.innerText = totalText;
  }

  const paidInput = document.getElementById('salePaid');
  if (cust && (cust.name === 'عميل نقدي عام' || cust.name === 'Cash Customer') && paidInput) {
    paidInput.value = finalTotal.toFixed(2);
  }

  if (state.cart.length === 0) {
    state.selectedCartIndex = -1;
  } else if (state.selectedCartIndex < 0 || state.selectedCartIndex >= state.cart.length) {
    state.selectedCartIndex = state.cart.length - 1;
  }

  updateMobileCartBar();
}

function updateCartQty(idx, val) {
  const raw = parseInt(val);
  const q = (!Number.isFinite(raw) || raw < 1) ? 1 : raw;
  const item = state.cart[idx];
  if (!item) return;
  const prod = state.products.find(function(p) { return p.id === item.id; });
  if (prod && q > prod.stock) {
    showNotification(tr('qty_exceeds_stock_1') + prod.stock + tr('qty_exceeds_stock_2'), 'error');
    playSound && playSound('error');
    _flashCart && _flashCart('error');
    renderCart();
    refocusCashierInput && refocusCashierInput();
    return;
  }
  state.cart[idx].qty = q;
  state.selectedCartIndex = idx;
  renderCart();
  refocusCashierInput && refocusCashierInput();
}

function removeFromCart(idx) {
  if (idx < 0 || idx >= state.cart.length) return;
  state.cart.splice(idx, 1);
  state.selectedCartIndex = state.cart.length > 0
    ? Math.min(idx, state.cart.length - 1)
    : -1;
  playSound && playSound('remove');
  renderCart();
  refocusCashierInput && refocusCashierInput();
}

function clearCart() {
  state.cart = [];
  state.selectedCartIndex = -1;
  const d = document.getElementById('saleDiscount'); if (d) d.value = 0;
  const p = document.getElementById('salePaid'); if (p) p.value = 0;
  const n = document.getElementById('saleNotes'); if (n) n.value = '';
  const pts = document.getElementById('salePointsUsed'); if (pts) pts.value = 0;
  renderCart();
  refocusCashierInput && refocusCashierInput();
}
/* ============================================================
   دالة مساعدة: ضمان وجود وردية مفتوحة
   ============================================================ */
async function ensureOpenShift() {
  const ownerId = (state.role === 'employee' && state.ownerId) ? state.ownerId : state.currentUser.id;

  if (state.currentShift && !state.currentShift.end_time && !state.currentShift.endTime) {
    return state.currentShift.id;
  }

  const openShift = (state.shifts || []).find(s => !s.end_time && !s.endTime);
  if (openShift) {
    state.currentShift = openShift;
    return openShift.id;
  }

  const newShiftId = uid('SHIFT');
  const newShift = {
    id: newShiftId, user_id: ownerId, cashier_name: state.currentUser.email,
    cashierName: state.currentUser.email, start_time: new Date().toISOString(),
    startTime: new Date().toISOString(), opening_cash: 0, openingCash: 0,
    expected_cash: 0, expectedCash: 0
  };

  if (navigator.onLine && supabaseClient) {
    try {
      const { error } = await supabaseClient.from('shifts').upsert({
        id: newShiftId, user_id: ownerId, cashier_name: newShift.cashier_name,
        start_time: newShift.start_time, opening_cash: 0
      }, { onConflict: 'id' });
      
      if (error) throw new Error((currentLang === 'en' ? 'Failed to save shift: ' : 'تعذر حفظ الوردية: ') + error.message);
    } catch (e) {
      console.error('Shift auto-open failed:', e);
      return null;
    }
  }

  if (!state.shifts) state.shifts = [];
  state.shifts.unshift(newShift);
  state.currentShift = newShift;
  return newShiftId;
}

function askRefundMethod(sale, soldItem, qty) {
  const baseReturn = (Number(soldItem.price) || 0) * qty;
  const saleVatRate = Number(sale.vat_rate) || 0;
  const saleVatMode = sale.vat_mode || 'inclusive';
  const vatSnap = financeCore.calcVatFromSnapshot(baseReturn, saleVatRate, saleVatMode);
  const total = vatSnap.total;
  const wasCredit = Number(sale.remaining) > 0;

  if (wasCredit) {
    const choice = confirm(
      tr('credit_return_confirm_1') + total.toFixed(2) + tr('credit_return_confirm_2') + '\n\n' +
      tr('credit_option') + '\n' +
      tr('cash_option')
    );
    return choice ? 'credit' : 'cash';
  }
  return 'cash';
}

/* ============================================================
   إتمام البيع
   ============================================================ */
async function completeSale() {
  if (window.isReadOnlyMode) return showNotification(tr('renew_sub_expense'), 'error');
  if (state.cart.length === 0) {
    playBeep(false);
    return showNotification(tr('empty_cart_err'), 'error');
  }

  showLoading(currentLang === 'en' ? 'Saving invoice...' : 'جارٍ حفظ الفاتورة...');
  await new Promise(function(resolve) { requestAnimationFrame(function() { resolve(); }); });

  let shiftId;
  try {
    shiftId = await ensureOpenShift();
  } catch (e) {
    hideLoading();
    return showNotification((currentLang === 'en' ? 'Failed to open shift: ' : 'تعذر فتح وردية: ') + (e.message || ''), 'error');
  }

  if (!shiftId) {
    hideLoading();
    return showNotification(tr('shift_create_fail'), 'error');
  }

  const subtotal = state.cart.reduce(function(sum, i) { return sum + i.price * i.qty; }, 0);
  const discVal = parseFloat(document.getElementById('saleDiscount').value) || 0;
  const discType = document.getElementById('saleDiscountType').value;
  let discountAmount = discType === 'percent' ? (subtotal * discVal / 100) : discVal;
  discountAmount = Math.min(Math.max(0, discountAmount), subtotal);
  if (state.role === 'employee') {
    const perms = state.storeSettings.permissions || {};
    if (!perms.canDiscount) discountAmount = 0;
  }

  const pointsInput = document.getElementById('salePointsUsed');
  let pointsUsed = pointsInput ? (parseInt(pointsInput.value) || 0) : 0;
  if (!Number.isFinite(pointsUsed) || pointsUsed < 0) pointsUsed = 0;
  const pointValue = state.storeSettings.pointValue || 0;
  const pointsDiscount = Math.max(0, Math.min(pointsUsed * pointValue, subtotal - discountAmount));

  const base = Math.max(0, subtotal - discountAmount - pointsDiscount);
  const vat = financeCore.calcVatForSale(base);
  const total = vat.total;

  const vatMode = state.storeSettings.vatMode || state.storeSettings.vat_mode || 'inclusive';
  const paidInput = document.getElementById('salePaid');
  const rawPaid = paidInput ? paidInput.value.trim() : '';
  let paid;
  if (rawPaid === '' || rawPaid === null) paid = total;
  else {
    const parsed = parseFloat(rawPaid);
    paid = Number.isFinite(parsed) ? Math.max(0, Math.min(parsed, total)) : total;
  }

  const customerId = document.getElementById('saleCustomer').value;
  const customer = state.customers.find(c => c.id === customerId);
  const isCashCustomer = customer && (customer.name === 'عميل نقدي عام' || customer.name === 'Cash Customer');
  const saleCustomerId = isCashCustomer ? null : customerId;

  if (isCashCustomer && paid < total) {
    hideLoading();
    return showNotification(tr('customer_must_pay_full'), 'error');
  }

  const payMethod = document.getElementById('salePayMethod').value;
  const notes = document.getElementById('saleNotes').value.trim();
  const ownerId = (state.role === 'employee' && state.ownerId) ? state.ownerId : state.currentUser.id;
  const remaining = Math.max(0, total - paid);

  const saleId = 'INV-' + new Date().getFullYear() + (new Date().getMonth()+1).toString().padStart(2,'0') + new Date().getDate().toString().padStart(2,'0') + '-' + Math.floor(Math.random() * 10000).toString().padStart(4, '0');

  const saleObj = {
    id: saleId, date: new Date().toISOString(), items: JSON.parse(JSON.stringify(state.cart)),
    subtotal: subtotal, discount: discountAmount, pointsDiscount: pointsDiscount,
    pointsUsed: pointsUsed, points_used: pointsUsed, total: total, paid: paid, remaining: remaining,
    returned_total: 0, returnedTotal: 0, net_total: total, netTotal: total,
    customer_id: isCashCustomer ? null : customerId, customerId: isCashCustomer ? null : customerId,
    pay_method: payMethod, payMethod: payMethod, notes: notes, cashier: state.currentUser.email,
    shift_id: shiftId, shiftId: shiftId, vat_rate: vat.vat_rate, vat_amount: vat.vat_amount, vat_mode: vatMode,
    _pendingUpload: true
  };

  enqueueSyncOperation('insert_sale', {
    id: saleObj.id, date: saleObj.date, subtotal: saleObj.subtotal, discount: saleObj.discount,
    total: saleObj.total, paid: saleObj.paid, points_used: pointsUsed, customer_id: saleCustomerId,
    pay_method: saleObj.payMethod, notes: saleObj.notes, cashier: saleObj.cashier, shift_id: shiftId,
    vat_rate: vat.vat_rate, vat_amount: vat.vat_amount, vat_mode: vatMode,
    items: saleObj.items.map(i => ({ id: i.id, name: i.name, qty: i.qty, price: i.price, cost: i.cost }))
  }, saleObj.id);

  state.sales.unshift(saleObj);

  if (!state.saleItems) state.saleItems = [];
  saleObj.items.forEach(i => {
    state.saleItems.push({
      id: uid('SI'), sale_id: saleObj.id, saleId: saleObj.id, user_id: ownerId,
      product_id: i.id, productId: i.id, product_name: i.name, productName: i.name,
      qty: i.qty, price: i.price, cost: i.cost
    });
  });

  state.cart.forEach(function(item) {
    const prod = state.products.find(function(p) { return p.id === item.id; });
    if (prod) prod.stock = Math.max(0, Number(prod.stock) - item.qty);
  });

  if (saleObj.customerId) {
    const cust = state.customers.find(c => c.id === saleObj.customerId);
    if (cust) {
      if (pointsUsed > 0) cust.points = Math.max(0, (Number(cust.points) || 0) - pointsUsed);
      const pointsRate = state.storeSettings.pointsRate || 0;
      if (pointsRate > 0) {
        const earnedPoints = Math.floor(total / pointsRate);
        if (earnedPoints > 0) {
          cust.points = (Number(cust.points) || 0) + earnedPoints;
          setTimeout(() => showNotification(tr('points_earned_1') + earnedPoints + tr('points_earned_2'), 'info'), 1500);
        }
      }
    }
  }

  if (saleObj.customerId && saleObj.remaining > 0) {
    state.customerBalances = state.customerBalances || {};
    state.customerBalances[saleObj.customerId] = (Number(state.customerBalances[saleObj.customerId]) || 0) + saleObj.remaining;
  }

  if (discountAmount > 0 && typeof addAuditLog === 'function') {
    addAuditLog('apply_discount', { saleId: saleObj.id, discount: discountAmount }, saleObj.id);
  }

  saveData();
  playBeep(true);
  showNotification(currentLang === 'en' ? 'Invoice saved successfully ✅' : 'تم حفظ الفاتورة بنجاح ✅');

  try {
    if (state.storeSettings.printType === 'a4') printInvoice(saleObj);
    else printThermalInvoice(saleObj.id);
  } catch (printErr) { console.warn('Print invoice failed:', printErr); }
  finally {
    clearCart();
    renderSales();
    renderDashboard();
    updateStockBadge();
    renderProducts();
    renderStockMoves();
    renderShifts();
    renderCustomers();
    populateSalesDropdowns();
    state.selectedCartIndex = -1;
    refocusCashierInput();
    hideLoading();
  }
}

function renderSales() {
  const container = document.getElementById('salesTable');
  if (!container) return;

  const searchInput = document.getElementById('salesSearch');
  const fromInput = document.getElementById('salesFrom');
  const toInput = document.getElementById('salesTo');
  const search = (searchInput ? searchInput.value : '').toLowerCase();
  const from = fromInput ? fromInput.value : '';
  const to = toInput ? toInput.value : '';

  const filtered = state.sales.filter(function(s) {
    const custId = s.customer_id || s.customerId;
    const cust = state.customers.find(function(c) { return c.id === custId; });
    const haystack = (s.id + ' ' + (cust ? cust.name : '') + ' ' + (s.notes || '')).toLowerCase();
    const matchSearch = haystack.indexOf(search) !== -1;
    const sDate = (s.date || '').split('T')[0];
    let matchDate = true;
    if (from && sDate < from) matchDate = false;
    if (to && sDate > to) matchDate = false;
    return matchSearch && matchDate;
  });

  if (filtered.length === 0) {
    container.innerHTML = '<p class="text-muted">' + tr('empty_invoices') + '</p>';
    return;
  }

  const en = currentLang === 'en';
  const payLabels = { cash: en ? 'Cash' : 'نقدي', visa: en ? 'Visa' : 'فيزا', transfer: en ? 'Transfer' : 'تحويل', card: en ? 'Card' : 'بطاقة' };

  let html = '<div class="table-wrap"><table class="data-table"><thead><tr><th data-i18n="th_invoice_number">رقم الفاتورة</th><th data-i18n="th_date">التاريخ</th><th data-i18n="th_customer">العميل</th><th data-i18n="th_total">الإجمالي</th><th data-i18n="th_paid">المدفوع</th><th data-i18n="th_remaining">المتبقي</th><th data-i18n="th_payment_method">طريقة الدفع</th><th data-i18n="th_action">إجراء</th></tr></thead><tbody>';
  filtered.forEach(function(s) {
    const custId = s.customer_id || s.customerId;
    const cust = state.customers.find(function(c) { return c.id === custId; });
    const payMethod = s.pay_method || s.payMethod;
    const payText = payLabels[payMethod] || payMethod || '-';
    const totalNum = Number(s.total) || 0;
    const paidNum = Number(s.paid) || 0;
    const remainingNum = Number(s.remaining) || 0;
    html += '<tr>' +
      '<td>' + escapeHTML(s.id) + '</td>' +
      '<td>' + new Date(s.date).toLocaleString(currentLang === 'en' ? 'en-US' : 'ar-EG') + '</td>' +
      '<td>' + (cust ? escapeHTML(cust.name) : tr('cash_label')) + '</td>' +
      '<td>' + totalNum.toFixed(2) + '</td>' +
      '<td>' + paidNum.toFixed(2) + '</td>' +
      '<td class="' + (remainingNum > 0 ? 'red-text' : '') + '">' + remainingNum.toFixed(2) + '</td>' +
      '<td>' + escapeHTML(payText) + '</td>' +
      '<td style="white-space: nowrap;">' +
        '<button class="small-btn orange" onclick="printThermalInvoice(\'' + s.id + '\')" title="' + (currentLang === 'en' ? 'Print' : 'طباعة') + '">🧾</button>' +
        '<div class="action-dropdown">' +
          '<button class="small-btn grey" onclick="toggleActionMenu(event, \'' + s.id + '\')" title="' + (currentLang === 'en' ? 'Options' : 'خيارات') + '">⋮</button>' +
          '<div id="menu-' + s.id + '" class="action-dropdown-menu">' +
            '<button onclick="sendInvoiceWhatsApp(\'' + s.id + '\')">💬 ' + (currentLang === 'en' ? 'Send WhatsApp' : 'إرسال واتساب') + '</button>' +
            '<button onclick="initiateReturnFromSale(\'' + s.id + '\')">🔄 ' + tr('tab_returns') + '</button>' +
            '<button class="text-danger" onclick="safeDeleteRecord(\'sale\', \'' + s.id + '\')">🗑️ ' + (currentLang === 'en' ? 'Delete Invoice' : 'حذف الفاتورة') + '</button>' +
          '</div>' +
        '</div>' +
      '</td>' +
      '</tr>';
  });
  html += '</tbody></table></div>';
  container.innerHTML = html;
}

function safeDeleteRecord(type, id) {
  if (state.role === 'employee') {
    const perms = state.storeSettings.permissions || {};
    if (!perms.canDelete) return showNotification(tr('manager_only'), 'warning');
  }

  showCustomConfirm(tr('delete_sale_confirm_title'), tr('msg_delete_mistake'), () => {
    executeDeleteRecord(type, id);
  });
}

async function executeDeleteRecord(type, id) {
  const ownerId = (state.role === 'employee' && state.ownerId) ? state.ownerId : state.currentUser.id;

  if (type === 'sale') {
    const idx = state.sales.findIndex(function(s) { return s.id === id; });
    if (idx === -1) return;
    const s = state.sales[idx];

    enqueueSyncOperation('delete_sale', { id }, id);

    s.items.forEach(function(item) {
      const prod = state.products.find(function(p) { return p.id === item.id; });
      if (prod) prod.stock += item.qty;
    });

    state.sales.splice(idx, 1);
    if (state.saleItems) state.saleItems = state.saleItems.filter(si => si.sale_id !== id && si.saleId !== id);

    if (typeof addAuditLog === 'function') addAuditLog('delete_sale', { saleId: s.id, total: s.total }, s.id);

  } else if (type === 'expense') {
    const exp = state.expenses.find(function(e) { return e.id === id; });
    state.expenses = state.expenses.filter(function(e) { return e.id !== id; });
    enqueueSyncOperation('delete_expense', { id }, id);
    if (exp && typeof addAuditLog === 'function') addAuditLog('delete_expense', { expenseId: exp.id, amount: exp.amount }, exp.id);

  } else if (type === 'purchase') {
    const idx = state.purchases.findIndex(function(p) { return p.id === id; });
    if (idx !== -1) {
      const p = state.purchases[idx];
      const prod = state.products.find(function(pr) { return pr.id === (p.product_id || p.productId); });
      if (prod) {
        prod.stock = Math.max(0, Number(prod.stock) - p.qty);
        if (navigator.onLine && supabaseClient) await supabaseClient.from('products').update({ stock: prod.stock }).eq('id', prod.id);
      }
      if (navigator.onLine && supabaseClient) await supabaseClient.from('purchases').delete().eq('id', id);
      state.purchases.splice(idx, 1);
      if (typeof addAuditLog === 'function') addAuditLog('delete_purchase', { purchaseId: p.id }, p.id);
    }
  }

  saveData();
  renderAll();
  showNotification(tr('delete_success'));
}

function clearTableLog(logType) {
  if (state.role === 'employee') {
    const perms = state.storeSettings.permissions || {};
    if (!perms.canDelete) return showNotification(tr('manager_only'), 'warning');
  }
  if (!confirm(tr('msg_clear_log'))) return;

  let clearedCount = 0;
  if (logType === 'sales') { clearedCount = state.sales.length; state.sales = []; state.saleItems = []; }
  else if (logType === 'expenses') { clearedCount = state.expenses.length; state.expenses = []; }

  if (typeof addAuditLog === 'function') addAuditLog('clear_table_log', { logType: logType, clearedCount: clearedCount }, logType);

  saveData();
  renderAll();
  showNotification(tr('log_cleared'));
}

/* ════════════════════════════════════════════════════════════
   ✅ v7.10 — Mobile Cart Bottom Sheet Logic & Init
   ════════════════════════════════════════════════════════════ */
let _mcbTouchStartY = 0;
let _mcbTouchCurrentY = 0;
let _mcbDragActive = false;

function _isMobileView() { return window.matchMedia('(max-width: 768px)').matches; }
function _lockBodyScroll(lock) { document.body.style.overflow = lock ? 'hidden' : ''; }

function bindMobileCartSwipe() {
  const header = document.querySelector('.cart-header');
  if (!header || header._swipeBound) return;
  header._swipeBound = true;

  header.addEventListener('touchstart', function(e) {
    if (!_isMobileView()) return;
    _mcbTouchStartY = e.touches[0].clientY;
    _mcbDragActive = true;
    const c = document.getElementById('cartArea');
    if (c) c.style.transition = 'none';
  }, { passive: true });

  header.addEventListener('touchmove', function(e) {
    if (!_mcbDragActive) return;
    _mcbTouchCurrentY = e.touches[0].clientY;
    const delta = Math.max(0, _mcbTouchCurrentY - _mcbTouchStartY);
    const c = document.getElementById('cartArea');
    if (c) c.style.transform = 'translateY(' + delta + 'px)';
  }, { passive: true });

  header.addEventListener('touchend', function() {
    if (!_mcbDragActive) return;
    _mcbDragActive = false;
    const delta = _mcbTouchCurrentY - _mcbTouchStartY;
    const c = document.getElementById('cartArea');
    if (!c) return;
    c.style.transition = '';
    if (delta > 80) closeMobileCart();
    else c.style.transform = '';
  });

  header.addEventListener('touchcancel', function() {
    _mcbDragActive = false;
    const c = document.getElementById('cartArea');
    if (c) { c.style.transform = ''; c.style.transition = ''; }
  });
}

document.addEventListener('keydown', function(e) {
  if (e.key !== 'Escape') return;
  const cart = document.getElementById('cartArea');
  if (cart && cart.classList.contains('open')) {
    e.preventDefault();
    closeMobileCart();
  }
});

let _resizeTimer = null;
let _lastIsMobile = null;

function handleViewportChange() {
  const nowMobile = _isMobileView();
  if (_lastIsMobile !== null && _lastIsMobile !== nowMobile) {
    const cart = document.getElementById('cartArea');
    if (cart) { cart.classList.remove('open'); cart.style.transform = ''; cart.style.transition = ''; }
    const bd = document.getElementById('mobileCartBackdrop');
    if (bd) bd.classList.remove('show');
    _lockBodyScroll(false);
  }
  _lastIsMobile = nowMobile;
  updateMobileCartBar();
}

function initResizeHandler() {
  if (window._v710ResizeBound) return;
  window._v710ResizeBound = true;
  _lastIsMobile = _isMobileView();
  window.addEventListener('resize', function() {
    clearTimeout(_resizeTimer);
    _resizeTimer = setTimeout(handleViewportChange, 150);
  });
  window.addEventListener('orientationchange', function() {
    setTimeout(handleViewportChange, 300);
  });
}

function initSalesWorkspaceV710() {
  try { bindProductSearch(); } catch (e) { console.warn('bindProductSearch:', e); }
  try { bindMobileCartSwipe(); } catch (e) { console.warn('bindMobileCartSwipe:', e); }
  try { initResizeHandler(); } catch (e) { console.warn('initResizeHandler:', e); }

  const page = document.getElementById('sales');
  if (page && page.style.display !== 'none') {
    try { populateSalesDropdowns(); } catch (e) { console.warn('populate:', e); }
  }

  const custSel = document.getElementById('saleCustomer');
  if (custSel && !custSel._v710Bound) {
    custSel._v710Bound = true;
    custSel.addEventListener('change', renderCart);
  }

  ['saleDiscount', 'saleDiscountType', 'salePointsUsed'].forEach(function(id) {
    const el = document.getElementById(id);
    if (el && !el._v710Bound) {
      el._v710Bound = true;
      el.addEventListener('input', renderCart);
      el.addEventListener('change', renderCart);
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() { setTimeout(initSalesWorkspaceV710, 400); });
} else {
  setTimeout(initSalesWorkspaceV710, 400);
}