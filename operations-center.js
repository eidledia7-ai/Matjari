/* ============================================================
   operations-center.js — v7.9.1
   ============================================================ */

let _ocRefreshTimer = null;

function openOperationsCenter() {
  if (typeof showPage === 'function') {
    try { showPage('operationsCenter'); } catch (e) {}
  }
  // ✅ v7.9.1 — تسمية ID صحيحة
  const el = document.getElementById('operationsCenter');
  if (el) {
    document.querySelectorAll('.page').forEach(p => {
      if (p.id !== 'operationsCenter') p.style.display = 'none';
    });
    el.style.display = 'block';
  }
  renderOperationsCenter();
}

function refreshOperationsCenter() {
  if (_ocRefreshTimer) return;
  _ocRefreshTimer = requestAnimationFrame(() => {
    _ocRefreshTimer = null;
    renderOperationsCenter();
  });
}

async function renderOperationsCenter() {
  await Promise.all([renderFailedOps(), renderStockConflicts()]);
  updateOperationsCenterBadge();
}

function updateOperationsCenterBadge() {
  const counts = (typeof getSyncQueueCounts === 'function') ? getSyncQueueCounts() : { failed: 0 };
  const conflicts = Number(state._stockConflictCount) || 0;
  const total = (counts.failed || 0) + conflicts;
  const badge = document.getElementById('opsCenterBadge');
  if (!badge) return;
  if (total > 0) {
    badge.textContent = total > 99 ? '99+' : String(total);
    badge.style.display = 'inline-block';
  } else {
    badge.style.display = 'none';
  }
}

async function renderFailedOps() {
  const container = document.getElementById('failedOpsTable');
  if (!container) return;

  const queue = (typeof _loadQueue === 'function') ? _loadQueue() : [];
  const failed = queue.filter(q =>
    q.status === 'failed' || (q.status === 'pending' && q.attempts >= q.maxAttempts)
  );

  if (failed.length === 0) {
    container.innerHTML = '<p class="text-muted" style="padding:20px;">' + tr('ops_no_failed') + '</p>';
    return;
  }

  const typeLabels = {
    insert_sale:              tr('op_type_sale'),
    insert_return:            tr('op_type_return'),
    insert_expense:           tr('op_type_expense'),
    insert_customer_payment:  tr('op_type_payment'),
    delete_sale:              tr('op_type_delete_sale'),
    delete_expense:           tr('op_type_delete_expense')
  };

  let html = '<div style="margin-bottom:10px;text-align:right;">' +
    '<button class="small-btn primary" onclick="retryAllFailedOps()">🔄 ' +
    tr('op_retry_all') + ' (' + failed.length + ')</button></div>';

  html += '<div class="table-wrap"><table class="data-table"><thead><tr>' +
    '<th>' + tr('op_col_date') + '</th>' +
    '<th>' + tr('op_col_type') + '</th>' +
    '<th>' + tr('op_col_summary') + '</th>' +
    '<th>' + tr('op_col_error') + '</th>' +
    '<th>' + tr('op_col_attempts') + '</th>' +
    '<th>' + tr('op_col_actions') + '</th>' +
    '</tr></thead><tbody>';

  failed.forEach(op => {
    const dateStr = new Date(op.createdAt).toLocaleString(currentLang === 'en' ? 'en-US' : 'ar-EG');
    html += '<tr>' +
      '<td>' + escapeHTML(dateStr) + '</td>' +
      '<td>' + escapeHTML(typeLabels[op.type] || op.type) + '</td>' +
      '<td>' + _summarizeOp(op) + '</td>' +
      '<td style="color:#c0392b;font-size:11px;">' + escapeHTML((op.lastError || '').slice(0, 80)) + '</td>' +
      '<td>' + (op.attempts || 0) + '/' + (op.maxAttempts || 5) + '</td>' +
      '<td style="white-space:nowrap;">' +
        '<button class="small-btn primary" onclick="retryFailedOp(\'' + op.id + '\')">🔄 ' + tr('op_retry') + '</button>' +
        '<button class="small-btn grey" onclick="showOpDetails(\'' + op.id + '\')">👁️</button>' +
        '<button class="small-btn red" onclick="deleteFailedOp(\'' + op.id + '\')">🗑️</button>' +
      '</td>' +
      '</tr>';
  });
  html += '</tbody></table></div>';
  container.innerHTML = html;
}

