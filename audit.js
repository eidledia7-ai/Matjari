/* ============ سجل النشاط (Audit Log) ============ */
async function addAuditLog(action, details, entityId) {
  try {
    const ownerId = (state.role === 'employee' && state.ownerId) ? state.ownerId : (state.currentUser ? state.currentUser.id : null);
    if (!ownerId) return;

    const entry = {
      id: 'AUD-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      user_id: state.currentUser ? state.currentUser.id : null,
      owner_id: ownerId,
      role: state.role,
      action: String(action || 'unknown'),
      details: (typeof details === 'string') ? details : JSON.stringify(details || {}),
      created_at: new Date().toISOString()
    };

    // إضافة للـ State عشان تظهر في الواجهة فوراً
    state.auditLogs = state.auditLogs || [];
    state.auditLogs.push({
      id: entry.id, action: entry.action, details: entry.details,
      date: entry.created_at, userId: entry.user_id, role: entry.role
    });
    if (state.auditLogs.length > 5000) state.auditLogs = state.auditLogs.slice(-5000);

    // الرفع للسيرفر
    if (navigator.onLine && supabaseClient) {
      const { error } = await supabaseClient.from('audit_logs').insert(entry);
      if (error) console.warn('Audit log upload failed:', error);
    }

    if (typeof saveData === 'function') saveData();
  } catch (e) {
    console.warn('addAuditLog failed:', e);
  }
}

function renderAuditLogs() {
  const container = document.getElementById('auditLogsTable');
  if (!container) return;

  if (!state.auditLogs || state.auditLogs.length === 0) {
    container.innerHTML = '<p class="text-muted">لا توجد سجلات نشاط حتى الآن.</p>';
    return;
  }

  // 1. قاموس لترجمة أسماء الإجراءات (Action Codes) إلى نصوص واضحة
  const actionLabels = {
    'add_expense': '💸 إضافة مصروف',
    'drawer_expense': '💵 مصروف من الدرج',
    'record_customer_payment': '💰 تحصيل من عميل',
    'record_supplier_payment': '💳 سداد لمورد',
    'add_customer': '👤 إضافة عميل',
    'edit_customer': '✏️ تعديل عميل',
    'delete_customer': '🗑️ حذف عميل',
    'add_supplier': '🏭 إضافة مورد',
    'edit_supplier': '✏️ تعديل مورد',
    'add_purchase': '📦 تسجيل مشتريات',
    'delete_purchase': '🗑️ حذف مشتريات',
    'apply_discount': '🏷️ تطبيق خصم',
    'delete_sale': '🗑️ حذف فاتورة',
    'close_shift': '🔒 إغلاق وردية',
    'quick_add_stock': '➕ إضافة كمية سريعة',
    'stock_adjustment': '⚖️ جرد مخزون',
    'add_product': '📦 إضافة منتج',
    'edit_product': '✏️ تعديل منتج',
    'delete_product': '🗑️ حذف منتج',
    'add_return': '🔄 تسجيل مرتجع',
    'import_products_csv': '📥 استيراد منتجات (CSV)',
    'clear_table_log': '🧹 تصفير سجلات'
  };

  // 2. دالة لتحويل تفاصيل الـ JSON إلى نص مفهوم
  const formatDetails = (action, details) => {
    if (!details) return '-';
    
    // تحويل التفاصيل لنص لو كانت object
    let d = details;
    if (typeof details === 'string') {
      try { d = JSON.parse(details); } catch (e) { return details; }
    }

    switch (action) {
      case 'add_expense':
      case 'drawer_expense':
        return `البند: ${d.name || d.reason || 'غير محدد'} | المبلغ: ${d.amount} ج.م`;
      case 'record_customer_payment':
        return `تحصيل مبلغ: ${d.amount} ج.م`;
      case 'add_customer':
      case 'edit_customer':
        return `العميل: ${d.name || 'غير محدد'}`;
      case 'delete_sale':
        return `فاتورة رقم: ${d.saleId} | بقيمة: ${d.total} ج.م`;
      case 'apply_discount':
        return `خصم بقيمة: ${d.discount} ج.م على فاتورة: ${d.saleId}`;
      case 'add_return':
        return `مرتجع فاتورة: ${d.saleId} | الكمية: ${d.qty} | الاسترداد: ${d.refundMethod === 'cash' ? 'كاش' : 'خصم دين'}`;
      case 'record_supplier_payment':
        return `سداد مبلغ: ${d.amount} ج.م للمورد`;
      case 'add_purchase':
        return `مشتريات بقيمة: ${d.total} ج.م`;
      default:
        // لو مفيش صيغة مخصصة، نعرض الـ JSON بس بشكل مرتب
        return Object.entries(d).map(([key, val]) => `${key}: ${val}`).join(' | ');
    }
  };

  let html = '<div class="table-wrap"><table class="data-table"><thead><tr><th>التاريخ والوقت</th><th>المستخدم</th><th>الرتبة</th><th>الإجراء</th><th>التفاصيل</th></tr></thead><tbody>';
  
  state.auditLogs.forEach(function(log) {
    // 3. استخراج اسم المستخدم (لو المدير الحالي، نعرض إيميله، لو موظف، نعرض ID مختصر)
    let userName = 'مستخدم غير معروف';
    if (log.userId === state.currentUser?.id || log.user_id === state.currentUser?.id) {
      userName = state.currentUser.email;
    } else {
      // لو مش اليوزر الحالي، بنعرض اختصار للـ ID
      const uid = log.userId || log.user_id || '';
      userName = uid.substring(0, 8) + '...';
    }

    // 4. ترجمة الإجراء
    const actionCode = log.action;
    const actionText = actionLabels[actionCode] || actionCode;

    // 5. ترجمة التفاصيل
    const detailsText = formatDetails(actionCode, log.details);

    // 6. تنسيق الوقت
    const dateObj = new Date(log.date);
    const dateStr = dateObj.toLocaleDateString(currentLang === 'en' ? 'en-US' : 'ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
    const timeStr = dateObj.toLocaleTimeString(currentLang === 'en' ? 'en-US' : 'ar-EG', { hour: '2-digit', minute: '2-digit' });

    // 7. لون للرتبة
    const roleText = log.role === 'manager' ? 'مدير' : 'موظف';
    const roleBadge = log.role === 'manager' 
      ? '<span style="background:#e0f2fe; color:#0284c7; padding:2px 8px; border-radius:4px; font-size:12px; font-weight:bold;">مدير</span>'
      : '<span style="background:#f3f4f6; color:#4b5563; padding:2px 8px; border-radius:4px; font-size:12px; font-weight:bold;">موظف</span>';

    html += '<tr>' +
      '<td style="white-space:nowrap; font-size:13px;">' + dateStr + '<br><span style="color:#888; font-size:11px;">' + timeStr + '</span></td>' +
      '<td><span title="' + (log.userId || '') + '">' + escapeHTML(userName) + '</span></td>' +
      '<td>' + roleBadge + '</td>' +
      '<td><b>' + actionText + '</b></td>' +
      '<td style="font-size:13px; color:#555;">' + escapeHTML(detailsText) + '</td>' +
      '</tr>';
  });
  
  html += '</tbody></table></div>';
  container.innerHTML = html;
}