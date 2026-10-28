function enforceSubscriptionBlock() {
  // 1. مسح أي شاشة قفل قديمة أو شريط قديم
  const existing = document.getElementById('subscriptionBlock');
  if (existing) existing.remove();
  
  const oldBanner = document.getElementById('readOnlyBanner');
  if (oldBanner) oldBanner.remove();
  
  document.body.style.overflow = ''; // إرجاع السكرول

  const sub = state.subscription || {};
  let endDate = null;
  if (sub.plan === 'trial' && sub.trial_ends_at) endDate = new Date(sub.trial_ends_at).getTime();
  else if (sub.expires_at) endDate = new Date(sub.expires_at).getTime();

  const now = Date.now();
  const isActive = sub.status === 'active' && (!endDate || endDate > now);
  
  // حفظ حالة الاشتراك في متغير عام عشان نستخدمه في منع الحفظ
  window.isReadOnlyMode = !isActive; 

  if (isActive) {
    document.body.style.paddingTop = '0'; // تصفير المسافة لو الاشتراك سليم
    return;
  }

  // 2. عمل الشريط الأحمر التحذيري
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
  document.body.style.paddingTop = '50px'; // عشان الشريط ميداريش الهيدر
}

async function startSubscription(planId) {
  const plan = PLANS.find(p => p.id === planId);
  if (!plan) return;
  
  showLoading(currentLang === 'en' ? 'Connecting to payment...' : 'جارٍ الاتصال ببوابة الدفع...');

  try {
    // 1. الاتصال بدالة Supabase وتمرير الـ userId
    const { data, error } = await supabaseClient.functions.invoke('create-payment', {
      body: {
        amount: plan.price,
        planId: planId,
        userEmail: state.currentUser ? state.currentUser.email : '',
        userName: 'Customer',
        userId: state.currentUser ? state.currentUser.id : '' // 🚨 السطر الجديد المهم جداً
      }
    });

    if (error) throw error;
    if (!data || !data.token) throw new Error('لم يتم استلام توكن الدفع');

    hideLoading();

    // 2. عرض شاشة الدفع (Iframe) جوه التطبيق
    const iframeId = '1090930'; 
    const iframeUrl = `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${data.token}`;

    const oldModal = document.getElementById('paymobIframeModal');
    if (oldModal) oldModal.remove();

    const modal = document.createElement('div');
    modal.id = 'paymobIframeModal';
    modal.className = 'modal-overlay';
    modal.style.zIndex = '9999999'; 
    modal.innerHTML = `
      <div class="modal-card" style="max-width: 600px; width: 100%; padding: 0; overflow: hidden; height: 85vh;">
        <div style="padding: 15px; background: #17364c; color: white; display: flex; justify-content: space-between; align-items: center;">
          <h3 style="margin: 0; color: white;">💳 ${currentLang === 'en' ? 'Secure Payment' : 'الدفع الآمن'}</h3>
          <button onclick="document.getElementById('paymobIframeModal').remove()" style="background: transparent; border: none; color: white; font-size: 20px; cursor: pointer;">✕</button>
        </div>
        <iframe src="${iframeUrl}" width="100%" height="100%" style="border: none;"></iframe>
      </div>
    `;
    document.body.appendChild(modal);

  } catch (err) {
    hideLoading();
    showNotification((currentLang === 'en' ? 'Error: ' : 'خطأ: ') + err.message, 'error');
  }
}
/* ============ عرض تفاصيل باقة ============ */
function showPlanDetail(planId, context) {
  const plan = PLANS.find(p => p.id === planId);
  if (!plan) return;

  const en = currentLang === 'en';
  const cur = state.storeSettings.currency || 'ج.م';
  const dict = translations[currentLang] || translations.ar;

  const old = document.getElementById('planDetailModal');
  if (old) old.remove();

  const names = { starter: en ? 'Starter' : 'البداية', growth: en ? 'Growth' : 'النمو', pro: en ? 'Pro' : 'الاحترافي' };
  const icons = { starter: '🚀', growth: '⭐', pro: '👑' };
  const subtitles = {
    starter: en ? 'Perfect to get started' : 'مناسبة للبداية والاحتياج الأساسي',
    growth:  en ? 'Best for growing shops' : 'الأفضل للمحلات النامية',
    pro:     en ? 'For large stores & chains' : 'للمحلات الكبيرة والسلاسل'
  };

  const includesText = planId === 'growth'
    ? (en ? '✅ Everything in Starter +' : '✅ كل مميزات البداية +')
    : planId === 'pro'
    ? (en ? '✅ Everything in Growth +' : '✅ كل مميزات النمو +')
    : (en ? 'This plan includes:' : 'هذه الباقة تشمل:');

  let featuresHtml = '';
  PLAN_FEATURES.forEach(f => {
    const val = f.values[planId];
    let icon, text, cls;
    if (val === true)  { icon = '✅'; text = en ? f.label_en : f.label_ar; cls = 'pd-on'; }
    else if (val === false) { icon = '❌'; text = en ? f.label_en : f.label_ar; cls = 'pd-off'; }
    else { icon = '✓'; text = (en ? f.label_en : f.label_ar) + ': <b>' + val + '</b>'; cls = 'pd-on'; }
    featuresHtml += '<li class="' + cls + '"><span class="pd-fi">' + icon + '</span><span>' + text + '</span></li>';
  });

  const ctaHtml = context === 'landing'
    ? '<button class="btn green w-100 pd-cta" onclick="hidePlanDetail(); showAuthView(\'signup\')">' + dict.start_free_trial + '</button>'
    : '<button class="btn green w-100 pd-cta" onclick="hidePlanDetail(); startSubscription(\'' + planId + '\')">' + dict.subscribe_now + ' — ' + plan.price + ' ' + cur + '/' + dict.per_month + '</button>';

  const modal = document.createElement('div');
  modal.id = 'planDetailModal';
  modal.className = 'plan-detail-overlay';
  modal.setAttribute('onclick', 'if(event.target===this)hidePlanDetail()');
  modal.innerHTML =
    '<div class="plan-detail-card pd-theme-' + planId + '">' +
      '<button class="pd-close" onclick="hidePlanDetail()">✕</button>' +
      (plan.popular ? '<div class="pd-popular-badge">⭐ ' + dict.most_popular + '</div>' : '') +
      '<div class="pd-hero">' +
        '<div class="pd-icon">' + icons[planId] + '</div>' +
        '<h2 class="pd-name">' + names[planId] + '</h2>' +
        '<p class="pd-subtitle">' + subtitles[planId] + '</p>' +
      '</div>' +
      '<div class="pd-price-block">' +
        '<div class="pd-price"><span class="pd-amount">' + plan.price + '</span><span class="pd-cur">' + cur + '</span><span class="pd-period">/' + dict.per_month + '</span></div>' +
        '<div class="pd-yearly">' + (en ? 'or ' : 'أو ') + '<b>' + plan.yearly + ' ' + cur + '</b>/' + dict.per_year +
          '<span class="pd-save-badge">' + (en ? 'Save 2 months' : 'وفّر شهرين') + '</span></div>' +
      '</div>' +
      '<div class="pd-divider"></div>' +
      '<div class="pd-includes">' + includesText + '</div>' +
      '<ul class="pd-features">' + featuresHtml + '</ul>' +
      ctaHtml +
      '<div class="pd-trust">' +
        '<span>🔒 ' + (en ? 'Secure' : 'دفع آمن') + '</span>' +
        '<span>↩️ ' + (en ? '7-day guarantee' : 'ضمان 7 أيام') + '</span>' +
        '<span>📞 ' + (en ? '24/7 support' : 'دعم 24/7') + '</span>' +
      '</div>' +
    '</div>';

  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';
}

