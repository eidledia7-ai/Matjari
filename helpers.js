/* ============ قفل التطبيق عند انتهاء الاشتراك ============ */
function enforceSubscriptionBlock() {
  const existing = document.getElementById('subscriptionBlock');
  if (existing) existing.remove();

  const oldBanner = document.getElementById('readOnlyBanner');
  if (oldBanner) oldBanner.remove();

  document.body.style.overflow = '';

  const sub = state.subscription || {};
  let endDate = null;
  if (sub.plan === 'trial' && sub.trial_ends_at) endDate = new Date(sub.trial_ends_at).getTime();
  else if (sub.expires_at) endDate = new Date(sub.expires_at).getTime();

  const now = Date.now();
  const isActive = sub.status === 'active' && (!endDate || endDate > now);

  window.isReadOnlyMode = !isActive;

  if (isActive) {
    document.body.style.paddingTop = '0';
    return;
  }

  const en = currentLang === 'en';
  const banner = document.createElement('div');
  banner.id = 'readOnlyBanner';
  banner.style.cssText = 'position:fixed; top:0; left:0; right:0; background:#ef4444; color:#fff; text-align:center; padding:12px; z-index:99999; font-weight:bold; font-size:14px; box-shadow:0 4px 10px rgba(0,0,0,0.2); display:flex; justify-content:center; align-items:center; gap:10px; flex-wrap:wrap;';

  banner.innerHTML = `
    <span>⚠️ ${en ? 'Subscription expired. Read-Only mode.' : 'اشتراكك منتهي. أنت الآن في وضع القراءة فقط (لا يمكنك البيع أو التعديل).'}</span>
    <button onclick="showPage('settSubscription')" style="background:#fff; color:#ef4444; border:none; padding:6px 15px; border-radius:20px; font-weight:bold; cursor:pointer; font-family:inherit; font-size:13px;">
      ${en ? 'Renew Now' : 'جدد الآن'}
    </button>
    <button onclick="this.parentElement.remove(); document.body.style.paddingTop='0';" style="background:transparent; border:none; color:#fff; cursor:pointer; font-size:18px; padding:0 5px;">✕</button>
  `;

  document.body.prepend(banner);
  document.body.style.paddingTop = '50px';
}

/* ============ نظام تعليق الفواتير (Hold Sale) ============ */
function updateHeldCartsCount() {
  const badge = document.getElementById('heldCartsCount');
  if (badge) badge.innerText = state.heldCarts ? state.heldCarts.length : 0;
}

async function holdCurrentSale() {
  if (state.cart.length === 0) {
    return showNotification('السلة فارغة، لا يوجد ما يتم تعليقه', 'warning');
  }

  const custId = document.getElementById('saleCustomer').value;
  const cust = state.customers.find(c => c.id === custId);

  // الحصول على shift_id الحالي (لو فيه)
  const currentShiftId = state.currentShift ? state.currentShift.id : null;

  const heldSale = {
    id: uid('HOLD'),
    time: new Date().toISOString(),
    cart: JSON.parse(JSON.stringify(state.cart)),
    customerId: custId,
    customerName: cust ? cust.name : 'عميل نقدي',
    discount: document.getElementById('saleDiscount').value || 0,
    discountType: document.getElementById('saleDiscountType').value,
    notes: document.getElementById('saleNotes').value || '',
    shiftId: currentShiftId
  };

  if (!state.heldCarts) state.heldCarts = [];
  state.heldCarts.unshift(heldSale);

  // الرفع للسيرفر
  const ownerId = (state.role === 'employee' && state.ownerId) ? state.ownerId : state.currentUser.id;
  if (navigator.onLine && supabaseClient) {
    await supabaseClient.from('held_carts').insert({
      id: heldSale.id, user_id: ownerId, cart_data: heldSale.cart,
      customer_id: heldSale.customerId, customer_name: heldSale.customerName,
      discount: heldSale.discount, discount_type: heldSale.discountType,
      notes: heldSale.notes, time: heldSale.time,
      shift_id: heldSale.shiftId
    });
  }

  clearCart();
  updateHeldCartsCount();
  saveData();
  showNotification('تم تعليق الفاتورة بنجاح ✅', 'success');
}

function openHeldCartsModal() {
  const modal = document.getElementById('heldCartsModal');
  if (!modal) return;
  modal.style.display = 'flex';
  renderHeldCartsList();
}

