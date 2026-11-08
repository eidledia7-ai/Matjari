/* ============ Supabase Auth ============ */
function initSupabase() {
  if (typeof supabase !== 'undefined') {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  }
}

function togglePassword(id, btn) {
  const field = document.getElementById(id);
  if (!field) return;
  const showing = field.type === 'password';
  field.type = showing ? 'text' : 'password';
  if (btn) btn.textContent = showing ? tr('hide_pass') : tr('show_pass');
}

function setAuthMessage(msg, isError) {
  const el = document.getElementById('authMessage');
  if (!el) return;
  el.textContent = msg;
  el.style.color = isError ? '#c0392b' : '#17643a';
}

function setAuthBusy(busy) {
  const lb = document.getElementById('loginButton');
  const sb = document.getElementById('signupButton');
  const fb = document.getElementById('forgotButton');
  if (lb) { lb.disabled = busy; lb.textContent = busy ? '...' : tr('login_btn'); }
  if (sb) sb.disabled = busy;
  if (fb) fb.disabled = busy;
}

async function signIn() {
  const email = (document.getElementById('authEmail').value || '').trim();
  const password = document.getElementById('authPassword').value || '';

  if (!supabaseClient) initSupabase();
  if (!supabaseClient) return setAuthMessage(tr('auth_no_connection'), true);

  if (!email || !password) return setAuthMessage(tr('auth_enter_email_pass'), true);
  setAuthBusy(true);
  showLoading(tr('auth_signing_in'));
  setAuthMessage(tr('auth_signing_in'));
  try {
    const result = await supabaseClient.auth.signInWithPassword({ email: email, password: password });
    if (result.error) throw result.error;
    await openUserSession(result.data.user);
  } catch (e) {
    setAuthMessage(tr('auth_sign_in_fail_prefix') + (e.message || ''), true);
  } finally {
    setAuthBusy(false);
    hideLoading();
  }
}

async function signUp() {
  const email = (document.getElementById('authEmail').value || '').trim();
  const password = document.getElementById('authPassword').value || '';

  if (!supabaseClient) initSupabase();
  if (!supabaseClient) return setAuthMessage(tr('auth_no_connection'), true);

  if (!email || !password) return setAuthMessage(tr('auth_enter_email_pass'), true);
  if (password.length < 6) return setAuthMessage(tr('auth_password_min_6'), true);
  setAuthBusy(true);
  setAuthMessage(tr('auth_creating_account'));
  try {
    const result = await supabaseClient.auth.signUp({ email: email, password: password });
    if (result.error) throw result.error;

    if (result.data.session && result.data.user) {
      await openUserSession(result.data.user);
    } else {
      setAuthMessage(tr('auth_check_email'));
    }
  } catch (e) {
    setAuthMessage(tr('auth_signup_fail_prefix') + (e.message || ''), true);
  } finally {
    setAuthBusy(false);
  }
}

async function sendPasswordReset() {
  const email = (document.getElementById('authEmail').value || '').trim();
  if (!email) return setAuthMessage(tr('auth_enter_email_first'), true);
  if (!supabaseClient) return setAuthMessage(tr('auth_no_connection'), true);
  setAuthBusy(true);
  try {
    const result = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: location.origin + location.pathname
    });
    if (result.error) throw result.error;
    setAuthMessage(tr('auth_reset_sent'));
  } catch (e) {
    setAuthMessage(tr('auth_reset_fail_prefix') + (e.message || ''), true);
  } finally {
    setAuthBusy(false);
  }
}

async function saveNewPassword() {
  const password = document.getElementById('newPassword').value || '';
  if (password.length < 6) return setAuthMessage(tr('auth_password_min_6'), true);
  if (!supabaseClient) return setAuthMessage(tr('auth_no_connection'), true);
  try {
    const result = await supabaseClient.auth.updateUser({ password: password });
    if (result.error) throw result.error;
    await supabaseClient.auth.signOut();
    showLoggedOutUI();
    setAuthMessage(tr('auth_pass_changed_login'));
  } catch (e) {
    setAuthMessage(tr('auth_pass_change_fail_prefix') + (e.message || ''), true);
  }
}

