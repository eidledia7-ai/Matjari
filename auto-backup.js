/* ============================================================
   auto-backup.js — v8.0 (The Rock Edition)
   ============================================================ */

const AUTO_BACKUP_APP_SECRET = 'Matjari-POS-AutoBackup-v7.6-2026-Secret-Key'; // متغيرش عشان النسخ القديمة
const AUTO_BACKUP_MAX_SIZE = 50 * 1024 * 1024;         // 50 MB (آمن جداً للخطة المجانية)
const AUTO_BACKUP_MIN_INTERVAL_MS = 60 * 60 * 1000;   // ساعة بين المحاولات
const AUTO_BACKUP_DAILY_MS = 24 * 60 * 60 * 1000;     // 24 ساعة

/* ── اشتقاق مفتاح PBKDF2 من (APP_SECRET + ownerId) + salt ── */
async function deriveAutoBackupKey(ownerId, salt) {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(AUTO_BACKUP_APP_SECRET + '::' + ownerId),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/* ── بناء الـ payload (مع تحديد السجلات الثقيلة) ── */
/* ── بناء الـ payload من السيرفر مباشرة (بدون حدود الـ 500) ── */
async function buildAutoBackupPayload() {
  if (!navigator.onLine || !supabaseClient) {
    throw new Error('No internet connection for auto-backup');
  }
  
  // سحب كل الداتا من السيرفر باستخدام الـ RPC
  const { data: fullBackup, error } = await supabaseClient.rpc('get_full_backup');
  if (error) throw error;
  if (!fullBackup) throw new Error('Empty backup received from server');

  return {
    version: 'v8.0',
    timestamp: new Date().toISOString(),
    data: fullBackup // الداتا دي بقت جاهزة وبتشمل كل حاجة
  };
}

/* ── تشفير: [16 salt][12 IV][ciphertext] ── */
async function encryptAutoBackup(payload, ownerId) {
  const json = JSON.stringify(payload);
  const plaintext = new TextEncoder().encode(json);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv   = crypto.getRandomValues(new Uint8Array(12));

  const key = await deriveAutoBackupKey(ownerId, salt);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);

  const ct = new Uint8Array(ciphertext);
  const combined = new Uint8Array(16 + 12 + ct.length);
  combined.set(salt, 0);
  combined.set(iv, 16);
  combined.set(ct, 28);
  return combined;
}

/* ── رفع إلى Supabase Storage ── */
async function uploadAutoBackup(ownerId, encryptedBytes) {
  if (!supabaseClient) throw new Error('No Supabase client');
  if (encryptedBytes.length > AUTO_BACKUP_MAX_SIZE) {
    throw new Error('Backup too large: ' + encryptedBytes.length + ' bytes');
  }

  const d = new Date();
  const ts = d.getFullYear()
    + String(d.getMonth() + 1).padStart(2, '0')
    + String(d.getDate()).padStart(2, '0') + '-'
    + String(d.getHours()).padStart(2, '0')
    + String(d.getMinutes()).padStart(2, '0')
    + String(d.getSeconds()).padStart(2, '0');

  const filename = `auto-${ts}.enc`;
  const path = `${ownerId}/${filename}`;

  const { error } = await supabaseClient
    .storage.from('backups')
    .upload(path, encryptedBytes, {
      contentType: 'application/octet-stream',
      upsert: false
    });
  if (error) throw error;

  return { path, filename, size: encryptedBytes.length };
}

/* ── Retention: احذف الأقدم بعد الحد ── */
async function rotateOldAutoBackups(ownerId, retention) {
  if (!supabaseClient) return;
  const { data, error } = await supabaseClient
    .storage.from('backups')
    .list(ownerId, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });
  if (error) { console.warn('List backups failed:', error.message); return; }

  const autoFiles = (data || []).filter(f => f.name && f.name.startsWith('auto-'));
  if (autoFiles.length <= retention) return;

  const toDelete = autoFiles.slice(retention);
  for (const f of toDelete) {
    try {
      await supabaseClient.storage.from('backups').remove([`${ownerId}/${f.name}`]);
    } catch (e) { console.warn('Delete backup failed:', f.name, e); }
  }
}

/* ── تسجيل نتيجة النسخة في audit log ── */
function logAutoBackupResult(success, reason, size) {
  try {
    if (typeof addAuditLog === 'function') {
      addAuditLog(success ? 'auto_backup_success' : 'auto_backup_failed', {
        reason: reason || null,
        size: size || null
      });
    }
  } catch (e) { /* silent */ }
}

