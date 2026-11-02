/* ============================================================
   stock-conflicts.js — v7.8
   كشف تعارضات المخزون بعد المزامنة (Read-only)
   ============================================================ */

async function getNegativeStockProducts() {
  const ownerId = (state.role === 'employee' && state.ownerId) ? state.ownerId : state.currentUser?.id;
  if (!ownerId || !navigator.onLine || !supabaseClient) return [];

  try {
    const { data, error } = await supabaseClient.rpc('get_negative_stock_products', { p_user_id: ownerId });
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.warn('get_negative_stock_products failed:', e);
    return [];
  }
}

async function refreshStockConflictIndicator() {
  const neg = await getNegativeStockProducts();
  state._negativeStockCount = neg.length;
  try {
    const ownerId = (state.role === 'employee' && state.ownerId) ? state.ownerId : state.currentUser?.id;
    if (ownerId && supabaseClient && navigator.onLine) {
      const { data } = await supabaseClient.rpc('get_flagged_sales', { p_user_id: ownerId });
      state._stockConflictCount = Array.isArray(data) ? data.length : 0;
    }
  } catch (e) {}
  try { window.dispatchEvent(new CustomEvent('stockconflicts:changed', {
    detail: { count: neg.length, flagged: state._stockConflictCount || 0 }
  })); } catch (e) {}
  return neg;
}