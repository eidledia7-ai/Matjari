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

async function deleteFailedOp(opId) {
  const queue = _loadQueue();
  const op = queue.find(o => o.id === opId);
  if (!op) return;

  // ✅ Part B Phase 1: insert_sale → server check + full reversal
  if (op.type === 'insert_sale') {
    return await _deleteFailedSaleOp(op);
  }

  // ✅ Part B Phase 2: insert_return → server check + full reversal
  if (op.type === 'insert_return') {
    return await _deleteFailedReturnOp(op);
  }

  // Legacy path للأنواع الأخرى (insert_expense / insert_customer_payment)
  // — بدون تغيير، سيتم ترقيتها في مراحل لاحقة (Phase 3+)
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
async function _deleteFailedSaleOp(op) {
  const p = op.payload || {};
  const saleId = p.id;
  if (!saleId) return;

  // TODO(i18n): 8 رسائل هاردكود مؤقتًا — تُنقل إلى translations.js
  //             في مرحلة التنظيف بعد Part B (المراحل 2-11 + cleanup pass).
  const MSG_OFFLINE         = 'يجب الاتصال بالإنترنت للتحقق من حالة العملية قبل الحذف.';
  const MSG_SERVER_ERROR    = (msg) => 'تعذر التحقق من السيرفر: ' + msg + '. حاول مرة أخرى.';
  const MSG_EXISTS_TITLE    = 'الفاتورة موجودة على السيرفر';
  const MSG_EXISTS_BODY     = 'الفاتورة رُفعت بنجاح (ربما في محاولة سابقة). حذف العملية من القائمة سيمسحها من الـ queue فقط، والبيانات المحلية ستبقى.';
  const MSG_EXISTS_CONFIRM  = 'حذف من القائمة فقط (البيانات تبقى)';
  const MSG_REVERSAL_CONFIRM= 'لم يتم رفع الفاتورة. سيتم عكس المخزون والرصيد وحذف العملية. متابعة؟';
  const MSG_REVERSAL_FAIL   = (msg) => 'فشل عكس البيانات: ' + msg + '. لم يتم حذف العملية.';

  // ═══════════════════════════════════════════════════════
  // المرحلة 1: Server check (precondition إجباري)
  // ═══════════════════════════════════════════════════════
  if (!navigator.onLine || !supabaseClient) {
    return showNotification(MSG_OFFLINE, 'warning');
  }

  let existsOnServer = false;
  try {
    const { data, error } = await supabaseClient
      .from('sales').select('id').eq('id', saleId).maybeSingle();
    if (error) throw error;
    existsOnServer = !!data;
  } catch (e) {
    return showNotification(MSG_SERVER_ERROR(e.message || 'network'), 'error');
  }

  // ═══════════════════════════════════════════════════════
  // المرحلة 2أ: موجود على السيرفر → حذف من القائمة فقط
  // ═══════════════════════════════════════════════════════
  if (existsOnServer) {
    const choice = confirm(
      MSG_EXISTS_TITLE + '\n\n' + MSG_EXISTS_BODY +
      '\n\n[OK] = ' + MSG_EXISTS_CONFIRM + '\n[Cancel] = إلغاء'
    );
    if (!choice) return;

    const q = _loadQueue();
    const idx = q.findIndex(o => o.id === op.id);
    if (idx !== -1) q.splice(idx, 1);
    _saveQueue(q);

    // امسح _pendingUpload عشان syncDown التالي يجيب النسخة من السيرفر
    const localSale = (state.sales || []).find(s => s.id === saleId);
    if (localSale) delete localSale._pendingUpload;

    if (typeof addAuditLog === 'function') {
      addAuditLog('remove_stale_sale_op', {
        saleId, reason: 'server_has_it', total: Number(p.total) || 0
      }, saleId);
    }

    saveData();
    if (typeof renderAll === 'function') renderAll();
    renderOperationsCenter();
    return showNotification(tr('op_deleted'), 'success');
  }

  // ═══════════════════════════════════════════════════════
  // المرحلة 2ب: مش موجود → تأكيد + reversal
  // ═══════════════════════════════════════════════════════
  if (!confirm(MSG_REVERSAL_CONFIRM)) return;

  // ═══════════════════════════════════════════════════════
  // المرحلة 3: Reversal (synchronous، قبل splice)
  // ═══════════════════════════════════════════════════════
  const sale = (state.sales || []).find(s => s.id === saleId);

  // Idempotency: لو sale مش موجود (reversal سابق نجح، splice فشل)، نروح للمرحلة 4
  if (sale) {
    try {
      const missingProducts = [];
      const items = sale.items || [];

      // 3.1 عكس المخزون
      items.forEach(item => {
        const prod = (state.products || []).find(pr => pr.id === item.id);
        if (prod) {
          prod.stock = (Number(prod.stock) || 0) + (Number(item.qty) || 0);
        } else {
          missingProducts.push(item.id);
        }
      });

      // 3.2 عكس رصيد العميل
      const cid = sale.customer_id || sale.customerId;
      const remaining = Number(sale.remaining) || 0;
      if (cid && remaining > 0) {
        state.customerBalances = state.customerBalances || {};
        state.customerBalances[cid] = (Number(state.customerBalances[cid]) || 0) - remaining;
      }

      // 3.3 عكس points_used (Option A — earned مش بنلمسه)
      const pointsUsed = Number(sale.points_used ?? sale.pointsUsed ?? 0);
      if (cid && pointsUsed > 0) {
        const cust = (state.customers || []).find(c => c.id === cid);
        if (cust) cust.points = (Number(cust.points) || 0) + pointsUsed;
      }

      // 3.4 إزالة من الـ state
      state.sales = (state.sales || []).filter(s => s.id !== saleId);
      state.saleItems = (state.saleItems || []).filter(si =>
        si.sale_id !== saleId && si.saleId !== saleId);

      // 3.5 audit log
      if (typeof addAuditLog === 'function') {
        addAuditLog('remove_failed_sale_op', {
          saleId,
          total: Number(sale.total) || 0,
          itemsRestored: items.length,
          missingProducts,
          balanceReverted: remaining,
          pointsReverted: pointsUsed
        }, saleId);
      }
    } catch (err) {
      if (typeof addAuditLog === 'function') {
        addAuditLog('remove_failed_sale_op_error', {
          saleId, error: err.message || String(err)
        }, saleId);
      }
      return showNotification(MSG_REVERSAL_FAIL(err.message || ''), 'error');
    }
  }

  // ═══════════════════════════════════════════════════════
  // المرحلة 4: Splice from queue (فقط بعد نجاح reversal)
  // ═══════════════════════════════════════════════════════
  const q = _loadQueue();
  const idx = q.findIndex(o => o.id === op.id);
  if (idx !== -1) q.splice(idx, 1);
  _saveQueue(q);

  // ═══════════════════════════════════════════════════════
  // المرحلة 5: Finalize
  // ═══════════════════════════════════════════════════════
  saveData();
  if (typeof renderAll === 'function') renderAll();
  renderOperationsCenter();
  showNotification(tr('op_deleted'), 'success');
}
async function _deleteFailedReturnOp(op) {
  const p = op.payload || {};
  const returnId = p.id;
  if (!returnId) return;

  // TODO(i18n): 8 رسائل هاردكود مؤقتًا — تُنقل إلى translations.js
  //             في مرحلة التنظيف بعد Part B (المراحل 3-11 + cleanup pass).
  const MSG_OFFLINE          = 'يجب الاتصال بالإنترنت للتحقق من حالة العملية قبل الحذف.';
  const MSG_SERVER_ERROR     = (msg) => 'تعذر التحقق من السيرفر: ' + msg + '. حاول مرة أخرى.';
  const MSG_EXISTS_TITLE     = 'المرتجع موجود على السيرفر';
  const MSG_EXISTS_BODY      = 'المرتجع رُفع بنجاح (ربما في محاولة سابقة). حذف العملية من القائمة سيمسحها من الـ queue فقط، والبيانات المحلية ستبقى.';
  const MSG_EXISTS_CONFIRM   = 'حذف من القائمة فقط (البيانات تبقى)';
  const MSG_REVERSAL_CONFIRM = 'لم يتم رفع المرتجع. سيتم عكس المخزون والرصيد وحذف العملية. متابعة؟';
  const MSG_REVERSAL_FAIL    = (msg) => 'فشل عكس البيانات: ' + msg + '. لم يتم حذف العملية.';
  const MSG_DUPLICATE_TITLE  = 'يوجد مرتجع آخر معلّق بنفس الرقم';
  const MSG_DUPLICATE_BODY   = 'لا يمكن عكس البيانات تلقائيًا لوجود عمليات أخرى معلقة لنفس المرتجع. راجع مركز العمليات أولاً.';

  // ═══════════════════════════════════════════════════════
  // المرحلة 0: Duplicate op check
  // ═══════════════════════════════════════════════════════
  const dupQueue = _loadQueue();
  const hasDuplicate = dupQueue.some(o =>
    o.id !== op.id &&
    o.type === 'insert_return' &&
    o.status !== 'synced' &&
    o.payload && o.payload.id === returnId
  );
  if (hasDuplicate) {
    return showNotification(MSG_DUPLICATE_TITLE + ' — ' + MSG_DUPLICATE_BODY, 'warning');
  }

  // ═══════════════════════════════════════════════════════
  // المرحلة 1: Server check (precondition إجباري)
  // ═══════════════════════════════════════════════════════
  if (!navigator.onLine || !supabaseClient) {
    return showNotification(MSG_OFFLINE, 'warning');
  }

  let existsOnServer = false;
  try {
    const { data, error } = await supabaseClient
      .from('returns').select('id').eq('id', returnId).maybeSingle();
    if (error) throw error;
    existsOnServer = !!data;
  } catch (e) {
    return showNotification(MSG_SERVER_ERROR(e.message || 'network'), 'error');
  }

  // ═══════════════════════════════════════════════════════
  // المرحلة 2أ: موجود على السيرفر → حذف من القائمة فقط
  // ═══════════════════════════════════════════════════════
  if (existsOnServer) {
    const choice = confirm(
      MSG_EXISTS_TITLE + '\n\n' + MSG_EXISTS_BODY +
      '\n\n[OK] = ' + MSG_EXISTS_CONFIRM + '\n[Cancel] = إلغاء'
    );
    if (!choice) return;

    const q = _loadQueue();
    const idx = q.findIndex(o => o.id === op.id);
    if (idx !== -1) q.splice(idx, 1);
    _saveQueue(q);

    // امسح _pendingUpload عشان syncDown التالي يجيب النسخة من السيرفر
    const localReturn = (state.returns || []).find(r => r.id === returnId);
    if (localReturn) delete localReturn._pendingUpload;

    if (typeof addAuditLog === 'function') {
      addAuditLog('remove_stale_return_op', {
        returnId, saleId: p.sale_id, reason: 'server_has_it',
        total: Number(p.total) || 0
      }, returnId);
    }

    saveData();
    if (typeof renderAll === 'function') renderAll();
    renderOperationsCenter();
    return showNotification(tr('op_deleted'), 'success');
  }

  // ═══════════════════════════════════════════════════════
  // المرحلة 2ب: مش موجود → تأكيد + reversal
  // ═══════════════════════════════════════════════════════
  if (!confirm(MSG_REVERSAL_CONFIRM)) return;

  // ═══════════════════════════════════════════════════════
  // المرحلة 3: Reversal (synchronous، قبل splice)
  // ═══════════════════════════════════════════════════════
  const ret = (state.returns || []).find(r => r.id === returnId);

  // Idempotency: لو return مش موجود في state (reversal سابق نجح، splice فشل)، نروح للمرحلة 4
  if (ret) {
    try {
      const saleId = ret.sale_id || ret.saleId;
      const productId = ret.product_id || ret.productId;
      const customerId = ret.customer_id || ret.customerId;
      const qty = Number(ret.qty) || 0;
      const returnValue = Number(ret.total) || 0;
      const refundMethod = ret.refund_method || ret.refundMethod;

      const sale = (state.sales || []).find(s => s.id === saleId);
      const prod = (state.products || []).find(pr => pr.id === productId);

      // 3.1 عكس sale.returned_total + net_total
      if (sale) {
        const newReturnedTotal = Math.max(0, (Number(sale.returned_total) || 0) - returnValue);
        sale.returned_total = newReturnedTotal;
        sale.returnedTotal = newReturnedTotal;
        const newNetTotal = Math.max(0, (Number(sale.total) || 0) - newReturnedTotal);
        sale.net_total = newNetTotal;
        sale.netTotal = newNetTotal;
      }

      // 3.2 عكس customerBalances (فقط لو credit)
      let restoredBalance = 0;
      if (refundMethod === 'credit' && customerId) {
        state.customerBalances = state.customerBalances || {};
        state.customerBalances[customerId] =
          (Number(state.customerBalances[customerId]) || 0) + returnValue;
        restoredBalance = returnValue;
      }

      // 3.3 عكس prod.stock
      let restoredStock = 0;
      if (prod) {
        prod.stock = Math.max(0, (Number(prod.stock) || 0) - qty);
        restoredStock = qty;
      }

      // 3.4 إزالة من state.returns
      state.returns = (state.returns || []).filter(r => r.id !== returnId);

      // 3.5 إزالة stock_move المحلي (idempotent)
      let removedLocalStockMoveId = null;
      if (saleId) {
        const expectedReason = tr('return_for_invoice_prefix') + saleId;
        const smCandidates = (state.stockMoves || []).filter(sm =>
          sm.type === 'return' &&
          (sm.product_id === productId || sm.productId === productId) &&
          Number(sm.qty) === qty &&
          sm.reason === expectedReason
        );
        if (smCandidates.length > 0) {
          // الأحدث — sort بـ date desc
          smCandidates.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          removedLocalStockMoveId = smCandidates[0].id;
          state.stockMoves = state.stockMoves.filter(sm => sm.id !== removedLocalStockMoveId);
        }
      }

      // 3.6 audit log
      if (typeof addAuditLog === 'function') {
        addAuditLog('remove_failed_return_op', {
          returnId,
          saleId,
          productId,
          qty,
          returnValue,
          refundMethod,
          restoredStock,
          restoredBalance,
          missingProduct: !prod,
          missingSale: !sale,
          removedLocalStockMoveId
        }, returnId);
      }
    } catch (err) {
      if (typeof addAuditLog === 'function') {
        addAuditLog('remove_failed_return_op_error', {
          returnId, error: err.message || String(err)
        }, returnId);
      }
      return showNotification(MSG_REVERSAL_FAIL(err.message || ''), 'error');
    }
  }

  // ═══════════════════════════════════════════════════════
  // المرحلة 4: Splice from queue (فقط بعد نجاح reversal)
  // ═══════════════════════════════════════════════════════
  const q = _loadQueue();
  const idx = q.findIndex(o => o.id === op.id);
  if (idx !== -1) q.splice(idx, 1);
  _saveQueue(q);

  // ═══════════════════════════════════════════════════════
  // المرحلة 5: Finalize
  // ═══════════════════════════════════════════════════════
  saveData();
  if (typeof renderAll === 'function') renderAll();
  renderOperationsCenter();
  showNotification(tr('op_deleted'), 'success');
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