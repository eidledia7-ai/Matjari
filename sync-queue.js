/* ============================================================
   sync-queue.js — v7.10.1
   ============================================================ */

const SYNC_QUEUE_KEY_PREFIX        = 'matjari_syncq_';
const SYNC_QUEUE_COUNTS_PREFIX     = 'matjari_syncq_counts_';
const SYNC_QUEUE_MAX_SIZE          = 500;
const SYNC_QUEUE_MAX_ATTEMPTS      = 5;
const SYNC_QUEUE_DRAIN_INTERVAL_MS = 30000;
const SYNC_QUEUE_KEEP_SYNCED_MS    = 24 * 60 * 60 * 1000;
const SYNC_QUEUE_MAX_PENDING       = 200;

let _syncQueueChannel = null;
let _syncQueueChannelOwner = null;
let _drainTimer = null;
let _isDraining = false;
let _queueMem = null;
let _queueMemOwner = null;
let _drainLockHeld = false;
let _drainLockTab = null;

function _getTabId() {
  if (!window._tabId) window._tabId = 'tab-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  return window._tabId;
}

function _acquireDrainLock() {
  if (!_syncQueueChannel) return true;
  if (_drainLockHeld && _drainLockTab !== _getTabId()) return false;
  _drainLockHeld = true;
  _drainLockTab = _getTabId();
  try { _syncQueueChannel.postMessage({ _type: 'lock_acquire', tabId: _getTabId() }); } catch (e) {}
  return true;
}

function _releaseDrainLock() {
  if (!_syncQueueChannel) return;
  try { _syncQueueChannel.postMessage({ _type: 'lock_release', tabId: _getTabId() }); } catch (e) {}
  _drainLockHeld = false;
  _drainLockTab = null;
}

function _getQueueOwnerId() {
  return (state.role === 'employee' && state.ownerId) ? state.ownerId : state.currentUser?.id;
}

function _getQueueKey() {
  const oid = _getQueueOwnerId();
  return oid ? (SYNC_QUEUE_KEY_PREFIX + oid) : null;
}

function _loadQueue() {
  if (_queueMem !== null && _queueMemOwner === _getQueueOwnerId()) return _queueMem;
  const key = _getQueueKey();
  if (!key) return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) { _queueMem = []; _queueMemOwner = _getQueueOwnerId(); return []; }
    const parsed = JSON.parse(raw);
    if (parsed && parsed._enc === true) return []; // سيتم فكها في initSyncQueue
    _queueMem = Array.isArray(parsed) ? parsed : [];
    _queueMemOwner = _getQueueOwnerId();
    return _queueMem;
  } catch (e) { return []; }
}

function _saveQueue(queue) {
  _queueMem = queue;
  _queueMemOwner = _getQueueOwnerId();
  const key = _getQueueKey();
  if (!key) return;

  try {
    localStorage.setItem(key, JSON.stringify(queue));
  } catch (e) {
    if (e && (e.name === 'QuotaExceededError' || e.code === 22)) {
      try { showNotification(tr('sync_queue_full'), 'error'); } catch (err) {}
    }
  }

  _persistEncrypted(queue).catch(err => console.warn('Encrypt persist failed:', err));
  _updateCounts(queue);
  _broadcastQueueChange();
}

async function _encryptPayload(payload, ownerId) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv   = crypto.getRandomValues(new Uint8Array(12));
  const key  = await deriveAutoBackupKey(ownerId, salt);
  const enc  = new TextEncoder().encode(JSON.stringify(payload));
  const ct   = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc);
  const all  = new Uint8Array(16 + 12 + ct.byteLength);
  all.set(salt, 0); all.set(iv, 16); all.set(new Uint8Array(ct), 28);
  let bin = ''; for (let i = 0; i < all.length; i++) bin += String.fromCharCode(all[i]);
  return btoa(bin);
}

