/* ============ صفحة الاشتراك ============ */
function renderSubscriptionPage() {
  const container = document.getElementById('subscriptionContent');
  if (!container) return;

  const sub = state.subscription || {};
  const cur = state.storeSettings.currency || 'ج.م';

  let endDate = null;
  if (sub.plan === 'trial' && sub.trial_ends_at) endDate = new Date(sub.trial_ends_at).getTime();
  else if (sub.expires_at) endDate = new Date(sub.expires_at).getTime();

  const now = Date.now();
  const daysLeft = endDate ? Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24))) : 0;
  const isActive = sub.status === 'active' && (!endDate || endDate > now);

  const planNames = {
    trial: tr('plan_trial'), starter: tr('plan_starter'),
    growth: tr('plan_growth'), pro: tr('plan_pro')
  };
  const planName = planNames[sub.plan] || sub.plan || tr('plan_trial');

  let progressPercent = 0;
  if (sub.plan === 'trial' && endDate) {
    const startTime = endDate - (14 * 24 * 60 * 60 * 1000);
    progressPercent = Math.min(100, Math.max(0, ((now - startTime) / (endDate - startTime)) * 100));
  }

  const plans = PLANS.map(function(p) {
    return {
      id: p.id, name: currentLang === 'en' ? p.name_en : p.name_ar,
      price: p.price, yearly: p.yearly, popular: !!p.popular,
      features: buildPlanFeaturesList(p.id, currentLang === 'en')
    };
  });

  let html = '';
  html += '<div class="card">';
  html += '<h3>' + tr('current_status_title') + '</h3>';
  html += '<div class="sub-status-grid">';
  html += '<div class="stat-card ' + (isActive ? 'active' : 'expired') + '"><h3>' + tr('current_plan') + '</h3><p>' + planName + '</p></div>';
  html += '<div class="stat-card ' + (isActive ? 'active' : 'expired') + '"><h3>' + tr('th_status') + '</h3><p>' + (isActive ? tr('active_status') : tr('expired_status')) + '</p></div>';
  if (endDate) {
    html += '<div class="stat-card"><h3>' + tr('days_remaining') + '</h3><p>' + daysLeft + ' ' + tr('days_word') + '</p></div>';
    html += '<div class="stat-card"><h3>' + tr('expires_on') + '</h3><p style="font-size:14px">' + new Date(endDate).toLocaleDateString(currentLang === 'en' ? 'en-US' : 'ar-EG') + '</p></div>';
  }
  html += '</div>';
  if (sub.plan === 'trial' && endDate && isActive) {
    html += '<div class="sub-progress-wrap mt-15"><div class="sub-progress-label">' + tr('trial_progress') + ' — ' + daysLeft + ' / 14 ' + tr('days_word') + '</div>';
    html += '<div class="sub-progress-bar"><div class="sub-progress-fill" style="width:' + progressPercent + '%"></div></div></div>';
  }
  html += '</div>';

  html += '<div class="card mt-20"><h3>' + tr('available_plans') + '</h3><div class="plans-grid">';
  plans.forEach(plan => {
    const isCurrent = sub.plan === plan.id;
    html += '<div class="plan-card' + (plan.popular ? ' popular' : '') + (isCurrent ? ' current' : '') + '" onclick="showPlanDetail(\'' + plan.id + '\', \'subscription\')" style="cursor:pointer">';
    if (plan.popular) html += '<div class="plan-badge">' + tr('most_popular') + '</div>';
    if (isCurrent) html += '<div class="plan-badge current-badge">' + tr('your_current_plan') + '</div>';
    html += '<h4>' + plan.name + '</h4>';
    html += '<div class="plan-price"><span class="price-amount">' + plan.price + '</span><span class="price-currency">' + cur + '</span><span class="price-period">/' + tr('per_month') + '</span></div>';
    html += '<div class="plan-yearly">' + tr('or_text') + ' ' + plan.yearly + ' ' + cur + ' / ' + tr('per_year') + '</div>';
    html += '<ul class="plan-features">';
    plan.features.forEach(f => { html += '<li>✓ ' + f + '</li>'; });
    html += '</ul>';
    if (isCurrent) {
      html += '<button class="btn grey w-100" disabled>' + tr('your_current_plan') + '</button>';
    } else {
      html += '<button class="btn green w-100" onclick="event.stopPropagation(); startSubscription(\'' + plan.id + '\')">' + tr('upgrade_now') + '</button>';
    }
    html += '</div>';
  });
  html += '</div></div>';

  html += '<div class="notice info mt-20">💳 <b>' + tr('payment_coming_soon') + '</b> ' + tr('payment_coming_desc') + '</div>';
  container.innerHTML = html;
}

