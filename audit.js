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
  const container = document.getElementById('auditLogTable');
  if (!container) return;

  if (!state.auditLogs || state.auditLogs.length === 0) {
    container.innerHTML = '<p class="text-muted">لا توجد سجلات نشاط حتى الآن.</p>';
    return;
  }

  const locale = (typeof currentLang !== 'undefined' && currentLang === 'en') ? 'en-US' : 'ar-EG';
  let html = '<div class="table-wrap"><table class="data-table"><thead><tr><th>التاريخ</th><th>المستخدم</th><th>الرتبة</th><th>الإجراء</th><th>التفاصيل</th></tr></thead><tbody>';
  
  state.auditLogs.forEach(log => {
    const dateVal = log.date || new Date().toISOString();
    const roleVal = log.role === 'manager' ? 'مدير' : (log.role === 'employee' ? 'موظف' : (log.role || '-'));
    const actionVal = log.action || '-';
    let detailsVal = log.details;
    if (detailsVal && typeof detailsVal === 'object') detailsVal = JSON.stringify(detailsVal);
    if (!detailsVal) detailsVal = '-';

    html += `<tr>
      <td>${new Date(dateVal).toLocaleString(locale)}</td>
      <td>${escapeHTML(log.userId || 'مستخدم')}</td>
      <td>${escapeHTML(String(roleVal))}</td>
      <td><b>${escapeHTML(String(actionVal))}</b></td>
      <td>${escapeHTML(String(detailsVal))}</td>
    </tr>`;
  });
  html += '</tbody></table></div>';
  container.innerHTML = html;
}