async function _decryptPayload(b64, ownerId) {
  try {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const key = await deriveAutoBackupKey(ownerId, bytes.slice(0, 16));
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(16, 28) }, key, bytes.slice(28));
    return JSON.parse(new TextDecoder().decode(plain));
  } catch (e) { return null; }
}

async function _persistEncrypted(queue) {
  const key = _getQueueKey();
  const oid = _getQueueOwnerId();
  if (!key || !oid) return;
  const ops = [];
  for (const op of queue) {
    if (op.payload) {
      const enc = await _encryptPayload(op.payload, oid);
      ops.push({ ...op, payload: undefined, payload_enc: enc });
    } else {
      ops.push(op);
    }
  }
  localStorage.setItem(key, JSON.stringify({ _enc: true, _v: 1, ops }));
}

async function _loadFromStorageEncrypted(oid) {
  const key = SYNC_QUEUE_KEY_PREFIX + oid;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (parsed && parsed._enc === true && Array.isArray(parsed.ops)) {
      const out = [];
      for (const op of parsed.ops) {
        if (op.payload_enc) {
          const p = await _decryptPayload(op.payload_enc, oid);
          out.push({ ...op, payload: p || {}, payload_enc: undefined });
        } else out.push(op);
      }
      return out;
    }
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) { return []; }
}

function _updateCounts(queue) {
  const oid = _getQueueOwnerId();
  if (!oid) return;
  const counts = {
    pending: queue.filter(q => q.status === 'pending').length,
    failed:  queue.filter(q => q.status === 'failed').length,
    updatedAt: Date.now()
  };
  try { localStorage.setItem(SYNC_QUEUE_COUNTS_PREFIX + oid, JSON.stringify(counts)); } catch (e) {}
}

function getSyncQueueCounts() {
  const oid = _getQueueOwnerId();
  if (!oid) return { pending: 0, failed: 0 };
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_COUNTS_PREFIX + oid);
    return raw ? JSON.parse(raw) : { pending: 0, failed: 0 };
  } catch (e) { return { pending: 0, failed: 0 }; }
}

function _ensureChannel(ownerId) {
  if (_syncQueueChannel && _syncQueueChannelOwner === ownerId) return;
  if (_syncQueueChannel) {
    try { _syncQueueChannel.close(); } catch (e) {}
    _syncQueueChannel = null;
  }
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      _syncQueueChannel = new BroadcastChannel('matjari_syncqueue_' + ownerId);
      _syncQueueChannelOwner = ownerId;
      _syncQueueChannel.onmessage = (ev) => {
        const d = ev.data;
        if (d === 'changed') {
          try { window.dispatchEvent(new CustomEvent('syncqueue:changed')); } catch (e) {}
        } else if (d && d._type === 'lock_acquire' && d.tabId !== _getTabId() && _drainLockHeld) {
          // نحن نحمل القفل بالفعل
        } else if (d && d._type === 'lock_release' && d.tabId === _drainLockTab) {
          _drainLockHeld = false; _drainLockTab = null;
        }
      };
    } catch (e) {}
  }
}

function _broadcastQueueChange() {
  try { window.dispatchEvent(new CustomEvent('syncqueue:changed')); } catch (e) {}
  if (_syncQueueChannel) {
    try { _syncQueueChannel.postMessage('changed'); } catch (e) {}
  }
}