function hidePlanDetail() {
  const m = document.getElementById('planDetailModal');
  if (m) m.remove();
  if (!document.getElementById('subscriptionBlock')) {
    document.body.style.overflow = '';
  }
}
/* ============ نظام تعليق الفواتير (Hold Sale) ============ */
function updateHeldCartsCount() {
  const badge = document.getElementById('heldCartsCount');
  if (badge) badge.innerText = state.heldCarts ? state.heldCarts.length : 0;
}

function holdCurrentSale() {
  if (state.cart.length === 0) {
    return showNotification('السلة فارغة، لا يوجد ما يتم تعليقه', 'warning');
  }

  const custId = document.getElementById('saleCustomer').value;
  const cust = state.customers.find(c => c.id === custId);

  const heldSale = {
    id: uid('HOLD'),
    time: new Date().toISOString(),
    cart: JSON.parse(JSON.stringify(state.cart)),
    customerId: custId,
    customerName: cust ? cust.name : 'عميل نقدي',
    discount: document.getElementById('saleDiscount').value || 0,
    discountType: document.getElementById('saleDiscountType').value,
    notes: document.getElementById('saleNotes').value || ''
  };

  if (!state.heldCarts) state.heldCarts = [];
  state.heldCarts.unshift(heldSale);

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
  
  closeHeldCartsModal();
  renderCart();
  updateHeldCartsCount();
  saveData();
  showNotification('تم استرجاع الفاتورة بنجاح ✅', 'success');
}