function closeHeldCartsModal() {
  const modal = document.getElementById('heldCartsModal');
  if (modal) modal.style.display = 'none';
}

function renderHeldCartsList() {
  const container = document.getElementById('heldCartsList');
  if (!container) return;

  if (!state.heldCarts || state.heldCarts.length === 0) {
    container.innerHTML = '<p class="text-muted text-center">لا توجد فواتير معلقة حالياً.</p>';
    return;
  }

  let html = '';
  state.heldCarts.forEach(sale => {
    const date = new Date(sale.time).toLocaleTimeString(currentLang === 'en' ? 'en-US' : 'ar-EG');
    const total = sale.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

    html += `
      <div style="background:var(--bg-body); border:1px solid var(--border); border-radius:8px; padding:12px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
        <div>
          <div style="font-weight:bold; color:var(--text-main);">${escapeHTML(sale.customerName)} <span style="font-size:12px; color:var(--text-muted);">(${date})</span></div>
          <div style="font-size:13px; color:var(--text-muted); margin-top:4px;">${sale.cart.length} أصناف - الإجمالي: <b>${total.toFixed(2)} ${state.storeSettings.currency}</b></div>
        </div>
        <div style="display:flex; gap:5px;">
          <button class="small-btn green" onclick="resumeHeldSale('${sale.id}')">استرجاع</button>
          <button class="small-btn red" onclick="deleteHeldSale('${sale.id}')">حذف</button>
        </div>
      </div>
    `;
  });
  container.innerHTML = html;
}

function resumeHeldSale(id) {
  if (state.cart.length > 0) {
    if (!confirm('السلة الحالية بها أصناف. هل تريد تعليقها أولاً واسترجاع الفاتورة المحددة؟')) {
      return;
    }
    holdCurrentSale();
  }

  const index = state.heldCarts.findIndex(s => s.id === id);
  if (index === -1) return;

  const sale = state.heldCarts[index];

  state.cart = sale.cart;
  document.getElementById('saleCustomer').value = sale.customerId;
  document.getElementById('saleDiscount').value = sale.discount;
  document.getElementById('saleDiscountType').value = sale.discountType;
  document.getElementById('saleNotes').value = sale.notes;

  state.heldCarts.splice(index, 1);

  // مسح من السيرفر بعد الاسترجاع
  if (navigator.onLine && supabaseClient) {
    supabaseClient.from('held_carts').delete().eq('id', id);
  }

  closeHeldCartsModal();
  renderCart();
  updateHeldCartsCount();
  saveData();
  showNotification('تم استرجاع الفاتورة بنجاح ✅', 'success');
}

async function deleteHeldSale(id) {
  if (!confirm('هل أنت متأكد من حذف هذه الفاتورة المعلقة نهائياً؟')) return;

  state.heldCarts = state.heldCarts.filter(s => s.id !== id);

  if (navigator.onLine && supabaseClient) {
    await supabaseClient.from('held_carts').delete().eq('id', id);
  }

  renderHeldCartsList();
  updateHeldCartsCount();
  saveData();
  showNotification('تم حذف الفاتورة المعلقة', 'info');
}

