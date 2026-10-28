/* ============ صفحة الاشتراك ============ */
function renderSubscriptionPage() {
  const container = document.getElementById('subscriptionContent');
  if (!container) return;

  const sub = state.subscription || {};
  const en = currentLang === 'en';
  const cur = state.storeSettings.currency || 'ج.م';

  // حساب الأيام المتبقية
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

  // شريط تقدم (14 يوم trial)
  let progressPercent = 0;
  if (sub.plan === 'trial' && endDate) {
    const startTime = endDate - (14 * 24 * 60 * 60 * 1000);
    progressPercent = Math.min(100, Math.max(0, ((now - startTime) / (endDate - startTime)) * 100));
  }

  const plans = [
    {
      id: 'starter',
      name: tr('plan_starter'),
      price: 299,
      yearly: 2990,
      features: en
        ? ['1 user', '1 branch', 'Up to 500 products', 'Basic reports', 'WhatsApp support']
        : ['مستخدم واحد', 'فرع واحد', 'حتى 500 منتج', 'تقارير أساسية', 'دعم واتساب']
    },
    {
      id: 'growth',
      name: tr('plan_growth'),
      price: 699,
      yearly: 6990,
      popular: true,
      features: en
        ? ['3 users', '3 branches', 'Up to 3,000 products', 'Advanced reports', 'Priority WhatsApp', 'WhatsApp invoices ✅']
        : ['3 مستخدمين', '3 فروع', 'حتى 3,000 منتج', 'تقارير متقدمة', 'واتساب أولوية', 'فاتورة واتساب ✅']
    },
    {
      id: 'pro',
      name: tr('plan_pro'),
      price: 1499,
      yearly: 14990,
      features: en
        ? ['Unlimited users', 'Unlimited branches', 'Unlimited products', 'All reports + export', 'Account manager', 'API access']
        : ['مستخدمين غير محدود', 'فروع غير محدودة', 'منتجات غير محدودة', 'كل التقارير + تصدير', 'مدير حساب مخصص', 'API']
    }
  ];

  let html = '';

  // === كارت الحالة ===
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

  // === الخطط المتاحة ===
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
      html += '<button class="btn green w-100" onclick="showNotification(\'' + tr('payment_coming_soon') + '\', \'info\')">' + tr('upgrade_now') + '</button>';
    }
    html += '</div>';
  });

  html += '</div></div>';

  html += '<div class="notice info mt-20">💳 <b>' + tr('payment_coming_soon') + '</b> ' + tr('payment_coming_desc') + '</div>';

  container.innerHTML = html;
}
/* ============ صفحة الهبوط للزوار ============ */