function buildPlanFeaturesList(planId, en) {
  const features = [];
  PLAN_FEATURES.forEach(f => {
    const val = f.values[planId];
    const label = en ? f.label_en : f.label_ar;
    if (val === true) features.push(label);
    else if (val === false) return;
    else features.push(label + ': ' + val);
  });
  return features;
}

async function startSubscription(planId) {
  const plan = PLANS.find(p => p.id === planId);
  if (!plan) return;

  if (!supabaseClient) return showNotification(tr('error_no_server_connection'), 'error');
  
  showLoading(tr('sub_connecting_payment'));

  try {
    const { data, error } = await supabaseClient.functions.invoke('create-payment', {
      body: {
        amount: plan.price, planId: planId,
        userEmail: state.currentUser ? state.currentUser.email : '',
        userName: 'Customer',
        userId: state.currentUser ? state.currentUser.id : ''
      }
    });

    if (error) throw error;
    if (!data || !data.token) throw new Error(tr('sub_token_error'));

    hideLoading();

    const iframeId = '1090930'; 
    const iframeUrl = `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${data.token}`;

    const oldModal = document.getElementById('paymobIframeModal');
    if (oldModal) oldModal.remove();

    if (window._paymentCheckInterval) clearInterval(window._paymentCheckInterval);

    const modal = document.createElement('div');
    modal.id = 'paymobIframeModal';
    modal.className = 'modal-overlay';
    modal.style.zIndex = '9999999'; 
    modal.innerHTML = `
      <div class="modal-card" style="max-width: 600px; width: 100%; padding: 0; overflow: hidden; height: 85vh;">
        <div style="padding: 15px; background: #17364c; color: white; display: flex; justify-content: space-between; align-items: center;">
          <h3 style="margin: 0; color: white;">💳 ${tr('sub_secure_payment')}</h3>
          <button onclick="closePaymobModal()" style="background: transparent; border: none; color: white; font-size: 20px; cursor: pointer;">✕</button>
        </div>
        <iframe src="${iframeUrl}" width="100%" height="100%" style="border: none;"></iframe>
      </div>
    `;
    document.body.appendChild(modal);

    window._paymentCheckInterval = setInterval(async () => {
      try {
        const { data: subData } = await supabaseClient
          .from('shop_subscriptions')
          .select('*')
          .eq('user_id', state.currentUser.id)
          .maybeSingle();

        if (subData && (subData.plan === planId || (subData.expires_at && new Date(subData.expires_at) > new Date()))) {
          clearInterval(window._paymentCheckInterval);
          state.subscription = subData;
          closePaymobModal();
          showNotification(tr('sub_activated_success'), 'success');
          renderSubscriptionPage();
          if (typeof enforceSubscriptionBlock === 'function') enforceSubscriptionBlock();
        }
      } catch (e) { }
    }, 5000);

  } catch (err) {
    hideLoading();
    showNotification(tr('error_generic_prefix') + err.message, 'error');
  }
}

function closePaymobModal() {
  const modal = document.getElementById('paymobIframeModal');
  if (modal) modal.remove();
  if (window._paymentCheckInterval) {
    clearInterval(window._paymentCheckInterval);
    window._paymentCheckInterval = null;
  }
}

