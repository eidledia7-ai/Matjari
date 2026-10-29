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
  if (btn) btn.textContent = showing ? (currentLang === 'ar' ? 'إخفاء' : 'Hide') : (currentLang === 'ar' ? 'إظهار' : 'Show');
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
  if (lb) { lb.disabled = busy; lb.textContent = busy ? '...' : (currentLang === 'ar' ? 'دخول للنظام 🚀' : 'Sign In 🚀'); }
  if (sb) sb.disabled = busy;
  if (fb) fb.disabled = busy;
}

async function signIn() {
  const email = (document.getElementById('authEmail').value || '').trim();
  const password = document.getElementById('authPassword').value || '';
  
  if (!supabaseClient) initSupabase(); 
  if (!supabaseClient) return setAuthMessage('فشل الاتصال بالسيرفر، تأكد من الإنترنت.', true);

  if (!email || !password) return setAuthMessage('أدخل البريد وكلمة المرور', true);
  setAuthBusy(true);
  showLoading(currentLang === 'en' ? 'Signing in...' : 'جارٍ تسجيل الدخول...');
  setAuthMessage(currentLang === 'en' ? 'Signing in...' : 'جارٍ تسجيل الدخول...');
  try {
    const result = await supabaseClient.auth.signInWithPassword({ email: email, password: password });
    if (result.error) throw result.error;
    await openUserSession(result.data.user);
  } catch (e) {
    setAuthMessage('تعذر الدخول: ' + (e.message || ''), true);
  } finally {
    setAuthBusy(false);
    hideLoading();
  }
}

async function signUp() {
  const email = (document.getElementById('authEmail').value || '').trim();
  const password = document.getElementById('authPassword').value || '';
  
  if (!supabaseClient) initSupabase(); 
  if (!supabaseClient) return setAuthMessage('فشل الاتصال بالسيرفر، تأكد من الإنترنت.', true);

  if (!email || !password) return setAuthMessage('أدخل البريد وكلمة المرور', true);
  if (password.length < 6) return setAuthMessage('كلمة المرور 6 أحرف على الأقل', true);
  setAuthBusy(true);
  setAuthMessage('جارٍ إنشاء الحساب...');
  try {
    const result = await supabaseClient.auth.signUp({ email: email, password: password });
    if (result.error) throw result.error;

    // ملاحظة: الـ Trigger في السيرفر هيعمل صلاحيات المدير والاشتراك أوتوماتيك
    if (result.data.session && result.data.user) {
      await openUserSession(result.data.user);
    } else {
      setAuthMessage('تم إنشاء الحساب. تحقق من بريدك ثم سجّل دخول.');
    }
  } catch (e) {
    setAuthMessage('تعذر الإنشاء: ' + (e.message || ''), true);
  } finally {
    setAuthBusy(false);
  }
}

async function sendPasswordReset() {
  const email = (document.getElementById('authEmail').value || '').trim();
  if (!email) return setAuthMessage('أدخل البريد أولاً', true);
  if (!supabaseClient) return setAuthMessage('فشل الاتصال بالسيرفر، تأكد من الإنترنت.', true);
  setAuthBusy(true);
  try {
    const result = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: location.origin + location.pathname
    });
    if (result.error) throw result.error;
    setAuthMessage('تم إرسال رابط الاسترجاع على بريدك.');
  } catch (e) {
    setAuthMessage('تعذر الإرسال: ' + (e.message || ''), true);
  } finally {
    setAuthBusy(false);
  }
}

async function saveNewPassword() {
  const password = document.getElementById('newPassword').value || '';
  if (password.length < 6) return setAuthMessage('كلمة المرور 6 أحرف على الأقل', true);
  if (!supabaseClient) return setAuthMessage('فشل الاتصال بالسيرفر، تأكد من الإنترنت.', true);
  try {
    const result = await supabaseClient.auth.updateUser({ password: password });
    if (result.error) throw result.error;
    await supabaseClient.auth.signOut();
    showLoggedOutUI();
    setAuthMessage('تم تغيير كلمة المرور. سجّل دخول الآن.');
  } catch (e) {
    setAuthMessage('تعذر التغيير: ' + (e.message || ''), true);
  }
}

