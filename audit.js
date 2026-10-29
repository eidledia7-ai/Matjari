/* ============ سجل النشاط (Audit Log) ============ */
/**
 * إضافة سطر لسجل النشاط.
 * @param {string} action - نوع العملية (مثال: 'delete_product', 'apply_discount', 'drawer_expense', 'close_shift').
 * @param {object|string} details - تفاصيل العملية (سيتم تخزينها كنص JSON لو كائن).
 * @param {string} [entityId] - معرّف الكيان المتأثر (اختياري).
 */
function addAuditLog(action, details, entityId) {
  try {
    const entry = {
      id: 'AUD-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      at: new Date().toISOString(),
      action: String(action || 'unknown'),
      entityId: entityId || null,
      details: (typeof details === 'string') ? details : JSON.stringify(details || {}),
      userId: state.currentUser ? state.currentUser.id : null,
      role: state.role,
      cashier: state.currentUser ? (state.currentUser.email || state.currentUser.id) : null
    };
    state.auditLogs = state.auditLogs || [];
    state.auditLogs.push(entry);
    if (state.auditLogs.length > 5000) state.auditLogs = state.auditLogs.slice(-5000);
    if (typeof saveData === 'function') saveData();
  } catch (e) {
    console.warn('addAuditLog failed:', e);
  }
}

/**
 * عرض سجل النشاط في الجدول.
 * يدعم الشكلين: القديم (date/userEmail) والجديد (at/cashier/userId).
 */
function renderAuditLogs() {
  const container = document.getElementById('auditLogTable');
  if (!container) return;

  if (!state.auditLogs || state.auditLogs.length === 0) {
    container.innerHTML = '<p class="text-muted">لا توجد سجلات نشاط حتى الآن.</p>';
    return;
  }

  const locale = (typeof currentLang !== 'undefined' && currentLang === 'en') ? 'en-US' : 'ar-EG';
  let html = '<div class="table-wrap"><table class="data-table"><thead><tr><th>التاريخ</th><th>المستخدم</th><th>الرتبة</th><th>الإجراء</th><th>التفاصيل</th></tr></thead><tbody>';
  state.auditLogs.forEach(log => {
    const dateVal = log.date || log.at || new Date().toISOString();
    const userVal = log.userEmail || log.cashier || log.userId || 'غير معروف';
    const roleVal = log.role === 'manager' ? 'مدير' : (log.role === 'employee' ? 'موظف' : (log.role || '-'));
    const actionVal = log.action || '-';
    let detailsVal = log.details;
    if (detailsVal && typeof detailsVal === 'object') detailsVal = JSON.stringify(detailsVal);
    if (!detailsVal) detailsVal = '-';

    html += `<tr>
      <td>${new Date(dateVal).toLocaleString(locale)}</td>
      <td>${escapeHTML(String(userVal))}</td>
      <td>${escapeHTML(String(roleVal))}</td>
      <td><b>${escapeHTML(String(actionVal))}</b></td>
      <td>${escapeHTML(String(detailsVal))}</td>
    </tr>`;
  });
  html += '</tbody></table></div>';
  container.innerHTML = html;
}