/* ── الفحص الرئيسي (يدعم daily + shift_close) ── */
/* ── الفحص الرئيسي (يدعم daily + shift_close) ── */
async function checkAndRunAutoBackup(trigger) {
  const t = trigger || 'manual';
  try {
    const ownerId = (state.role === 'employee' && state.ownerId) ? state.ownerId : state.currentUser?.id;
    if (!ownerId) return { skipped: true, reason: 'no_user' };

    const settings = state.storeSettings || {};
    const enabled = !!(settings.autoBackupEnabled ?? settings.auto_backup_enabled);
    if (!enabled) return { skipped: true, reason: 'disabled' };

    const mode = settings.autoBackupInterval || settings.auto_backup_interval || 'daily';
    const isShift = t === 'shift_close';

    if (isShift && mode === 'daily')       return { skipped: true, reason: 'mode_daily' };
    if (!isShift && mode === 'shift_close') return { skipped: true, reason: 'mode_shift_only' };

    const now = Date.now();
    const lastAttempt = Number(state._lastAutoBackupAttempt || 0);
    
    if (!isShift && (now - lastAttempt) < AUTO_BACKUP_MIN_INTERVAL_MS) {
      return { skipped: true, reason: 'too_soon' };
    }

    if (!isShift) {
      const lastIso = settings.lastAutoBackupAt || settings.last_auto_backup_at;
      const lastOk = lastIso ? new Date(lastIso).getTime() : 0;
      if ((now - lastOk) < AUTO_BACKUP_DAILY_MS) {
        return { skipped: true, reason: 'not_due' };
      }
    }

    state._lastAutoBackupAttempt = now;

    // 🔴 التعديل الجديد: تنفيذ العملية في الخلفية (Background) عشان ميبطأش التطبيق
    const runBackupTask = async () => {
      try {
        const payload = await buildAutoBackupPayload();
        const encrypted = await encryptAutoBackup(payload, ownerId);

        if (encrypted.length > AUTO_BACKUP_MAX_SIZE) {
          logAutoBackupResult(false, 'size_exceeded', encrypted.length);
          return;
        }

        const result = await uploadAutoBackup(ownerId, encrypted);

        const nowIso = new Date().toISOString();
        state.storeSettings.lastAutoBackupAt = nowIso;
        
        if (supabaseClient) {
          try {
            await supabaseClient.from('store_settings')
              .update({ last_auto_backup_at: nowIso })
              .eq('user_id', ownerId);
          } catch (e) { /* silent */ }
        }

        const retention = Number(settings.autoBackupRetention ?? settings.auto_backup_retention) || 7;
        await rotateOldAutoBackups(ownerId, retention);

        logAutoBackupResult(true, null, result.size);
      } catch (err) {
        console.warn('Auto-backup background task failed:', err);
        logAutoBackupResult(false, err.message || 'unknown');
      }
    };

    // 🔴 تشغيل المهمة في وقت الفراغ (Idle Time) عشان ميبطأش الواجهة
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => runBackupTask(), { timeout: 5000 });
    } else {
      setTimeout(runBackupTask, 0);
    }

    return { success: true, status: 'scheduled_in_background' };

  } catch (err) {
    console.warn('Auto-backup trigger failed:', err);
    logAutoBackupResult(false, err.message || 'unknown');
    return { success: false, reason: err.message };
  }
}

/* ── Trigger صريح (shift_close / manual) ── */
async function triggerAutoBackup(trigger) {
  return await checkAndRunAutoBackup(trigger || 'manual');
}

/* ── حالة النسخ للعرض في الإعدادات ── */
async function getAutoBackupStatus() {
  const ownerId = (state.role === 'employee' && state.ownerId) ? state.ownerId : state.currentUser?.id;
  if (!ownerId || !supabaseClient) return { files: [], count: 0 };
  try {
    const { data, error } = await supabaseClient
      .storage.from('backups')
      .list(ownerId, { limit: 50, sortBy: { column: 'created_at', order: 'desc' } });
    if (error) throw error;
    const files = (data || []).filter(f => f.name && f.name.startsWith('auto-'));
    return { files, count: files.length, lastAt: state.storeSettings?.lastAutoBackupAt || null };
  } catch (e) {
    return { files: [], count: 0, error: e.message };
  }
}