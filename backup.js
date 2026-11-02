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

/* ============ النسخ الاحتياطي ============ */
function buildBackupData() {
  return { version: 5, storeSettings: state.storeSettings, products: state.products, sales: state.sales, customers: state.customers, suppliers: state.suppliers, expenses: state.expenses, stockMoves: state.stockMoves, returns: state.returns, customerPayments: state.customerPayments, supplierPayments: state.supplierPayments, purchases: state.purchases, shifts: state.shifts };
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
  if (!silent) showNotification(tr('backup_downloaded'));
}

async function exportBackup() {
  if (state.role !== 'manager') return showNotification(tr('manager_only'), 'warning');
  const pass = prompt(tr('msg_backup_export_password'));
  if (pass === null) return;
  if (!(await verifyCurrentUserPassword(pass))) return showNotification(tr('backup_verify_fail'), 'error');
  await downloadEncryptedBackup(pass, false);

  if (typeof addAuditLog === 'function') {
    addAuditLog('export_backup', { timestamp: new Date().toISOString() });
  }
}

async function importBackup(event) {
  if (state.role !== 'manager') return;
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const pass = prompt(tr('msg_backup_restore_password'));
  if (pass === null) { event.target.value = ''; return; }
  if (!(await verifyCurrentUserPassword(pass))) { event.target.value = ''; return showNotification(tr('backup_verify_fail'), 'error'); }

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

      if (!backup || typeof backup !== 'object') throw new Error(tr('backup_invalid_format'));

      if (backup.version && Number(backup.version) > 5) {
        event.target.value = '';
        return showNotification(tr('backup_newer_version_error'), 'error');
      }

      if (backup.version && backup.version !== 5) {
        if (!confirm(tr('backup_older_version_confirm').replace('{version}', backup.version))) {
          event.target.value = '';
          return;
        }
      }

      if (backup.storeSettings && typeof backup.storeSettings === 'object' && !Array.isArray(backup.storeSettings)) {
        state.storeSettings = Object.assign({}, state.storeSettings, backup.storeSettings);
      }
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

      saveData();
      renderAll();

      if (typeof addAuditLog === 'function') {
        addAuditLog('import_backup', {
          version: backup.version || 'unknown',
          productsCount: Array.isArray(backup.products) ? backup.products.length : 0,
          salesCount: Array.isArray(backup.sales) ? backup.sales.length : 0
        });
      }

      showNotification(tr('backup_restore_success'));
    } catch (err) {
      showNotification(tr('backup_restore_fail') + err.message, 'error');
    } finally {
      event.target.value = '';
    }
  };
  reader.readAsText(file);
}