/* ============ 2. المبيعات ============ */
function populateSalesDropdowns() {
  const prodSelect = document.getElementById('saleProduct');
  const custSelect = document.getElementById('saleCustomer');
  if (!prodSelect || !custSelect) return;

  prodSelect.innerHTML = '<option value="">' + tr('opt_select_product') + '</option>';
  state.products.forEach(function(p) {
    prodSelect.innerHTML += '<option value="' + p.id + '">' + escapeHTML(p.name) + (currentLang === 'en' ? ' (Stock: ' : ' (مخزن: ') + p.stock + ') - ' + p.price + ' ' + state.storeSettings.currency + '</option>';
  });

  custSelect.innerHTML = '';
  if (!state.customers.length) state.customers.push({ id: uid('CUST'), name: (translations[currentLang] || translations.ar).cash_customer, phone: '-', openingDebt: 0 });
  state.customers.forEach(function(c) {
    const isCashCustomer = c.name === 'عميل نقدي عام' || c.name === 'Cash Customer';
    const displayName = isCashCustomer ? (translations[currentLang] || translations.ar).cash_customer : c.name;
    const pointsLabel = (c.points && c.points > 0) ? ' (💎 ' + c.points + ' نقطة)' : '';
custSelect.innerHTML += '<option value="' + c.id + '">' + escapeHTML(displayName) + pointsLabel + '</option>';
  });
}

function addToCartManual() {
  const prodId = document.getElementById('saleProduct').value;
  const qty = parseInt(document.getElementById('saleQty').value) || 1;
  if (!prodId) return showNotification(tr('notify_select_product'), 'error');

  const product = state.products.find(function(p) { return p.id === prodId; });
  if (!product) return;
  if (qty > product.stock) return showNotification('الكمية تتجاوز المخزون!', 'error');

  const existing = state.cart.find(function(item) { return item.id === product.id; });
  if (existing) {
    if (existing.qty + qty > product.stock) return showNotification('الكمية تتجاوز المخزون!', 'error');
    existing.qty += qty;
  } else {
    state.cart.push({ id: product.id, name: product.name, price: product.price, cost: product.cost, qty: qty });
  }
  document.getElementById('saleQty').value = 1;
  playBeep(true);
  renderCart();
}

function renderCart() {
  const container = document.getElementById('cartTable');
  if (!container) return;

  const custId = document.getElementById('saleCustomer').value;
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
    container.innerHTML = '<p class="text-muted">سلة المبيعات فارغة.</p>';
    const t = document.getElementById('cartTotal');
    if (t) t.innerText = tr('invoice_total') + ': 0.00 ' + state.storeSettings.currency;
    return;
  }

  let html = '<div class="table-wrap"><table class="data-table"><thead><tr><th data-i18n="th_item">الصنف</th><th data-i18n="th_price">السعر</th><th data-i18n="th_quantity">الكمية</th><th data-i18n="th_total">الإجمالي</th><th data-i18n="th_action">إجراء</th></tr></thead><tbody>';
  let subtotal = 0;
  state.cart.forEach(function(item, idx) {
    const tot = item.price * item.qty;
    subtotal += tot;
    html += '<tr>' +
      '<td>' + escapeHTML(item.name) + '</td>' +
      '<td>' + item.price + '</td>' +
      '<td><input type="number" min="1" value="' + item.qty + '" style="width:70px" onchange="updateCartQty(' + idx + ', this.value)"></td>' +
      '<td>' + tot.toFixed(2) + '</td>' +
      '<td><button class="small-btn red" onclick="removeFromCart(' + idx + ')">حذف</button></td>' +
      '</tr>';
  });
  html += '</tbody></table></div>';
  container.innerHTML = html;

  const discVal = parseFloat(document.getElementById('saleDiscount').value) || 0;
  const discType = document.getElementById('saleDiscountType').value;
  let discountAmount = discType === 'percent' ? (subtotal * discVal / 100) : discVal;
  // [إصلاح] clamp الخصم عشان ميتجاوزش subtotal
  discountAmount = Math.min(Math.max(0, discountAmount), subtotal);