/* ============ إضافة كمية سريعة للمخزون ============ */
async function quickAddStock(id) {
  if (state.role !== 'manager') return showNotification('هذه العملية للمدير فقط', 'warning');
  if (window.isReadOnlyMode) return showNotification('جدد اشتراكك أولاً لإضافة منتجات', 'error');

  const prod = state.products.find(p => p.id === id);
  if (!prod) return;

  const qtyInput = prompt('إضافة كمية للمنتج: "' + prod.name + '"\n\nالمخزون الحالي: ' + prod.stock + '\n\nأدخل الكمية اللي هتضيفها (مثال: 10):');

  if (qtyInput === null) return;
  const qty = parseInt(qtyInput);

  if (isNaN(qty) || qty <= 0) {
    return showNotification('أدخل رقم صحيح أكبر من صفر', 'error');
  }

  const oldStock = prod.stock;
  prod.stock += qty;

  const ownerId = (state.role === 'employee' && state.ownerId) ? state.ownerId : state.currentUser.id;

  // تحديث المنتج في السيرفر
  if (navigator.onLine && supabaseClient) {
    await supabaseClient.from('products').update({ stock: prod.stock }).eq('id', prod.id);
  }

  const moveObj = {
    id: uid('SM'), user_id: ownerId, product_id: prod.id, product_name: prod.name,
    type: 'in', qty: qty, old_stock: oldStock, new_stock: prod.stock,
    reason: 'إضافة سريعة من قائمة المنتجات', date: new Date().toISOString()
  };
  state.stockMoves.unshift({ id: moveObj.id, date: moveObj.date, product_id: prod.id, productId: prod.id, product_name: prod.name, productName: prod.name, type: 'in', qty, old_stock: oldStock, oldStock: oldStock, new_stock: prod.stock, newStock: prod.stock, reason: moveObj.reason });

  // رفع حركة المخزون للسيرفر
  if (navigator.onLine && supabaseClient) {
    await supabaseClient.from('stock_moves').insert(moveObj);
  }

  if (typeof addAuditLog === 'function') {
    addAuditLog('quick_add_stock', { productId: prod.id, qty: qty }, prod.id);
  }

  saveData();
  renderProducts();
  renderStockMoves();
  renderDashboard();
  updateStockBadge();
  showNotification('تم إضافة ' + qty + ' قطعة لمخزون "' + prod.name + '" ✅', 'success');
}

/* ============ مصروفات الدرج ============ */
function openDrawerExpenseModal() {
  if (window.isReadOnlyMode) return showNotification('جدد اشتراكك أولاً', 'error');

  // البحث عن وردية مفتوحة في state.shifts
  const userId = (state.role === 'employee' && state.ownerId) ? state.ownerId : state.currentUser.id;
  const openShift = (state.shifts || []).find(s => !s.end_time && !s.endTime);

  if (!openShift && !state.currentShift) {
    return showNotification('لا توجد وردية مفتوحة حالياً. ابدأ بيع أولاً.', 'warning');
  }
  document.getElementById('drawerExpenseAmount').value = '';
  document.getElementById('drawerExpenseReason').value = '';
  document.getElementById('drawerExpenseModal').style.display = 'flex';
}

async function saveDrawerExpense() {
  if (window.isReadOnlyMode) return showNotification('جدد اشتراكك أولاً', 'error');
  if (!state.currentUser) return showNotification('سجّل الدخول أولاً', 'error');

  const amount = parseFloat(document.getElementById('drawerExpenseAmount').value);
  const reason = document.getElementById('drawerExpenseReason').value.trim();

  if (isNaN(amount) || amount <= 0 || !reason) {
    return showNotification('أدخل مبلغاً صحيحاً وسبباً للمصروف', 'error');
  }

  const ownerId = (state.role === 'employee' && state.ownerId) ? state.ownerId : state.currentUser.id;

  // الحصول على shift_id الحالي (من state.currentShift أو من state.shifts)
  let currentShiftId = null;
  if (state.currentShift) {
    currentShiftId = state.currentShift.id;
  } else {
    const openShift = (state.shifts || []).find(s => !s.end_time && !s.endTime);
    if (openShift) currentShiftId = openShift.id;
  }

  const newExpense = {
    id: uid('EXP'),
    user_id: ownerId,
    name: 'مصروف وردية: ' + reason,
    amount: amount,
    date: today(),
    notes: 'تم سحبه من درج الكاشير أثناء الوردية',
    shift_id: currentShiftId,
    pay_method: 'cash'
  };

  // الرفع للسيرفر
  if (navigator.onLine && supabaseClient) {
    const { error } = await supabaseClient.from('expenses').insert(newExpense);
    if (error) {
      console.warn('Drawer expense upload failed:', error);
      return showNotification('تعذر حفظ المصروف: ' + error.message, 'error');
    }
  }

  // التحديث المحلي (camel + snake للتوافقية)
  state.expenses.unshift({
    id: newExpense.id,
    name: newExpense.name,
    amount: newExpense.amount,
    date: newExpense.date,
    notes: newExpense.notes,
    shift_id: newExpense.shift_id,
    shiftId: newExpense.shift_id,
    pay_method: newExpense.pay_method,
    payMethod: newExpense.pay_method
  });

  if (state.currentShift) {
    if (!state.currentShift.drawerExpenses) state.currentShift.drawerExpenses = [];
    state.currentShift.drawerExpenses.push({ amount: amount, reason: reason, time: new Date().toISOString() });
  }

  if (typeof addAuditLog === 'function') {
    addAuditLog('drawer_expense', { expenseId: newExpense.id, amount: amount, reason: reason }, newExpense.id);
  }

  // تحديث الكاش المتوقع للوردية (لو الدالة موجودة)
  if (typeof calcExpectedShiftCash === 'function') {
    calcExpectedShiftCash();
  }

  saveData();

  if (typeof renderExpenses === 'function') renderExpenses();
  document.getElementById('drawerExpenseModal').style.display = 'none';
  showNotification('تم تسجيل المصروف وخصمه من الدرج ✅', 'success');
}