function deleteHeldSale(id) {
  if (!confirm('هل أنت متأكد من حذف هذه الفاتورة المعلقة نهائياً؟')) return;
  state.heldCarts = state.heldCarts.filter(s => s.id !== id);
  renderHeldCartsList();
  updateHeldCartsCount();
  saveData();
  showNotification('تم حذف الفاتورة المعلقة', 'info');
}
/* ============ إضافة كمية سريعة للمخزون ============ */
function quickAddStock(id) {
  if (state.role !== 'manager') return showNotification('هذه العملية للمدير فقط', 'warning');
  if (window.isReadOnlyMode) return showNotification('جدد اشتراكك أولاً لإضافة منتجات', 'error');
  
  const prod = state.products.find(p => p.id === id);
  if (!prod) return;

  // استخدام شاشة الإدخال السريعة (Prompt) عشان ننجز ومنبوظش الشكل
  const qtyInput = prompt('إضافة كمية للمنتج: "' + prod.name + '"\n\nالمخزون الحالي: ' + prod.stock + '\n\nأدخل الكمية اللي هتضيفها (مثال: 10):');
  
  if (qtyInput === null) return; // لو داس إلغاء
  const qty = parseInt(qtyInput);
  
  if (isNaN(qty) || qty <= 0) {
    return showNotification('أدخل رقم صحيح أكبر من صفر', 'error');
  }

  const oldStock = prod.stock;
  prod.stock += qty;

  // تسجيل الحركة في سجل المخزون
  state.stockMoves.unshift({
    id: uid('SM'), date: new Date().toISOString(),
    productId: prod.id, productName: prod.name,
    type: 'in', qty: qty, oldStock: oldStock, newStock: prod.stock,
    reason: 'إضافة سريعة من قائمة المنتجات'
  });

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
  if (!state.currentShift) {
    return showNotification('لا توجد وردية مفتوحة حالياً. ابدأ بيع أولاً.', 'warning');
  }
  document.getElementById('drawerExpenseAmount').value = '';
  document.getElementById('drawerExpenseReason').value = '';
  document.getElementById('drawerExpenseModal').style.display = 'flex';
}

