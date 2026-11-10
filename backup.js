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
  } catch (e) { throw new Error(tr('backup_decrypt_fail')); }
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

function buildBackupData() {
  // هذه الدالة بقت قديمة بنستخدمها فقط كـ Fallback للـ Auto Backup
  // النسخة اليدوية بقت بتسحب من السيرفر مباشرة
  return { version: 6, storeSettings: state.storeSettings, products: state.products, sales: state.sales, customers: state.customers, suppliers: state.suppliers, expenses: state.expenses, stockMoves: state.stockMoves, returns: state.returns, customerPayments: state.customerPayments, supplierPayments: state.supplierPayments, purchases: state.purchases, shifts: state.shifts };
}

async function downloadEncryptedBackup(pass, silent) {
  if (!navigator.onLine || !supabaseClient) {
    throw new Error(tr('error_no_server_connection') || 'Internet connection required for full backup');
  }

  // سحب الداتا الكاملة من السيرفر (بدون حد 500)
  const { data: backupData, error } = await supabaseClient.rpc('get_full_backup');
  if (error) throw error;
  if (!backupData) throw new Error('Empty backup received from server');

  const encrypted = await encryptData(JSON.stringify(backupData), pass);
  const blob = new Blob([JSON.stringify({ encrypted: true, data: encrypted })], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'backup-matjari-' + today() + '.shopbak';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function() { URL.revokeObjectURL(url); }, 1500);
  if (!silent) showNotification(tr('backup_downloaded'));
}

async function exportBackup() {
  if (state.role !== 'manager') return showNotification(tr('manager_only'), 'warning');
  const pass = prompt(tr('msg_backup_export_password'));
  if (pass === null) return;
  if (!(await verifyCurrentUserPassword(pass))) return showNotification(tr('backup_verify_fail'), 'error');
  
  try {
    await downloadEncryptedBackup(pass, false);
    if (typeof addAuditLog === 'function') {
      addAuditLog('export_backup', { timestamp: new Date().toISOString() });
    }
  } catch (err) {
    showNotification(tr('backup_restore_fail') + err.message, 'error');
  }
}

async function importBackup(event) {
  if (state.role !== 'manager') return;
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const pass = prompt(tr('msg_backup_restore_password'));
  if (pass === null) { event.target.value = ''; return; }
  if (!(await verifyCurrentUserPassword(pass))) { event.target.value = ''; return showNotification(tr('backup_verify_fail'), 'error'); }

  if (!navigator.onLine || !supabaseClient) {
    event.target.value = '';
    return showNotification(tr('error_no_server_connection'), 'error');
  }

  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      showLoading(tr('restoring_data'));
      const parsed = JSON.parse(e.target.result);
      let backup;
      if (parsed && parsed.encrypted && parsed.data) {
        backup = JSON.parse(await decryptData(parsed.data, pass));
      } else {
        backup = parsed;
      }

      if (!backup || typeof backup !== 'object') throw new Error(tr('backup_invalid_format'));

      if (backup.version && Number(backup.version) > 6) {
        event.target.value = '';
        hideLoading();
        return showNotification(tr('backup_newer_version_error'), 'error');
      }

      if (backup.version && backup.version < 6) {
        if (!confirm('هذا الملف من إصدار قديم، قد تفقد بعض البيانات الدقيقة. هل أنت متأكد؟')) {
          event.target.value = '';
          hideLoading();
          return;
        }
      }

      // 🔴 استدعاء دالة الاستعادة في السيرفر
      const { error } = await supabaseClient.rpc('restore_user_data', { p_data: backup });
      if (error) throw error;

      // 🔴 مزامنة الداتا المستعادة من السيرفر للموبايل
      await syncDown(state.ownerId);
      renderAll();

      if (typeof addAuditLog === 'function') {
        addAuditLog('import_backup', { version: backup.version || 'unknown' });
      }

      showNotification(tr('backup_restore_success'));
    } catch (err) {
      showNotification(tr('backup_restore_fail') + err.message, 'error');
    } finally {
      hideLoading();
      event.target.value = '';
    }
  };
  reader.readAsText(file);
}