/* ============ تذكير العملاء بالديون ============ */
function sendDebtReminder(customerId) {
  const cust = state.customers.find(c => c.id === customerId);
  if (!cust) return showNotification('العميل غير موجود', 'error');

  const debt = Number(cust.opening_debt ?? cust.openingDebt) || 0;
  if (debt <= 0) {
    return showNotification('هذا العميل ليس عليه أي ديون', 'info');
  }

  const storeName = state.storeSettings.name || 'متجري';
  const currency = state.storeSettings.currency || 'ج.م';

  const message = `أهلاً ${cust.name}،\n\n` +
                  `تذكير ودود بخصوص حسابكم معنا في "${storeName}".\n` +
                  `المبلغ المتبقي: ${debt.toFixed(2)} ${currency}.\n\n` +
                  `شاكرين تعاملكم معنا، ونتمنى لكم يوماً سعيداً! 🌟`;

  const countryCode = state.storeSettings.countryCode || '20';
  const phone = cust.phone && cust.phone !== '-' ? cust.phone.replace(/\D/g, '') : '';
  const finalPhone = phone.startsWith('0') ? countryCode + phone.substring(1) : phone;

  const whatsappUrl = phone ? `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}` : `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank');
}

/* ============ كشف حساب العميل ============ */
let activeStatementCustomerId = null;

function getStatementData(custId) {
  const cust = state.customers.find(c => c.id === custId);
  if (!cust) return null;

  let transactions = [];

  // مبيعات (باستخدام customer_id أو customerId)
  state.sales.filter(s => (s.customer_id === custId || s.customerId === custId)).forEach(s => {
    if (Number(s.remaining) > 0) {
      transactions.push({ date: s.date, desc: 'فاتورة رقم ' + s.id, debit: Number(s.remaining), credit: 0 });
    }
  });

  // دفعات
  state.customerPayments.filter(p => (p.customer_id === custId || p.customerId === custId)).forEach(p => {
    transactions.push({ date: p.date, desc: 'دفعة (تحصيل)', debit: 0, credit: Number(p.amount) });
  });

  // مرتجعات credit (لو موجودة)
  (state.returns || []).filter(r => (r.customer_id === custId || r.customerId === custId) && r.refund_method === 'credit').forEach(r => {
    transactions.push({ date: r.date, desc: 'مرتجع رقم ' + r.id, debit: 0, credit: Number(r.total) || 0 });
  });

  transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

  let totalDebit = transactions.reduce((sum, t) => sum + t.debit, 0);
  let totalCredit = transactions.reduce((sum, t) => sum + t.credit, 0);
  const opening = Number(cust.opening_debt ?? cust.openingDebt) || 0;
  let currentDebt = opening;
  let initialBalance = opening - totalDebit + totalCredit;

  return { cust, transactions, initialBalance, currentDebt };
}

function showCustomerStatement(custId) {
  activeStatementCustomerId = custId;
  const data = getStatementData(custId);
  if (!data) return;

  const { cust, transactions, initialBalance, currentDebt } = data;
  const cur = state.storeSettings.currency || 'ج.م';

  document.getElementById('statementCustName').innerText = cust.name;

  let html = '<div class="table-wrap"><table class="data-table"><thead><tr><th>التاريخ</th><th>البيان</th><th>عليه (مدين)</th><th>له (دائن)</th><th>الرصيد</th></tr></thead><tbody>';

  let runningBalance = initialBalance;
  html += `<tr><td>-</td><td>رصيد سابق</td><td>-</td><td>-</td><td><b>${runningBalance.toFixed(2)}</b></td></tr>`;

  transactions.forEach(t => {
    runningBalance += t.debit;
    runningBalance -= t.credit;
    html += `<tr>
      <td>${new Date(t.date).toLocaleDateString('ar-EG')}</td>
      <td>${escapeHTML(t.desc)}</td>
      <td>${t.debit > 0 ? t.debit.toFixed(2) : '-'}</td>
      <td>${t.credit > 0 ? t.credit.toFixed(2) : '-'}</td>
      <td><b>${runningBalance.toFixed(2)}</b></td>
    </tr>`;
  });

  html += `<tr style="background:#fef2f2;"><td colspan="4" style="text-align:left;"><b>الرصيد النهائي المتبقي:</b></td><td><b class="red-text">${currentDebt.toFixed(2)} ${cur}</b></td></tr>`;
  html += '</tbody></table></div>';

  document.getElementById('statementContent').innerHTML = html;
  document.getElementById('customerStatementModal').style.display = 'flex';
}

function printCustomerStatement() {
  if (!activeStatementCustomerId) return;
  const data = getStatementData(activeStatementCustomerId);
  if (!data) return;

  const { cust, transactions, initialBalance, currentDebt } = data;
  const cur = state.storeSettings.currency || 'ج.م';
  const storeName = state.storeSettings.name || 'متجري';

  const win = window.open('', '_blank');
  if (!win) return showNotification('اسمح بالنوافذ المنبثقة للطباعة', 'warning');

  let rows = '';
  let runningBalance = initialBalance;
  rows += `<tr><td>-</td><td>رصيد سابق</td><td>-</td><td>-</td><td>${runningBalance.toFixed(2)}</td></tr>`;

  transactions.forEach(t => {
    runningBalance += t.debit;
    runningBalance -= t.credit;
    rows += `<tr>
      <td>${new Date(t.date).toLocaleDateString('ar-EG')}</td>
      <td>${escapeHTML(t.desc)}</td>
      <td>${t.debit > 0 ? t.debit.toFixed(2) : '-'}</td>
      <td>${t.credit > 0 ? t.credit.toFixed(2) : '-'}</td>
      <td>${runningBalance.toFixed(2)}</td>
    </tr>`;
  });

  win.document.write(`
    <!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>كشف حساب - ${escapeHTML(cust.name)}</title>
    <style>body{font-family:Tahoma,Arial;padding:20px;} h1,h2{text-align:center;color:#17364c;} table{width:100%;border-collapse:collapse;margin-top:20px;} th,td{border:1px solid #ccc;padding:10px;text-align:right;} th{background:#f8fafc;} .total{font-weight:bold;background:#fef2f2;}</style>
    </head><body>
    <h1>${escapeHTML(storeName)}</h1>
    <h2>كشف حساب العميل: ${escapeHTML(cust.name)}</h2>
    <table><thead><tr><th>التاريخ</th><th>البيان</th><th>عليه (مدين)</th><th>له (دائن)</th><th>الرصيد</th></tr></thead>
    <tbody>${rows}<tr class="total"><td colspan="4" style="text-align:left;">الرصيد النهائي المتبقي:</td><td>${currentDebt.toFixed(2)} ${cur}</td></tr></tbody></table>
    <script>window.onload=function(){setTimeout(function(){window.print()},300)};<\/script>
    </body></html>
  `);
  win.document.close();
}

function sendCustomerStatementWhatsApp() {
  if (!activeStatementCustomerId) return;
  const data = getStatementData(activeStatementCustomerId);
  if (!data) return;

  const { cust, transactions, initialBalance, currentDebt } = data;
  const cur = state.storeSettings.currency || 'ج.م';
  const storeName = state.storeSettings.name || 'متجري';

  let message = `أهلاً ${cust.name}،\n`;
  message += `كشف حسابكم في "${storeName}":\n\n`;

  if (initialBalance !== 0) {
    message += `🔹 رصيد سابق: ${initialBalance.toFixed(2)} ${cur}\n`;
  }

  message += `🔹 الحركات الأخيرة:\n`;

  const recentTransactions = transactions.slice(-5).reverse();
  recentTransactions.forEach(t => {
    if (t.debit > 0) message += `- فاتورة بـ ${t.debit.toFixed(2)} ${cur}\n`;
    if (t.credit > 0) message += `- دفعة بـ ${t.credit.toFixed(2)} ${cur}\n`;
  });

  message += `\n💰 الرصيد الحالي المتبقي: *${currentDebt.toFixed(2)} ${cur}*\n\n`;
  message += `شاكرين تعاملكم معنا! 🌟`;

  const countryCode = state.storeSettings.countryCode || '20';
  const phone = cust.phone && cust.phone !== '-' ? cust.phone.replace(/\D/g, '') : '';
  const finalPhone = phone.startsWith('0') ? countryCode + phone.substring(1) : phone;

  const whatsappUrl = phone ? `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}` : `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank');
}