function saveDrawerExpense() {
  const amount = parseFloat(document.getElementById('drawerExpenseAmount').value);
  const reason = document.getElementById('drawerExpenseReason').value.trim();

  if (isNaN(amount) || amount <= 0 || !reason) {
    return showNotification('أدخل مبلغاً صحيحاً وسبباً للمصروف', 'error');
  }

  // 1. تسجيله في جدول المصروفات العام (عشان يخصم من الربح)
  state.expenses.unshift({
    id: uid('EXP'),
    name: 'مصروف وردية: ' + reason,
    amount: amount,
    date: today(),
    notes: 'تم سحبه من درج الكاشير أثناء الوردية'
  });

  // 2. حفظه في الوردية الحالية (عشان نخصمه من الكاش المتوقع)
  if (!state.currentShift.drawerExpenses) state.currentShift.drawerExpenses = [];
  state.currentShift.drawerExpenses.push({ amount: amount, reason: reason, time: new Date().toISOString() });

  // 3. تحديث الكاش المتوقع
  calcExpectedShiftCash();
  
  saveData();
  renderExpenses(); // تحديث صفحة المصروفات
  document.getElementById('drawerExpenseModal').style.display = 'none';
  showNotification('تم تسجيل المصروف وخصمه من الدرج ✅', 'success');
}
/* ============ تذكير العملاء بالديون ============ */
function sendDebtReminder(customerId) {
  const cust = state.customers.find(c => c.id === customerId);
  if (!cust) return showNotification('العميل غير موجود', 'error');
  
  if (!cust.openingDebt || cust.openingDebt <= 0) {
    return showNotification('هذا العميل ليس عليه أي ديون', 'info');
  }

  const storeName = state.storeSettings.name || 'متجري';
  const currency = state.storeSettings.currency || 'ج.م';
  
  const message = `أهلاً ${cust.name}،\n\n` +
                  `تذكير ودود بخصوص حسابكم معنا في "${storeName}".\n` +
                  `المبلغ المتبقي: ${cust.openingDebt.toFixed(2)} ${currency}.\n\n` +
                  `شاكرين تعاملكم معنا، ونتمنى لكم يوماً سعيداً! 🌟`;

  // تجهيز رقم الموبايل
  const countryCode = state.storeSettings.countryCode || '20';
  const phone = cust.phone && cust.phone !== '-' ? cust.phone.replace(/\D/g, '') : '';
  const finalPhone = phone.startsWith('0') ? countryCode + phone.substring(1) : phone;

  // لو مفيش رقم، نفتح واتساب عادي
  const whatsappUrl = phone ? `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}` : `https://wa.me/?text=${encodeURIComponent(message)}`;
  
  window.open(whatsappUrl, '_blank');
}
function printThermalInvoice(saleId) {
  const sale = state.sales.find(s => s.id === saleId);
  if (!sale) return showNotification('الفاتورة غير موجودة', 'error');

  const settings = state.storeSettings || {};
  const cust = state.customers.find(c => c.id === sale.customerId);
  const custName = cust ? cust.name : 'عميل نقدي';
  const cur = settings.currency || 'ج.م';

  const oldFrame = document.getElementById('thermalPrintFrame');
if (oldFrame) oldFrame.remove();

const iframe = document.createElement('iframe');
iframe.id = 'thermalPrintFrame';
iframe.style.position = 'fixed';
iframe.style.bottom = '0';
iframe.style.right = '0';
iframe.style.width = '0';
iframe.style.height = '0';
iframe.style.border = '0';
document.body.appendChild(iframe);

const win = iframe.contentWindow;

  let itemsHtml = (sale.items || []).map(i => `
    <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
      <div style="flex:1; text-align:right;">${escapeHTML(i.name)}<br><small>${i.qty} × ${i.price.toFixed(2)}</small></div>
      <div style="text-align:left;">${(i.qty * i.price).toFixed(2)}</div>
    </div>
  `).join('');

  win.document.write(`
    <!DOCTYPE html><html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>فاتورة حرارية</title>
      <style>
        @page { margin: 0; size: 80mm auto; }
        body { 
          width: 72mm; margin: 0 auto; padding: 5px; 
          font-family: 'Cairo', Tahoma, sans-serif; font-size: 12px; color: #000;
        }
        .text-center { text-align: center; }
        .dashed-line { border-top: 1px dashed #000; margin: 8px 0; }
        .bold { font-weight: 900; }
        table { width: 100%; border-collapse: collapse; }
      </style>
    </head>
    <body>
      <div class="text-center">
        <h2 style="margin:0 0 5px 0;">${escapeHTML(settings.name || 'متجري')}</h2>
        <div>${escapeHTML(settings.phone || '')}</div>
      </div>
      <div class="dashed-line"></div>
      <div>رقم الفاتورة: ${sale.id}</div>
      <div>التاريخ: ${new Date(sale.date).toLocaleString('ar-EG')}</div>
      <div>العميل: ${escapeHTML(custName)}</div>
      <div class="dashed-line"></div>
      ${itemsHtml}
      <div class="dashed-line"></div>
      <div style="display:flex; justify-content:space-between; font-weight:bold;">
        <span>الإجمالي:</span><span>${sale.total.toFixed(2)} ${cur}</span>
      </div>
      <div style="display:flex; justify-content:space-between;">
        <span>المدفوع:</span><span>${sale.paid.toFixed(2)} ${cur}</span>
      </div>
      ${sale.remaining > 0 ? `<div style="display:flex; justify-content:space-between;"><span>المتبقي:</span><span>${sale.remaining.toFixed(2)} ${cur}</span></div>` : ''}
      <div class="dashed-line"></div>
      <div class="text-center bold" style="margin-top:10px;">شكراً لتعاملكم معنا!</div>
      <script>window.onload=function(){setTimeout(function(){window.print()},300)};<\/script>
    </body></html>
  `);
  win.document.close();
  setTimeout(() => { iframe.remove(); }, 5000);
}
/* ============ استيراد المنتجات من CSV ============ */
function importProductsCSV(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (state.role !== 'manager') return showNotification('للمدير فقط', 'error');

  const reader = new FileReader();
  reader.onload = function(e) {
    const text = e.target.result;
    const lines = text.split('\n');
    let addedCount = 0;

    lines.forEach((line, index) => {
      // تخطي أول سطر (العناوين) والسطور الفاضية
      if (index === 0 || !line.trim()) return;
      
      const cols = line.split(',');
      if (cols.length >= 5) {
        const name = cols[0].trim();
        const barcode = cols[1].trim();
        const price = parseFloat(cols[2]) || 0;
        const cost = parseFloat(cols[3]) || 0;
        const stock = parseInt(cols[4]) || 0;

        if (name) {
          state.products.push({
            id: uid('PRD'),
            name: name,
            barcode: barcode,
            category: 'عام',
            price: price,
            cost: cost,
            stock: stock,
            minStock: 5
          });
          addedCount++;
        }
      }
    });

    if (addedCount > 0) {
      saveData();
      renderProducts();
      showNotification('تم استيراد ' + addedCount + ' منتج بنجاح ✅');
    } else {
      showNotification('لم يتم العثور على بيانات صالحة في الملف', 'warning');
    }
    event.target.value = ''; // تفريغ الحقل
  };
  reader.readAsText(file);
}
function toggleActionMenu(event, id) {
  event.stopPropagation(); // عشان ميقفلش القائمة فوراً
  const menu = document.getElementById('menu-' + id);
  const isShowing = menu.classList.contains('show');
  
  // اقفل أي قائمة تانية مفتوحة
  document.querySelectorAll('.action-dropdown-menu').forEach(m => m.classList.remove('show'));
  
  // افتح القائمة الحالية لو كانت مقفولة
  if (!isShowing) menu.classList.add('show');
}

