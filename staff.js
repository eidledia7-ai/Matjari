/* ============ إدارة الموظفين (Edge Function) ============ */
async function inviteStaff() {
  // [إصلاح] حماية supabaseClient
  if (!supabaseClient) return showNotification('لا يوجد اتصال بالسيرفر', 'error');

  const btn = document.querySelector('button[onclick="inviteStaff()"]');
  if (btn && btn.disabled) return;
  
  const email = document.getElementById('staffEmail').value.trim();
  if (!email) return showNotification('أدخل إيميل الموظف', 'error');

  const { count } = await supabaseClient
    .from('shop_user_roles')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', state.currentUser.id);

  const lim = checkLimit('users', count || 0);
  if (!lim.allowed) {
    return showNotification(
      currentLang === 'en'
        ? 'User limit reached (' + lim.max + '). Upgrade your plan.'
        : 'وصلت لحد المستخدمين (' + lim.max + '). رقّي باقتك.',
      'warning'
    );
  }

  const defaultPassword = prompt('أدخل كلمة مرور مؤقتة للموظف (6 أحرف على الأقل):');
  if (!defaultPassword || defaultPassword.length < 6) {
    return showNotification('يجب إدخال كلمة مرور من 6 أحرف على الأقل', 'error');
  }

  if (btn) btn.disabled = true;
  showLoading('جارٍ إنشاء الحساب...');
  
  let accountCreated = false;
  try {
    const session = await supabaseClient.auth.getSession();
    const token = session.data.session?.access_token || SUPABASE_KEY; 

    const { data, error } = await supabaseClient.functions.invoke('invite-staff', {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_KEY
      },
      body: {
        email: email,
        owner_id: state.currentUser.id,
        password: defaultPassword
      }
    });

    if (error) throw error;
    if (data && data.error) throw new Error(data.error);

    accountCreated = true;

    // [إصلاح البند 5] سجل إضافة موظف
    if (typeof addAuditLog === 'function') {
      addAuditLog('invite_staff', {
        email: email,
        ownerId: state.currentUser.id
      }, email);
    }

    showNotification(`تم إنشاء الحساب! الإيميل: ${email} | الباسورد: ${defaultPassword}`, 'success');
    
    document.getElementById('staffEmail').value = '';
    
  } catch (e) {
    let errorMsg = e.message || 'خطأ غير معروف';
    if (e.context && typeof e.context.json === 'function') {
      try {
        const errBody = await e.context.json();
        if (errBody && errBody.error) errorMsg = errBody.error;
      } catch (err) {}
    }
    showNotification('تعذر إنشاء الحساب: ' + errorMsg, 'error');
    console.error("REAL ERROR:", e);
  } finally {
    if (btn) btn.disabled = false;
    hideLoading();
  }

  // [إصلاح] loadStaffList خارج الـ try/catch عشان فشلها ميفسرش كفشل إنشاء الحساب
  if (accountCreated) {
    try { await loadStaffList(); } catch (e) { console.warn('loadStaffList failed:', e); }
  }
}

async function loadStaffList() {
  const container = document.getElementById('staffList');
  if (!container) return;

  try {
    if (!supabaseClient) throw new Error('No supabase client');
    const { data, error } = await supabaseClient
      .from('shop_user_roles')
      .select('user_id, role, owner_id, email') 
      .eq('owner_id', state.currentUser.id)
      .order('email', { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) {
      container.innerHTML = '<p class="text-muted">لا يوجد موظفين مسجلين حتى الآن.</p>';
      return;
    }

    let html = '<div class="table-wrap"><table class="data-table"><thead><tr><th>إيميل الموظف</th><th>الرتبة</th><th>الإجراءات</th></tr></thead><tbody>';
    
    data.forEach(staff => {
      html += '<tr>' +
        '<td><b>' + escapeHTML(staff.email || staff.user_id) + '</b></td>' +
        '<td><span class="badge" style="background:#e0e0e0; padding:4px 8px; border-radius:4px;">' + escapeHTML(staff.role) + '</span></td>' +
        '<td><button class="small-btn red" onclick="deactivateStaff(\'' + staff.user_id + '\')">إلغاء التنشيط</button></td>' +
        '</tr>';
    });
    
    html += '</tbody></table></div>';
    container.innerHTML = html;

  } catch (e) {
    container.innerHTML = '<p class="text-red">تعذر تحميل قائمة الموظفين.</p>';
    console.error(e);
  }
}

async function deactivateStaff(userId) {
  if (state.role !== 'manager') return showNotification('هذه العملية للمدير فقط', 'warning');
  if (!userId) return;
  if (!supabaseClient) return showNotification('لا يوجد اتصال بالسيرفر', 'error');
  if (!confirm('هل أنت متأكد من إلغاء تنشيط هذا الموظف؟')) return;

  // [إصلاح البند 5] نجيب إيميل الموظف قبل الحذف للسجل
  let staffEmail = userId;
  try {
    const { data } = await supabaseClient
      .from('shop_user_roles')
      .select('email')
      .eq('user_id', userId)
      .eq('owner_id', state.currentUser.id)
      .maybeSingle();
    if (data && data.email) staffEmail = data.email;
  } catch (e) { /* ignore */ }

  showLoading('جارٍ إلغاء التنشيط...');
  try {
    const { error } = await supabaseClient
      .from('shop_user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('owner_id', state.currentUser.id);

    if (error) throw error;

    // [إصلاح البند 5] سجل إلغاء تنشيط
    if (typeof addAuditLog === 'function') {
      addAuditLog('deactivate_staff', {
        userId: userId,
        email: staffEmail,
        ownerId: state.currentUser.id
      }, userId);
    }

    showNotification('تم إلغاء تنشيط الموظف ✅', 'success');
    await loadStaffList();
  } catch (e) {
    showNotification('تعذر إلغاء التنشيط: ' + (e.message || ''), 'error');
  } finally {
    hideLoading();
  }
}