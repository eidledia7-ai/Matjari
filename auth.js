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
  btn.textContent = showing ? (currentLang === 'ar' ? 'إخفاء' : 'Hide') : (currentLang === 'ar' ? 'إظهار' : 'Show');
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

    if (result.data.user) {
      const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      try {
        await supabaseClient
          .from('shop_subscriptions')
          .upsert({
            user_id: result.data.user.id,
            plan: 'trial',
            status: 'active',
            trial_ends_at: trialEnd
          }, { onConflict: 'user_id' });
      } catch (subErr) {
        console.warn('Could not create trial subscription:', subErr);
      }
    }

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
  const newPass = prompt(currentLang === 'en' ? 'Enter new password (at least 6 characters):' : 'أدخل كلمة المرور الجديدة (6 أحرف على الأقل):');
  if (newPass === null) return; // لو المستخدم داس إلغاء
  
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
    // 1. تحديد الدور (Role) ورقم المدير (owner_id) والإيميل
    const roleRes = await supabaseClient
      .from('shop_user_roles')
      .select('role, owner_id, email')
      .eq('user_id', user.id)
      .maybeSingle();

    // نبدأ بالافتراضي الأأمن (موظف)
    state.role = 'employee';
    state.ownerId = null;

    if (roleRes.data) {
      if (roleRes.data.role === 'manager' && !roleRes.data.owner_id) {
        state.role = 'manager';
      } else if (roleRes.data.role === 'employee' && roleRes.data.owner_id) {
        state.role = 'employee';
        state.ownerId = roleRes.data.owner_id;
      } else {
        throw new Error('بيانات دور المستخدم غير متسقة. تواصل مع الدعم.');
      }
    } else {
      // لا يوجد سطر: نتحقق هل لديه بيانات shop_data
      let hasShopData = false;
      try {
        const dataCheck = await supabaseClient
          .from('shop_data')
          .select('user_id')
          .eq('user_id', user.id)
          .maybeSingle();
        if (dataCheck.data) hasShopData = true;
      } catch (e) { }

      // أول مستخدم (أو صاحب بيانات) → manager، وننشئ السطر
      state.role = 'manager';
      state.ownerId = null;
      try {
        await supabaseClient
          .from('shop_user_roles')
          .upsert({
            user_id: user.id,
            role: 'manager',
            owner_id: null,
            email: user.email || null
          }, { onConflict: 'user_id' });
      } catch (e) {
        console.warn('تعذر إنشاء سطر الدور تلقائياً:', e.message);
      }
    }

     // 2. جلب بيانات الاشتراك (للمدير أو للموظف عن طريق مديره)
    const subOwnerId = (state.role === 'employee' && state.ownerId) ? state.ownerId : user.id;
    const subRes = await supabaseClient
  .from('shop_subscriptions')
  .select('*')
  .eq('user_id', subOwnerId) // <--- التعديل هنا
  .maybeSingle();

   if (subRes.data) {
  state.subscription = {
    plan: subRes.data.plan || 'trial',
    status: subRes.data.status || 'active',
    expires_at: subRes.data.expires_at,
    trial_ends_at: subRes.data.trial_ends_at,
    payment_method: subRes.data.payment_method
  };
  // السطر ده هو اللي هيحل مشكلة الواتساب
  if (state.role === 'employee') state.ownerPlan = state.subscription.plan;
} else {
      // لو مفيش اشتراك، نفترض trial 14 يوم
      state.subscription = {
        plan: 'trial',
        status: 'active',
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      };
    }

    // 3. تحديد مين صاحب البيانات (المدير) عشان نقرا كاشه ونحفظ فيه
    const cacheOwnerId = (state.role === 'employee' && state.ownerId) ? state.ownerId : user.id;
    let localCache = null;
    try { localCache = JSON.parse(localStorage.getItem('matjari_cache_' + cacheOwnerId)); } catch (e) {}

    let dataRes = { data: null, error: null };
    if (navigator.onLine && supabaseClient) {
      try {
        dataRes = await supabaseClient
          .from('shop_data')
          .select('shop_data')
          .eq('user_id', cacheOwnerId)
          .maybeSingle();
        if (dataRes.error) throw dataRes.error;
      } catch (e) { console.warn('Cloud fetch failed', e); }
    }

    let d = null;
    // بنجيب البيانات من السيرفر لو موجودة، أو من الكاش
    if (dataRes && dataRes.data && dataRes.data.shop_data && Object.keys(dataRes.data.shop_data).length > 0) {
      d = dataRes.data.shop_data;
      try { localStorage.setItem('matjari_cache_' + cacheOwnerId, JSON.stringify(d)); } catch (e) {}
    } else if (localCache && (localCache.products || localCache.sales)) {
      d = localCache;
    }

    if (d) {
      state.products = d.products || [];
      state.sales = d.sales || [];
      state.customers = d.customers || [];
      state.suppliers = d.suppliers || [];
      state.expenses = d.expenses || [];
      state.stockMoves = d.stockMoves || [];
      state.returns = d.returns || [];
      state.customerPayments = d.customerPayments || [];
      state.supplierPayments = d.supplierPayments || [];
      state.purchases = d.purchases || [];
      state.shifts = d.shifts || [];
      state.currentShift = d.currentShift || null;
      state.heldCarts = d.heldCarts || [];
      state.auditLogs = d.auditLogs || [];
      if (d.storeSettings) state.storeSettings = Object.assign({}, state.storeSettings, d.storeSettings);
    } else {
      state.products = [];
      state.sales = [];
      state.customers = [{ id: uid('CUST'), name: 'عميل نقدي عام', phone: '-', openingDebt: 0 }];
      state.suppliers = [];
      state.expenses = [];
      state.stockMoves = [];
      state.returns = [];
      state.customerPayments = [];
      state.supplierPayments = [];
      state.purchases = [];
      state.shifts = [];
      state.currentShift = null;
} // <--- قفل الـ else (سطر 1290)