/* ============ استيراد المنتجات من CSV ============ */
async function importProductsCSV(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (state.role !== 'manager') return showNotification('للمدير فقط', 'error');

  const reader = new FileReader();
  reader.onload = async function(e) {
    const text = e.target.result;
    const lines = text.split('\n');
    let addedCount = 0;
    const newProductsToUpload = [];
    const ownerId = state.currentUser.id;

    lines.forEach((line, index) => {
      if (index === 0 || !line.trim()) return;

      const cols = line.split(',');
      if (cols.length >= 5) {
        const name = cols[0].trim();
        const barcode = cols[1].trim();
        const price = parseFloat(cols[2]) || 0;
        const cost = parseFloat(cols[3]) || 0;
        const stock = parseInt(cols[4]) || 0;

        if (name) {
          const newProd = {
            id: uid('PRD'), user_id: ownerId, name: name, barcode: barcode,
            category: 'عام', price: price, cost: cost, stock: stock, min_stock: 5
          };
          state.products.push({
            id: newProd.id, name: newProd.name, barcode: newProd.barcode,
            category: newProd.category, price: newProd.price, cost: newProd.cost,
            stock: newProd.stock, min_stock: newProd.min_stock, minStock: newProd.min_stock
          });
          newProductsToUpload.push(newProd);
          addedCount++;
        }
      }
    });

    if (addedCount > 0) {
      if (navigator.onLine && supabaseClient) {
        await supabaseClient.from('products').insert(newProductsToUpload);
      }
      if (typeof addAuditLog === 'function') {
        addAuditLog('import_products_csv', { count: addedCount });
      }
      saveData();
      renderProducts();
      showNotification('تم استيراد ' + addedCount + ' منتج بنجاح ✅');
    } else {
      showNotification('لم يتم العثور على بيانات صالحة في الملف', 'warning');
    }
    event.target.value = '';
  };
  reader.readAsText(file);
}