if (state.role === 'employee') {
  const perms = state.storeSettings.permissions || {};
  if (!perms.canDiscount) discountAmount = 0;
}
  
  let pointsUsed = pointsInput ? (parseInt(pointsInput.value) || 0) : 0;
  // [إصلاح] حماية pointsUsed من NaN والسالب
  if (!Number.isFinite(pointsUsed) || pointsUsed < 0) pointsUsed = 0;
  if (pointsUsed > availablePoints) { pointsUsed = availablePoints; pointsInput.value = pointsUsed; }
  const pointsDiscount = Math.max(0, Math.min(pointsUsed * pointValue, subtotal - discountAmount));

  const finalTotal = Math.max(0, subtotal - discountAmount - pointsDiscount);

  const t = document.getElementById('cartTotal');
  if (t) {
    let totalText = tr('invoice_total') + ': ' + finalTotal.toFixed(2) + ' ' + state.storeSettings.currency;
    if (pointsDiscount > 0) totalText += ' (خصم نقاط: -' + pointsDiscount.toFixed(2) + ')';
    t.innerText = totalText;
  }
}

function updateCartQty(idx, val) {
  const raw = parseInt(val);
  // [إصلاح] رفض القيم السالبة والصفر و NaN
  const q = (!Number.isFinite(raw) || raw < 1) ? 1 : raw;
  const item = state.cart[idx];
  if (!item) return;
  const prod = state.products.find(function(p) { return p.id === item.id; });
  if (prod && q > prod.stock) {
    showNotification('الكمية تتجاوز المخزون!', 'error');
    renderCart();
    return;
  }
  state.cart[idx].qty = q;
  renderCart();
}

function removeFromCart(idx) {
  state.cart.splice(idx, 1);
  renderCart();
}

function clearCart() {
  state.cart = [];
  const d = document.getElementById('saleDiscount'); if (d) d.value = 0;
  const p = document.getElementById('salePaid'); if (p) p.value = 0;
  const n = document.getElementById('saleNotes'); if (n) n.value = '';
  renderCart();
  const pts = document.getElementById('salePointsUsed'); if (pts) pts.value = 0;
}