function showLoggedOutUI(showAuthForm) {
  state.currentUser = null;
  state.role = 'employee';
  state.ownerId = null;
  state.ownerPlan = null;
  state.subscription = { plan: 'trial', status: 'active', expires_at: null };
  state.products = [];
  state.sales = [];
  state.customers = [{ id: 'CASH-CUSTOMER', name: 'عميل نقدي عام', phone: '-', openingDebt: 0, opening_debt: 0, points: 0 }];
  state.suppliers = [];
  state.expenses = [];
  state.stockMoves = [];
  state.returns = [];
  state.customerPayments = [];
  state.supplierPayments = [];
  state.purchases = [];
  state.shifts = [];
  state.currentShift = null;
  state.cart = [];
  state.heldCarts = [];
  state.saleItems = [];
  state.auditLogs = [];
  state.customerBalances = {};
  state._stockConflictCount = 0;
  state._negativeStockCount = 0;
  
  document.body.classList.add('auth-locked');
  document.body.style.overflow = '';

  const block = document.getElementById('subscriptionBlock');
  if (block) block.remove();

  const ls = document.getElementById('loginScreen');
  if (ls) ls.classList.add('active');

  if (showAuthForm) {
    showAuthView('login');
  } else {
    showLandingView();
  }

  const rb = document.getElementById('recoveryPanel');
  if (rb) rb.style.display = 'none';
  const lb = document.getElementById('loginButtons');
  if (lb) lb.style.display = 'block';
}

function showLoggedInUI() {
  document.body.classList.remove('auth-locked');
  const ls = document.getElementById('loginScreen');
  if (ls) ls.classList.remove('active');
}

async function handleLogout() {
  if (!confirm(tr('msg_logout'))) return;
  try {
    await supabaseClient.auth.signOut();
    localStorage.removeItem('matjari_last_user');
    showLoggedOutUI();
  } catch (e) {
    showNotification(tr('auth_logout_fail'), 'error');
  }
}

/* ============ تغيير كلمة المرور ============ */
async function changePasswordPrompt() {
  if (!supabaseClient) {
    return showNotification(tr('error_no_server_connection'), 'error');
  }
  const newPass = prompt(tr('auth_change_password_prompt'));
  if (newPass === null) return;

  if (newPass.length < 6) {
    return showNotification(tr('auth_password_min_6'), 'error');
  }

  const confirmPass = prompt(tr('auth_change_password_confirm_prompt'));
  if (confirmPass !== newPass) {
    return showNotification(tr('auth_passwords_mismatch'), 'error');
  }

  showLoading(tr('auth_updating'));
  try {
    const { data, error } = await supabaseClient.auth.updateUser({ password: newPass });
    if (error) throw error;
    showNotification(tr('auth_password_updated'), 'success');
  } catch (e) {
    showNotification(tr('error_generic_prefix') + (e.message || ''), 'error');
  } finally {
    hideLoading();
  }
}

