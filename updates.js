/* ============ تحديثات التطبيق ============ */
async function checkForUpdates() {
  if (!('serviceWorker' in navigator)) {
    // ✅ v7.10.2 — ترجمة
    return showNotification(tr('update_browser_unsupported'), 'info');
  }
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    // ✅ v7.10.2 — ترجمة
    if (!reg) return showNotification(tr('update_no_sw'), 'warning');
    await reg.update();
    if (reg.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
      // ✅ v7.10.2 — ترجمة
      showNotification(tr('update_ready_reloading'), 'info');
    } else {
      // ✅ v7.10.2 — ترجمة
      showNotification(tr('update_up_to_date'));
    }
  } catch (e) {
    // ✅ v7.10.2 — ترجمة
    showNotification(tr('update_failed'), 'error');
  }
}

async function clearAppCache() {
  if (!confirm(tr('msg_clear_cache'))) return;
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.active) {
        const channel = new MessageChannel();
        reg.active.postMessage({ type: 'CLEAR_CACHES' }, [channel.port2]);
        await new Promise(function(resolve) {
          let done = false;
          channel.port1.onmessage = function() { if (!done) { done = true; resolve(); } };
          setTimeout(function() { if (!done) { done = true; resolve(); } }, 1500);
        });
      }
    }
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(names.map(function(n) { return caches.delete(n); }));
    }
  } catch (e) {
    console.warn('Clear cache error:', e);
  }
  location.reload();
}
/* ============ v7.20 — Diagnostics (Pro) ============ */
function showDiagnostics() {
  // تاريخ أول استخدام (يتسجل تلقائياً)
  if (!localStorage.getItem('matjari_first_use')) {
    localStorage.setItem('matjari_first_use', new Date().toISOString());
  }

  const cacheOwnerId = (state.role === 'employee' && state.ownerId) ? state.ownerId : (state.currentUser?.id || '');
  const raw = localStorage.getItem('matjari_cache_' + cacheOwnerId) || '';
  const bytes = new Blob([raw]).size;
  const sizeMB = (bytes / (1024 * 1024)).toFixed(2);
  const sizeText = bytes > 1024 * 1024 ? sizeMB + ' MB' : (bytes / 1024).toFixed(0) + ' KB';
  const sizeColor = bytes > 5*1024*1024 ? '#c0392b' : (bytes > 3*1024*1024 ? '#d97706' : '#2e7d32');

  const storeName = state.storeSettings?.name || 'غير معروف';
  const email = state.currentUser?.email || 'غير معروف';
  const role = state.role === 'manager' ? 'مدير' : 'موظف';
  const firstUse = localStorage.getItem('matjari_first_use');
  const usageDays = firstUse ? Math.floor((Date.now() - new Date(firstUse).getTime()) / 86400000) : 0;

  const sub = state.subscription || {};
  const plan = sub.plan || 'trial';
  let subExpiry = 'غير معروف';
  if (sub.plan === 'trial' && sub.trial_ends_at) subExpiry = new Date(sub.trial_ends_at).toLocaleDateString('ar-EG');
  else if (sub.expires_at) subExpiry = new Date(sub.expires_at).toLocaleDateString('ar-EG');

  // ===== كشف المشاكل =====
  const issues = [];
  if (bytes > 5*1024*1024) issues.push({ l: 'critical', t: `حجم الكاش ${sizeText} — أكبر من 5MB (خطر)` });
  else if (bytes > 3*1024*1024) issues.push({ l: 'warning', t: `حجم الكاش ${sizeText} — أكبر من 3MB (ينصح بالتنظيف)` });

  const negStock = state.products.filter(p => Number(p.stock) < 0);
  if (negStock.length) issues.push({ l: 'critical', t: `${negStock.length} منتج بمخزون سالب (تعارض)` });

  const noBarcode = state.products.filter(p => !p.barcode);
  if (noBarcode.length) issues.push({ l: 'info', t: `${noBarcode.length} منتج بدون باركود` });

  const lowStock = state.products.filter(p => {
    const min = Number(p.minStock ?? p.min_stock) || 5;
    return Number(p.stock) <= min && Number(p.stock) > 0;
  });
  if (lowStock.length) issues.push({ l: 'warning', t: `${lowStock.length} منتج عند حد التنبيه` });

  if (sub.status !== 'active') issues.push({ l: 'critical', t: `الاشتراك غير نشط (${sub.status})` });

  try {
    if (typeof getSyncQueueCounts === 'function') {
      const q = getSyncQueueCounts();
      if (q.failed > 0) issues.push({ l: 'critical', t: `${q.failed} عملية مزامنة فاشلة` });
      if (q.pending > 0) issues.push({ l: 'warning', t: `${q.pending} عملية معلقة` });
    }
  } catch(e) {}

  const lastBackup = state.storeSettings?.lastAutoBackupAt;
  if (!lastBackup) issues.push({ l: 'warning', t: 'لا توجد نسخة احتياطية تلقائية' });
  else {
    const d = Math.floor((Date.now() - new Date(lastBackup).getTime()) / 86400000);
    if (d > 7) issues.push({ l: 'warning', t: `آخر نسخة احتياطية منذ ${d} يوم` });
  }

  const conflicts = Number(state._stockConflictCount) || 0;
  if (conflicts > 0) issues.push({ l: 'critical', t: `${conflicts} فاتورة بتعارض مخزون` });

  // ===== التقرير النصي =====
  const lines = [
    '═══ تقرير تشخيص متجري ═══',
    `🏪 المتجر: ${storeName}`,
    `👤 المستخدم: ${email}`,
    `🔑 الدور: ${role}`,
    `📅 أول استخدام: ${firstUse ? new Date(firstUse).toLocaleDateString('ar-EG') : 'غير معروف'}`,
    `⏱️ مدة الاستخدام: ${usageDays} يوم`,
    `💳 الخطة: ${plan} (حتى ${subExpiry})`,
    '',
    '── البيانات ──',
    `📊 حجم الكاش: ${sizeText}`,
    `📦 المنتجات: ${state.products.length}`,
    `👥 العملاء: ${state.customers.length}`,
    `🧾 المبيعات: ${state.sales.length}`,
    `💰 المصروفات: ${state.expenses.length}`,
    `🔄 المرتجعات: ${state.returns.length}`,
    `📈 حركات المخزون: ${state.stockMoves.length}`,
    `🛒 المشتريات: ${state.purchases.length}`,
    `💵 مدفوعات العملاء: ${state.customerPayments.length}`,
    `💳 مدفوعات الموردين: ${state.supplierPayments.length}`,
    '',
    '── المشاكل المكتشفة ──',
  ];
  if (issues.length === 0) lines.push('✅ لا توجد مشاكل');
  else issues.forEach(i => lines.push(`${i.l === 'critical' ? '🔴' : (i.l === 'warning' ? '🟡' : 'ℹ️')} ${i.t}`));
  lines.push('');
  lines.push('📱 الإصدار: v7.20.0');
  lines.push(`🕐 ${new Date().toLocaleString('ar-EG')}`);
  const reportText = lines.join('\n');

  // ===== المودال =====
  const old = document.getElementById('diagnosticsModal');
  if (old) old.remove();

  let issuesHtml = '';
  if (issues.length === 0) {
    issuesHtml = '<div style="text-align:center;padding:15px;color:#2e7d32;font-weight:bold;">✅ لا توجد مشاكل</div>';
  } else {
    issues.forEach(i => {
      const bg = i.l === 'critical' ? '#fef2f2' : (i.l === 'warning' ? '#fffbeb' : '#eff6ff');
      const c = i.l === 'critical' ? '#c0392b' : (i.l === 'warning' ? '#d97706' : '#2563eb');
      const ic = i.l === 'critical' ? '🔴' : (i.l === 'warning' ? '🟡' : 'ℹ️');
      issuesHtml += `<div style="background:${bg};color:${c};padding:10px;border-radius:8px;margin-bottom:6px;font-size:12px;font-weight:bold;">${ic} ${escapeHTML(i.t)}</div>`;
    });
  }

  const modal = document.createElement('div');
  modal.id = 'diagnosticsModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto;';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:14px;max-width:440px;width:100%;max-height:90vh;overflow-y:auto;padding:20px;box-shadow:0 10px 40px rgba(0,0,0,0.3);">
      <h3 style="margin:0 0 15px 0;color:#17364c;text-align:center;">${tr('diag_title')}</h3>
      <div style="background:#f1f6f8;padding:12px;border-radius:8px;margin-bottom:12px;font-size:12px;line-height:1.8;">
        <div><b>المتجر:</b> ${escapeHTML(storeName)}</div>
        <div><b>المستخدم:</b> ${escapeHTML(email)}</div>
        <div><b>مدة الاستخدام:</b> ${usageDays} يوم</div>
        <div><b>حجم الكاش:</b> <span style="color:${sizeColor};font-weight:bold;">${sizeText}</span></div>
        <div><b>المنتجات:</b> ${state.products.length} | <b>العملاء:</b> ${state.customers.length} | <b>المبيعات:</b> ${state.sales.length}</div>
      </div>
      <h4 style="margin:12px 0 8px 0;font-size:13px;color:#17364c;">المشاكل المكتشفة:</h4>
      ${issuesHtml}
      <div style="display:flex;gap:8px;margin-top:20px;">
        <button id="diagCopyBtn" style="flex:1;padding:12px;border:none;border-radius:8px;background:#176b70;color:#fff;font-weight:bold;cursor:pointer;">${tr('diag_copy_btn')}</button>
        <button id="diagSendBtn" style="flex:1;padding:12px;border:none;border-radius:8px;background:#25D366;color:#fff;font-weight:bold;cursor:pointer;">${tr('diag_send_btn')}</button>
        <button id="diagCloseBtn" style="flex:0 0 60px;padding:12px;border:none;border-radius:8px;background:#e5e7eb;color:#17364c;font-weight:bold;cursor:pointer;>${tr('diag_close_btn')}</button>
      </div>
    </div>`;
  document.body.appendChild(modal);

  document.getElementById('diagCloseBtn').onclick = () => modal.remove();

  document.getElementById('diagCopyBtn').onclick = () => {
    navigator.clipboard.writeText(reportText).then(() => {
      modal.remove();
      showNotification('تم نسخ التقرير ✅', 'success');
    }).catch(() => showNotification('تعذر النسخ', 'error'));
  };

  document.getElementById('diagSendBtn').onclick = () => {
    const devNumber = DEVELOPER_WHATSAPP;
    window.open(`https://wa.me/${devNumber}?text=${encodeURIComponent(reportText)}`, '_blank');
    modal.remove();
  };
}