/* ============ قائمة خيارات الفاتورة ============ */
function toggleActionMenu(event, id) {
  event.stopPropagation();
  const menu = document.getElementById('menu-' + id);
  if (!menu) return;
  const isShowing = menu.classList.contains('show');

  document.querySelectorAll('.action-dropdown-menu').forEach(m => m.classList.remove('show'));

  if (!isShowing) menu.classList.add('show');
}

document.addEventListener('click', function() {
  document.querySelectorAll('.action-dropdown-menu').forEach(m => m.classList.remove('show'));
});

function initiateReturnFromSale(saleId) {
  document.querySelectorAll('.action-dropdown-menu').forEach(m => m.classList.remove('show'));
  showPage('invReturns');
  setTimeout(() => {
    const saleSel = document.getElementById('returnSale');
    if (saleSel) {
      saleSel.value = saleId;
      updateReturnProducts();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, 150);
}

/* ============ مودال التأكيد المخصص ============ */
function showCustomConfirm(title, message, onConfirm) {
  const modalHtml = `
    <div id="customConfirmModal" class="modal-overlay" style="display:flex; z-index:100000;">
      <div class="modal-card" style="max-width:400px; text-align:center;">
        <h3 style="color:var(--danger); margin-bottom:10px;">${title}</h3>
        <p style="margin-bottom:20px;">${message}</p>
        <div class="btn-group" style="justify-content:center;">
          <button class="btn red" id="confirmBtn">تأكيد</button>
          <button class="btn grey" id="cancelBtn">إلغاء</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  document.getElementById('confirmBtn').onclick = () => {
    document.getElementById('customConfirmModal').remove();
    onConfirm();
  };
  document.getElementById('cancelBtn').onclick = () => {
    document.getElementById('customConfirmModal').remove();
  };
}