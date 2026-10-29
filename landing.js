/* ============ صفحة الهبوط للزوار ============ */
function renderLandingView() {
  const container = document.getElementById('landingView');
  if (!container) return;

  const en = currentLang === 'en';
  const cur = state.storeSettings.currency || 'ج.م';

  let plansHtml = '';
  PLANS.forEach(plan => {
    plansHtml += '<div class="landing-plan-card' + (plan.popular ? ' popular' : '') + '">';
    if (plan.popular) plansHtml += '<div class="landing-popular-badge">الأكثر شعبية ⭐</div>';
    plansHtml += '<h4>' + (en ? plan.name_en : plan.name_ar) + '</h4>';
    plansHtml += '<div class="landing-plan-price"><span>' + plan.price + '</span> ' + cur + ' / شهر</div>';
    plansHtml += '<button class="landing-btn-primary" style="margin-top:20px; padding: 12px 20px; font-size: 15px; width: 100%; box-shadow: none;" onclick="showAuthView(\'signup\')">اشترك الآن ←</button>';
    plansHtml += '</div>';
  });

  container.innerHTML = `
    <div class="landing-hero">
      <div class="landing-badge">🚀 النظام رقم 1 لإدارة المحلات</div>
      <h1 class="landing-title">سيبك من الدفاتر والورق.<br><span class="text-gradient">محلك وحساباته في جيبك.</span></h1>
      <p class="landing-subtitle">نظام الكاشير الأسهل في مصر. بيع، اطبع فاتورتك، وابعت للعميل واتساب في ثانية. واعرف أرباحك الحقيقية في أي وقت.</p>
      
      <div class="landing-cta-group">
        <button class="landing-btn-primary" onclick="showAuthView('signup')">
          ابدأ 14 يوم مجاناً ←
        </button>
        <span class="landing-trust-text">✅ لن نطلب منك أي بيانات دفع الآن</span>
      </div>
    </div>

    <!-- محاكاة شكل التطبيق -->
    <div class="landing-mockup-wrap">
      <div class="landing-mockup-phone">
        <div class="landing-mockup-header">💳 الدفع الآمن</div>
        <div class="landing-mockup-body">
          <div class="mockup-line"></div>
          <div class="mockup-line short"></div>
          <div class="mockup-box">فاتورة رقم #1092<br><b>150.00 ج.م</b></div>
          <div class="mockup-btn">تأكيد البيع</div>
        </div>
      </div>
      <!-- أيقونات طايرة -->
      <div class="floating-icon icon-1">📦</div>
      <div class="floating-icon icon-2">📈</div>
      <div class="floating-icon icon-3">💬</div>
    </div>

    <!-- قسم مشاكل التاجر -->
    <div style="background: #fff; padding: 40px 20px; text-align: center; border-bottom: 1px solid #e2e8f0;">
      <h2 style="font-size: 28px; font-weight: 900; color: #0f172a; margin-bottom: 24px;">هل تعاني من هذه المشاكل في محلك؟</h2>
      <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 16px; max-width: 900px; margin: 0 auto;">
        <div style="background: #fef2f2; color: #991b1b; padding: 16px 24px; border-radius: 12px; font-weight: 700; flex: 1; min-width: 250px; border: 1px solid #fecaca;">❌ بتتعب في حصر مخزونك وبتكتشف إن فيه بضاعة ضايعة؟</div>
        <div style="background: #fef2f2; color: #991b1b; padding: 16px 24px; border-radius: 12px; font-weight: 700; flex: 1; min-width: 250px; border: 1px solid #fecaca;">❌ العملاء اللي عليهم ديون بيتوهوا منك ومش فاكرهم؟</div>
        <div style="background: #fef2f2; color: #991b1b; padding: 16px 24px; border-radius: 12px; font-weight: 700; flex: 1; min-width: 250px; border: 1px solid #fecaca;">❌ بتبيع طول اليوم ومش عارف صافي ربحك الحقيقي كام؟</div>
      </div>
    </div>

    <!-- قسم المميزات -->
    <div class="landing-features">
      <div class="landing-feature-card">
        <div class="feat-icon" style="background:#eff6ff; color:#2563eb;">⚡</div>
        <h3>كاشير بيطير</h3>
        <p>امسح الباركود واطبع الفاتورة في ثانية. مفيش طوابير وهتخلص زباين أسرع.</p>
      </div>
      <div class="landing-feature-card">
        <div class="feat-icon" style="background:#ecfdf5; color:#059669;">📦</div>
        <h3>مخزنك في أمان</h3>
        <p>هيعرفك فوراً إيه اللي خلص، وهينبهك قبل ما تخلص، عشان مبيعاتك متقفش.</p>
      </div>
      <div class="landing-feature-card">
        <div class="feat-icon" style="background:#fffbeb; color:#d97706;">💎</div>
        <h3>رجع عميلك تاني</h3>
        <p>نظام نقاط ذكي بيخلي العميل بيشتري منك إنت بس، عشان يستفيد بخصمه.</p>
      </div>
      <div class="landing-feature-card">
        <div class="feat-icon" style="background:#fef2f2; color:#dc2626;">📈</div>
        <h3>اعرف ربحك صح</h3>
        <p>تقارير بتوريك التكلفة والمصروفات وصافي الربح، عشان تاخد قرارات صح لمحلك.</p>
      </div>
    </div>

    <div class="landing-pricing-section">
      <h2>خطط تناسب كل تاجر</h2>
      <div class="landing-plans-grid">
        ${plansHtml}
      </div>
    </div>

    <div class="landing-footer-cta">
      <h2>جاهز تطور تجارتك؟</h2>
      <p>انضم لمئات التجار اللي بيديروا محلاتهم بذكاء وأمان تام.</p>
      <button class="landing-btn-primary" onclick="showAuthView('signup')">أنشئ حسابك المجاني الآن</button>
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
    setAuthMessage(currentLang === 'en'
      ? 'Fill in your info, then click "✨ Create Account ✨" below'
      : 'املأ بياناتك ثم اضغط "✨ إنشاء حساب جديد ✨" بالأسفل');
  } else {
    setAuthMessage('');
  }

  setTimeout(() => {
    const email = document.getElementById('authEmail');
    if (email) email.focus();
  }, 100);
}