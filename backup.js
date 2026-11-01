/* ============ التشفير الآمن (AES-GCM) ============ */
async function encryptData(text, password) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode('matjari_salt'), iterations: 100000, hash: 'SHA-256' },
    keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt']
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(text));
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  return uint8ArrayToBase64(combined);
}

async function decryptData(encryptedBase64, password) {
  try {
    const enc = new TextEncoder();
    const combined = base64ToUint8Array(encryptedBase64);
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: enc.encode('matjari_salt'), iterations: 100000, hash: 'SHA-256' },
      keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['decrypt']
    );
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
    return new TextDecoder().decode(decrypted);
  } catch (e) { throw new Error('كلمة المرور غير صحيحة أو الملف تالف'); }
}

function uint8ArrayToBase64(bytes) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToUint8Array(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/* ============ النسخ الاحتياطي ============ */
function buildBackupData() {
  return { 
    version: 6, // ✅ تحديث الإصدار
    storeSettings: state.storeSettings, products: state.products, sales: state.sales, 
    customers: state.customers, suppliers: state.suppliers, expenses: state.expenses, 
    stockMoves: state.stockMoves, returns: state.returns, customerPayments: state.customerPayments, 
    supplierPayments: state.supplierPayments, purchases: state.purchases, shifts: state.shifts,
    heldCarts: state.heldCarts, auditLogs: state.auditLogs // ✅ إضافة الجداول الناقصة
  };
}

async function downloadEncryptedBackup(pass, silent) {
  const encrypted = await encryptData(JSON.stringify(buildBackupData()), pass);
  const blob = new Blob([JSON.stringify({ encrypted: true, data: encrypted })], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'backup-matjari-' + today() + '.shopbak';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function() { URL.revokeObjectURL(url); }, 1500);
  if (!silent) showNotification(currentLang === 'en' ? 'Encrypted backup downloaded.' : 'تم تنزيل النسخة الاحتياطية المشفرة ✅');
}

async function exportBackup() {
  if (state.role !== 'manager') return showNotification('هذه العملية للمدير فقط', 'warning');
  const pass = prompt(tr('dlg_backup_export_password'));
  if (pass === null) return;
  if (!(await verifyCurrentUserPassword(pass))) return showNotification(currentLang === 'en' ? 'Password verification failed.' : 'فشل التحقق من كلمة المرور.', 'error');
  await downloadEncryptedBackup(pass, false);

  if (typeof addAuditLog === 'function') {
    addAuditLog('export_backup', { timestamp: new Date().toISOString() });
  }
}

/* ✅ دالة جديدة لرفع النسخة المسترجعة للسيرفر */
async function uploadRestoredBackup(ownerId) {
  showLoading('جارٍ رفع البيانات للسيرفر...');
  try {
    // 1. مسح البيانات القديمة من السيرفر
    const tables = ['sale_items', 'sales', 'returns', 'expenses', 'products', 'customers', 'shifts', 'suppliers', 'purchases', 'customer_payments', 'supplier_payments', 'stock_moves', 'held_carts', 'audit_logs'];
    for (const t of tables) {
       await supabaseClient.from(t).delete().eq('user_id', ownerId);
    }

    // 2. رفع الإعدادات
    await supabaseClient.from('store_settings').upsert({
      user_id: ownerId, name: state.storeSettings.name, phone: state.storeSettings.phone,
      address: state.storeSettings.address, tax_number: state.storeSettings.taxNumber,
      currency: state.storeSettings.currency, logo: state.storeSettings.logo,
      monthly_goal: state.storeSettings.monthlyGoal, points_rate: state.storeSettings.pointsRate,
      point_value: state.storeSettings.pointValue, print_type: state.storeSettings.printType,
      permissions: state.storeSettings.permissions, updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });

    // 3. دالة مساعدة للرفع على دفعات (لتجنب تخطي حدود السيرفر)
    const uploadTable = async (tableName, array, mapper) => {
      if (!array || array.length === 0) return;
      const chunks = [];
      for (let i = 0; i < array.length; i += 500) chunks.push(array.slice(i, i + 500));
      for (const chunk of chunks) {
        await supabaseClient.from(tableName).upsert(chunk.map(mapper));
      }
    };

    await uploadTable('products', state.products, p => ({ id: p.id, user_id: ownerId, name: p.name, barcode: p.barcode, category: p.category, price: p.price, cost: p.cost, stock: p.stock, min_stock: p.minStock || p.min_stock }));
    await uploadTable('customers', state.customers, c => ({ id: c.id, user_id: ownerId, name: c.name, phone: c.phone, opening_debt: c.openingDebt || c.opening_debt, points: c.points }));
    await uploadTable('suppliers', state.suppliers, s => ({ id: s.id, user_id: ownerId, name: s.name, phone: s.phone, opening_debt: s.openingDebt || s.opening_debt }));
    
    await uploadTable('sales', state.sales, s => ({
      id: s.id, user_id: ownerId, date: s.date, subtotal: s.subtotal, discount: s.discount,
      total: s.total, paid: s.paid, customer_id: s.customer_id || s.customerId,
      pay_method: s.pay_method || s.payMethod, notes: s.notes, cashier: s.cashier,
      shift_id: s.shift_id || s.shiftId, returned_total: s.returned_total || 0,
      points_used: s.points_used || s.pointsUsed || 0
    }));

    const allSaleItems = [];
    state.sales.forEach(s => {
      if (s.items) {
        s.items.forEach(i => {
          allSaleItems.push({ sale_id: s.id, user_id: ownerId, product_id: i.id, product_name: i.name, qty: i.qty, price: i.price, cost: i.cost });
        });
      }
    });
    await uploadTable('sale_items', allSaleItems, i => i);

    await uploadTable('returns', state.returns, r => ({ id: r.id, user_id: ownerId, sale_id: r.saleId || r.sale_id, product_id: r.productId || r.product_id, product_name: r.productName || r.product_name, qty: r.qty, price: r.price, total: r.total, refund_method: r.refundMethod || r.refund_method, shift_id: r.shiftId || r.shift_id, customer_id: r.customerId || r.customer_id, reason: r.reason, date: r.date }));
    await uploadTable('expenses', state.expenses, e => ({ id: e.id, user_id: ownerId, name: e.name, amount: e.amount, date: e.date, notes: e.notes, shift_id: e.shiftId || e.shift_id, pay_method: e.payMethod || e.pay_method }));
    await uploadTable('shifts', state.shifts, s => ({ id: s.id, user_id: ownerId, cashier_name: s.cashierName || s.cashier_name, start_time: s.startTime || s.start_time, end_time: s.endTime || s.end_time, opening_cash: s.openingCash || s.opening_cash || 0, expected_cash: s.expectedCash || s.expected_cash || 0, actual_cash: s.actualCash || s.actual_cash, difference: s.difference, cash_sales: s.cashSales || s.cash_sales || 0, cash_collections: s.cashCollections || s.cash_collections || 0, cash_returns: s.cashReturns || s.cash_returns || 0, cash_expenses: s.cashExpenses || s.cash_expenses || 0, notes: s.notes }));
    await uploadTable('purchases', state.purchases, p => ({ id: p.id, user_id: ownerId, date: p.date, supplier_id: p.supplierId || p.supplier_id, product_id: p.productId || p.product_id, product_name: p.productName || p.product_name, qty: p.qty, cost: p.cost, total: p.total, paid: p.paid, remaining: p.remaining }));
    await uploadTable('customer_payments', state.customerPayments, p => ({ id: p.id, user_id: ownerId, customer_id: p.customerId || p.customer_id, customer_name: p.customerName || p.customer_name, amount: p.amount, date: p.date, notes: p.notes, shift_id: p.shiftId || p.shift_id, pay_method: p.payMethod || p.pay_method }));
    await uploadTable('supplier_payments', state.supplierPayments, p => ({ id: p.id, user_id: ownerId, supplier_id: p.supplierId || p.supplier_id, supplier_name: p.supplierName || p.supplier_name, amount: p.amount, date: p.date, notes: p.notes }));
    await uploadTable('stock_moves', state.stockMoves, m => ({ id: m.id, user_id: ownerId, product_id: m.productId || m.product_id, product_name: m.productName || m.product_name, type: m.type, qty: m.qty, old_stock: m.oldStock || m.old_stock, new_stock: m.newStock || m.new_stock, reason: m.reason, date: m.date }));
    await uploadTable('held_carts', state.heldCarts, h => ({ id: h.id, user_id: ownerId, cart_data: h.cart, customer_id: h.customerId, customer_name: h.customerName, discount: h.discount, discount_type: h.discountType, notes: h.notes, time: h.time, shift_id: h.shiftId }));
    await uploadTable('audit_logs', state.auditLogs, a => ({ id: a.id, user_id: ownerId, owner_id: ownerId, role: a.role, action: a.action, details: a.details, created_at: a.date || a.created_at }));

    showNotification('تمت مزامنة البيانات المسترجعة مع السيرفر ✅');
  } catch (e) {
    console.error('Upload restored backup failed:', e);
    showNotification('تعذر رفع بعض البيانات للسيرفر: ' + e.message, 'error');
  } finally {
    hideLoading();
  }
}

async function importBackup(event) {
  if (state.role !== 'manager') return;
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const pass = prompt(tr('dlg_backup_restore_password'));
  if (pass === null) { event.target.value = ''; return; }
  if (!(await verifyCurrentUserPassword(pass))) { event.target.value = ''; return showNotification(currentLang === 'en' ? 'Password verification failed.' : 'فشل التحقق من كلمة المرور.', 'error'); }

  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const parsed = JSON.parse(e.target.result);
      let backup;
      if (parsed && parsed.encrypted && parsed.data) {
        backup = JSON.parse(await decryptData(parsed.data, pass));
      } else {
        backup = parsed;
      }

      if (!backup || typeof backup !== 'object') throw new Error('صيغة الملف غير صحيحة');

      if (backup.version && Number(backup.version) > 6) {
        event.target.value = '';
        return showNotification(currentLang === 'en' ? 'This backup was created by a newer version.' : 'هذه النسخة من إصدار أحدث. حدّث التطبيق أولاً.', 'error');
      }

      if (backup.version && backup.version !== 6) {
        if (!confirm('نسخة قديمة (' + backup.version + '). المتابعة قد تفقد بيانات. متابعة؟')) {
          event.target.value = '';
          return;
        }
      }

      if (backup.storeSettings && typeof backup.storeSettings === 'object' && !Array.isArray(backup.storeSettings)) state.storeSettings = Object.assign({}, state.storeSettings, backup.storeSettings);
      if (Array.isArray(backup.products)) state.products = backup.products;
      if (Array.isArray(backup.sales)) state.sales = backup.sales;
      if (Array.isArray(backup.customers)) state.customers = backup.customers;
      if (Array.isArray(backup.suppliers)) state.suppliers = backup.suppliers;
      if (Array.isArray(backup.expenses)) state.expenses = backup.expenses;
      if (Array.isArray(backup.stockMoves)) state.stockMoves = backup.stockMoves;
      if (Array.isArray(backup.returns)) state.returns = backup.returns;
      if (Array.isArray(backup.customerPayments)) state.customerPayments = backup.customerPayments;
      if (Array.isArray(backup.supplierPayments)) state.supplierPayments = backup.supplierPayments;
      if (Array.isArray(backup.purchases)) state.purchases = backup.purchases;
      if (Array.isArray(backup.shifts)) state.shifts = backup.shifts;
      if (Array.isArray(backup.heldCarts)) state.heldCarts = backup.heldCarts; 
      if (Array.isArray(backup.auditLogs)) state.auditLogs = backup.auditLogs; 

      saveData();
      renderAll();

      // ✅ السؤال المهم: هل تريد الرفع للسيرفر؟
      if (navigator.onLine && supabaseClient) {
        if (confirm('تم الاسترجاع محلياً. هل تريد رفع هذه البيانات للسيرفر الآن؟ (تحذير: سيتم مسح البيانات الحالية في السيرفر واستبدالها بالنسخة الاحتياطية)')) {
          await uploadRestoredBackup(state.currentUser.id);
        }
      }

      if (typeof addAuditLog === 'function') {
        addAuditLog('import_backup', { version: backup.version || 'unknown', productsCount: Array.isArray(backup.products) ? backup.products.length : 0, salesCount: Array.isArray(backup.sales) ? backup.sales.length : 0 });
      }

      showNotification('تمت الاستعادة بنجاح 🎉');
    } catch (err) {
      showNotification('فشل الاستعادة: ' + err.message, 'error');
    } finally {
      event.target.value = '';
    }
  };
  reader.readAsText(file);
}