function enqueueSyncOperation(type, payload, idempotencyKey) {
  const queue = _loadQueue();
  const pendingCount = queue.filter(q => q.status === 'pending').length;
  if (pendingCount >= SYNC_QUEUE_MAX_PENDING) {
    try { showNotification(tr('sync_queue_full'), 'error'); } catch (e) {}
    return null;
  }

  const op = {
    id: 'OP-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
    type, payload, idempotencyKey: idempotencyKey || null,
    attempts: 0, maxAttempts: SYNC_QUEUE_MAX_ATTEMPTS,
    status: 'pending', lastError: null,
    createdAt: new Date().toISOString()
  };

  queue.push(op);

  if (type === 'insert_sale' && payload && payload.id) {
    const s = (state.sales || []).find(x => x.id === payload.id);
    if (s) s._pendingUpload = true;
  }
  if (type === 'insert_return' && payload && payload.id) {
    const r = (state.returns || []).find(x => x.id === payload.id);
    if (r) r._pendingUpload = true;
  }
  if (type === 'insert_shift' && payload && payload.id) {
    const sh = (state.shifts || []).find(x => x.id === payload.id);
    if (sh) sh._pendingUpload = true;
  }

  if (queue.length > SYNC_QUEUE_MAX_SIZE) {
    const pending = queue.filter(q => q.status !== 'synced');
    const synced  = queue.filter(q => q.status === 'synced');
    const keepSynced = Math.max(0, SYNC_QUEUE_MAX_SIZE - pending.length);
    _saveQueue(synced.slice(-keepSynced).concat(pending));
  } else {
    _saveQueue(queue);
  }

  if (navigator.onLine && supabaseClient) setTimeout(() => drainSyncQueue(), 100);
  return op.id;
}

function getPendingSyncCount() { return getSyncQueueCounts().pending; }
function getFailedSyncCount()  { return getSyncQueueCounts().failed;  }

function getPendingSaleIdsFromQueue() {
  const q = _loadQueue();
  return new Set(q.filter(o => o.type === 'insert_sale' && o.status !== 'synced').map(o => o.payload?.id).filter(Boolean));
}
function getPendingReturnIdsFromQueue() {
  const q = _loadQueue();
  return new Set(q.filter(o => o.type === 'insert_return' && o.status !== 'synced').map(o => o.payload?.id).filter(Boolean));
}