async function completeSale() {
  if (window.isReadOnlyMode) return showNotification('جدد اشتراكك أولاً لتتمكن من البيع', 'error');

  if (state.cart.length === 0) {
    playBeep(false);
    return showNotification('السلة فارغة!', 'error');
  }

  showLoading(currentLang === 'en' ? 'Saving invoice...' : 'جارٍ حفظ الفاتورة...');
  await new Promise(function(resolve) { requestAnimationFrame(function() { resolve(); }); });
  const subtotal = state.cart.reduce(function(sum, i) { return sum + i.price * i.qty; }, 0);
  const discVal = parseFloat(document.getElementById('saleDiscount').value) || 0;
  const discType = document.getElementById('saleDiscountType').value;
  let discountAmount = discType === 'percent' ? (subtotal * discVal / 100) : discVal;
  // [إصلاح] clamp الخصم
  discountAmount = Math.min(Math.max(0, discountAmount), subtotal);
if (state.role === 'employee') {
  const perms = state.storeSettings.permissions || {};
  if (!perms.canDiscount) discountAmount = 0;
}
  const pointsInput = document.getElementById('salePointsUsed');
let pointsUsed = pointsInput ? (parseInt(pointsInput.value) || 0) : 0;
// [إصلاح] حماية NaN والسالب
if (!Number.isFinite(pointsUsed) || pointsUsed < 0) pointsUsed = 0;
const pointValue = state.storeSettings.pointValue || 0;
const pointsDiscount = Math.max(0, Math.min(pointsUsed * pointValue, subtotal - discountAmount));

const total = Math.max(0, subtotal - discountAmount - pointsDiscount);
  const paidInput = document.getElementById('salePaid');
  const rawPaid = paidInput ? paidInput.value.trim() : '';
  // [إصلاح] نفرق بين "فاضي" (يعني دفع كامل) و "0" (يعني آجل بالكامل)
  let paid;
  if (rawPaid === '' || rawPaid === null) {
    paid = total;
  } else {
    const parsed = parseFloat(rawPaid);
    paid = Number.isFinite(parsed) ? Math.max(0, Math.min(parsed, total)) : total;
  }
  const customerId = document.getElementById('saleCustomer').value;
  const payMethod = document.getElementById('salePayMethod').value;
  const notes = document.getElementById('saleNotes').value.trim();

  if (!state.currentShift) {
    state.currentShift = {
      id: uid('SHIFT'),
      name: 'وردية تلقائية',
      cashierName: state.currentUser ? state.currentUser.email : '',
      startTime: new Date().toISOString()
    };
  }

  state.cart.forEach(function(item) {
    const prod = state.products.find(function(p) { return p.id === item.id; });
    if (prod) {
      const before = prod.stock;
      prod.stock -= item.qty;
      state.stockMoves.unshift({
        id: uid('SM'),
        date: new Date().toISOString(),
        productId: prod.id,
        productName: prod.name,
        type: 'out',
        qty: item.qty,
        oldStock: before,
        newStock: prod.stock,
        reason: 'بيع'
      });
    }
  });

  const saleObj = {
 id: 'INV-' + new Date().getFullYear() + (new Date().getMonth()+1).toString().padStart(2,'0') + new Date().getDate().toString().padStart(2,'0') + '-' + Math.floor(Math.random() * 10000).toString().padStart(4, '0'),
    date: new Date().toISOString(),
    items: JSON.parse(JSON.stringify(state.cart)),
    subtotal: subtotal,
    discount: discountAmount,
    pointsDiscount: pointsDiscount,
    pointsUsed: pointsUsed,
    total: total,
    paid: paid,
    remaining: Math.max(0, total - paid),
    customerId: customerId,
    payMethod: payMethod,
    notes: notes,
    cashier: state.currentUser ? state.currentUser.email : '',
    shiftId: state.currentShift ? state.currentShift.id : null
  };

  state.sales.unshift(saleObj);

// حفظ الفاتورة في جدول المبيعات المنفصل
if (navigator.onLine && supabaseClient) {
  const cacheOwnerId = (state.role === 'employee' && state.ownerId) ? state.ownerId : state.currentUser.id;
  supabaseClient.from('sales').insert({
    id: saleObj.id,
    user_id: cacheOwnerId,
    date: saleObj.date,
    items: saleObj.items,
    subtotal: saleObj.subtotal,
    discount: saleObj.discount,
    total: saleObj.total,
    paid: saleObj.paid,
    remaining: saleObj.remaining,
    customer_id: saleObj.customerId,
    pay_method: saleObj.payMethod,
    notes: saleObj.notes,
    cashier: saleObj.cashier,
    shift_id: saleObj.shiftId
  }).then(({error}) => { if(error) console.error('Sales Sync Error:', error); });
}

  if (saleObj.remaining > 0 && customerId) {
    const cust = state.customers.find(function(c) { return c.id === customerId; });
    if (cust) cust.openingDebt = (Number(cust.openingDebt) || 0) + saleObj.remaining;
  }
  // 💎 برنامج الولاء
if (customerId) {
  const cust = state.customers.find(c => c.id === customerId);
  if (cust && cust.name !== 'عميل نقدي عام') {
    if (!cust.points) cust.points = 0;
    cust.points = Math.max(0, cust.points - pointsUsed);
    
    const pointsRate = state.storeSettings.pointsRate || 0;
    if (pointsRate > 0) {
      const earnedPoints = Math.floor(total / pointsRate);
      if (earnedPoints > 0) {
        cust.points += earnedPoints;
        setTimeout(() => showNotification('💎 العميل كسب ' + earnedPoints + ' نقطة!', 'info'), 1500);
      }
    }
  }
}

  // [البند 5] سجل النشاط للخصم
  if (discountAmount > 0 && typeof addAuditLog === 'function') {
    addAuditLog('apply_discount', {
      saleId: saleObj.id,
      discount: discountAmount,
      subtotal: subtotal,
      total: total,
      customerId: customerId
    }, saleObj.id);
  }

await uploadToCloud();
  saveData();
  playBeep(true);
  showNotification('تم حفظ الفاتورة بنجاح ✅');

  try {
    if (state.storeSettings.printType === 'a4') {
  printInvoice(saleObj);
} else {
  printThermalInvoice(saleObj.id);
}
  } catch (printErr) {
    console.warn('Print invoice failed:', printErr);
  } finally {
    clearCart();
    renderSales();
    renderDashboard();
    updateStockBadge();
    renderProducts();
    renderStockMoves();
    renderShifts();
    renderCustomers();
    renderCustomerPayments();
    populateSalesDropdowns();
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
    const cust = state.customers.find(function(c) { return c.id === s.customerId; });
    const haystack = (s.id + ' ' + (cust ? cust.name : '') + ' ' + (s.notes || '')).toLowerCase();
    const matchSearch = haystack.indexOf(search) !== -1;
    const sDate = (s.date || '').split('T')[0];
    let matchDate = true;
    if (from && sDate < from) matchDate = false;
    if (to && sDate > to) matchDate = false;
    return matchSearch && matchDate;
  });

  if (filtered.length === 0) {
    container.innerHTML = '<p class="text-muted">لا توجد فواتير مسجلة.</p>';
    return;
  }

  const en = currentLang === 'en';
  const payLabels = {
    cash: en ? 'Cash' : 'نقدي',
    visa: en ? 'Visa' : 'فيزا',
    transfer: en ? 'Transfer' : 'تحويل',
    card: en ? 'Card' : 'بطاقة'
  };

  let html = '<div class="table-wrap"><table class="data-table"><thead><tr><th data-i18n="th_invoice_number">رقم الفاتورة</th><th data-i18n="th_date">التاريخ</th><th data-i18n="th_customer">العميل</th><th data-i18n="th_total">الإجمالي</th><th data-i18n="th_paid">المدفوع</th><th data-i18n="th_remaining">المتبقي</th><th data-i18n="th_payment_method">طريقة الدفع</th><th data-i18n="th_action">إجراء</th></tr></thead><tbody>';
  filtered.forEach(function(s) {
    const cust = state.customers.find(function(c) { return c.id === s.customerId; });
    const payText = payLabels[s.payMethod] || s.payMethod || '-';
    // [إصلاح] Number() بدل .toFixed مباشرة
    const totalNum = Number(s.total) || 0;
    const paidNum = Number(s.paid) || 0;
    const remainingNum = Number(s.remaining) || 0;
    html += '<tr>' +
  '<td>' + escapeHTML(s.id) + '</td>' +
  '<td>' + new Date(s.date).toLocaleString(currentLang === 'en' ? 'en-US' : 'ar-EG') + '</td>' +
  '<td>' + (cust ? escapeHTML(cust.name) : 'نقدي') + '</td>' +
  '<td>' + totalNum.toFixed(2) + '</td>' +
  '<td>' + paidNum.toFixed(2) + '</td>' +
  '<td class="' + (remainingNum > 0 ? 'red-text' : '') + '">' + remainingNum.toFixed(2) + '</td>' +
  '<td>' + escapeHTML(payText) + '</td>' +
  '<td style="white-space: nowrap;">' +
    '<button class="small-btn orange" onclick="printThermalInvoice(\'' + s.id + '\')" title="طباعة">🧾</button>' +
    '<div class="action-dropdown">' +
      '<button class="small-btn grey" onclick="toggleActionMenu(event, \'' + s.id + '\')" title="خيارات">⋮</button>' +
      '<div id="menu-' + s.id + '" class="action-dropdown-menu">' +
        '<button onclick="sendInvoiceWhatsApp(\'' + s.id + '\')">💬 إرسال واتساب</button>' +
        '<button onclick="initiateReturnFromSale(\'' + s.id + '\')">🔄 تسجيل مرتجع</button>' +
        '<button class="text-danger" onclick="safeDeleteRecord(\'sale\', \'' + s.id + '\')">🗑️ حذف الفاتورة</button>' +
      '</div>' +
    '</div>' +
  '</td>' +
  '</tr>';
      
  });
  html += '</tbody></table></div>';
  container.innerHTML = html;
}