async function openUserSession(user) {
  state.currentUser = user;

  document.getElementById('skeletonLoader').style.display = 'block';
  const main = document.querySelector('.main-content');
  if (main) main.style.display = 'none';

  try {
    const roleRes = await supabaseClient
      .from('shop_user_roles')
      .select('role, owner_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (roleRes.data) {
      state.role = roleRes.data.role;
      state.ownerId = roleRes.data.owner_id || null;
    } else {
      throw new Error(tr('auth_no_permissions_found'));
    }

    const ownerId = state.role === 'employee' ? state.ownerId : user.id;

    const subRes = await supabaseClient
      .from('shop_subscriptions')
      .select('*')
      .eq('user_id', ownerId)
      .maybeSingle();

    if (subRes.data) {
      state.subscription = subRes.data;
    } else {
      state.subscription = { plan: 'trial', status: 'active', trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() };
    }
    state.ownerPlan = state.subscription.plan;

    const cacheOwnerId = ownerId;
    let localCache = null;
    try { localCache = JSON.parse(localStorage.getItem('matjari_cache_' + cacheOwnerId)); } catch (e) {}

    if (localCache) {
      if (localCache.products) state.products = localCache.products;
      if (localCache.customers) state.customers = localCache.customers;
      if (localCache.sales) state.sales = localCache.sales;
      if (localCache.returns) state.returns = localCache.returns;
      if (localCache.expenses) state.expenses = localCache.expenses;
      if (localCache.shifts) state.shifts = localCache.shifts;
      if (localCache.auditLogs) state.auditLogs = localCache.auditLogs;
      if (localCache.storeSettings) state.storeSettings = Object.assign({}, state.storeSettings, localCache.storeSettings);
      if (localCache.suppliers) state.suppliers = localCache.suppliers;
      if (localCache.purchases) state.purchases = localCache.purchases;
      if (localCache.customerPayments) state.customerPayments = localCache.customerPayments;
      if (localCache.supplierPayments) state.supplierPayments = localCache.supplierPayments;
      if (localCache.stockMoves) state.stockMoves = localCache.stockMoves;
      if (localCache.heldCarts) state.heldCarts = localCache.heldCarts;
      if (localCache.saleItems) state.saleItems = localCache.saleItems;
    }

    // ✅ v7.10.2 — heldCarts normalization
    if (Array.isArray(state.heldCarts)) {
      state.heldCarts = state.heldCarts.map(h => ({
        ...h,
        customer_id: h.customer_id || h.customerId || null,
        customer_name: h.customer_name || h.customerName || null
      }));
    }

    if (navigator.onLine && supabaseClient) {
  try { await drainSyncQueue(); } catch (e) { console.warn('drain before sync failed:', e); }
  await syncDown(ownerId);
}

    setTimeout(() => {
      if (typeof checkAndRunAutoBackup === 'function') {
        checkAndRunAutoBackup('load').catch(e => console.warn('auto-backup:', e));
      }
    }, 2000);

    if (!state.saleItems || state.saleItems.length === 0) {
      state.saleItems = [];
      (state.sales || []).forEach(s => {
        (s.items || []).forEach(i => {
          state.saleItems.push({
            id: uid('SI'), sale_id: s.id, saleId: s.id, user_id: ownerId,
            product_id: i.id, productId: i.id, product_name: i.name, productName: i.name,
            qty: Number(i.qty) || 0, price: Number(i.price) || 0, cost: Number(i.cost) || 0
          });
        });
      });
    }

    if (!state.customers || state.customers.length === 0) {
      state.customers = [{ id: 'CASH-CUSTOMER', name: 'عميل نقدي عام', phone: '-', openingDebt: 0, opening_debt: 0, points: 0 }];
    } else if (!state.customers.find(c => c.name === 'عميل نقدي عام' || c.name === 'Cash Customer')) {
      state.customers.unshift({ id: 'CASH-CUSTOMER', name: 'عميل نقدي عام', phone: '-', openingDebt: 0, opening_debt: 0, points: 0 });
    }

    document.getElementById('skeletonLoader').style.display = 'none';
    if (main) main.style.display = 'block';

    showLoggedInUI();
    applyRolePermissions();
    renderAll();

    checkSubscriptionStatus();
    enforceSubscriptionBlock();

    const lastPage = getLastPage();
    const validPages = ['home', 'sales', 'salesLog', 'invProducts', 'invMoves', 'invReturns', 'partCustomers', 'partSuppliers', 'finExpenses', 'finReports', 'finCompare', 'finShift', 'settStore', 'settLang', 'settSubscription', 'settBackup', 'settUpdates', 'settStaff', 'supportContact', 'supportGuide', 'supportAbout'];
    const pageToShow = (state.role === 'employee') ? 'sales' : (validPages.includes(lastPage) ? lastPage : 'home');
    showPage(pageToShow);

  } catch (e) {
    console.error(e);
    document.getElementById('skeletonLoader').style.display = 'none';
    if (main) main.style.display = 'block';
    setAuthMessage(tr('auth_data_load_fail_prefix') + (e.message || ''), true);
    showLoggedOutUI();
  } finally {
    hideLoading();
  }

  try {
    localStorage.setItem('matjari_last_user', JSON.stringify({
      id: user.id, email: user.email, role: state.role, ownerId: state.ownerId || null
    }));
  } catch (e) {}
}

