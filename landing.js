/* ============ صفحة الهبوط للزوار ============ */
function renderLandingView() {
  const container = document.getElementById('landingView');
  if (!container) return;

  const cur = state.storeSettings.currency || 'ج.م';

  let plansHtml = '';
  PLANS.forEach(plan => {
    plansHtml += '<div class="landing-plan-card' + (plan.popular ? ' popular' : '') + '">';
    if (plan.popular) plansHtml += '<div class="landing-popular-badge">' + tr('landing_popular_badge') + '</div>';
    plansHtml += '<h4>' + (currentLang === 'en' ? plan.name_en : plan.name_ar) + '</h4>';
    plansHtml += '<div class="landing-plan-price"><span>' + plan.price + '</span> ' + cur + ' ' + tr('landing_plan_per_month_suffix') + '</div>';
    plansHtml += '<button class="landing-btn-primary" style="margin-top:20px; padding: 12px 20px; font-size: 15px; width: 100%; box-shadow: none;" onclick="showAuthView(\'signup\')">' + tr('landing_subscribe_btn') + '</button>';
    plansHtml += '</div>';
  });

  container.innerHTML = `
    <div class="landing-hero">
      <div class="landing-badge">${tr('landing_badge')}</div>
      <h1 class="landing-title">${tr('landing_title_line1')}<br><span class="text-gradient">${tr('landing_title_line2')}</span></h1>
      <p class="landing-subtitle">${tr('landing_hero_desc')}</p>
      
      <div class="landing-cta-group">
        <button class="landing-btn-primary" onclick="showAuthView('signup')">
          ${tr('landing_cta_primary')}
        </button>
        <span class="landing-trust-text">${tr('landing_trust_no_payment')}</span>
      </div>
    </div>

    <!-- محاكاة شكل التطبيق -->
    <div class="landing-mockup-wrap">
      <div class="landing-mockup-phone">
        <div class="landing-mockup-header">${tr('landing_mockup_title')}</div>
        <div class="landing-mockup-body">
          <div class="mockup-line"></div>
          <div class="mockup-line short"></div>
          <div class="mockup-box">${tr('landing_mockup_invoice')}<br><b>150.00 ${cur}</b></div>
          <div class="mockup-btn">${tr('landing_mockup_confirm')}</div>
        </div>
      </div>
      <!-- أيقونات طايرة -->
      <div class="floating-icon icon-1">📦</div>
      <div class="floating-icon icon-2">📈</div>
      <div class="floating-icon icon-3">💬</div>
    </div>

    <!-- قسم مشاكل التاجر -->
    <div style="background: #fff; padding: 40px 20px; text-align: center; border-bottom: 1px solid #e2e8f0;">
      <h2 style="font-size: 28px; font-weight: 900; color: #0f172a; margin-bottom: 24px;">${tr('landing_pain_title')}</h2>
      <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 16px; max-width: 900px; margin: 0 auto;">
        <div style="background: #fef2f2; color: #991b1b; padding: 16px 24px; border-radius: 12px; font-weight: 700; flex: 1; min-width: 250px; border: 1px solid #fecaca;">${tr('landing_pain_1')}</div>
        <div style="background: #fef2f2; color: #991b1b; padding: 16px 24px; border-radius: 12px; font-weight: 700; flex: 1; min-width: 250px; border: 1px solid #fecaca;">${tr('landing_pain_2')}</div>
        <div style="background: #fef2f2; color: #991b1b; padding: 16px 24px; border-radius: 12px; font-weight: 700; flex: 1; min-width: 250px; border: 1px solid #fecaca;">${tr('landing_pain_3')}</div>
      </div>
    </div>

    <!-- قسم المميزات -->
    <div class="landing-features">
      <div class="landing-feature-card">
        <div class="feat-icon" style="background:#eff6ff; color:#2563eb;">⚡</div>
        <h3>${tr('landing_feat_cashier_title')}</h3>
        <p>${tr('landing_feat_cashier_desc')}</p>
      </div>
      <div class="landing-feature-card">
        <div class="feat-icon" style="background:#ecfdf5; color:#059669;">📦</div>
        <h3>${tr('landing_feat_inventory_title')}</h3>
        <p>${tr('landing_feat_inventory_desc')}</p>
      </div>
      <div class="landing-feature-card">
        <div class="feat-icon" style="background:#fffbeb; color:#d97706;">💎</div>
        <h3>${tr('landing_feat_loyalty_title')}</h3>
        <p>${tr('landing_feat_loyalty_desc')}</p>
      </div>
      <div class="landing-feature-card">
        <div class="feat-icon" style="background:#fef2f2; color:#dc2626;">📈</div>
        <h3>${tr('landing_feat_profit_title')}</h3>
        <p>${tr('landing_feat_profit_desc')}</p>
      </div>
    </div>

    <div class="landing-pricing-section">
      <h2>${tr('landing_pricing_title')}</h2>
      <div class="landing-plans-grid">
        ${plansHtml}
      </div>
    </div>

    <div class="landing-footer-cta">
      <h2>${tr('landing_footer_title')}</h2>
      <p>${tr('landing_footer_desc')}</p>
      <button class="landing-btn-primary" onclick="showAuthView('signup')">${tr('landing_footer_cta')}</button>
    </div>
  `;
}

function showLandingView() {
  const landing = document.getElementById('landingView');
  if (landing) landing.style.display = 'block';
  const auth = document.getElementById('authView');
  if (auth) auth.style.display = 'none';
  renderLandingView();
}

function showAuthView(mode) {
  const landing = document.getElementById('landingView');
  if (landing) landing.style.display = 'none';
  const auth = document.getElementById('authView');
  if (auth) auth.style.display = 'block';

  const rb = document.getElementById('recoveryPanel');
  if (rb) rb.style.display = 'none';
  const lb = document.getElementById('loginButtons');
  if (lb) lb.style.display = 'block';

  if (mode === 'signup') {
    setAuthMessage(tr('landing_signup_fill_info'));
  } else {
    setAuthMessage('');
  }

  setTimeout(() => {
    const email = document.getElementById('authEmail');
    if (email) email.focus();
  }, 100);
}