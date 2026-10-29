/* ============ 2. المبيعات ============ */
function populateSalesDropdowns() {
  const prodSelect = document.getElementById('saleProduct');
  const custSelect = document.getElementById('saleCustomer');
  if (!prodSelect || !custSelect) return;

  prodSelect.innerHTML = '<option value="">' + tr('opt_select_product') + '</option>';
  state.products.forEach(function(p) {
    prodSelect.innerHTML += '<option value="' + p.id + '">' + escapeHTML(p.name) + (currentLang === 'en' ? ' (Stock: ' : ' (مخزن: ') + (Number(p.stock) || 0) + ') - ' + (Number(p.price) || 0) + ' ' + state.storeSettings.currency + '</option>';
  });

  custSelect.innerHTML = '';
  if (!state.customers || !state.customers.length) {
    state.customers = [{ id: 'CASH-CUSTOMER', name: (translations[currentLang] || translations.ar).cash_customer, phone: '-', openingDebt: 0 }];
  }
  state.customers.forEach(function(c) {
    const isCashCustomer = c.name === 'عميل نقدي عام' || c.name === 'Cash Customer';
    const displayName = isCashCustomer ? (translations[currentLang] || translations.ar).cash_customer : c.name;
    const pointsLabel = (c.points && c.points > 0) ? ' (💎 ' + c.points + ' نقطة)' : '';
    custSelect.innerHTML += '<option value="' + c.id + '">' + escapeHTML(displayName) + pointsLabel + '</option>';
  });

  // استدعاء دالة العرض عشان تظبط المدفوع لو أول عميل نقدي
  renderCart();
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
    state.cart.push({ id: product.id, name: product.name, price: Number(product.price), cost: Number(product.cost), qty: qty });
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
  discountAmount = Math.min(Math.max(0, discountAmount), subtotal);
  if (state.role === 'employee') {
    const perms = state.storeSettings.permissions || {};
    if (!perms.canDiscount) discountAmount = 0;
  }
  
  let pointsUsed = pointsInput ? (parseInt(pointsInput.value) || 0) : 0;
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

  // ملء المدفوع تلقائياً للعميل النقدي
  const paidInput = document.getElementById('salePaid');
  if (cust && (cust.name === 'عميل نقدي عام' || cust.name === 'Cash Customer') && paidInput) {
      paidInput.value = finalTotal.toFixed(2);
  }
}