/* ============ فحص حالة الاشتراك ============ */
function checkSubscriptionStatus() {
  const sub = state.subscription || {};

  if (sub.status !== 'active') {
    showNotification(tr('auth_sub_inactive'), 'error');
    return;
  }

  const now = Date.now();
  let endDate = null;

  if (sub.plan === 'trial' && sub.trial_ends_at) {
    endDate = new Date(sub.trial_ends_at).getTime();
  } else if (sub.expires_at) {
    endDate = new Date(sub.expires_at).getTime();
  }

  if (!endDate) return;

  const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    showNotification(tr('auth_trial_expired'), 'error');
  } else if (daysLeft === 0) {
    showNotification(tr('auth_trial_expires_today'), 'warning');
  } else if (daysLeft <= 3) {
    showNotification(tr('auth_trial_expires_in_days').replace('{days}', daysLeft), 'warning');
  }
}

function applyRolePermissions() {
  const employee = state.role === 'employee';

  document.querySelectorAll('.nav-group').forEach(function(group) {
    group.style.display = employee ? 'none' : '';
  });

  document.querySelectorAll('#mainNavigation button[data-page]').forEach(function(btn) {
    const page = btn.getAttribute('data-page');
    if (employee && page !== 'sales' && page !== 'invReturns') {
      btn.style.display = 'none';
    } else {
      btn.style.display = '';
    }
  });

  document.querySelectorAll('.sync-btn').forEach(function(btn) {
    btn.style.display = employee ? 'none' : '';
  });
}

async function startAuth() {
  if (!navigator.onLine) {
    loadOfflineSession();
    return;
  }

  if (!supabaseClient) initSupabase();
  if (!supabaseClient) {
    setAuthMessage(tr('error_no_server_connection'), true);
    return;
  }
  try {
    const isRecovery = location.hash.includes('type=recovery') || location.hash.includes('type=invite') || location.hash.includes('access_token');

    if (isRecovery) {
      await supabaseClient.auth.signOut();
      showLoggedOutUI();
      document.getElementById('recoveryPanel').style.display = 'block';
      document.getElementById('loginButtons').style.display = 'none';
      document.getElementById('authTitle').textContent = tr('auth_welcome_set_pass');
      history.replaceState(null, null, ' ');
      return;
    }

  const result = await supabaseClient.auth.getSession();
if (result.error) throw result.error;
if (result.data.session && result.data.session.user) {
  await openUserSession(result.data.session.user);
} else {
  // ✅ فحص: لو المستخدم مسجل قبل كده، افتحه من الكاش
  const lastUser = localStorage.getItem('matjari_last_user');
  if (lastUser) {
    loadOfflineSession();
  } else {
    showLoggedOutUI();
  }
}

  } catch (e) {
    const isNetworkErr = !navigator.onLine || /network|fetch|timeout/i.test((e && e.message) || '');
    if (isNetworkErr) {
      loadOfflineSession();
    } else {
      // ✅ التعديل الجديد: لو المستخدم مسجل قبل كده، افتحله السيشن المحلي بدل صفحة الهبوط
      const lastUser = localStorage.getItem('matjari_last_user');
      if (lastUser) {
        loadOfflineSession();
      } else {
        setAuthMessage(tr('auth_sign_in_fail_prefix') + (e.message || ''), true);
        showLoggedOutUI();
      }
    }
  }
}