/* ============ إدارة الحذف الآمن ============ */
function safeDeleteRecord(type, id) {
  // [إصلاح] قراءة الصلاحيات من إعدادات المحل بدل الحماية الثابتة للمدير فقط
  if (state.role === 'employee') {
    const perms = state.storeSettings.permissions || {};
    if (!perms.canDelete) {
      return showNotification('هذه العملية للمدير فقط (الموظف غير مسموح له بالحذف)', 'warning');
    }
  }
  
  showCustomConfirm('تأكيد الحذف', tr('msg_delete_mistake'), () => {
    executeDeleteRecord(type, id);
  });
}

function executeDeleteRecord(type, id) {
  if (type === 'sale') {
    const idx = state.sales.findIndex(function(s) { return s.id === id; });
    if (idx === -1) return;
    const s = state.sales[idx];
    
    s.items.forEach(function(item) {
      const prod = state.products.find(function(p) { return p.id === item.id; });
      if (prod) {
        const before = prod.stock;
        prod.stock += item.qty;
        state.stockMoves.unshift({
          id: uid('SM'), date: new Date().toISOString(),
          productId: prod.id, productName: prod.name,
          type: 'in', qty: item.qty, oldStock: before, newStock: prod.stock,
          reason: 'تصحيح خطأ إدخال - حذف فاتورة ' + s.id
        });
      }
    });

    if (s.customerId) {
      const cust = state.customers.find(function(c) { return c.id === s.customerId; });
      if (cust) cust.openingDebt = Math.max(0, (Number(cust.openingDebt) || 0) - (Number(s.remaining) || 0));
    }

    if (state.currentShift && s.shiftId === state.currentShift.id) {
      setTimeout(function() { calcExpectedShiftCash(); }, 50);
    }

    const closedShift = state.shifts.find(function(sh) { return sh.id === s.shiftId; });
    if (closedShift) {
      closedShift.totalSales = Math.max(0, (Number(closedShift.totalSales) || 0) - (Number(s.total) || 0));
      closedShift.saleCount = Math.max(0, (Number(closedShift.saleCount) || 0) - 1);
      if (s.payMethod === 'cash') closedShift.cashSales = Math.max(0, (Number(closedShift.cashSales) || 0) - (Number(s.paid) || 0));
      // [إصلاح] نفس منطق closeShift: نخصم drawerExpenses قبل حساب difference
      const drawerExp = Number(closedShift.drawerExpenses) || 0;
      const expectedCash = Math.max(0, (Number(closedShift.cashSales) || 0) - drawerExp);
      closedShift.difference = (Number(closedShift.actualCash) || 0) - expectedCash;
    }
    state.sales.splice(idx, 1);
    
    if (navigator.onLine && supabaseClient) {
      supabaseClient.from('sales').delete().eq('id', id).then();
    }

    // [إصلاح البند 5] سجل حذف فاتورة
    if (typeof addAuditLog === 'function') {
      addAuditLog('delete_sale', {
        saleId: s.id,
        total: s.total,
        paid: s.paid,
        customerId: s.customerId,
        itemsCount: s.items ? s.items.length : 0
      }, s.id);
    }
    
  } else if (type === 'expense') {
    const exp = state.expenses.find(function(e) { return e.id === id; });
    state.expenses = state.expenses.filter(function(e) { return e.id !== id; });

    // [إصلاح البند 5] سجل حذف مصروف
    if (exp && typeof addAuditLog === 'function') {
      addAuditLog('delete_expense', {
        expenseId: exp.id,
        name: exp.name,
        amount: exp.amount
      }, exp.id);
    }
  } else if (type === 'purchase') {
    const idx = state.purchases.findIndex(function(p) { return p.id === id; });
    if (idx !== -1) {
      const p = state.purchases[idx];
      const prod = state.products.find(function(pr) { return pr.id === p.productId; });
      if (prod) {
        prod.stock = Math.max(0, prod.stock - p.qty);
      }
      state.purchases.splice(idx, 1);

      // [إصلاح البند 5] سجل حذف مشتريات
      if (typeof addAuditLog === 'function') {
        addAuditLog('delete_purchase', {
          purchaseId: p.id,
          productId: p.productId,
          qty: p.qty,
          total: p.total
        }, p.id);
      }
    }
  }

  saveData();
  renderAll();
  showNotification('تم حذف العملية وتعديل التأثير بنجاح ✅');
}

function clearTableLog(logType) {
 if (state.role === 'employee') {
  const perms = state.storeSettings.permissions || {};
  if (!perms.canDelete) return showNotification('هذه العملية للمدير فقط', 'warning');
}
  if (!confirm(tr('msg_clear_log'))) return;

  let clearedCount = 0;
  if (logType === 'sales') { clearedCount = state.sales.length; state.sales = []; }
  else if (logType === 'expenses') { clearedCount = state.expenses.length; state.expenses = []; }
  else if (logType === 'purchases') { clearedCount = state.purchases.length; state.purchases = []; }

  // [إصلاح البند 5] سجل تصفير جماعي
  if (typeof addAuditLog === 'function') {
    addAuditLog('clear_table_log', {
      logType: logType,
      clearedCount: clearedCount
    }, logType);
  }

  saveData();
  renderAll();
  showNotification('تم تصفير السجل بنجاح ✅');
}