function showPlanDetail(planId, context) {
  const plan = PLANS.find(p => p.id === planId);
  if (!plan) return;

  const cur = state.storeSettings.currency || 'ج.م';

  const old = document.getElementById('planDetailModal');
  if (old) old.remove();

  const names = { starter: tr('plan_starter'), growth: tr('plan_growth'), pro: tr('plan_pro') };
  const icons = { starter: '🚀', growth: '⭐', pro: '👑' };
  const subtitles = {
    starter: tr('sub_sub_starter'),
    growth:  tr('sub_sub_growth'),
    pro:     tr('sub_sub_pro')
  };

  const includesText = planId === 'growth' ? tr('sub_includes_starter')
    : planId === 'pro' ? tr('sub_includes_growth')
    : tr('sub_includes_base');

  let featuresHtml = '';
  PLAN_FEATURES.forEach(f => {
    const val = f.values[planId];
    let icon, text, cls;
    if (val === true)  { icon = '✅'; text = currentLang === 'en' ? f.label_en : f.label_ar; cls = 'pd-on'; }
    else if (val === false) { icon = '❌'; text = currentLang === 'en' ? f.label_en : f.label_ar; cls = 'pd-off'; }
    else { icon = '✓'; text = (currentLang === 'en' ? f.label_en : f.label_ar) + ': <b>' + val + '</b>'; cls = 'pd-on'; }
    featuresHtml += '<li class="' + cls + '"><span class="pd-fi">' + icon + '</span><span>' + text + '</span></li>';
  });

  const ctaHtml = context === 'landing'
    ? '<button class="btn green w-100 pd-cta" onclick="hidePlanDetail(); showAuthView(\'signup\')">' + tr('start_free_trial') + '</button>'
    : '<button class="btn green w-100 pd-cta" onclick="hidePlanDetail(); startSubscription(\'' + planId + '\')">' + tr('subscribe_now') + ' — ' + plan.price + ' ' + cur + '/' + tr('per_month') + '</button>';

  const modal = document.createElement('div');
  modal.id = 'planDetailModal';
  modal.className = 'plan-detail-overlay';
  modal.setAttribute('onclick', 'if(event.target===this)hidePlanDetail()');
  modal.innerHTML =
    '<div class="plan-detail-card pd-theme-' + planId + '">' +
      '<button class="pd-close" onclick="hidePlanDetail()">✕</button>' +
      (plan.popular ? '<div class="pd-popular-badge">⭐ ' + tr('most_popular') + '</div>' : '') +
      '<div class="pd-hero">' +
        '<div class="pd-icon">' + icons[planId] + '</div>' +
        '<h2 class="pd-name">' + names[planId] + '</h2>' +
        '<p class="pd-subtitle">' + subtitles[planId] + '</p>' +
      '</div>' +
      '<div class="pd-price-block">' +
        '<div class="pd-price"><span class="pd-amount">' + plan.price + '</span><span class="pd-cur">' + cur + '</span><span class="pd-period">/' + tr('per_month') + '</span></div>' +
        '<div class="pd-yearly">' + tr('or_text') + ' <b>' + plan.yearly + ' ' + cur + '</b>/' + tr('per_year') +
          '<span class="pd-save-badge">' + tr('sub_save_2_months') + '</span></div>' +
      '</div>' +
      '<div class="pd-divider"></div>' +
      '<div class="pd-includes">' + includesText + '</div>' +
      '<ul class="pd-features">' + featuresHtml + '</ul>' +
      ctaHtml +
      '<div class="pd-trust">' +
        '<span>🔒 ' + tr('sub_secure_label') + '</span>' +
        '<span>↩️ ' + tr('sub_trust_guarantee') + '</span>' +
        '<span>📞 ' + tr('sub_trust_support') + '</span>' +
      '</div>' +
    '</div>';

  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';
}

function hidePlanDetail() {
  const m = document.getElementById('planDetailModal');
  if (m) m.remove();
  if (!document.getElementById('subscriptionBlock')) {
    document.body.style.overflow = '';
  }
}