function showLoggedOutUI(showAuthForm) {
  state.currentUser = null;
  state.role = 'employee';
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
    showNotification('تعذر الخروج', 'error');
  }
}

/* ============ تغيير كلمة المرور ============ */
async function changePasswordPrompt() {
  if (!supabaseClient) {
    return showNotification(currentLang === 'en' ? 'No connection to server.' : 'لا يوجد اتصال بالسيرفر.', 'error');
  }
  const newPass = prompt(currentLang === 'en' ? 'Enter new password (at least 6 characters):' : 'أدخل كلمة المرور الجديدة (6 أحرف على الأقل):');
  if (newPass === null) return;
  
  if (newPass.length < 6) {
    return showNotification(currentLang === 'en' ? 'Password must be at least 6 characters.' : 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.', 'error');
  }
  
  const confirmPass = prompt(currentLang === 'en' ? 'Confirm new password:' : 'تأكيد كلمة المرور الجديدة:');
  if (confirmPass !== newPass) {
    return showNotification(currentLang === 'en' ? 'Passwords do not match.' : 'كلمتا المرور غير متطابقتين.', 'error');
  }

  showLoading(currentLang === 'en' ? 'Updating...' : 'جارٍ التحديث...');
  try {
    const { data, error } = await supabaseClient.auth.updateUser({ password: newPass });
    if (error) throw error;
    showNotification(currentLang === 'en' ? 'Password updated successfully!' : 'تم تغيير كلمة المرور بنجاح! ✅', 'success');
  } catch (e) {
    showNotification((currentLang === 'en' ? 'Error: ' : 'خطأ: ') + (e.message || ''), 'error');
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
    // 1. تحديد الدور ورقم المدير
    await new Promise(r => setTimeout(r, 1000)); // ننتظر ثانية عشان الـ Trigger يخلص
const roleRes = await supabaseClient.from('shop_user_roles').select('role, owner_id').eq('user_id', user.id).maybeSingle();

    if (roleRes.data) {
      state.role = roleRes.data.role;
      state.ownerId = roleRes.data.owner_id || null;
    } else {
      throw new Error('لم يتم العثور على صلاحيات لهذا الحساب. تواصل مع الدعم.');
    }

    // 2. تحديد صاحب المحل (المدير) لجلب البيانات
    const ownerId = state.role === 'employee' ? state.ownerId : user.id;

    // 3. جلب الاشتراك (للموظف بيجيب اشتراك مديره)
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

    // 4. تحميل البيانات (من الكاش أو من السيرفر)
    const cacheOwnerId = ownerId;
    let localCache = null;
    try { localCache = JSON.parse(localStorage.getItem('matjari_cache_' + cacheOwnerId)); } catch (e) {}

    // تحميل الكاش الأول (سريع)
    if (localCache) {
      if (localCache.products) state.products = localCache.products;
      if (localCache.customers) state.customers = localCache.customers;
      if (localCache.sales) state.sales = localCache.sales;
      if (localCache.returns) state.returns = localCache.returns;
      if (localCache.expenses) state.expenses = localCache.expenses;
      if (localCache.shifts) state.shifts = localCache.shifts;
      if (localCache.auditLogs) state.auditLogs = localCache.auditLogs;
      if (localCache.storeSettings) state.storeSettings = Object.assign({}, state.storeSettings, localCache.storeSettings);
    }

    // التحميل من السيرفر (لو أونلاين)
    if (navigator.onLine && supabaseClient) {
      await syncDown(ownerId);
    }

    // لو مفيش منتجات خالص، نضيف عميل افتراضي
    if (!state.customers || state.customers.length === 0) {
  state.customers = [{ id: uid('CUST'), name: 'عميل نقدي عام', phone: '-', openingDebt: 0 }];
}

    document.getElementById('skeletonLoader').style.display = 'none';
    if (main) main.style.display = 'block';
    
    showLoggedInUI();
    applyRolePermissions();
    renderAll();

    checkSubscriptionStatus();
    enforceSubscriptionBlock();
    
    const lastPage = getLastPage();
    const validPages = ['home', 'sales', 'invProducts', 'invMoves', 'invReturns', 'partCustomers', 'partSuppliers', 'finExpenses', 'finReports', 'finCompare', 'finShift', 'settStore', 'settLang', 'settSubscription', 'settBackup', 'settUpdates', 'settStaff', 'supportContact', 'supportGuide', 'supportAbout'];
    const pageToShow = (state.role === 'employee') ? 'sales' : (validPages.includes(lastPage) ? lastPage : 'home');
    showPage(pageToShow);
    
  } catch (e) {
  console.error(e);
  document.getElementById('skeletonLoader').style.display = 'none';
  if (main) main.style.display = 'block';
  setAuthMessage('تعذر تحميل البيانات: ' + (e.message || ''), true);
  showLoggedOutUI();
} finally {
  hideLoading();
}
  
  // حفظ الجلسة للأوفلاين
  try {
    localStorage.setItem('matjari_last_user', JSON.stringify({
      id: user.id,
      email: user.email,
      role: state.role,
      ownerId: state.ownerId || null
    }));
  } catch (e) {}
}

/* ============ فحص حالة الاشتراك ============ */
function checkSubscriptionStatus() {
  const sub = state.subscription || {};
  const en = currentLang === 'en';

  if (sub.status !== 'active') {
    showNotification(en ? 'Your subscription is inactive.' : 'اشتراكك غير نشط. جدد الآن.', 'error');
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
    showNotification(en ? 'Your trial has expired.' : 'انتهت فترة التجربة. اشترك للاستمرار.', 'error');
  } else if (daysLeft === 0) {
    showNotification(en ? 'Your trial expires today!' : 'تجربتك تنتهي اليوم!', 'warning');
  } else if (daysLeft <= 3) {
    showNotification(en ? `Your trial expires in ${daysLeft} days.` : `تجربتك تنتهي خلال ${daysLeft} أيام.`, 'warning');
  }
}

function applyRolePermissions() {
  const employee = state.role === 'employee';
  document.querySelectorAll('.sidebar-nav button, .nav-group').forEach(function(btn) {
    const page = btn.getAttribute('data-page');
    if (employee && page && page !== 'sales' && page !== 'home' && page !== 'invReturns') {
      btn.style.display = 'none';
    } else {
      btn.style.display = '';
    }
  });
  const syncBtn = document.querySelector('.sidebar-nav button[data-action="sync"]');
  if (syncBtn) syncBtn.style.display = employee ? 'none' : '';

  document.querySelectorAll('.nav-group').forEach(function(group) {
    const buttons = group.querySelectorAll('button');
    let anyVisible = false;
    buttons.forEach(function(b) {
      if (b.style.display !== 'none') anyVisible = true;
    });
    group.style.display = anyVisible ? '' : 'none';
  });
}

async function startAuth() {
  if (!navigator.onLine) {
    loadOfflineSession();
    return;
  }

  if (!supabaseClient) initSupabase();
  if (!supabaseClient) {
    setAuthMessage('فشل الاتصال بالسيرفر', true);
    return;
  }
  try {
    const isRecovery = location.hash.includes('type=recovery') || location.hash.includes('type=invite') || location.hash.includes('access_token');

    if (isRecovery) {
      await supabaseClient.auth.signOut();
      showLoggedOutUI();
      document.getElementById('recoveryPanel').style.display = 'block';
      document.getElementById('loginButtons').style.display = 'none';
      document.getElementById('authTitle').textContent = 'مرحباً بك! عيّن كلمة المرور الخاصة بك';
      history.replaceState(null, null, ' ');
      return;
    }

    const result = await supabaseClient.auth.getSession();
    if (result.error) throw result.error;
    if (result.data.session && result.data.session.user) {
      await openUserSession(result.data.session.user);
    } else {
      showLoggedOutUI();
    }
  } catch (e) {
    const isNetworkErr = !navigator.onLine || /network|fetch|timeout/i.test((e && e.message) || '');
    if (isNetworkErr) {
      loadOfflineSession();
    } else {
      setAuthMessage('تعذر الدخول: ' + (e.message || ''), true);
      showLoggedOutUI();
    }
  }
}