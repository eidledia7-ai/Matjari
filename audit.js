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

    state.auditLogs = state.auditLogs || [];
    state.auditLogs.push({
      id: entry.id, action: entry.action, details: entry.details,
      date: entry.created_at, userId: entry.user_id, role: entry.role,
      uploaded: false
    });
    if (state.auditLogs.length > 5000) state.auditLogs = state.auditLogs.slice(-5000);

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
  const container = document.getElementById('auditLogsTable') || document.getElementById('auditLogTable');
  if (!container) return;

  if (!state.auditLogs || state.auditLogs.length === 0) {
    container.innerHTML = '<p class="text-muted">' + tr('audit_no_logs') + '</p>';
    return;
  }

  // ✅ v7.10.2 — action labels عبر tr() + 33 كود (22 موجود + 11 جديد)
  const actionLabels = {
    'add_expense':                    tr('audit_action_add_expense'),
    'drawer_expense':                 tr('audit_action_drawer_expense'),
    'record_customer_payment':        tr('audit_action_record_customer_payment'),
    'record_supplier_payment':        tr('audit_action_record_supplier_payment'),
    'add_customer':                   tr('audit_action_add_customer'),
    'edit_customer':                  tr('audit_action_edit_customer'),
    'delete_customer':                tr('audit_action_delete_customer'),
    'add_supplier':                   tr('audit_action_add_supplier'),
    'edit_supplier':                  tr('audit_action_edit_supplier'),
    'delete_supplier':                tr('audit_action_delete_supplier'),
    'add_purchase':                   tr('audit_action_add_purchase'),
    'delete_purchase':                tr('audit_action_delete_purchase'),
    'apply_discount':                 tr('audit_action_apply_discount'),
    'delete_sale':                    tr('audit_action_delete_sale'),
    'delete_expense':                 tr('audit_action_delete_expense'),
    'close_shift':                    tr('audit_action_close_shift'),
    'quick_add_stock':                tr('audit_action_quick_add_stock'),
    'stock_adjustment':               tr('audit_action_stock_adjustment'),
    'add_product':                    tr('audit_action_add_product'),
    'edit_product':                   tr('audit_action_edit_product'),
    'delete_product':                 tr('audit_action_delete_product'),
    'add_return':                     tr('audit_action_add_return'),
    'import_products_csv':            tr('audit_action_import_products_csv'),
    'clear_table_log':                tr('audit_action_clear_table_log'),
    'invite_staff':                   tr('audit_action_invite_staff'),
    'deactivate_staff':               tr('audit_action_deactivate_staff'),
    'save_store_settings':            tr('audit_action_save_store_settings'),
    'clear_all_data':                 tr('audit_action_clear_all_data'),
    'export_backup':                  tr('audit_action_export_backup'),
    'import_backup':                  tr('audit_action_import_backup'),
    'auto_backup_success':            tr('audit_action_auto_backup_success'),
    'auto_backup_failed':             tr('audit_action_auto_backup_failed'),
    'stock_conflict_detected':        tr('audit_action_stock_conflict_detected')
  };

  // ✅ v7.10.2 — safety net
  const humanize = (code) => code.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const formatDetails = (action, details) => {
    if (!details) return '-';
    let d = details;
    if (typeof details === 'string') {
      try { d = JSON.parse(details); } catch (e) { return details; }
    }

    switch (action) {
      case 'add_expense':
      case 'drawer_expense':
        return tr('audit_detail_expense_template')
          .replace('{name}', d.name || d.reason || '-')
          .replace('{amount}', d.amount || 0);
      case 'record_customer_payment':
        return tr('audit_detail_payment_template').replace('{amount}', d.amount || 0);
      case 'add_customer':
      case 'edit_customer':
        return tr('audit_detail_customer_template').replace('{name}', d.name || '-');
      case 'delete_sale':
        return tr('audit_detail_sale_delete_template')
          .replace('{id}', d.saleId || '-')
          .replace('{total}', d.total || 0);
      case 'apply_discount':
        return tr('audit_detail_discount_template')
          .replace('{discount}', d.discount || 0)
          .replace('{saleId}', d.saleId || '-');
      case 'add_return': {
        const methodLabel = d.refundMethod === 'cash' ? tr('refund_cash')
          : (d.refundMethod === 'credit' ? tr('refund_credit') : tr('none_method'));
        return tr('audit_detail_return_template')
          .replace('{saleId}', d.saleId || '-')
          .replace('{qty}', d.qty || 0)
          .replace('{method}', methodLabel);
      }
      case 'record_supplier_payment':
        return tr('audit_detail_supplier_payment_template').replace('{amount}', d.amount || 0);
      case 'add_purchase':
        return tr('audit_detail_purchase_template').replace('{total}', d.total || 0);
      default:
        return Object.entries(d).map(([key, val]) => `${key}: ${val}`).join(' | ');
    }
  };

  let html = '<div class="table-wrap"><table class="data-table"><thead><tr><th>' + tr('th_date') + '</th><th>' + tr('th_user') + '</th><th>' + tr('th_role') + '</th><th>' + tr('th_action') + '</th><th>' + tr('th_details') + '</th></tr></thead><tbody>';

  state.auditLogs.forEach(function(log) {
    let userName = tr('audit_unknown_user');
    if (log.userId === state.currentUser?.id || log.user_id === state.currentUser?.id) {
      userName = state.currentUser.email;
    } else {
      const uid = log.userId || log.user_id || '';
      userName = uid.substring(0, 8) + '...';
    }

    const actionCode = log.action;
    const actionText = actionLabels[actionCode] || humanize(actionCode);
    const detailsText = formatDetails(actionCode, log.details);

    const dateObj = new Date(log.date);
    const dateStr = dateObj.toLocaleDateString(currentLang === 'en' ? 'en-US' : 'ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
    const timeStr = dateObj.toLocaleTimeString(currentLang === 'en' ? 'en-US' : 'ar-EG', { hour: '2-digit', minute: '2-digit' });

    const roleBadge = log.role === 'manager'
      ? '<span style="background:#e0f2fe; color:#0284c7; padding:2px 8px; border-radius:4px; font-size:12px; font-weight:bold;">' + tr('audit_role_manager') + '</span>'
      : '<span style="background:#f3f4f6; color:#4b5563; padding:2px 8px; border-radius:4px; font-size:12px; font-weight:bold;">' + tr('audit_role_employee') + '</span>';

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