function _summarizeOp(op) {
  const p = op.payload || {};
  const cur = state.storeSettings?.currency || '';
  if (op.type === 'insert_sale')   return escapeHTML('#' + (p.id || '?') + ' — ' + (Number(p.total) || 0).toFixed(2) + ' ' + cur);
  if (op.type === 'insert_return') return escapeHTML('#' + (p.sale_id || '?') + ' — ' + (p.product_name || '') + ' × ' + (p.qty || 0));
  if (op.type === 'insert_expense') return escapeHTML((p.name || '') + ' — ' + (Number(p.amount) || 0).toFixed(2));
  if (op.type === 'insert_customer_payment') return escapeHTML((p.customer_name || '') + ' — ' + (Number(p.amount) || 0).toFixed(2));
  if (op.type === 'delete_sale' || op.type === 'delete_expense') return escapeHTML('#' + (p.id || '?'));
  return '-';
}

function showOpDetails(opId) {
  const queue = _loadQueue();
  const op = queue.find(o => o.id === opId);
  if (!op) return;
  const modal = document.getElementById('opDetailsModal');
  const body = document.getElementById('opDetailsBody');
  if (!modal || !body) { alert(JSON.stringify(op, null, 2)); return; }
  body.innerHTML = '<pre style="direction:ltr;text-align:left;background:#f1f6f8;padding:12px;border-radius:6px;font-size:11px;overflow:auto;max-height:50vh;white-space:pre-wrap;">'
    + escapeHTML(JSON.stringify(op, null, 2)) + '</pre>';
  modal.style.display = 'flex';
}

function closeOpDetails() {
  const m = document.getElementById('opDetailsModal');
  if (m) m.style.display = 'none';
}

async function retryFailedOp(opId) {
  if (!navigator.onLine) return showNotification(tr('conn_offline'), 'warning');
  const queue = _loadQueue();
  const op = queue.find(o => o.id === opId);
  if (!op) return;
  op.status = 'pending'; op.attempts = 0; op.lastError = null;
  _saveQueue(queue);
  showNotification(tr('op_retrying'), 'info');
  await drainSyncQueue();
  renderOperationsCenter();
}

async function retryAllFailedOps() {
  if (!navigator.onLine) return showNotification(tr('conn_offline'), 'warning');
  const queue = _loadQueue();
  let reset = 0;
  queue.forEach(op => {
    if (op.status === 'failed') {
      op.status = 'pending'; op.attempts = 0; op.lastError = null; reset++;
    }
  });
  if (!reset) return;
  _saveQueue(queue);
  showNotification(tr('op_retrying_all') + ' (' + reset + ')', 'info');
  await drainSyncQueue();
  renderOperationsCenter();
}

function deleteFailedOp(opId) {
  const queue = _loadQueue();
  const op = queue.find(o => o.id === opId);
  if (!op) return;
  if (!confirm(tr('op_delete_confirm') + '\n\n' + tr('op_delete_warning'))) return;

  const idx = queue.findIndex(o => o.id === opId);
  if (idx !== -1) queue.splice(idx, 1);
  _saveQueue(queue);

  _removeLocalDataForOp(op);
  saveData();
  if (typeof renderAll === 'function') renderAll();
  renderOperationsCenter();
  showNotification(tr('op_deleted'), 'success');
}

function _removeLocalDataForOp(op) {
  const p = op.payload || {};
  if (op.type === 'insert_sale' && p.id) {
    state.sales = (state.sales || []).filter(s => s.id !== p.id);
    state.saleItems = (state.saleItems || []).filter(si => si.sale_id !== p.id);
  } else if (op.type === 'insert_return' && p.id) {
    state.returns = (state.returns || []).filter(r => r.id !== p.id);
  } else if (op.type === 'insert_expense' && p.id) {
    state.expenses = (state.expenses || []).filter(e => e.id !== p.id);
  } else if (op.type === 'insert_customer_payment' && p.id) {
    state.customerPayments = (state.customerPayments || []).filter(cp => cp.id !== p.id);
  }
}

