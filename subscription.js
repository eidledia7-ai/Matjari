/* ============ صفحة الاشتراك ============ */
function renderSubscriptionPage() {
  const container = document.getElementById('subscriptionContent');
  if (!container) return;

  const sub = state.subscription || {};
  const en = currentLang === 'en';
  const cur = state.storeSettings.currency || 'ج.م';

  let endDate = null;
  if (sub.plan === 'trial' && sub.trial_ends_at) endDate = new Date(sub.trial_ends_at).getTime();
  else if (sub.expires_at) endDate = new Date(sub.expires_at).getTime();

  const now = Date.now();
  const daysLeft = endDate ? Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24))) : 0;
  const isActive = sub.status === 'active' && (!endDate || endDate > now);

  const planNames = {
    trial: en ? 'Free Trial' : 'تجربة مجانية',
    starter: en ? 'Starter' : 'البداية',
    growth: en ? 'Growth' : 'النمو',
    pro: en ? 'Pro' : 'الاحترافي'
  };
  const planName = planNames[sub.plan] || sub.plan || 'Trial';

  let progressPercent = 0;
  if (sub.plan === 'trial' && endDate) {
    const startTime = endDate - (14 * 24 * 60 * 60 * 1000);
    progressPercent = Math.min(100, Math.max(0, ((now - startTime) / (endDate - startTime)) * 100));
  }

  const plans = PLANS.map(function(p) {
    return {
      id: p.id,
      name: en ? p.name_en : p.name_ar,
      price: p.price,
      yearly: p.yearly,
      popular: !!p.popular,
      features: buildPlanFeaturesList(p.id, en)
    };
  });

  let html = '';

  html += '<div class="card">';
  html += '<h3>' + tr('current_status_title') + '</h3>';
  html += '<div class="sub-status-grid">';

  html += '<div class="stat-card ' + (isActive ? 'active' : 'expired') + '">';
  html += '<h3>' + tr('current_plan') + '</h3><p>' + planName + '</p></div>';

  html += '<div class="stat-card ' + (isActive ? 'active' : 'expired') + '">';
  html += '<h3>' + tr('th_status') + '</h3><p>' + (isActive ? tr('active_status') : tr('expired_status')) + '</p></div>';

  if (endDate) {
    html += '<div class="stat-card">';
    html += '<h3>' + tr('days_remaining') + '</h3><p>' + daysLeft + ' ' + tr('days_word') + '</p></div>';

    html += '<div class="stat-card">';
    html += '<h3>' + tr('expires_on') + '</h3><p style="font-size:14px">' + new Date(endDate).toLocaleDateString(en ? 'en-US' : 'ar-EG') + '</p></div>';
  }

  html += '</div>';

  if (sub.plan === 'trial' && endDate && isActive) {
    html += '<div class="sub-progress-wrap mt-15">';
    html += '<div class="sub-progress-label">' + tr('trial_progress') + ' — ' + daysLeft + ' / 14 ' + tr('days_word') + '</div>';
    html += '<div class="sub-progress-bar"><div class="sub-progress-fill" style="width:' + progressPercent + '%"></div></div>';
    html += '</div>';
  }

  html += '</div>';

  html += '<div class="card mt-20">';
  html += '<h3>' + tr('available_plans') + '</h3>';
  html += '<div class="plans-grid">';

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

/* ============ بدء الاشتراك (Paymob) ============ */
async function startSubscription(planId) {
  const plan = PLANS.find(p => p.id === planId);
  if (!plan) return;

  if (!supabaseClient) {
    return showNotification(currentLang === 'en' ? 'No connection to server.' : 'لا يوجد اتصال بالسيرفر.', 'error');
  }
  
  showLoading(currentLang === 'en' ? 'Connecting to payment...' : 'جارٍ الاتصال ببوابة الدفع...');

  try {
    const { data, error } = await supabaseClient.functions.invoke('create-payment', {
      body: {
        amount: plan.price,
        planId: planId,
        userEmail: state.currentUser ? state.currentUser.email : '',
        userName: 'Customer',
        userId: state.currentUser ? state.currentUser.id : ''
      }
    });

    if (error) throw error;
    if (!data || !data.token) throw new Error('لم يتم استلام توكن الدفع');

    hideLoading();

    const iframeId = '1090930'; 
    const iframeUrl = `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${data.token}`;

    const oldModal = document.getElementById('paymobIframeModal');
    if (oldModal) oldModal.remove();

    const modal = document.createElement('div');
    modal.id = 'paymobIframeModal';
    modal.className = 'modal-overlay';
    modal.style.zIndex = '9999999'; 
    modal.innerHTML = `
      <div class="modal-card" style="max-width: 600px; width: 100%; padding: 0; overflow: hidden; height: 85vh;">
        <div style="padding: 15px; background: #17364c; color: white; display: flex; justify-content: space-between; align-items: center;">
          <h3 style="margin: 0; color: white;">💳 ${currentLang === 'en' ? 'Secure Payment' : 'الدفع الآمن'}</h3>
          <button onclick="document.getElementById('paymobIframeModal').remove()" style="background: transparent; border: none; color: white; font-size: 20px; cursor: pointer;">✕</button>
        </div>
        <iframe src="${iframeUrl}" width="100%" height="100%" style="border: none;"></iframe>
      </div>
    `;
    document.body.appendChild(modal);

  } catch (err) {
    hideLoading();
    showNotification((currentLang === 'en' ? 'Error: ' : 'خطأ: ') + err.message, 'error');
  }
}

