/* ============ إدارة الموظفين (Edge Function) ============ */
async function inviteStaff() {
  if (!supabaseClient) return showNotification(tr('error_no_server_connection'), 'error');

  const btn = document.querySelector('button[onclick="inviteStaff()"]');
  if (btn && btn.disabled) return;
  
  const email = document.getElementById('staffEmail').value.trim();
  if (!email) return showNotification(tr('staff_email_req'), 'error');

  const { count } = await supabaseClient.from('shop_user_roles').select('*', { count: 'exact', head: true }).eq('owner_id', state.currentUser.id);
  const lim = checkLimit('users', count || 0);
  if (!lim.allowed) return showNotification(tr('staff_limit_reached'), 'warning');

  const defaultPassword = prompt(tr('staff_temp_password_prompt'));
  if (!defaultPassword || defaultPassword.length < 6) return showNotification(tr('staff_password_min'), 'error');

  if (btn) btn.disabled = true;
  showLoading(tr('staff_creating_account'));
  
  let accountCreated = false;
  try {
    const session = await supabaseClient.auth.getSession();
    const token = session.data.session?.access_token || SUPABASE_KEY; 

    const { data, error } = await supabaseClient.functions.invoke('invite-staff', {
      headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_KEY },
      body: { email: email, owner_id: state.currentUser.id, password: defaultPassword }
    });

    if (error) throw error;
    if (data && data.error) throw new Error(data.error);

    accountCreated = true;

    if (typeof addAuditLog === 'function') {
      addAuditLog('invite_staff', { email: email, ownerId: state.currentUser.id });
    }

    showNotification(
      tr('staff_created_ok_template')
        .replace('{email}', email)
        .replace('{password}', defaultPassword),
      'success'
    );
    document.getElementById('staffEmail').value = '';
    
  } catch (e) {
    let errorMsg = e.message || tr('staff_unknown_error');
    if (e.context && typeof e.context.json === 'function') {
      try { const errBody = await e.context.json(); if (errBody && errBody.error) errorMsg = errBody.error; } catch (err) {}
    }
    showNotification(tr('staff_create_fail') + errorMsg, 'error');
    console.error("REAL ERROR:", e);
  } finally {
    if (btn) btn.disabled = false;
    hideLoading();
  }

  if (accountCreated) {
    try { await loadStaffList(); } catch (e) { console.warn('loadStaffList failed:', e); }
  }
}

async function loadStaffList() {
  const container = document.getElementById('staffList');
  if (!container) return;

  try {
    if (!supabaseClient) throw new Error(tr('error_no_server_connection'));
    const { data, error } = await supabaseClient.from('shop_user_roles').select('user_id, role, owner_id, email').eq('owner_id', state.currentUser.id).order('email', { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) {
      container.innerHTML = '<p class="text-muted">' + tr('staff_no_employees') + '</p>';
      return;
    }

    let html = '<div class="table-wrap"><table class="data-table"><thead><tr><th>' + tr('staff_email_header') + '</th><th>' + tr('staff_role_header') + '</th><th>' + tr('staff_actions_header') + '</th></tr></thead><tbody>';
    data.forEach(staff => {
      html += '<tr>' +
        '<td><b>' + escapeHTML(staff.email || staff.user_id) + '</b></td>' +
        '<td><span class="badge" style="background:#e0e0e0; padding:4px 8px; border-radius:4px;">' + escapeHTML(staff.role) + '</span></td>' +
        '<td><button class="small-btn red" onclick="deactivateStaff(\'' + staff.user_id + '\')">' + tr('staff_deactivate_btn') + '</button></td>' +
        '</tr>';
    });
    html += '</tbody></table></div>';
    container.innerHTML = html;

  } catch (e) {
    container.innerHTML = '<p class="text-red">' + tr('staff_load_fail') + '</p>';
    console.error(e);
  }
}

async function deactivateStaff(userId) {
  if (state.role !== 'manager') return showNotification(tr('manager_only'), 'warning');
  if (!userId) return;
  if (!supabaseClient) return showNotification(tr('error_no_server_connection'), 'error');
  if (!confirm(tr('staff_deactivate_confirm'))) return;

  let staffEmail = userId;
  try {
    const { data } = await supabaseClient.from('shop_user_roles').select('email').eq('user_id', userId).eq('owner_id', state.currentUser.id).maybeSingle();
    if (data && data.email) staffEmail = data.email;
  } catch (e) { }

  showLoading(tr('staff_deactivating'));
  try {
    const { error } = await supabaseClient.from('shop_user_roles').delete().eq('user_id', userId).eq('owner_id', state.currentUser.id);
    if (error) throw error;

    if (typeof addAuditLog === 'function') {
      addAuditLog('deactivate_staff', { userId: userId, email: staffEmail, ownerId: state.currentUser.id }, userId);
    }

    showNotification(tr('staff_deactivated'), 'success');
    await loadStaffList();
  } catch (e) {
    showNotification(tr('staff_deactivate_fail') + (e.message || ''), 'error');
  } finally {
    hideLoading();
  }
}