// اقفل القائمة لو المستخدم دوس في أي مكان في الشاشة
document.addEventListener('click', function() {
  document.querySelectorAll('.action-dropdown-menu').forEach(m => m.classList.remove('show'));
});
/* ============ سجل النشاط (Audit Log) ============ */
function addAuditLog(action, details) {
  const userEmail = state.currentUser ? state.currentUser.email : 'غير معروف';
  const role = state.role === 'manager' ? 'مدير' : 'موظف';
  const logEntry = {
    id: uid('LOG'),
    date: new Date().toISOString(),
    userEmail: userEmail,
    role: role,
    action: action,
    details: details
  };
  if (!state.auditLogs) state.auditLogs = [];
  state.auditLogs.unshift(logEntry);
  if (state.auditLogs.length > 500) state.auditLogs.pop(); // الاحتفاظ بآخر 500 حركة فقط
  saveData();
}

function renderAuditLogs() {
  const container = document.getElementById('auditLogTable');
  if (!container) return;
  
  if (!state.auditLogs || state.auditLogs.length === 0) {
    container.innerHTML = '<p class="text-muted">لا توجد سجلات نشاط حتى الآن.</p>';
    return;
  }
  
  let html = '<div class="table-wrap"><table class="data-table"><thead><tr><th>التاريخ</th><th>المستخدم</th><th>الرتبة</th><th>الإجراء</th><th>التفاصيل</th></tr></thead><tbody>';
  state.auditLogs.forEach(log => {
    html += `<tr>
      <td>${new Date(log.date).toLocaleString('ar-EG')}</td>
      <td>${escapeHTML(log.userEmail)}</td>
      <td>${log.role}</td>
      <td><b>${escapeHTML(log.action)}</b></td>
      <td>${escapeHTML(log.details)}</td>
    </tr>`;
  });
  html += '</tbody></table></div>';
  container.innerHTML = html;
}
function initiateReturnFromSale(saleId) {
  // 1. إغلاق قائمة الخيارات لو مفتوحة
  document.querySelectorAll('.action-dropdown-menu').forEach(m => m.classList.remove('show'));
  
  // 2. الانتقال لصفحة المرتجعات
  showPage('invReturns');
  
  // 3. مهلة صغيرة عشان القائمة تتحدث وبعدين نختار الفاتورة
  setTimeout(() => {
    const saleSel = document.getElementById('returnSale');
    if (saleSel) {
      saleSel.value = saleId;
      updateReturnProducts(); // تحديث قائمة المنتجات
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, 150);
}
/* ============ كشف حساب العميل ============ */


function getStatementData(custId) {
  const cust = state.customers.find(c => c.id === custId);
  if (!cust) return null;

  let transactions = [];
  
  // 1. الفواتير (الديون)
  state.sales.filter(s => s.customerId === custId).forEach(s => {
    if (s.remaining > 0) {
      transactions.push({ date: s.date, desc: 'فاتورة رقم ' + s.id, debit: s.remaining, credit: 0 });
    }
  });

  // 2. التحصيلات (المدفوعات)
  state.customerPayments.filter(p => p.customerId === custId).forEach(p => {
    transactions.push({ date: p.date, desc: 'دفعة (تحصيل)', debit: 0, credit: p.amount });
  });

  // ترتيب حسب التاريخ
  transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

  // حساب الرصيد الافتتاحي
  let totalDebit = transactions.reduce((sum, t) => sum + t.debit, 0);
  let totalCredit = transactions.reduce((sum, t) => sum + t.credit, 0);
  let currentDebt = cust.openingDebt || 0;
  let initialBalance = currentDebt - totalDebit + totalCredit;

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
  
  // السطر الجديد ده (عرض الرصيد السابق)
  if (initialBalance !== 0) {
    message += `🔹 رصيد سابق: ${initialBalance.toFixed(2)} ${cur}\n`;
  }
  
  message += `🔹 الحركات الأخيرة:\n`;
  
  // بنعرض آخر 5 حركات بس عشان الرسالة متبقاش طويلة أوي
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