/* ============ عرض تفاصيل باقة ============ */
function showPlanDetail(planId, context) {
  const plan = PLANS.find(p => p.id === planId);
  if (!plan) return;

  const en = currentLang === 'en';
  const cur = state.storeSettings.currency || 'ج.م';
  const dict = translations[currentLang] || translations.ar;

  const old = document.getElementById('planDetailModal');
  if (old) old.remove();

  const names = { starter: en ? 'Starter' : 'البداية', growth: en ? 'Growth' : 'النمو', pro: en ? 'Pro' : 'الاحترافي' };
  const icons = { starter: '🚀', growth: '⭐', pro: '👑' };
  const subtitles = {
    starter: en ? 'Perfect to get started' : 'مناسبة للبداية والاحتياج الأساسي',
    growth:  en ? 'Best for growing shops' : 'الأفضل للمحلات النامية',
    pro:     en ? 'For large stores & chains' : 'للمحلات الكبيرة والسلاسل'
  };

  const includesText = planId === 'growth'
    ? (en ? '✅ Everything in Starter +' : '✅ كل مميزات البداية +')
    : planId === 'pro'
    ? (en ? '✅ Everything in Growth +' : '✅ كل مميزات النمو +')
    : (en ? 'This plan includes:' : 'هذه الباقة تشمل:');

  let featuresHtml = '';
  PLAN_FEATURES.forEach(f => {
    const val = f.values[planId];
    let icon, text, cls;
    if (val === true)  { icon = '✅'; text = en ? f.label_en : f.label_ar; cls = 'pd-on'; }
    else if (val === false) { icon = '❌'; text = en ? f.label_en : f.label_ar; cls = 'pd-off'; }
    else { icon = '✓'; text = (en ? f.label_en : f.label_ar) + ': <b>' + val + '</b>'; cls = 'pd-on'; }
    featuresHtml += '<li class="' + cls + '"><span class="pd-fi">' + icon + '</span><span>' + text + '</span></li>';
  });

  const ctaHtml = context === 'landing'
    ? '<button class="btn green w-100 pd-cta" onclick="hidePlanDetail(); showAuthView(\'signup\')">' + dict.start_free_trial + '</button>'
    : '<button class="btn green w-100 pd-cta" onclick="hidePlanDetail(); startSubscription(\'' + planId + '\')">' + dict.subscribe_now + ' — ' + plan.price + ' ' + cur + '/' + dict.per_month + '</button>';

  const modal = document.createElement('div');
  modal.id = 'planDetailModal';
  modal.className = 'plan-detail-overlay';
  modal.setAttribute('onclick', 'if(event.target===this)hidePlanDetail()');
  modal.innerHTML =
    '<div class="plan-detail-card pd-theme-' + planId + '">' +
      '<button class="pd-close" onclick="hidePlanDetail()">✕</button>' +
      (plan.popular ? '<div class="pd-popular-badge">⭐ ' + dict.most_popular + '</div>' : '') +
      '<div class="pd-hero">' +
        '<div class="pd-icon">' + icons[planId] + '</div>' +
        '<h2 class="pd-name">' + names[planId] + '</h2>' +
        '<p class="pd-subtitle">' + subtitles[planId] + '</p>' +
      '</div>' +
      '<div class="pd-price-block">' +
        '<div class="pd-price"><span class="pd-amount">' + plan.price + '</span><span class="pd-cur">' + cur + '</span><span class="pd-period">/' + dict.per_month + '</span></div>' +
        '<div class="pd-yearly">' + (en ? 'or ' : 'أو ') + '<b>' + plan.yearly + ' ' + cur + '</b>/' + dict.per_year +
          '<span class="pd-save-badge">' + (en ? 'Save 2 months' : 'وفّر شهرين') + '</span></div>' +
      '</div>' +
      '<div class="pd-divider"></div>' +
      '<div class="pd-includes">' + includesText + '</div>' +
      '<ul class="pd-features">' + featuresHtml + '</ul>' +
      ctaHtml +
      '<div class="pd-trust">' +
        '<span>🔒 ' + (en ? 'Secure' : 'دفع آمن') + '</span>' +
        '<span>↩️ ' + (en ? '7-day guarantee' : 'ضمان 7 أيام') + '</span>' +
        '<span>📞 ' + (en ? '24/7 support' : 'دعم 24/7') + '</span>' +
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