async function _executeOp(op, ownerId) {
  const c = supabaseClient;
  const t = op.type;
  const p = op.payload || {};

  if (t === 'insert_sale') {
    const { error: e1 } = await c.from('sales').upsert({
      id: p.id, user_id: ownerId, date: p.date, subtotal: p.subtotal,
      discount: p.discount, total: p.total, paid: p.paid,
      points_used: p.points_used ?? 0, customer_id: p.customer_id,
      pay_method: p.pay_method, notes: p.notes, cashier: p.cashier, shift_id: p.shift_id,
      vat_rate: Number(p.vat_rate) || 0, vat_amount: Number(p.vat_amount) || 0, vat_mode: p.vat_mode || 'inclusive'
    }, { onConflict: 'id' });
    if (e1) throw e1;
    if (Array.isArray(p.items) && p.items.length > 0) {
      const items = p.items.map(i => ({
        sale_id: p.id, user_id: ownerId, product_id: i.id, product_name: i.name,
        qty: i.qty, price: i.price, cost: i.cost
      }));
      const { error: e2 } = await c.from('sale_items').upsert(items, { onConflict: 'sale_id,product_id' });
      if (e2) throw e2;
    }
    const idx = (state.sales || []).findIndex(s => s.id === p.id);
    if (idx !== -1) delete state.sales[idx]._pendingUpload;
    return;
  }

  if (t === 'insert_return') {
    const { error } = await c.from('returns').upsert({
      id: p.id, user_id: ownerId, sale_id: p.sale_id,
      product_id: p.product_id, product_name: p.product_name,
      qty: p.qty, price: p.price, total: p.total, vat_amount: Number(p.vat_amount) || 0,
      refund_method: p.refund_method, shift_id: p.shift_id,
      customer_id: p.customer_id, reason: p.reason, date: p.date
    }, { onConflict: 'id' });
    if (error) throw error;
    const idxR = (state.returns || []).findIndex(r => r.id === p.id);
    if (idxR !== -1) delete state.returns[idxR]._pendingUpload;
    return;
  }

  if (t === 'insert_expense') {
    const { error } = await c.from('expenses').upsert({
      id: p.id, user_id: ownerId, name: p.name, amount: p.amount,
      notes: p.notes, date: p.date, shift_id: p.shift_id, pay_method: p.pay_method,
      needs_review: p.needs_review === true,
      created_by: p.created_by || null
    }, { onConflict: 'id' });
    if (error) throw error;
    return;
  }

  if (t === 'insert_customer_payment') {
    const { error } = await c.from('customer_payments').upsert({
      id: p.id, user_id: ownerId, customer_id: p.customer_id,
      customer_name: p.customer_name, amount: p.amount,
      date: p.date, notes: p.notes, shift_id: p.shift_id, pay_method: p.pay_method
    }, { onConflict: 'id' });
    if (error) throw error;
    return;
  }

  if (t === 'delete_sale') {
    const { error } = await c.from('sales').delete().eq('id', p.id).eq('user_id', ownerId);
    if (error) throw error;
    return;
  }

  if (t === 'delete_expense') {
    const { error } = await c.from('expenses').delete().eq('id', p.id).eq('user_id', ownerId);
    if (error) throw error;
    return;
  }

  if (t === 'insert_product') {
    const { error } = await c.from('products').upsert({
      id: p.id, user_id: ownerId, name: p.name, barcode: p.barcode || '',
      category: p.category || null, price: p.price || 0, cost: p.cost || 0,
      stock: p.stock || 0, min_stock: p.min_stock || 5
    }, { onConflict: 'id' });
    if (error) throw error;
    return;
  }

  if (t === 'insert_shift') {
    const { error } = await c.from('shifts').upsert({
      id: p.id, user_id: ownerId, cashier_name: p.cashier_name,
      start_time: p.start_time, opening_cash: Number(p.opening_cash) || 0
    }, { onConflict: 'id' });
    if (error) throw error;
    const idxSh = (state.shifts || []).findIndex(s => s.id === p.id);
    if (idxSh !== -1) delete state.shifts[idxSh]._pendingUpload;
    return;
  }

  if (t === 'insert_purchase') {
    const { error } = await c.from('purchases').upsert({
      id: p.id, user_id: ownerId, supplier_id: p.supplier_id,
      product_id: p.product_id, product_name: p.product_name,
      qty: p.qty, cost: p.cost, total: p.total, paid: p.paid,
      remaining: p.remaining, date: p.date
    }, { onConflict: 'id' });
    if (error) throw error;
    return;
  }

  if (t === 'adjust_stock') {
    const { data: existing } = await c.from('stock_moves').select('id').eq('id', p.id).maybeSingle();
    if (existing) return;

    const { error: updErr } = await c.from('products')
      .update({ stock: p.new_stock })
      .eq('id', p.product_id).eq('user_id', ownerId);
    if (updErr) throw updErr;

    const { error: moveErr } = await c.from('stock_moves').insert({
      id: p.id, user_id: ownerId, product_id: p.product_id, product_name: p.product_name,
      type: 'in', qty: p.qty, old_stock: p.old_stock, new_stock: p.new_stock,
      reason: p.reason, date: p.date
    });
    if (moveErr) throw moveErr;
    return;
  }

  throw new Error('Unknown op type: ' + t);
}

async function checkAndFlagStockConflicts(saleIds) {
  if (!navigator.onLine || !supabaseClient || !saleIds || saleIds.length === 0) return { skipped: true };
  const ownerId = _getQueueOwnerId();
  if (!ownerId) return { skipped: true };
  try {
    const { data, error } = await supabaseClient.rpc('flag_stock_conflicts', {
      p_user_id: ownerId, p_sale_ids: saleIds
    });
    if (error) throw error;
    const flagged = Number(data) || 0;
    if (flagged > 0) {
      try { showNotification(tr('stock_conflict_detected') + ' (' + flagged + ')', 'warning'); } catch (e) {}
      try { if (typeof addAuditLog === 'function') addAuditLog('stock_conflict_detected', { flagged, saleIds }); } catch (e) {}
    }
    return { flagged };
  } catch (e) {
    return { error: e.message };
  }
}