function updateCartQty(idx, val) {
  const raw = parseInt(val);
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
  const total = Math.max(0, subtotal - discountAmount - pointsDiscount);
  
  const paidInput = document.getElementById('salePaid');
  const rawPaid = paidInput ? paidInput.value.trim() : '';
  let paid;
  if (rawPaid === '' || rawPaid === null) {
    paid = total;
  } else {
    const parsed = parseFloat(rawPaid);
    paid = Number.isFinite(parsed) ? Math.max(0, Math.min(parsed, total)) : total;
  }
  
  const customerId = document.getElementById('saleCustomer').value;
  const customer = state.customers.find(c => c.id === customerId);
  
  if (customer && (customer.name === 'عميل نقدي عام' || customer.name === 'Cash Customer') && paid < total) {
    hideLoading();
    return showNotification('العميل النقدي يجب أن يدفع كامل المبلغ.', 'error');
  }

  const payMethod = document.getElementById('salePayMethod').value;
  const notes = document.getElementById('saleNotes').value.trim();
  const ownerId = (state.role === 'employee' && state.ownerId) ? state.ownerId : state.currentUser.id;

  if (!state.currentShift) {
    state.currentShift = { id: uid('SHIFT'), name: 'وردية تلقائية', cashierName: state.currentUser.email, startTime: new Date().toISOString() };
    
    // رفع الوردية للسيرفر أول ما تفتح تلقائي
    if (navigator.onLine && supabaseClient) {
      supabaseClient.from('shifts').insert({
        id: state.currentShift.id, user_id: ownerId, cashier_name: state.currentShift.cashierName, start_time: state.currentShift.startTime
      }).then(({error}) => { if(error) console.log('Shift auto-open error:', error); });
    }
  }

  state.cart.forEach(function(item) {
    const prod = state.products.find(function(p) { return p.id === item.id; });
    if (prod) prod.stock = Math.max(0, Number(prod.stock) - item.qty);
  });

  const saleObj = {
    id: 'INV-' + new Date().getFullYear() + (new Date().getMonth()+1).toString().padStart(2,'0') + new Date().getDate().toString().padStart(2,'0') + '-' + Math.floor(Math.random() * 10000).toString().padStart(4, '0'),
    date: new Date().toISOString(),
    items: JSON.parse(JSON.stringify(state.cart)),
    subtotal: subtotal, discount: discountAmount, pointsDiscount: pointsDiscount, pointsUsed: pointsUsed,
    total: total, paid: paid, remaining: Math.max(0, total - paid),
    customerId: (customer && (customer.name === 'عميل نقدي عام' || customer.name === 'Cash Customer')) ? null : customerId, 
    payMethod: payMethod, notes: notes,
    cashier: state.currentUser.email, shiftId: state.currentShift.id
  };

  if (navigator.onLine && supabaseClient) {
    try {
      const { error: saleErr } = await supabaseClient.from('sales').insert({
        id: saleObj.id, user_id: ownerId, date: saleObj.date, subtotal: saleObj.subtotal,
        discount: saleObj.discount, total: saleObj.total, paid: saleObj.paid, remaining: saleObj.remaining,
        customer_id: saleObj.customerId, pay_method: saleObj.payMethod, notes: saleObj.notes,
        cashier: saleObj.cashier, shift_id: saleObj.shiftId
      });
      if (saleErr) throw saleErr;

      if (saleObj.items.length > 0) {
        const itemsData = saleObj.items.map(i => ({
          sale_id: saleObj.id, user_id: ownerId, product_id: i.id, product_name: i.name,
          qty: i.qty, price: i.price, cost: i.cost
        }));
        const { error: itemsErr } = await supabaseClient.from('sale_items').insert(itemsData);
        if (itemsErr) throw itemsErr;
      }
    } catch (err) {
      console.error('Error saving sale to server:', err);
      showNotification('تم الحفظ محلياً، وسيتم الرفع عند عودة الإنترنت.', 'warning');
    }
  }

  state.sales.unshift(saleObj);

  if (saleObj.remaining > 0 && saleObj.customerId) {
    const cust = state.customers.find(function(c) { return c.id === saleObj.customerId; });
    if (cust) {
      cust.openingDebt = (Number(cust.openingDebt) || 0) + saleObj.remaining;
      if (navigator.onLine && supabaseClient) {
        await supabaseClient.from('customers').update({ opening_debt: cust.openingDebt }).eq('id', cust.id);
      }
    }
  }

  if (saleObj.customerId) {
    const cust = state.customers.find(c => c.id === saleObj.customerId);
    if (cust) {
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

  if (discountAmount > 0 && typeof addAuditLog === 'function') {
    addAuditLog('apply_discount', { saleId: saleObj.id, discount: discountAmount }, saleObj.id);
  }

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
  const payLabels = { cash: en ? 'Cash' : 'نقدي', visa: en ? 'Visa' : 'فيزا', transfer: en ? 'Transfer' : 'تحويل', card: en ? 'Card' : 'بطاقة' };

  let html = '<div class="table-wrap"><table class="data-table"><thead><tr><th data-i18n="th_invoice_number">رقم الفاتورة</th><th data-i18n="th_date">التاريخ</th><th data-i18n="th_customer">العميل</th><th data-i18n="th_total">الإجمالي</th><th data-i18n="th_paid">المدفوع</th><th data-i18n="th_remaining">المتبقي</th><th data-i18n="th_payment_method">طريقة الدفع</th><th data-i18n="th_action">إجراء</th></tr></thead><tbody>';
  filtered.forEach(function(s) {
    const cust = state.customers.find(function(c) { return c.id === s.customerId; });
    const payText = payLabels[s.payMethod] || s.payMethod || '-';
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

function safeDeleteRecord(type, id) {
  if (state.role === 'employee') {
    const perms = state.storeSettings.permissions || {};
    if (!perms.canDelete) return showNotification('هذه العملية للمدير فقط', 'warning');
  }
  
  showCustomConfirm('تأكيد الحذف', tr('msg_delete_mistake'), () => {
    executeDeleteRecord(type, id);
  });
}

async function executeDeleteRecord(type, id) {
  const ownerId = (state.role === 'employee' && state.ownerId) ? state.ownerId : state.currentUser.id;

  if (type === 'sale') {
    const idx = state.sales.findIndex(function(s) { return s.id === id; });
    if (idx === -1) return;
    const s = state.sales[idx];
    
    s.items.forEach(function(item) {
      const prod = state.products.find(function(p) { return p.id === item.id; });
      if (prod) {
        prod.stock += item.qty;
        if (navigator.onLine && supabaseClient) {
          supabaseClient.from('products').update({ stock: prod.stock }).eq('id', prod.id).then();
        }
      }
    });

    if (s.customerId) {
      const cust = state.customers.find(function(c) { return c.id === s.customerId; });
      if (cust) {
        cust.openingDebt = Math.max(0, (Number(cust.openingDebt) || 0) - (Number(s.remaining) || 0));
        if (navigator.onLine && supabaseClient) {
          supabaseClient.from('customers').update({ opening_debt: cust.openingDebt }).eq('id', cust.id).then();
        }
      }
    }

    if (navigator.onLine && supabaseClient) {
      await supabaseClient.from('sales').delete().eq('id', id);
    }

    state.sales.splice(idx, 1);

    if (typeof addAuditLog === 'function') {
      addAuditLog('delete_sale', { saleId: s.id, total: s.total }, s.id);
    }
    
  } else if (type === 'expense') {
    const exp = state.expenses.find(function(e) { return e.id === id; });
    state.expenses = state.expenses.filter(function(e) { return e.id !== id; });
    
    if (navigator.onLine && supabaseClient) {
      await supabaseClient.from('expenses').delete().eq('id', id);
    }

    if (exp && typeof addAuditLog === 'function') {
      addAuditLog('delete_expense', { expenseId: exp.id, amount: exp.amount }, exp.id);
    }

  } else if (type === 'purchase') {
    const idx = state.purchases.findIndex(function(p) { return p.id === id; });
    if (idx !== -1) {
      const p = state.purchases[idx];
      
      const prod = state.products.find(function(pr) { return pr.id === p.productId; });
      if (prod) {
        prod.stock = Math.max(0, Number(prod.stock) - p.qty);
        if (navigator.onLine && supabaseClient) {
           await supabaseClient.from('products').update({ stock: prod.stock }).eq('id', prod.id);
        }
      }

      if (p.remaining > 0) {
        const sup = state.suppliers.find(s => s.id === p.supplierId);
        if (sup) {
          sup.openingDebt = Math.max(0, Number(sup.openingDebt) - Number(p.remaining));
          if (navigator.onLine && supabaseClient) {
             await supabaseClient.from('suppliers').update({ opening_debt: sup.openingDebt }).eq('id', sup.id);
          }
        }
      }

      if (navigator.onLine && supabaseClient) {
        await supabaseClient.from('purchases').delete().eq('id', id);
        await supabaseClient.from('stock_moves').delete().eq('product_id', p.productId).eq('type', 'in').like('reason', '%مشتريات%');
      }
      state.stockMoves = state.stockMoves.filter(m => !(m.productId === p.productId && m.reason.includes('مشتريات')));

      state.purchases.splice(idx, 1);

      if (typeof addAuditLog === 'function') {
        addAuditLog('delete_purchase', { purchaseId: p.id }, p.id);
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

  if (typeof addAuditLog === 'function') {
    addAuditLog('clear_table_log', { logType: logType, clearedCount: clearedCount }, logType);
  }

  saveData();
  renderAll();
  showNotification('تم تصفير السجل محلياً بنجاح ✅');
}