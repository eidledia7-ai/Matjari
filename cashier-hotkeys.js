/* ============================================================
   cashier-hotkeys.js — v7.7
   اختصارات لوحة المفاتيح لشاشة الكاشير (Additive)
   لا يمس F2/F4/F8/F9 الموجودة في main.js
   ============================================================ */

/* ── Helpers ── */
function _isTypingTarget(el) {
  if (!el) return false;
  const tag = (el.tagName || '').toUpperCase();
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

function _getSelectedCartIndex() {
  if (typeof state.selectedCartIndex === 'number' &&
      state.selectedCartIndex >= 0 &&
      state.selectedCartIndex < state.cart.length) {
    return state.selectedCartIndex;
  }
  return state.cart.length - 1; // default: آخر صنف
}

function _flashCart(type) {
  const tbl = document.getElementById('cartTable');
  if (!tbl) return;
  const cls = type === 'error' ? 'flash-error' : 'flash-add';
  tbl.classList.add(cls);
  setTimeout(() => tbl.classList.remove(cls), 350);
}

/* ── Actions ── */
function increaseSelectedQty() {
  const idx = _getSelectedCartIndex();
  if (idx < 0) return;
  const item = state.cart[idx];
  if (!item) return;
  const prod = state.products.find(p => p.id === item.id);
  if (prod && (item.qty + 1) > prod.stock) {
    showNotification(tr('qty_exceeds_stock_1') + prod.stock + tr('qty_exceeds_stock_2'), 'error');
    playSound('error');
    _flashCart('error');
    return;
  }
  state.cart[idx].qty += 1;
  state.selectedCartIndex = idx;
  playSound('tick');
  renderCart();
  refocusCashierInput();
}

function decreaseSelectedQty() {
  const idx = _getSelectedCartIndex();
  if (idx < 0) return;
  const item = state.cart[idx];
  if (!item) return;
  if (item.qty <= 1) { removeSelectedCartItem(); return; }
  state.cart[idx].qty -= 1;
  state.selectedCartIndex = idx;
  playSound('tick');
  renderCart();
  refocusCashierInput();
}

function removeLastCartItem() {
  if (!state.cart.length) return;
  state.cart.pop();
  state.selectedCartIndex = state.cart.length - 1;
  playSound('remove');
  renderCart();
  refocusCashierInput();
}

function removeSelectedCartItem() {
  const idx = _getSelectedCartIndex();
  if (idx < 0) return;
  state.cart.splice(idx, 1);
  state.selectedCartIndex = state.cart.length > 0
    ? Math.min(idx, state.cart.length - 1)
    : -1;
  playSound('remove');
  renderCart();
  refocusCashierInput();
}

function selectCartRow(idx) {
  state.selectedCartIndex = idx;
  renderCart();
  refocusCashierInput();
}

function focusDiscountField() {
  const el = document.getElementById('saleDiscount');
  if (el) { el.focus(); try { el.select(); } catch (e) {} }
}

function showHotkeysHelp() {
  const m = document.getElementById('hotkeysHelpModal');
  if (m) m.style.display = 'flex';
}

function closeHotkeysHelp() {
  const m = document.getElementById('hotkeysHelpModal');
  if (m) m.style.display = 'none';
  refocusCashierInput();
}

/* ── Keydown Dispatcher (لا يمس F2/F4/F8/F9) ── */
document.addEventListener('keydown', function (e) {
  if (window.isReadOnlyMode) return;

  // F1 — Help (دائماً)
  if (e.key === 'F1') {
    e.preventDefault();
    showHotkeysHelp();
    return;
  }

  // F6 — Focus Discount (دائماً)
  if (e.key === 'F6') {
    e.preventDefault();
    focusDiscountField();
    return;
  }

  // Escape — إغلاق modal / blur
  if (e.key === 'Escape') {
    const m = document.getElementById('hotkeysHelpModal');
    if (m && m.style.display === 'flex') {
      e.preventDefault();
      closeHotkeysHelp();
      return;
    }
    if (_isTypingTarget(e.target)) {
      e.target.blur();
      refocusCashierInput();
    }
    return;
  }

  // تجاهل باقي الاختصارات لو المستخدم داخل حقل
  if (_isTypingTarget(e.target)) return;

  // + / = : زيادة
  if (e.key === '+' || e.key === '=') {
    e.preventDefault();
    increaseSelectedQty();
    return;
  }

  // - / _ : تقليل
  if (e.key === '-' || e.key === '_') {
    e.preventDefault();
    decreaseSelectedQty();
    return;
  }

  // Delete : حذف المحدد
  if (e.key === 'Delete') {
    e.preventDefault();
    removeSelectedCartItem();
    return;
  }

  // Ctrl+Z / Cmd+Z : Undo (حذف آخر صنف)
  if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
    e.preventDefault();
    removeLastCartItem();
    return;
  }
});

/* ── Enter في حقل salePaid → إتمام البيع ── */
document.addEventListener('keydown', function (e) {
  if (e.key === 'Enter' && e.target && e.target.id === 'salePaid') {
    e.preventDefault();
    if (typeof completeSale === 'function') completeSale();
  }
});