async function drainSyncQueue() {
  if (_isDraining) return { skipped: true, reason: 'already_draining' };
  if (!navigator.onLine || !supabaseClient) return { skipped: true, reason: 'offline' };
  if (!_acquireDrainLock()) return { skipped: true, reason: 'locked_by_other_tab' };

  _isDraining = true;
  const ownerId = _getQueueOwnerId();
  if (!ownerId) { _isDraining = false; _releaseDrainLock(); return { skipped: true, reason: 'no_user' }; }

  _ensureChannel(ownerId);

  const queue = _loadQueue();
  const pending = queue.filter(q => q.status === 'pending');
  if (pending.length === 0) { _isDraining = false; _releaseDrainLock(); return { skipped: true, reason: 'empty' }; }

  try {
    try { window.dispatchEvent(new CustomEvent('syncqueue:drainStart', { detail: { total: pending.length } })); } catch (e) {}

    let succeeded = 0;
    let failed = 0;
    const newlySyncedSaleIds = [];

    for (let i = 0; i < queue.length; i++) {
      const op = queue[i];
      if (op.status !== 'pending') continue;

      try {
        // ✅ X54: وضع مؤقت 15 ثانية لأي عملية عشان منعلقش لو النت باظ
        const opPromise = _executeOp(op, ownerId);
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000));
        await Promise.race([opPromise, timeoutPromise]);
        
        op.status = 'synced';
        op.lastError = null;
        succeeded++;
        if (op.type === 'insert_sale' && op.payload?.id) newlySyncedSaleIds.push(op.payload.id);
      } catch (err) {
        op.attempts = (op.attempts || 0) + 1;
        op.lastError = err.message || String(err);
        if (op.attempts >= op.maxAttempts) { op.status = 'failed'; failed++; }
      }

      _saveQueue(queue);
      try { window.dispatchEvent(new CustomEvent('syncqueue:drainProgress', { detail: { done: succeeded + failed, total: pending.length } })); } catch (e) {}
    }

    const now = Date.now();
    const cleaned = queue.filter(q => {
      if (q.status !== 'synced') return true;
      return (now - new Date(q.createdAt).getTime()) < SYNC_QUEUE_KEEP_SYNCED_MS;
    });
    _saveQueue(cleaned);

    if (newlySyncedSaleIds.length > 0) {
      try { await checkAndFlagStockConflicts(newlySyncedSaleIds); } catch (e) {}
    }

    return { succeeded, failed, total: pending.length };

  } finally {
    // ✅ X54: ضمان تفكيك القفل وتصفير الحالة مهما حصل
    _isDraining = false;
    _releaseDrainLock();
    try { window.dispatchEvent(new CustomEvent('syncqueue:drainEnd')); } catch (e) {}
  }
}

async function initSyncQueue() {
  const oid = _getQueueOwnerId();
  if (oid) {
    try {
      const decrypted = await _loadFromStorageEncrypted(oid);
      _queueMem = decrypted;
      _queueMemOwner = oid;
    } catch (e) { _queueMem = []; _queueMemOwner = oid; }
    _ensureChannel(oid);
  }

  window.addEventListener('online', () => setTimeout(() => drainSyncQueue(), 500));

  if (_drainTimer) clearInterval(_drainTimer);
  _drainTimer = setInterval(() => {
    if (navigator.onLine && getPendingSyncCount() > 0) drainSyncQueue();
  }, SYNC_QUEUE_DRAIN_INTERVAL_MS);

  window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith(SYNC_QUEUE_KEY_PREFIX)) {
      try { window.dispatchEvent(new CustomEvent('syncqueue:changed')); } catch (err) {}
    }
  });

  if (navigator.onLine && getPendingSyncCount() > 0) {
    setTimeout(() => drainSyncQueue(), 1500);
  }
}

function clearSyncQueue() {
  const oid = _getQueueOwnerId();
  if (!oid) return;
  try {
    localStorage.removeItem(SYNC_QUEUE_KEY_PREFIX + oid);
    localStorage.removeItem(SYNC_QUEUE_COUNTS_PREFIX + oid);
  } catch (e) {}
  _broadcastQueueChange();
}