// جلب الفواتير من الجدول الجديد ودمجها مع القديمة
if (navigator.onLine && supabaseClient) {
  try {
    const salesRes = await supabaseClient
      .from('sales')
      .select('*')
      .eq('user_id', cacheOwnerId)
      .order('date', { ascending: false });
      
    if (salesRes.data && salesRes.data.length > 0) {
      const newSales = salesRes.data.map(s => ({
        id: s.id,
        date: s.date,
        items: s.items,
        subtotal: s.subtotal,
        discount: s.discount,
        total: s.total,
        paid: s.paid,
        remaining: s.remaining,
        customerId: s.customer_id,
        payMethod: s.pay_method,
        notes: s.notes,
        cashier: s.cashier,
        shiftId: s.shift_id
      }));
      
      // دمج المبيعات الجديدة مع القديمة بدون تكرار (باستخدام ID)
      const newSalesIds = new Set(newSales.map(s => s.id));
      const oldSales = state.sales.filter(s => !newSalesIds.has(s.id));
      state.sales = [...newSales, ...oldSales];
    }
  } catch (e) { console.warn('Fetch sales failed', e); }
}
document.getElementById('skeletonLoader').style.display = 'none';
if (main) main.style.display = 'block';
showLoggedInUI(); // <--- (سطر 1292)
    applyRolePermissions();
    renderAll();

    // فحص الاشتراك قبل عرض الصفحة
    checkSubscriptionStatus();
    enforceSubscriptionBlock();
    const lastPage = getLastPage();
    const validPages = ['home', 'sales', 'invProducts', 'invMoves', 'invReturns', 'partCustomers', 'partSuppliers', 'finExpenses', 'finReports', 'finCompare', 'finShift', 'settStore', 'settLang', 'settSubscription', 'settBackup', 'settUpdates', 'settStaff', 'supportContact', 'supportGuide', 'supportAbout'];
     const pageToShow = (state.role === 'employee') ? 'sales' : (validPages.includes(lastPage) ? lastPage : 'home');
    showPage(pageToShow);
  } catch (e) {
    console.error(e);
    setAuthMessage('تعذر تحميل البيانات: ' + (e.message || ''), true);
    showLoggedOutUI();
  } finally {
    hideLoading();
  }
  try { localStorage.setItem('matjari_last_user', JSON.stringify({ id: user.id, email: user.email, role: state.role })); } catch(e) {}
}