async function renderStockConflicts() {
  const container = document.getElementById('stockConflictsTable');
  if (!container) return;

  if (!navigator.onLine || !supabaseClient) {
    container.innerHTML = '<p class="text-muted" style="padding:20px;">' + tr('ops_requires_online') + '</p>';
    return;
  }

  try {
    const ownerId = (state.role === 'employee' && state.ownerId) ? state.ownerId : state.currentUser?.id;
    const { data, error } = await supabaseClient.rpc('get_flagged_sales', { p_user_id: ownerId });
    if (error) throw error;
    const flagged = Array.isArray(data) ? data : [];
    state._stockConflictCount = flagged.length;
    updateOperationsCenterBadge();

    if (flagged.length === 0) {
      container.innerHTML = '<p class="text-muted" style="padding:20px;">' + tr('ops_no_conflicts') + '</p>';
      return;
    }

    let html = '<div class="table-wrap"><table class="data-table"><thead><tr>' +
      '<th>' + tr('op_col_invoice') + '</th>' +
      '<th>' + tr('op_col_date') + '</th>' +
      '<th>' + tr('op_col_customer') + '</th>' +
      '<th>' + tr('op_col_negative_items') + '</th>' +
      '<th>' + tr('op_col_total') + '</th>' +
      '<th>' + tr('op_col_actions') + '</th>' +
      '</tr></thead><tbody>';

    flagged.forEach(sale => {
      const cust = (state.customers || []).find(c => c.id === sale.customer_id);
      const custName = cust ? cust.name : tr('cash_customer');
      const dateStr = new Date(sale.date).toLocaleString(currentLang === 'en' ? 'en-US' : 'ar-EG');
      const negItems = (sale.items || [])
        .filter(i => Number(i.current_stock) < 0)
        .map(i => escapeHTML(i.product_name) + ' (' + Number(i.current_stock) + ')')
        .join(' • ') || '-';
      const total = Number(sale.total) || 0;
      const cur = state.storeSettings?.currency || '';

      html += '<tr>' +
        '<td>' + escapeHTML(sale.id) + '</td>' +
        '<td>' + escapeHTML(dateStr) + '</td>' +
        '<td>' + escapeHTML(custName) + '</td>' +
        '<td style="color:#c0392b;font-size:11px;">' + negItems + '</td>' +
        '<td>' + total.toFixed(2) + ' ' + cur + '</td>' +
        '<td style="white-space:nowrap;">' +
          '<button class="small-btn orange" onclick="viewConflictSale(\'' + sale.id + '\')">👁️</button>' +
          '<button class="small-btn red" onclick="voidConflictSale(\'' + sale.id + '\')">🚫 ' + tr('op_void_sale') + '</button>' +
          '<button class="small-btn grey" onclick="markConflictReviewed(\'' + sale.id + '\')">✅</button>' +
        '</td>' +
        '</tr>';
    });
    html += '</tbody></table></div>';
    container.innerHTML = html;
  } catch (e) {
    container.innerHTML = '<p class="text-muted" style="padding:20px;">' + tr('ops_load_error') + ': ' + escapeHTML(e.message) + '</p>';
  }
}

function viewConflictSale(saleId) {
  if (typeof printThermalInvoice === 'function') printThermalInvoice(saleId);
}

async function voidConflictSale(saleId) {
  if (!confirm(tr('op_void_confirm'))) return;
  if (typeof executeDeleteRecord === 'function') {
    await executeDeleteRecord('sale', saleId);
    renderOperationsCenter();
  }
}

async function markConflictReviewed(saleId) {
  try {
    const ownerId = (state.role === 'employee' && state.ownerId) ? state.ownerId : state.currentUser?.id;
    const { error } = await supabaseClient.rpc('mark_stock_conflict_reviewed', {
      p_user_id: ownerId, p_sale_id: saleId
    });
    if (error) throw error;
    showNotification(tr('op_marked_reviewed'), 'success');
    renderStockConflicts();
  } catch (e) {
    showNotification('Error: ' + e.message, 'error');
  }
}

window.addEventListener('syncqueue:changed', () => {
  // ✅ v7.9.1 — تسمية ID صحيحة
  const page = document.getElementById('operationsCenter');
  if (page && page.style.display !== 'none') refreshOperationsCenter();
  else updateOperationsCenterBadge();
});

window.addEventListener('stockconflicts:changed', () => {
  updateOperationsCenterBadge();
  // ✅ v7.9.1 — تسمية ID صحيحة
  const page = document.getElementById('operationsCenter');
  if (page && page.style.display !== 'none') renderStockConflicts();
});

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(updateOperationsCenterBadge, 1200);
});