/* ============ فحص حالة الاشتراك ============ */
function checkSubscriptionStatus() {
  const sub = state.subscription || {};
  const en = currentLang === 'en';

  // حالة غير نشطة
  if (sub.status !== 'active') {
    showNotification(
      en ? 'Your subscription is inactive. Please renew.' : 'اشتراكك غير نشط. جدد الآن.',
      'error'
    );
    return;
  }

  const now = Date.now();
  let endDate = null;

  if (sub.plan === 'trial' && sub.trial_ends_at) {
    endDate = new Date(sub.trial_ends_at).getTime();
  } else if (sub.expires_at) {
    endDate = new Date(sub.expires_at).getTime();
  }

  if (!endDate) return; // مفيش تاريخ انتهاء (اشتراك دائم)

  const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    showNotification(
      en ? 'Your trial has expired. Please subscribe to continue.'
         : 'انتهت فترة التجربة. اشترك للاستمرار.',
      'error'
    );
  } else if (daysLeft === 0) {
    showNotification(
      en ? 'Your trial expires today!' : 'تجربتك تنتهي اليوم!',
      'warning'
    );
  } else if (daysLeft <= 3) {
    showNotification(
      en ? `Your trial expires in ${daysLeft} days. Subscribe now!`
         : `تجربتك تنتهي خلال ${daysLeft} أيام. اشترك الآن!`,
      'warning'
    );
  }
}
function applyRolePermissions() {
  const employee = state.role === 'employee';
  document.querySelectorAll('.sidebar-nav button, .nav-group').forEach(function(btn) {
    const page = btn.getAttribute('data-page');
    if (employee && page && page !== 'sales' && page !== 'home') {
      btn.style.display = 'none';
    } else {
      btn.style.display = '';
    }
  });
  const syncBtn = document.querySelector('.sidebar-nav button[data-action="sync"]');
  if (syncBtn) syncBtn.style.display = employee ? 'none' : '';

  // [إضافة] إخفاء .nav-group إذا كل أزراره مخفية، وإظهاره إذا فيه أي زر ظاهر
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
  // التعديل الجديد: لو مفيش نت، افتح التطبيق من الذاكرة على طول
  if (!navigator.onLine) {
    loadOfflineSession();
    return;
  }

  initSupabase();
  if (!supabaseClient) {
    setAuthMessage('فشل الاتصال بالسيرفر', true);
    return;
  }
  try {
  // التعديل الجديد: لو الرابط فيه تغيير باسورد أو دعوة، نوقف أي جلسة تانية ونطلب الباسورد
if (location.hash.includes('type=recovery') || location.hash.includes('type=invite') || location.hash.includes('access_token')) {
  await supabaseClient.auth.signOut();
  
  showLoggedOutUI();
  document.getElementById('recoveryPanel').style.display = 'block';
  document.getElementById('loginButtons').style.display = 'none';
  document.getElementById('authTitle').textContent = 'مرحباً بك! عيّن كلمة المرور الخاصة بك';
  
  // نمسح الهاش من الرابط عشان لو عمل Refresh ميفضلش يطلب باسورد
  history.replaceState(null, null, ' ');
  return;
}

const result = await supabaseClient.auth.getSession();
    if (result.error) throw result.error;
    if (location.hash.includes('type=recovery') || location.hash.includes('type=invite') || location.hash.includes('access_token')) {
      showLoggedOutUI(true);
      document.getElementById('recoveryPanel').style.display = 'block';
      document.getElementById('loginButtons').style.display = 'none';
      document.getElementById('authTitle').textContent = 'تعيين كلمة مرور جديدة';
    } else if (result.data.session && result.data.session.user) {
      await openUserSession(result.data.session.user);
    } else {
      showLoggedOutUI();
    }
} catch (e) {
  // لو حصل إيرور في الاتصال (زي ما نت فصل)، جرب تفتح من الذاكرة
  loadOfflineSession(); 
}
}

