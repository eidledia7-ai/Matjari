/* ==========================================================
   متجري v5.0 - النظام السحابي المتكامل (app.js) — النسخة النهائية
   ========================================================== */

/* ============ إعدادات Supabase ============ */
const SUPABASE_URL = 'https://mdvamcntgajaiarhqeci.supabase.co';
const SUPABASE_KEY = 'sb_publishable_8a5ZkcHUW_b51WRanlLGSg_tspTOLoV';
let supabaseClient = null;

/* ============ نظام الترجمة الثنائي (ar / en) ============ */
const translations = {
  ar: {
    app_title: "متجري - نظام المبيعات والمخازن المتكامل",
    login_title: "🔐 تسجيل الدخول",
    login_hint: "سجّل دخولك للوصول لبيانات محلك",
    email_label: "البريد الإلكتروني",
    password_label: "كلمة المرور",
    show_pass: "إظهار",
    new_pass_label: "كلمة المرور الجديدة",
    save_new_pass: "حفظ كلمة المرور الجديدة",
    login_btn: "دخول للنظام 🚀",
    signup_btn: "إنشاء حساب جديد ✨",
    forgot_btn: "نسيت كلمة المرور؟",
    logout_btn: "خروج 🚪",
    main_menu: "القائمة الرئيسية",
    menu_home: "🏠 الرئيسية",
    menu_sales: "🛒 نقطة البيع",
    menu_inventory: "المخزون",
    menu_partners: "الشركاء",
    menu_finance: "المالية",
    menu_settings: "الإعدادات",
    menu_support: "🆘 الدعم والتواصل",
    store_data_page: "🏪 بيانات المحل",
    lang_page: "🌐 لغة التطبيق",
    select_lang_title: "اختر لغة النظام المفضلة",
    lang_desc: "يمكنك التبديل بين اللغات المتاحة وسيتم تطبيقها فوراً على واجهة التطبيق بالكامل.",
    sync_now: "🔄 مزامنة الآن",
    page_home_title: "الرئيسية وملخص النشاط",
    sales_last_7: "مبيعات آخر 7 أيام",
    low_stock_alerts: "⚠️ تنبيهات المخزون المنخفض",
    top_products: "🏆 المنتجات الأكثر مبيعاً",
    quick_accounts_summary: "ملخص الحسابات السريع",
    page_sales_title: "المبيعات وفواتير البيع",
    add_sale_items: "إضافة أصناف للفاتورة",
    select_product: "اختر المنتج",
    barcode_label: "الباركود (يضاف فوراً 📷)",
    qty_label: "الكمية",
    unit_price: "سعر الوحدة",
    customer_label: "العميل",
    add_manual_btn: "إضافة يدوية للفاتورة",
    paid_now: "المدفوع الآن",
    discount_label: "الخصم 🏷️",
    pay_method: "طريقة الدفع",
    pay_cash: "💵 كاش",
    pay_visa: "💳 فيزا / شبكة",
    pay_transfer: "📲 تحويل بنكي",
    notes_label: "ملاحظات",
    complete_sale_btn: "تأكيد الحفظ وطباعة الفاتورة (F9)",
    clear_cart_btn: "تفريغ الفاتورة (F8)",
    sales_log: "سجل المبيعات",
    clear_log: "🗑️ تصفير السجل",
    export_print_btn: "🖨️ / 📊 / 💬 خيارات",
    search_sales: "بحث في المبيعات",
    from_date: "من تاريخ",
    to_date: "إلى تاريخ",
    tab_products: "📦 المنتجات",
    tab_moves: "📊 حركة المخزون",
    tab_returns: "🔄 المرتجعات",
    add_product_title: "إضافة منتج جديد",
    prod_name: "اسم المنتج *",
    category_label: "التصنيف",
    sale_price: "سعر البيع",
    cost_price: "سعر التكلفة",
    stock_qty: "الكمية بالمخزن",
    min_alert: "حد التنبيه",
    save_product_btn: "حفظ المنتج",
    cancel_btn: "إلغاء",
    products_list: "قائمة المنتجات",
    print_barcode: "🏷️ طباعة باركود",
    search_placeholder: "بحث...",
    manual_adjust: "تعديل المخزون يدوياً",
    adjust_type: "نوع الحركة *",
    adj_in: "إضافة كمية (+)",
    adj_out: "خصم كمية (-)",
    adj_set: "تعديل إلى رقم مباشر (=)",
    adjust_reason: "سبب التعديل *",
    save_move: "تسجيل الحركة",
    moves_log: "سجل حركات المخزون",
    register_return: "تسجيل مرتجع",
    invoice_label: "الفاتورة *",
    item_label: "الصنف *",
    reason_label: "السبب",
    save_return: "تسجيل المرتجع",
    returns_log: "سجل المرتجعات",
    tab_customers: "👥 العملاء والتحصيلات",
    tab_suppliers: "🏭 الموردون والمشتريات",
    add_customer: "إضافة عميل",
    cust_name: "اسم العميل *",
    phone_label: "الهاتف",
    opening_debt: "رصيد افتتاحي",
    save_cust: "حفظ العميل",
    record_collection: "تسجيل تحصيل",
    amount_label: "المبلغ *",
    date_label: "التاريخ",
    save_collection: "تسجيل التحصيل",
    customers_list: "قائمة العملاء",
    collections_log: "سجل التحصيلات",
    add_supplier: "إضافة مورد",
    supp_name: "اسم المورد *",
    opening_due: "رصيد افتتاحي (مستحق له)",
    save_supp: "حفظ المورد",
    record_purchase: "تسجيل فاتورة مشتريات", purchase_sale_price: "سعر البيع للوحدة",
    supplier_label: "المورد *",
    existing_prod: "منتج موجود",
    new_prod_name: "أو منتج جديد",
    purchase_total_field: "الإجمالي (تلقائي)",
    paid_label: "المدفوع",
    save_purchase: "تسجيل المشتريات",
    record_supp_payment: "تسجيل سداد مبلغ لمورد",
    save_supp_payment: "تسجيل السداد للمورد",
    suppliers_list: "قائمة الموردين",
    purchases_log: "سجل المشتريات",
    supp_payments_log: "سجل مدفوعات الموردين",
    tab_expenses: "💸 المصروفات",
    tab_reports: "📈 التقارير المالية",
    tab_compare: "📊 مقارنة الفترات",
    tab_shift: "💵 إغلاق الوردية",
    add_expense: "إضافة مصروف",
    expense_item: "البند *",
    save_expense: "حفظ المصروف",
    expenses_log: "سجل المصروفات",
    detailed_report: "📊 تقرير تفصيلي",
    quick_period: "الفترة السريعة",
    period_today: "📅 اليوم",
    period_week: "📆 الأسبوع",
    period_month: "🗓️ آخر 30 يوم",
    period_curr_month: "📊 الشهر الحالي",
    period_year: "📈 السنة",
    period_all: "الكل",
    custom_range: "نطاق مخصص",
    refresh_btn: "🔄 تحديث",
    print_report: "🖨️ طباعة التقرير",
    performance_summary: "📊 ملخص الأداء",
    top_selling_period: "🏆 الأكثر مبيعاً في الفترة",
    compare_settings: "⚙️ إعدادات المقارنة",
    compare_type: "نوع المقارنة",
    comp_m_prev: "الشهر الحالي vs الشهر السابق",
    comp_m_year: "الشهر الحالي vs نفس الشهر من السنة السابقة",
    comp_custom: "فترتين مخصصتين",
    period_1: "الفترة الأولى",
    period_2: "الفترة الثانية",
    show_compare: "📊 عرض المقارنة",
    print_btn: "🖨️ طباعة",
    shift_close_title: "💵 إغلاق الوردية الحالية",
    shift_note: "قم بعدّ النقدية فعلياً وادخلها للمطابقة.",
    cashier_name: "اسم الكاشير / الوردية *",
    expected_cash: "مبيعات الكاش المتوقعة",
    actual_cash: "النقدية الفعلية بالدرج *",
    diff_label: "الفرق",
    close_shift_btn: "🔒 إغلاق الوردية وحفظها",
    shifts_log: "📋 سجل الورديات",
    store_data: "بيانات المحل",
    store_logo: "شعار المحل (صورة)",
    remove_logo: "حذف الشعار",
    store_name: "اسم المحل",
    address_label: "العنوان",
    tax_number: "الرقم الضريبي (اختياري)",
    currency_label: "العملة",
    monthly_goal: "🎯 هدف المبيعات الشهري (اختياري)",
    change_lang_label: "🌐 لغة التطبيق / Language",
    save_store_btn: "حفظ بيانات المحل",
    app_updates: "🔄 التحديثات والكاش",
    updates_note: "تحديث التطبيق تلقائي. لو لاحظت مشاكل، اضغط \"تحديث الآن\".",
    update_now: "🔄 تحديث الآن",
    clear_cache: "🗑️ مسح الكاش",
    backup_encryption: "🔒 النسخ الاحتياطي والأمان",
    backup_auth_note: "سيُطلب تأكيد كلمة مرور حسابك الحالية قبل تنزيل النسخة أو استعادتها، وتُستخدم لتشفير النسخة وفك تشفيرها.",
    export_backup: "تنزيل نسخة (.shopbak)",
    import_backup: "استعادة نسخة",
    danger_zone: "منطقة الخطر",
    danger_desc: "مسح كافة بيانات التطبيق الحالية بشكل نهائي.",
    clear_all_data: "مسح كافة بيانات التطبيق",
    page_support_title: "الدعم الفني وتواصل معنا",
    contact_us: "📞 تواصل مع الدعم الفني",
    contact_desc: "نحن هنا لمساعدتك على مدار الساعة عبر القنوات التالية:",
    help_guide: "📖 دليل الاستخدام السريع",
    version_text: "الإصدار الاحترافي v5.0",
    about_desc: "تم تصميم هذا النظام لمساعدة أصحاب المتاجر على إدارة المبيعات، المخزون، الحسابات، والعملاء بسهولة وأمان تام.",
    scan_barcode_title: "📷 مسح الباركود",
    point_camera: "وجّه الكاميرا نحو الباركود",
    close_btn: "إغلاق",
    exp_report_title: "📊 تقرير المصروفات التفصيلي",
    select_period_msg: "اختر الفترة ثم اضغط \"عرض التقرير\"",
    show_report: "📊 عرض التقرير",
    barcode_print_title: "🏷️ طباعة باركود",
    barcode_print_desc: "اختر المنتجات وحدد عدد النسخ",
    copies_label: "عدد النسخ لكل منتج",
    label_size: "حجم الملصق",
    size_small: "صغير (3 في السطر)",
    size_medium: "متوسط (2 في السطر)",
    size_large: "كبير (1 في السطر)",
    barcode_type: "نوع الباركود",
    select_products_label: "اختر المنتجات",
    select_all: "تحديد الكل",
    deselect_all: "إلغاء التحديد",
    print_barcode_btn: "🖨️ طباعة الباركود",
    all_records: "كل السجلات",
    custom_period: "فترة مخصصة (من - إلى)",
    excel_btn: "📊 Excel",
    email_placeholder: "name@example.com", password_placeholder: "كلمة المرور", new_password_placeholder: "6 أحرف على الأقل",
    appearance_title: "المظهر", appearance_desc: "تغيير مظهر التطبيق بين الوضع الليلي والنهاري.", toggle_theme: "🌙 تبديل الوضع", account_title: "الحساب", account_desc: "تسجيل الخروج من الحساب الحالي.",
    guide_sales_html: "<strong>1. المبيعات:</strong> اختر المنتجات أو امسح الباركود (يُضاف تلقائيًا مع صوت).", guide_shortcuts_html: "<strong>2. اختصارات لوحة المفاتيح:</strong>", guide_f2_html: "<code>F2</code>: الانتقال لشاشة نقطة البيع.", guide_f4_html: "<code>F4</code>: التركيز على خانة الباركود.", guide_f8_html: "<code>F8</code>: تفريغ الفاتورة.", guide_f9_html: "<code>F9</code>: حفظ الفاتورة وطباعتها.", guide_inventory_html: "<strong>3. المخزون:</strong> أضف المنتجات وعدّل الأرصدة مع ذكر السبب.", guide_shifts_html: "<strong>4. الورديات:</strong> اكتب اسم الكاشير، ثم اقفل الوردية في نهاية اليوم لمطابقة النقدية.", guide_export_html: "<strong>5. الطباعة والتصدير:</strong> استخدم خيارات الجدول للطباعة أو تنزيل CSV ومشاركته يدويًا على واتساب.", guide_sales: "1. المبيعات: اختر المنتجات أو امسح الباركود (يضاف تلقائياً مع صوت).", guide_shortcuts: "2. اختصارات لوحة المفاتيح:", guide_f2: "F2: الانتقال لشاشة نقطة البيع.", guide_f4: "F4: التركيز على خانة الباركود.", guide_f8: "F8: تفريغ الفاتورة.", guide_f9: "F9: حفظ الفاتورة وطباعتها.", guide_inventory: "3. المخزون: أضف المنتجات وعدّل الأرصدة مع ذكر السبب.", guide_shifts: "4. الورديات: اكتب اسم الكاشير، ثم اقفل الوردية في نهاية اليوم لمطابقة النقدية.", guide_export: "5. الطباعة والتصدير: استخدم خيارات الجدول للطباعة أو تنزيل CSV ومشاركته يدوياً على واتساب.", cash_customer: "عميل نقدي عام", dash_net_profit: "صافي الربح", dash_total_sales: "إجمالي المبيعات", dash_net_sales: "صافي المبيعات", dash_cost: "تكلفة البضاعة المباعة", dash_products: "عدد المنتجات", dash_expenses: "المصروفات", dash_stock_value: "قيمة المخزون", dash_customer_debt: "ديون العملاء", dash_supplier_due: "مستحقات الموردين", dash_stock_alerts: "تنبيهات المخزون",
    about_page: "ℹ️ عن التطبيق - من نحن", barcode_placeholder: "امسح/اكتب الباركود...", auto_added_placeholder: "يضاف تلقائياً", copyright_text: "جميع الحقوق محفوظة © 2026", whatsapp_btn: "💬 واتساب",
    th_item: "الصنف",
    th_price: "السعر",
    th_quantity: "الكمية",
    th_total: "الإجمالي",
    th_action: "إجراء",
    th_invoice_number: "رقم الفاتورة",
    th_date: "التاريخ",
    th_customer: "العميل",
    th_paid: "المدفوع",
    th_remaining: "المتبقي",
    th_payment_method: "طريقة الدفع",
    th_name: "الاسم",
    th_barcode: "الباركود",
    th_category: "التصنيف",
    th_cost: "التكلفة",
    th_stock: "المخزن",
    th_product: "المنتج",
    th_movement: "الحركة",
    th_before_after: "قبل ➔ بعد",
    th_reason: "السبب",
    th_phone: "الهاتف",
    th_debts: "الديون",
    th_notes: "ملاحظات",
    th_payables: "المستحقات (له فلوس)",
    th_supplier: "المورد",
    th_amount_paid: "المبلغ المدفوع",
    th_item_name: "البند",
    th_amount: "المبلغ",
    th_value: "القيمة",
    th_cashier: "الكاشير",
    th_invoice_count: "عدد الفواتير",
    th_expected_cash: "الكاش المتوقع",
    th_actual_cash: "الكاش الفعلي",
    th_difference: "الفرق",
    dlg_logout: "تسجيل الخروج؟",
    dlg_delete_logo: "حذف الشعار؟",
    dlg_wipe_all: "تحذير نهائي! سيتم مسح كافة البيانات نهائياً. هل أنت متأكد؟",
    dlg_delete_mistake: "هل هذا حذف لخطأ إدخال؟ (سيتم تعديل المخزون والأرصدة تبعا لذلك)",
    dlg_clear_log: "هل تريد مسح السجل بالكامل؟",
    dlg_delete_product: "حذف المنتج نهائياً؟",
    dlg_delete_customer: "حذف العميل؟",
    dlg_delete_supplier: "حذف المورد؟",
    dlg_clear_cache: "مسح الكاش وإعادة التحميل؟",
    opt_qr_camera: "QR Code (للكاميرا)",
    opt_barcode_usb: "باركود عادي (قارئ USB)",
    opt_both_codes: "الاثنين مع بعض",
    opt_discount_fixed: "ج.م",
    opt_discount_percent: "%",
    dlg_wipe_password: "أدخل كلمة مرور حسابك الحالية لتأكيد مسح كافة بيانات التطبيق:",
    dlg_backup_export_password: "أدخل كلمة مرور حسابك الحالية للتحقق وتشفير النسخة الاحتياطية:",
    dlg_backup_restore_password: "أدخل كلمة مرور حسابك الحالية للتحقق واستعادة النسخة الاحتياطية:",
    opt_select_product: "-- اختر المنتج --", opt_select_invoice: "-- اختر الفاتورة --", opt_select_item: "-- اختر الصنف --", opt_select_supplier: "-- اختر المورد --", opt_select_existing_product: "-- اختر منتج موجود --",
    opt_stock_label: "مخزن:", opt_available_label: "المتوفر:", opt_remaining_label: "متبقي:", opt_invoice_label: "فاتورة:", opt_supplier_due_label: "له مستحقات:",
    th_discount: "الخصم", th_subtotal: "الإجمالي قبل الخصم", th_net: "الصافي", th_status: "الحالة", th_type: "النوع", th_reference: "المرجع", th_balance: "الرصيد", th_user: "المستخدم", th_created_at: "تاريخ الإنشاء", th_unit: "الوحدة", th_profit: "الربح", th_percentage: "النسبة",
    opt_paid: "مدفوع", opt_unpaid: "غير مدفوع", opt_partial: "مدفوع جزئياً", opt_add_stock: "إضافة كمية", opt_remove_stock: "خصم كمية", opt_set_stock: "تحديد الكمية",
    msg_logout: "تسجيل الخروج؟", msg_delete_logo: "حذف الشعار؟", msg_clear_log: "هل تريد مسح السجل بالكامل؟", msg_delete_product: "حذف المنتج نهائياً؟", msg_delete_customer: "حذف العميل؟", msg_delete_supplier: "حذف المورد؟", msg_delete_mistake: "هل تريد حذف هذا السجل باعتباره خطأ إدخال؟ سيتم تعديل المخزون والأرصدة وفقاً لذلك.", msg_clear_cache: "مسح الكاش وإعادة التحميل؟", msg_wipe_all: "تحذير نهائي! سيتم مسح كافة البيانات نهائياً. هل أنت متأكد؟",
    empty_invoices: "لا توجد فواتير مسجلة.", empty_products: "لا توجد منتجات.", empty_stock_moves: "لا توجد حركات مسجلة.", empty_returns: "لا توجد مرتجعات.", empty_customers: "لا يوجد عملاء.", empty_collections: "لا توجد تحصيلات مسجلة.", empty_suppliers: "لا يوجد موردون.", empty_purchases: "لا توجد مشتريات.", empty_supplier_payments: "لا توجد مدفوعات للموردين مسجلة.", empty_expenses: "لا توجد مصروفات.", empty_sales_period: "لا توجد مبيعات في الفترة.", empty_shifts: "لا توجد ورديات مغلقة.", empty_data: "لا توجد بيانات", invoice_total: "إجمالي الفاتورة", discount_short: "خصم", total_cost: "إجمالي التكلفة", total_discounts: "إجمالي الخصومات", supplier_payments_title: "مدفوعات الموردين",
    notify_product_out: "المنتج نفذ من المخزن!", notify_select_product: "اختر منتجاً أولاً", notify_select_sale_item: "اختر الفاتورة والصنف", notify_select_supplier: "اختر المورد", notify_select_supplier_amount: "اختر المورد وأدخل مبلغاً صحيحاً", notify_select_product_name: "اختر منتج موجود أو اكتب اسم جديد", notify_no_products: "لا توجد منتجات", notify_select_one_product: "اختر منتجاً واحداً على الأقل",
    compare_title: "نتائج المقارنة",
    compare_sales: "المبيعات",
    compare_profit: "الأرباح",
    barcode_no_support: "المتصفح لا يدعم المسح. اكتب الباركود يدوياً."
  },
  en: {
    app_title: "Matjari - Integrated POS & Inventory System",
    login_title: "🔐 Login",
    login_hint: "Sign in to access your shop data",
    email_label: "Email Address",
    password_label: "Password",
    show_pass: "Show",
    new_pass_label: "New Password",
    save_new_pass: "Save New Password",
    login_btn: "Sign In 🚀",
    signup_btn: "Create Account ✨",
    forgot_btn: "Forgot Password?",
    logout_btn: "Logout 🚪",
    main_menu: "Main Menu",
    menu_home: "🏠 Home",
    menu_sales: "🛒 POS",
    menu_inventory: "Inventory",
    menu_partners: "Partners",
    menu_finance: "Finance",
    menu_settings: "Settings",
    menu_support: "🆘 Support & Contact",
    store_data_page: "🏪 Store Details",
    lang_page: "🌐 App Language",
    select_lang_title: "Select Preferred System Language",
    lang_desc: "You can switch between available languages and it will apply immediately to the entire app interface.",
    sync_now: "🔄 Sync Now",
    page_home_title: "Dashboard & Activity Summary",
    sales_last_7: "Sales Last 7 Days",
    low_stock_alerts: "⚠️ Low Stock Alerts",
    top_products: "🏆 Top Selling Products",
    quick_accounts_summary: "Quick Accounts Summary",
    page_sales_title: "Sales & Invoices",
    add_sale_items: "Add Items to Invoice",
    select_product: "Select Product",
    barcode_label: "Barcode (Instant 📷)",
    qty_label: "Quantity",
    unit_price: "Unit Price",
    customer_label: "Customer",
    add_manual_btn: "Add Manually",
    paid_now: "Paid Now",
    discount_label: "Discount 🏷️",
    pay_method: "Payment Method",
    pay_cash: "💵 Cash",
    pay_visa: "💳 Visa / Card",
    pay_transfer: "📲 Bank Transfer",
    notes_label: "Notes",
    complete_sale_btn: "Complete & Print Invoice (F9)",
    clear_cart_btn: "Clear Cart (F8)",
    sales_log: "Sales Log",
    clear_log: "🗑️ Clear Log",
    export_print_btn: "🖨️ / 📊 / 💬 Options",
    search_sales: "Search Sales",
    from_date: "From Date",
    to_date: "To Date",
    tab_products: "📦 Products",
    tab_moves: "📊 Stock Movement",
    tab_returns: "🔄 Returns",
    add_product_title: "Add New Product",
    prod_name: "Product Name *",
    category_label: "Category",
    sale_price: "Sale Price",
    cost_price: "Cost Price",
    stock_qty: "Stock Quantity",
    min_alert: "Min Alert",
    save_product_btn: "Save Product",
    cancel_btn: "Cancel",
    products_list: "Products List",
    print_barcode: "🏷️ Print Barcode",
    search_placeholder: "Search...",
    manual_adjust: "Manual Stock Adjustment",
    adjust_type: "Movement Type *",
    adj_in: "Add Quantity (+)",
    adj_out: "Deduct Quantity (-)",
    adj_set: "Direct Set (=)",
    adjust_reason: "Reason *",
    save_move: "Save Movement",
    moves_log: "Stock Movements Log",
    register_return: "Register Return",
    invoice_label: "Invoice *",
    item_label: "Item *",
    reason_label: "Reason",
    save_return: "Save Return",
    returns_log: "Returns Log",
    tab_customers: "👥 Customers & Collections",
    tab_suppliers: "🏭 Suppliers & Purchases",
    add_customer: "Add Customer",
    cust_name: "Customer Name *",
    phone_label: "Phone",
    opening_debt: "Opening Debt",
    save_cust: "Save Customer",
    record_collection: "Record Collection",
    amount_label: "Amount *",
    date_label: "Date",
    save_collection: "Save Collection",
    customers_list: "Customers List",
    collections_log: "Collections Log",
    add_supplier: "Add Supplier",
    supp_name: "Supplier Name *",
    opening_due: "Opening Due",
    save_supp: "Save Supplier",
    record_purchase: "Record Purchase Invoice", purchase_sale_price: "Unit Sale Price",
    supplier_label: "Supplier *",
    existing_prod: "Existing Product",
    new_prod_name: "Or New Product",
    purchase_total_field: "Total (Auto)",
    paid_label: "Paid",
    save_purchase: "Save Purchase",
    record_supp_payment: "Record Supplier Payment",
    save_supp_payment: "Save Supplier Payment",
    suppliers_list: "Suppliers List",
    purchases_log: "Purchases Log",
    supp_payments_log: "Supplier Payments Log",
    tab_expenses: "💸 Expenses",
    tab_reports: "📈 Financial Reports",
    tab_compare: "📊 Period Comparison",
    tab_shift: "💵 Shift Closing",
    add_expense: "Add Expense",
    expense_item: "Item *",
    save_expense: "Save Expense",
    expenses_log: "Expenses Log",
    detailed_report: "📊 Detailed Report",
    quick_period: "Quick Period",
    period_today: "📅 Today",
    period_week: "📆 Week",
    period_month: "🗓️ Last 30 Days",
    period_curr_month: "📊 Current Month",
    period_year: "📈 Year",
    period_all: "All",
    custom_range: "Custom Range",
    refresh_btn: "🔄 Refresh",
    print_report: "🖨️ Print Report",
    performance_summary: "📊 Performance Summary",
    top_selling_period: "🏆 Top Selling in Period",
    compare_settings: "⚙️ Comparison Settings",
    compare_type: "Comparison Type",
    comp_m_prev: "Current Month vs Previous Month",
    comp_m_year: "Current Month vs Same Month Last Year",
    comp_custom: "Two Custom Periods",
    period_1: "First Period",
    period_2: "Second Period",
    show_compare: "📊 Show Comparison",
    print_btn: "🖨️ Print",
    shift_close_title: "💵 Current Shift Closing",
    shift_note: "Count physical cash and enter it for reconciliation.",
    cashier_name: "Cashier / Shift Name *",
    expected_cash: "Expected Cash Sales",
    actual_cash: "Actual Cash in Drawer *",
    diff_label: "Difference",
    close_shift_btn: "🔒 Close & Save Shift",
    shifts_log: "📋 Shifts Log",
    store_data: "Shop Details",
    store_logo: "Shop Logo (Image)",
    remove_logo: "Remove Logo",
    store_name: "Shop Name",
    address_label: "Address",
    tax_number: "Tax Number (Optional)",
    currency_label: "Currency",
    monthly_goal: "🎯 Monthly Sales Goal (Optional)",
    change_lang_label: "🌐 App Language / اللغة",
    save_store_btn: "Save Shop Details",
    app_updates: "🔄 Updates & Cache",
    updates_note: "Automatic updates. If issues occur, click \"Update Now\".",
    update_now: "🔄 Update Now",
    clear_cache: "🗑️ Clear Cache",
    backup_encryption: "🔒 Backup & Security",
    backup_auth_note: "You will verify your current account password before exporting or restoring a backup. It is also used to encrypt and decrypt the backup.",
    export_backup: "Download Backup (.shopbak)",
    import_backup: "Restore Backup",
    danger_zone: "Danger Zone",
    danger_desc: "Permanently erase all current app data.",
    clear_all_data: "Clear All App Data",
    page_support_title: "Technical Support & Contact",
    contact_us: "📞 Contact Technical Support",
    contact_desc: "We are here to help 24/7 through the following channels:",
    help_guide: "📖 Quick User Guide",
    version_text: "Pro Edition v5.0",
    about_desc: "This system is designed to help shop owners manage sales, inventory, accounts, and customers easily and securely.",
    scan_barcode_title: "📷 Scan Barcode",
    point_camera: "Point camera at barcode",
    close_btn: "Close",
    exp_report_title: "📊 Detailed Expenses Report",
    select_period_msg: "Select period then click \"Show Report\"",
    show_report: "📊 Show Report",
    barcode_print_title: "🏷️ Print Barcodes",
    barcode_print_desc: "Select products and specify copies",
    copies_label: "Copies per product",
    label_size: "Label Size",
    size_small: "Small (3 per row)",
    size_medium: "Medium (2 per row)",
    size_large: "Large (1 per row)",
    barcode_type: "Barcode Type",
    select_products_label: "Select Products",
    select_all: "Select All",
    deselect_all: "Deselect All",
    print_barcode_btn: "🖨️ Print Barcodes",
    all_records: "All Records",
    custom_period: "Custom Period (From - To)",
    excel_btn: "📊 Excel",
    email_placeholder: "name@example.com", password_placeholder: "Password", new_password_placeholder: "At least 6 characters",
    appearance_title: "Appearance", appearance_desc: "Switch between dark and light mode.", toggle_theme: "🌙 Toggle Theme", account_title: "Account", account_desc: "Sign out of the current account.",
    guide_sales_html: "<strong>1. Sales:</strong> Select products or scan a barcode (added automatically with a sound).", guide_shortcuts_html: "<strong>2. Keyboard shortcuts:</strong>", guide_f2_html: "<code>F2</code>: Open the point-of-sale screen.", guide_f4_html: "<code>F4</code>: Focus the barcode field.", guide_f8_html: "<code>F8</code>: Clear the invoice.", guide_f9_html: "<code>F9</code>: Save and print the invoice.", guide_inventory_html: "<strong>3. Inventory:</strong> Add products and adjust stock, providing a reason.", guide_shifts_html: "<strong>4. Shifts:</strong> Enter the cashier name and close the shift at the end of the day to reconcile cash.", guide_export_html: "<strong>5. Printing and export:</strong> Use table options to print or download a CSV and share it manually on WhatsApp.", guide_sales: "1. Sales: Select products or scan a barcode (added automatically with a sound).", guide_shortcuts: "2. Keyboard shortcuts:", guide_f2: "F2: Open the point-of-sale screen.", guide_f4: "F4: Focus the barcode field.", guide_f8: "F8: Clear the invoice.", guide_f9: "F9: Save and print the invoice.", guide_inventory: "3. Inventory: Add products and adjust stock, providing a reason.", guide_shifts: "4. Shifts: Enter the cashier name and close the shift at the end of the day to reconcile cash.", guide_export: "5. Printing and export: Use table options to print or download a CSV and share it manually on WhatsApp.", cash_customer: "Cash Customer", dash_net_profit: "Net Profit", dash_total_sales: "Total Sales", dash_products: "Products", dash_expenses: "Expenses", dash_stock_value: "Stock Value", dash_customer_debt: "Customer Debts", dash_supplier_due: "Supplier Payables", dash_stock_alerts: "Low Stock Alerts", dash_cost: "Cost of Goods Sold", dash_net_sales: "Net Sales",
    about_page: "ℹ️ About the App", barcode_placeholder: "Scan/type barcode...", auto_added_placeholder: "Added automatically", copyright_text: "All rights reserved © 2026", whatsapp_btn: "💬 WhatsApp",
    th_item: "Item",
    th_price: "Price",
    th_quantity: "Quantity",
    th_total: "Total",
    th_action: "Action",
    th_invoice_number: "Invoice #",
    th_date: "Date",
    th_customer: "Customer",
    th_paid: "Paid",
    th_remaining: "Remaining",
    th_payment_method: "Payment Method",
    th_name: "Name",
    th_barcode: "Barcode",
    th_category: "Category",
    th_cost: "Cost",
    th_stock: "In Stock",
    th_product: "Product",
    th_movement: "Movement",
    th_before_after: "Before ➔ After",
    th_reason: "Reason",
    th_phone: "Phone",
    th_debts: "Debts",
    th_notes: "Notes",
    th_payables: "Payables (owed to them)",
    th_supplier: "Supplier",
    th_amount_paid: "Amount Paid",
    th_item_name: "Item",
    th_amount: "Amount",
    th_value: "Value",
    th_cashier: "Cashier",
    th_invoice_count: "Invoice Count",
    th_expected_cash: "Expected Cash",
    th_actual_cash: "Actual Cash",
    th_difference: "Difference",
    dlg_logout: "Log out?",
    dlg_delete_logo: "Delete the logo?",
    dlg_wipe_all: "Final warning! All data will be permanently deleted. Are you sure?",
    dlg_delete_mistake: "Delete this as an entry mistake? Stock and balances will be adjusted accordingly.",
    dlg_clear_log: "Do you want to clear the entire log?",
    dlg_delete_product: "Permanently delete this product?",
    dlg_delete_customer: "Delete this customer?",
    dlg_delete_supplier: "Delete this supplier?",
    dlg_clear_cache: "Clear cache and reload?",
    opt_qr_camera: "QR Code (camera)",
    opt_barcode_usb: "Standard barcode (USB scanner)",
    opt_both_codes: "Both",
    opt_discount_fixed: "EGP",
    opt_discount_percent: "%",
    dlg_wipe_password: "Enter your current account password to confirm deleting all app data:",
    dlg_backup_export_password: "Enter your current account password to verify and encrypt the backup:",
    dlg_backup_restore_password: "Enter your current account password to verify and restore the backup:",
    opt_select_product: "-- Select product --", opt_select_invoice: "-- Select invoice --", opt_select_item: "-- Select item --", opt_select_supplier: "-- Select supplier --", opt_select_existing_product: "-- Select existing product --",
    opt_stock_label: "Stock:", opt_available_label: "Available:", opt_remaining_label: "Remaining:", opt_invoice_label: "Invoice:", opt_supplier_due_label: "Payables:",
    th_discount: "Discount", th_subtotal: "Subtotal", th_net: "Net", th_status: "Status", th_type: "Type", th_reference: "Reference", th_balance: "Balance", th_user: "User", th_created_at: "Created At", th_unit: "Unit", th_profit: "Profit", th_percentage: "Percentage",
    opt_paid: "Paid", opt_unpaid: "Unpaid", opt_partial: "Partially Paid", opt_add_stock: "Add Quantity", opt_remove_stock: "Deduct Quantity", opt_set_stock: "Set Quantity",
    msg_logout: "Log out?", msg_delete_logo: "Delete the logo?", msg_clear_log: "Do you want to clear the entire log?", msg_delete_product: "Permanently delete this product?", msg_delete_customer: "Delete this customer?", msg_delete_supplier: "Delete this supplier?", msg_delete_mistake: "Delete this record as an entry mistake? Stock and balances will be adjusted accordingly.", msg_clear_cache: "Clear cache and reload?", msg_wipe_all: "Final warning! All data will be permanently deleted. Are you sure?",
    empty_invoices: "No invoices recorded.", empty_products: "No products.", empty_stock_moves: "No stock movements recorded.", empty_returns: "No returns.", empty_customers: "No customers.", empty_collections: "No collections recorded.", empty_suppliers: "No suppliers.", empty_purchases: "No purchases.", empty_supplier_payments: "No supplier payments recorded.", empty_expenses: "No expenses.", empty_sales_period: "No sales in this period.", empty_shifts: "No closed shifts.", empty_data: "No data", invoice_total: "Invoice Total", discount_short: "Discount", total_cost: "Total Cost", total_discounts: "Total Discounts", supplier_payments_title: "Supplier Payments",
    notify_product_out: "Product is out of stock!", notify_select_product: "Select a product first", notify_select_sale_item: "Select an invoice and item", notify_select_supplier: "Select a supplier", notify_select_supplier_amount: "Select a supplier and enter a valid amount", notify_select_product_name: "Select an existing product or enter a new name", notify_no_products: "No products", notify_select_one_product: "Select at least one product",
    compare_title: "Comparison Results",
    compare_sales: "Sales",
    compare_profit: "Profit",
    barcode_no_support: "Browser does not support scanning. Type the barcode manually."
  }
};

let currentLang = localStorage.getItem('matjari_lang') || 'ar';

function tr(key) { const dict = translations[currentLang] || translations.ar; return dict[key] || translations.ar[key] || key; }

function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('matjari_lang', lang);
  document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  document.documentElement.setAttribute('lang', lang);

  const dict = translations[lang] || translations.ar;
  const placeholderKeys = { authEmail: 'email_placeholder', authPassword: 'password_placeholder', newPassword: 'new_password_placeholder' };
  Object.keys(placeholderKeys).forEach(id => { const el = document.getElementById(id); if (el) el.setAttribute('data-i18n-placeholder', placeholderKeys[id]); });
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) el.textContent = dict[key];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (dict[key]) el.placeholder = dict[key];
  });
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.getAttribute('data-i18n-html');
    if (dict[key]) el.innerHTML = dict[key];
  });

  const langDisp = document.getElementById('currentLangDisplay');
  if (langDisp) langDisp.textContent = lang === 'ar' ? 'العربية (Arabic)' : 'English';
  const langSwText = document.getElementById('langSwitchText');
  if (langSwText) langSwText.textContent = lang === 'ar' ? 'English' : 'العربية';
}

function toggleLanguage() {
  setLanguage(currentLang === 'ar' ? 'en' : 'ar');
  renderAll();
}

/* ============ القوائم الفرعية المنسدلة ============ */
function toggleSubMenu(id) {
  const menu = document.getElementById(id);
  if (!menu) return;
  const isOpened = menu.classList.contains('open');
  
  document.querySelectorAll('.sub-menu').forEach(m => m.classList.remove('open'));
  document.querySelectorAll('.nav-toggle').forEach(b => b.classList.remove('open'));

  if (!isOpened) {
    menu.classList.add('open');
    if (menu.previousElementSibling) {
      menu.previousElementSibling.classList.add('open');
    }
  }
}

/* ============ الحالة العامة ============ */
let state = {
  currentUser: null,
  role: 'employee',
  cart: [],
  products: [],
  sales: [],
  customers: [],
  suppliers: [],
  expenses: [],
  stockMoves: [],
  returns: [],
  customerPayments: [],
  supplierPayments: [],
  purchases: [],
  shifts: [],
  currentShift: null,
  storeSettings: {
    name: 'متجري',
    phone: '',
    address: '',
    currency: 'ج.م',
    logo: '',
    taxNumber: '',
    monthlyGoal: 0
  },
  subscription: { plan: 'trial', status: 'active', expires_at: null }
};

let syncTimer = null;
let isSyncing = false;
let salesChartInstance = null;
let audioCtx = null;
let barcodeStream = null;
let barcodeDetector = null;
let barcodeScanFrame = null;
let barcodeTimer = null;
let lastProcessedBarcode = '';
let activeExportContext = { type: null };

/* ============ أدوات مساعدة ============ */
function uid(prefix) {
  prefix = prefix || 'ID';
  return prefix + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function money(n) {
  const cur = String((state.storeSettings && state.storeSettings.currency) || 'ج.م').trim();
  const decimals = 2;
  return (Number(n) || 0).toLocaleString(currentLang === 'en' ? 'en-US' : 'ar-EG', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + ' ' + cur;
}

function escapeHTML(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function normalizeBarcode(v) {
  return String(v == null ? '' : v)
    .normalize('NFKC')
    .replace(/[٠-٩]/g, function(c) { return String(c.charCodeAt(0) - 1632); })
    .replace(/[۰-۹]/g, function(c) { return String(c.charCodeAt(0) - 1776); })
    .replace(/[\s\-]/g, '')
    .trim();
}

/* ============ الصوت ============ */
function initAudio() {
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) { console.warn('Audio not supported'); }
}

function playBeep(success) {
  if (!audioCtx) return;
  try {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.value = success ? 880 : 220;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);
  } catch (e) {}
}

/* ============ الإشعارات ============ */
function showNotification(msg, type) {
  type = type || 'success';
  const colors = { success: '#2e7d32', error: '#c62828', warning: '#e58a16', info: '#1769aa' };
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const div = document.createElement('div');
  div.className = 'notification-toast ' + type;
  div.innerHTML = '<span style="font-size:18px">' + (icons[type] || '') + '</span> ' + escapeHTML(msg);
  div.style.cssText =
    'position:fixed;bottom:20px;left:20px;z-index:99999;' +
    'padding:12px 20px;border-radius:10px;color:#fff;font-weight:bold;' +
    'background:' + (colors[type] || colors.success) + ';' +
    'box-shadow:0 6px 20px rgba(0,0,0,0.25);transition:opacity 0.3s;max-width:90vw;' +
    'display:flex;align-items:center;gap:10px;font-family:Tahoma,Arial,sans-serif';
  document.body.appendChild(div);
  setTimeout(function() {
    div.style.opacity = '0';
    setTimeout(function() { div.remove(); }, 300);
  }, 3000);
}

/* ============ Loading ============ */
function showLoading(text) {
  if (document.querySelector('.spinner-overlay')) return;
  const overlay = document.createElement('div');
  overlay.className = 'spinner-overlay';
  overlay.style.cssText =
    'position:fixed;inset:0;background:#0007;display:flex;align-items:center;' +
    'justify-content:center;z-index:99999;backdrop-filter:blur(3px);';
  overlay.innerHTML =
    '<div style="text-align:center;color:#fff">' +
    '<div style="width:50px;height:50px;border:5px solid #ffffff30;' +
    'border-top-color:#fff;border-radius:50%;animation:spin 0.8s linear infinite;margin:auto"></div>' +
    '<p style="margin-top:14px;font-weight:700">' + escapeHTML(text || 'جارٍ التحميل...') + '</p>' +
    '</div>' +
    '<style>@keyframes spin{to{transform:rotate(360deg)}}</style>';
  document.body.appendChild(overlay);
}

function hideLoading() {
  const o = document.querySelector('.spinner-overlay');
  if (o) o.remove();
}

/* ============ حفظ الصفحة الحالية ============ */
function saveCurrentPage(pageId) {
  if (!state.currentUser) return;
  try {
    localStorage.setItem('matjari_lastPage_' + state.currentUser.id, pageId);
  } catch (e) {}
}

function getLastPage() {
  if (!state.currentUser) return 'home';
  try {
    return localStorage.getItem('matjari_lastPage_' + state.currentUser.id) || 'home';
  } catch (e) { return 'home'; }
}

/* ============ التنقل السلس والفتح الفردي للصفحات ============ */
function toggleSidebar(show) {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (!sidebar || !backdrop) return;
  if (show) {
    sidebar.classList.add('open');
    backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  } else {
    sidebar.classList.remove('open');
    backdrop.classList.remove('open');
    document.body.style.overflow = '';
  }
}

function showPage(pageId) {
  if (state.role === 'employee' && pageId !== 'sales' && pageId !== 'home') {
    showNotification('هذه الصفحة متاحة للمدير فقط', 'warning');
    pageId = 'sales';
  }

  document.querySelectorAll('.page').forEach(function(p) {
    p.classList.remove('active');
    p.style.display = 'none';
  });
  
  document.querySelectorAll('.sidebar-nav button').forEach(function(b) { b.classList.remove('active-nav'); });

  const targetPage = document.getElementById(pageId);
  if (targetPage) {
    targetPage.classList.add('active');
    targetPage.style.display = 'block';
  }

  const targetBtn = document.querySelector('.sidebar-nav button[data-page="' + pageId + '"]');
  if (targetBtn) targetBtn.classList.add('active-nav');

  saveCurrentPage(pageId);
  toggleSidebar(false);
  window.scrollTo(0, 0);

  if (pageId === 'home') renderDashboard();
  if (pageId === 'sales') {
    populateSalesDropdowns();
    const bc = document.getElementById('saleBarcode');
    if (bc) bc.focus();
  }
  if (pageId === 'invProducts') renderProducts();
  if (pageId === 'invMoves') { populateAdjustDropdown(); renderStockMoves(); }
  if (pageId === 'invReturns') { populateReturnDropdowns(); renderReturns(); }
  
  if (pageId === 'partCustomers') { renderCustomers(); renderCustomerPayments(); }
  if (pageId === 'partSuppliers') { renderSuppliers(); renderPurchases(); renderSupplierPayments(); }

  if (pageId === 'finExpenses') renderExpenses();
  if (pageId === 'finReports') renderReports();
  if (pageId === 'finCompare') { if (typeof onCompareTypeChange === 'function') onCompareTypeChange(); }
  if (pageId === 'finShift') { calcExpectedShiftCash(); renderShifts(); }

  if (pageId === 'settStore') loadStoreSettings();
  if (pageId === 'settStaff') loadStaffList();
}

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
  if (!email || !password) return setAuthMessage('أدخل البريد وكلمة المرور', true);
  if (password.length < 6) return setAuthMessage('كلمة المرور 6 أحرف على الأقل', true);
  setAuthBusy(true);
  setAuthMessage('جارٍ إنشاء الحساب...');
  try {
    const result = await supabaseClient.auth.signUp({ email: email, password: password });
    if (result.error) throw result.error;
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

function showLoggedOutUI() {
  state.currentUser = null;
  state.role = 'employee';
  document.body.classList.add('auth-locked');
  const ls = document.getElementById('loginScreen');
  if (ls) ls.classList.add('active');
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
    showLoggedOutUI();
  } catch (e) {
    showNotification('تعذر الخروج', 'error');
  }
}

async function openUserSession(user) {
  state.currentUser = user;
  showLoading('جارٍ تحميل بياناتك...');
  try {
    const roleRes = await supabaseClient
      .from('shop_user_roles')
      .select('role, owner_id')
      .eq('user_id', user.id)
      .maybeSingle();
      
    if (roleRes.data && roleRes.data.owner_id) {
        state.role = 'employee';
        state.ownerId = roleRes.data.owner_id; 
    } else {
        state.role = 'manager';
    }

    const subRes = await supabaseClient
      .from('shop_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (subRes.data) {
      state.subscription = {
        plan: subRes.data.plan || 'trial',
        status: subRes.data.status || 'active',
        expires_at: subRes.data.expires_at
      };
    }

    let localCache = null;
    try { localCache = JSON.parse(localStorage.getItem('matjari_cache_' + user.id)); } catch (e) {}

    const targetUserId = (state.role === 'employee' && state.ownerId) ? state.ownerId : user.id;
    let dataRes = { data: null, error: null }; // ✅ إصلاح الخطأ هنا

    if (navigator.onLine) {
      try {
        dataRes = await supabaseClient.from('shop_data').select('shop_data').eq('user_id', targetUserId).maybeSingle();
        if (dataRes.error) throw dataRes.error;
      } catch (e) { console.warn('Cloud fetch failed', e); }
    }

    let d = null;
    if (localCache && (localCache.products || localCache.sales)) {
      d = localCache;
    } else if (dataRes && dataRes.data && dataRes.data.shop_data && Object.keys(dataRes.data.shop_data).length > 0) {
      d = dataRes.data.shop_data;
      localStorage.setItem('matjari_cache_' + user.id, JSON.stringify(d));
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
    }

    showLoggedInUI();
    applyRolePermissions();
    renderAll();
    
    const lastPage = getLastPage();
    const validPages = ['home', 'sales', 'invProducts', 'invMoves', 'invReturns', 'partCustomers', 'partSuppliers', 'finExpenses', 'finReports', 'finCompare', 'finShift', 'settStore', 'settLang', 'settBackup', 'settUpdates', 'settStaff', 'supportContact', 'supportGuide', 'supportAbout'];
    
    const pageToShow = (state.role === 'employee') ? 'sales' : (validPages.includes(lastPage) ? lastPage : 'home');
    showPage(pageToShow);
    
  } catch (e) {
    console.error(e);
    setAuthMessage('تعذر تحميل البيانات: ' + (e.message || ''), true);
    showLoggedOutUI();
  } finally {
    hideLoading();
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
}

async function startAuth() {
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
  if (location.hash.includes('type=recovery') || location.hash.includes('type=invite') || location.hash.includes('access_token')) {
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
    if (location.hash.includes('type=recovery') || location.hash.includes('type=invite') || location.hash.includes('access_token')) {
      showLoggedOutUI();
      document.getElementById('recoveryPanel').style.display = 'block';
      document.getElementById('loginButtons').style.display = 'none';
      document.getElementById('authTitle').textContent = 'تعيين كلمة مرور جديدة';
    } else if (result.data.session && result.data.session.user) {
      await openUserSession(result.data.session.user);
    } else {
      showLoggedOutUI();
    }
} catch (e) {
  loadOfflineSession(); 
}
}

/* ============ الباركود ============ */
function setupBarcodeListener() {
  const barcodeInput = document.getElementById('saleBarcode');
  if (!barcodeInput) return;

  barcodeInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      clearTimeout(barcodeTimer);
      processBarcodeNow(barcodeInput.value);
      barcodeInput.value = '';
    }
  });

  barcodeInput.addEventListener('input', function() {
    clearTimeout(barcodeTimer);
    const val = barcodeInput.value.trim();
    if (val.length >= 4) {
      barcodeTimer = setTimeout(function() {
        if (document.activeElement === barcodeInput) {
          processBarcodeNow(val);
          barcodeInput.value = '';
        }
      }, 500);
    }
  });
}

function processBarcodeNow(code) {
  const cleanCode = normalizeBarcode(code);
  if (!cleanCode) return;
  if (cleanCode === lastProcessedBarcode) return;
  lastProcessedBarcode = cleanCode;
  setTimeout(function() { lastProcessedBarcode = ''; }, 800);

  const product = state.products.find(function(p) {
    return normalizeBarcode(p.barcode) === cleanCode;
  });

  if (!product) {
    playBeep(false);
    showNotification('الباركود غير مطابق لأي منتج', 'error');
    return;
  }

  if (Number(product.stock) <= 0) {
    playBeep(false);
    showNotification(tr('notify_product_out'), 'error');
    return;
  }

  const existing = state.cart.find(function(item) { return item.id === product.id; });
  if (existing) {
    if (existing.qty + 1 > product.stock) {
      playBeep(false);
      showNotification('الكمية تتجاوز المخزون!', 'error');
      return;
    }
    existing.qty += 1;
  } else {
    state.cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      cost: product.cost,
      qty: 1
    });
  }

  playBeep(true);
  renderCart();
  showNotification('تمت إضافة: ' + product.name, 'success');
}

async function openBarcodeScanner() {
  const modal = document.getElementById('barcodeModal');
  if (!('BarcodeDetector' in window)) {
    const saleBc = document.getElementById('saleBarcode');
    if (saleBc) saleBc.focus();
    showNotification(tr('barcode_no_support'), 'warning');
    return;
  }

  if (!modal) return;
  modal.style.display = 'flex';

  try {
    const formats = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code', 'itf'];
    let supported = formats;
    try {
      const supportedList = await BarcodeDetector.getSupportedFormats();
      supported = formats.filter(function(f) { return supportedList.indexOf(f) !== -1; });
    } catch (e) { supported = formats; }

    const usableFormats = formats.filter(function(f) { return supported.indexOf(f) !== -1; });
    if (!usableFormats.length) throw new Error('لا توجد صيغ مدعومة');

    barcodeDetector = new BarcodeDetector({ formats: usableFormats });
    barcodeStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false
    });

    const video = document.getElementById('barcodeVideo');
    video.srcObject = barcodeStream;
    await video.play();

    const scan = async function() {
      if (!barcodeStream) return;
      try {
        const codes = await barcodeDetector.detect(video);
        if (codes.length && codes[0].rawValue) {
          const code = codes[0].rawValue;
          closeBarcodeScanner();
          processBarcodeNow(code);
          return;
        }
      } catch (e) {}
      barcodeScanFrame = requestAnimationFrame(scan);
    };
    scan();
  } catch (e) {
    showNotification('تعذر تشغيل الكاميرا: ' + (e.message || ''), 'error');
    closeBarcodeScanner();
  }
}

function closeBarcodeScanner() {
  if (barcodeScanFrame) cancelAnimationFrame(barcodeScanFrame);
  barcodeScanFrame = null;
  if (barcodeStream) {
    barcodeStream.getTracks().forEach(function(t) { t.stop(); });
    barcodeStream = null;
  }
  const video = document.getElementById('barcodeVideo');
  if (video) video.srcObject = null;
  const modal = document.getElementById('barcodeModal');
  if (modal) modal.style.display = 'none';
}

/* ============ إدارة الإعدادات ============ */
function loadStoreSettings() {
  const s = state.storeSettings || {};
  const set = function(id, val) { const el = document.getElementById(id); if (el) el.value = val || ''; };
  set('storeName', s.name);
  set('storePhone', s.phone);
  set('storeAddress', s.address);
  set('storeTaxNumber', s.taxNumber);
  set('storeCurrency', s.currency);
  set('storeMonthlyGoal', s.monthlyGoal);
  const preview = document.getElementById('storeLogoPreview');
  if (preview && s.logo) { preview.src = s.logo; preview.style.display = 'block'; }
  else if (preview) { preview.style.display = 'none'; }
  
  const dz = document.getElementById('dangerZone');
  if (dz) dz.style.display = (state.role === 'manager') ? 'block' : 'none';
}

function saveStoreSettings() {
  if (state.role !== 'manager') return showNotification('هذه العملية للمدير فقط', 'warning');
  state.storeSettings.name = (document.getElementById('storeName').value || '').trim() || 'متجري';
  state.storeSettings.phone = (document.getElementById('storePhone').value || '').trim();
  state.storeSettings.address = (document.getElementById('storeAddress').value || '').trim();
  state.storeSettings.taxNumber = (document.getElementById('storeTaxNumber').value || '').trim();
  state.storeSettings.currency = (document.getElementById('storeCurrency').value || 'ج.م').trim();
  state.storeSettings.monthlyGoal = parseFloat(document.getElementById('storeMonthlyGoal').value) || 0;

  const titleEl = document.querySelector('.logo-title');
  if (titleEl) titleEl.textContent = state.storeSettings.name;

  saveData();
  showNotification('تم حفظ بيانات المحل');
}

function handleLogoUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  if (file.size > 500 * 1024) return showNotification('حجم الصورة كبير (حد أقصى 500KB)', 'warning');
  const reader = new FileReader();
  reader.onload = function() {
    state.storeSettings.logo = reader.result;
    const preview = document.getElementById('storeLogoPreview');
    if (preview) { preview.src = reader.result; preview.style.display = 'block'; }
    saveData();
    showNotification('تم رفع الشعار');
  };
  reader.readAsDataURL(file);
}

function removeStoreLogo() {
  if (!confirm(tr('msg_delete_logo'))) return;
  state.storeSettings.logo = '';
  const preview = document.getElementById('storeLogoPreview');
  if (preview) preview.style.display = 'none';
  const input = document.getElementById('storeLogo');
  if (input) input.value = '';
  saveData();
  showNotification('تم حذف الشعار');
}

async function verifyCurrentUserPassword(password) {
  if (!supabaseClient || !state.currentUser || !state.currentUser.email || !password) return false;
  try {
    const { error } = await supabaseClient.auth.signInWithPassword({ email: state.currentUser.email, password: password });
    return !error;
  } catch (e) { return false; }
}

function buildBackupData() {
  return { version: 5, storeSettings: state.storeSettings, products: state.products, sales: state.sales, customers: state.customers, suppliers: state.suppliers, expenses: state.expenses, stockMoves: state.stockMoves, returns: state.returns, customerPayments: state.customerPayments, supplierPayments: state.supplierPayments, purchases: state.purchases, shifts: state.shifts };
}

function downloadEncryptedBackup(pass, silent) {
  const encrypted = simpleEncrypt(JSON.stringify(buildBackupData()), pass);
  const blob = new Blob([JSON.stringify({ encrypted: true, data: encrypted })], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'backup-matjari-' + today() + '.shopbak';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function() { URL.revokeObjectURL(url); }, 1500);
  if (!silent) showNotification(currentLang === 'en' ? 'Encrypted backup downloaded.' : 'تم تنزيل النسخة الاحتياطية المشفرة ✅');
}

/* ============ حماية منطقة الخطر ============ */
async function safeClearAllDataPrompt() {
  if (state.role !== 'manager') return showNotification('هذه العملية للمدير فقط', 'warning');
  const pass = prompt(tr('dlg_wipe_password'));
  if (pass === null) return;
  if (!(await verifyCurrentUserPassword(pass))) return showNotification(currentLang === 'en' ? 'Password verification failed. Action cancelled.' : 'كلمة المرور غير صحيحة! تم إلغاء العملية.', 'error');

  if (!confirm(tr('msg_wipe_all'))) return;

  try {
    downloadEncryptedBackup(pass, true);
  } catch (backupError) {
    showNotification(currentLang === 'en' ? 'Automatic backup failed. Data was not cleared.' : 'فشل إنشاء النسخة الاحتياطية التلقائية. لم يتم مسح البيانات.', 'error');
    return;
  }

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
  state.cart = [];

  if (state.currentUser) {
    localStorage.removeItem('matjari_cache_' + state.currentUser.id);
  }

  await uploadToCloud();
  renderAll();
  updateStockBadge();
  showNotification('تم مسح كافة بيانات التطبيق بنجاح ✅');
}

/* ============ التخزين السحابي والمحلي ============ */
function saveData() {
  if (!state.currentUser) return;
  const key = 'matjari_cache_' + state.currentUser.id;
  try {
    const cache = {
      products: state.products,
      sales: state.sales,
      customers: state.customers,
      suppliers: state.suppliers,
      expenses: state.expenses,
      stockMoves: state.stockMoves,
      returns: state.returns,
      customerPayments: state.customerPayments,
      supplierPayments: state.supplierPayments,
      purchases: state.purchases,
      shifts: state.shifts,
      currentShift: state.currentShift,
      storeSettings: state.storeSettings
    };
    localStorage.setItem(key, JSON.stringify(cache));
    scheduleSync();
  } catch (e) {}
}

function scheduleSync() {
  if (!state.currentUser || state.role === 'employee') return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(function() { uploadToCloud(); }, 2000);
}

async function uploadToCloud() {
  if (!navigator.onLine) return;
  if (!state.currentUser || isSyncing) return;
  if (state.role === 'employee') return; // الموظف ميرفعش لوحده
  isSyncing = true;
  try {
    const payload = {
      products: state.products, sales: state.sales, customers: state.customers,
      suppliers: state.suppliers, expenses: state.expenses, stockMoves: state.stockMoves,
      returns: state.returns, customerPayments: state.customerPayments,
      supplierPayments: state.supplierPayments, purchases: state.purchases,
      shifts: state.shifts, currentShift: state.currentShift, storeSettings: state.storeSettings
    };
    
    // التعديل المهم: دايماً نرفع باسم المدير
    const targetUserId = (state.role === 'employee' && state.ownerId) ? state.ownerId : state.currentUser.id;

    const result = await supabaseClient
      .from('shop_data')
      .upsert({
        user_id: targetUserId, // ✅ الرفع باسم المدير
        shop_data: payload,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
    if (result.error) throw result.error;
  } catch (e) {
    console.warn('Cloud sync failed:', e.message);
  } finally {
    isSyncing = false;
  }
}

async function syncNow() {
  if (!state.currentUser) return showNotification('سجّل الدخول أولاً', 'warning');
  showLoading('جارٍ المزامنة...');
  try {
    await uploadToCloud();
    showNotification('تمت المزامنة بنجاح ✅');
  } catch (e) {
    showNotification('تعذرت المزامنة', 'error');
  } finally {
    hideLoading();
  }
}

/* ============ تسجيل Service Worker ============ */
async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.register('service-worker.js', { scope: './' });
    navigator.serviceWorker.addEventListener('controllerchange', function() {
      if (!window.__swReloaded) { window.__swReloaded = true; location.reload(); }
    });
  } catch (e) { console.warn('SW registration failed:', e.message); }
}

function loadOfflineSession() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith('matjari_cache_'));
  if (keys.length === 0) { showLoggedOutUI(); return; }
  
  const userId = keys[0].replace('matjari_cache_', '');
  const cache = JSON.parse(localStorage.getItem(keys[0]));
  
  state.currentUser = { id: userId, email: 'offline-user' };
  state.role = 'manager';
  
  if (cache.products) state.products = cache.products;
  if (cache.sales) state.sales = cache.sales;
  if (cache.customers) state.customers = cache.customers;
  if (cache.suppliers) state.suppliers = cache.suppliers;
  if (cache.expenses) state.expenses = cache.expenses;
  if (cache.stockMoves) state.stockMoves = cache.stockMoves;
  if (cache.returns) state.returns = cache.returns;
  if (cache.customerPayments) state.customerPayments = cache.customerPayments;
  if (cache.supplierPayments) state.supplierPayments = cache.supplierPayments;
  if (cache.purchases) state.purchases = cache.purchases;
  if (cache.shifts) state.shifts = cache.shifts;
  if (cache.currentShift) state.currentShift = cache.currentShift;
  if (cache.storeSettings) state.storeSettings = Object.assign({}, state.storeSettings, cache.storeSettings);
  
  showLoggedInUI(); 
  applyRolePermissions(); 
  renderAll(); 
  showPage('sales');
  showNotification('تم تشغيل التطبيق في وضع عدم الاتصال (أوفلاين) ✅', 'info');
}

window.onload = function() {
  registerServiceWorker();
  initAudio();
  setLanguage(currentLang);
  setupEventListeners();
  
  if (navigator.onLine) {
    startAuth();
  } else {
    loadOfflineSession();
  }
  
  applySavedDarkMode();
};

function setupEventListeners() {
  window.addEventListener('keydown', function(e) {
    if (e.key === 'F2') { e.preventDefault(); showPage('sales'); }
    if (e.key === 'F4') {
      e.preventDefault();
      showPage('sales');
      const bc = document.getElementById('saleBarcode');
      if (bc) bc.focus();
    }
    if (e.key === 'F8') { e.preventDefault(); if (typeof clearCart === 'function') clearCart(); }
    if (e.key === 'F9') { e.preventDefault(); if (typeof completeSale === 'function') completeSale(); }
  });

  setupBarcodeListener();

  const logoInput = document.getElementById('storeLogo');
  if (logoInput) logoInput.addEventListener('change', handleLogoUpload);

  const expDate = document.getElementById('expenseDate');
  if (expDate) expDate.value = today();
  const custPayDate = document.getElementById('customerPaymentDate');
  if (custPayDate) custPayDate.value = today();
  const suppPayDate = document.getElementById('supplierPaymentDate');
  if (suppPayDate) suppPayDate.value = today();
}

window.addEventListener('online', function() {
  if (state.currentUser && state.role === 'manager') syncNow();
});

function renderAll() {
  renderDashboard();
  renderProducts();
  renderSales();
  renderCustomers();
  renderCustomerPayments();
  renderSuppliers();
  renderPurchases();
  renderSupplierPayments();
  renderExpenses();
  renderReturns();
  renderStockMoves();
  renderReports();
  renderShifts();
  renderCart();
  loadStoreSettings();
  updateStockBadge();
}

function updateStockBadge() {
  const lowCount = state.products.filter(function(p) {
    return Number(p.stock) <= Number(p.minStock || 5);
  }).length;
  const badge = document.getElementById('stockAlertBadge');
  if (badge) {
    badge.innerText = lowCount > 0 ? lowCount : '';
    badge.style.cssText = lowCount > 0
      ? 'display:inline-block;background:#c0392b;color:#fff;border-radius:10px;padding:1px 7px;font-size:11px;margin-right:5px'
      : 'display:none';
  }
}

/* ============ 2. المبيعات ============ */
function populateSalesDropdowns() {
  const prodSelect = document.getElementById('saleProduct');
  const custSelect = document.getElementById('saleCustomer');
  if (!prodSelect || !custSelect) return;

  prodSelect.innerHTML = '<option value="">' + tr('opt_select_product') + '</option>';
  state.products.forEach(function(p) {
    prodSelect.innerHTML += '<option value="' + p.id + '">' + escapeHTML(p.name) + (currentLang === 'en' ? ' (Stock: ' : ' (مخزن: ') + p.stock + ') - ' + p.price + ' ' + state.storeSettings.currency + '</option>';
  });

  custSelect.innerHTML = '';
  if (!state.customers.length) state.customers.push({ id: uid('CUST'), name: (translations[currentLang] || translations.ar).cash_customer, phone: '-', openingDebt: 0 });
  state.customers.forEach(function(c) {
    const isCashCustomer = c.name === 'عميل نقدي عام' || c.name === 'Cash Customer';
    const displayName = isCashCustomer ? (translations[currentLang] || translations.ar).cash_customer : c.name;
    custSelect.innerHTML += '<option value="' + c.id + '">' + escapeHTML(displayName) + '</option>';
  });
}

function addToCartManual() {
  const prodId = document.getElementById('saleProduct').value;
  const qty = parseInt(document.getElementById('saleQty').value) || 1;
  if (!prodId) return showNotification(tr('notify_select_product'), 'error');

  const product = state.products.find(function(p) { return p.id === prodId; });
  if (!product) return;
  if (qty > product.stock) return showNotification('الكمية تتجاوز المخزون!', 'error');

  const existing = state.cart.find(function(item) { return item.id === product.id; });
  if (existing) {
    if (existing.qty + qty > product.stock) return showNotification('الكمية تتجاوز المخزون!', 'error');
    existing.qty += qty;
  } else {
    state.cart.push({ id: product.id, name: product.name, price: product.price, cost: product.cost, qty: qty });
  }
  document.getElementById('saleQty').value = 1;
  playBeep(true);
  renderCart();
}

function renderCart() {
  const container = document.getElementById('cartTable');
  if (!container) return;

  if (state.cart.length === 0) {
    container.innerHTML = '<p class="text-muted">سلة المبيعات فارغة.</p>';
    const t = document.getElementById('cartTotal');
    if (t) t.innerText = tr('invoice_total') + ': 0.00 ' + state.storeSettings.currency;
    return;
  }

  let html = '<div class="table-wrap"><table class="data-table"><thead><tr><th data-i18n="th_item">الصنف</th><th data-i18n="th_price">السعر</th><th data-i18n="th_quantity">الكمية</th><th data-i18n="th_total">الإجمالي</th><th data-i18n="th_action">إجراء</th></tr></thead><tbody>';
  let subtotal = 0;
  state.cart.forEach(function(item, idx) {
    const tot = item.price * item.qty;
    subtotal += tot;
    html += '<tr>' +
      '<td>' + escapeHTML(item.name) + '</td>' +
      '<td>' + item.price + '</td>' +
      '<td><input type="number" min="1" value="' + item.qty + '" style="width:70px" onchange="updateCartQty(' + idx + ', this.value)"></td>' +
      '<td>' + tot.toFixed(2) + '</td>' +
      '<td><button class="small-btn red" onclick="removeFromCart(' + idx + ')">حذف</button></td>' +
      '</tr>';
  });
  html += '</tbody></table></div>';
  container.innerHTML = html;

  const discVal = parseFloat(document.getElementById('saleDiscount').value) || 0;
  const discType = document.getElementById('saleDiscountType').value;
  const discountAmount = discType === 'percent' ? (subtotal * discVal / 100) : discVal;
  const finalTotal = Math.max(0, subtotal - discountAmount);

  const t = document.getElementById('cartTotal');
  if (t) t.innerText = tr('invoice_total') + ': ' + finalTotal.toFixed(2) + ' ' + state.storeSettings.currency + ' (' + tr('discount_short') + ': ' + discountAmount.toFixed(2) + ')';
}

function updateCartQty(idx, val) {
  const q = parseInt(val) || 1;
  const item = state.cart[idx];
  const prod = state.products.find(function(p) { return p.id === item.id; });
  if (prod && q > prod.stock) {
    showNotification('الكمية تتجاوز المخزون!', 'error');
    renderCart();
    return;
  }
  state.cart[idx].qty = q;
  renderCart();
}

function removeFromCart(idx) {
  state.cart.splice(idx, 1);
  renderCart();
}

function clearCart() {
  state.cart = [];
  const d = document.getElementById('saleDiscount'); if (d) d.value = 0;
  const p = document.getElementById('salePaid'); if (p) p.value = 0;
  const n = document.getElementById('saleNotes'); if (n) n.value = '';
  renderCart();
}

async function completeSale() {
  if (state.cart.length === 0) {
    playBeep(false);
    return showNotification('السلة فارغة!', 'error');
  }

  showLoading(currentLang === 'en' ? 'Saving invoice...' : 'جارٍ حفظ الفاتورة...');
  await new Promise(function(resolve) { requestAnimationFrame(function() { resolve(); }); });
  const subtotal = state.cart.reduce(function(sum, i) { return sum + i.price * i.qty; }, 0);
  const discVal = parseFloat(document.getElementById('saleDiscount').value) || 0;
  const discType = document.getElementById('saleDiscountType').value;
  const discountAmount = discType === 'percent' ? (subtotal * discVal / 100) : discVal;
  const total = Math.max(0, subtotal - discountAmount);

  const paid = parseFloat(document.getElementById('salePaid').value) || total;
  const customerId = document.getElementById('saleCustomer').value;
  const payMethod = document.getElementById('salePayMethod').value;
  const notes = document.getElementById('saleNotes').value.trim();

  if (!state.currentShift) {
    state.currentShift = {
      id: uid('SHIFT'),
      name: 'وردية تلقائية',
      cashierName: state.currentUser ? state.currentUser.email : '',
      startTime: new Date().toISOString()
    };
  }

  state.cart.forEach(function(item) {
    const prod = state.products.find(function(p) { return p.id === item.id; });
    if (prod) {
      const before = prod.stock;
      prod.stock -= item.qty;
      state.stockMoves.unshift({
        id: uid('SM'),
        date: new Date().toISOString(),
        productId: prod.id,
        productName: prod.name,
        type: 'out',
        qty: item.qty,
        oldStock: before,
        newStock: prod.stock,
        reason: 'بيع'
      });
    }
  });

  const saleObj = {
    id: 'INV-' + Date.now().toString().slice(-8),
    date: new Date().toISOString(),
    items: JSON.parse(JSON.stringify(state.cart)),
    subtotal: subtotal,
    discount: discountAmount,
    total: total,
    paid: paid,
    remaining: Math.max(0, total - paid),
    customerId: customerId,
    payMethod: payMethod,
    notes: notes,
    cashier: state.currentUser ? state.currentUser.email : '',
    shiftId: state.currentShift ? state.currentShift.id : null
  };

  state.sales.unshift(saleObj);

  if (saleObj.remaining > 0 && customerId) {
    const cust = state.customers.find(function(c) { return c.id === customerId; });
    if (cust) cust.openingDebt = (cust.openingDebt || 0) + saleObj.remaining;
  }

  saveData();
  playBeep(true);
  showNotification('تم حفظ الفاتورة بنجاح ✅');

  try {
    printInvoice(saleObj);
  } catch (printErr) {
    console.warn('Print invoice failed:', printErr);
  } finally {
    clearCart();
    renderSales();
    renderDashboard();
    updateStockBadge();
    renderProducts();
    renderStockMoves();
    renderShifts();
    renderCustomers();
    renderCustomerPayments();
    hideLoading();
  }
}

function renderSales() {
  const container = document.getElementById('salesTable');
  if (!container) return;

  const searchInput = document.getElementById('salesSearch');
  const fromInput = document.getElementById('salesFrom');
  const toInput = document.getElementById('salesTo');
  const search = (searchInput ? searchInput.value : '').toLowerCase();
  const from = fromInput ? fromInput.value : '';
  const to = toInput ? toInput.value : '';

  const filtered = state.sales.filter(function(s) {
    const cust = state.customers.find(function(c) { return c.id === s.customerId; });
    const haystack = (s.id + ' ' + (cust ? cust.name : '') + ' ' + (s.notes || '')).toLowerCase();
    const matchSearch = haystack.indexOf(search) !== -1;
    const sDate = (s.date || '').split('T')[0];
    let matchDate = true;
    if (from && sDate < from) matchDate = false;
    if (to && sDate > to) matchDate = false;
    return matchSearch && matchDate;
  });

  if (filtered.length === 0) {
    container.innerHTML = '<p class="text-muted">لا توجد فواتير مسجلة.</p>';
    return;
  }

  let html = '<div class="table-wrap"><table class="data-table"><thead><tr><th data-i18n="th_invoice_number">رقم الفاتورة</th><th data-i18n="th_date">التاريخ</th><th data-i18n="th_customer">العميل</th><th data-i18n="th_total">الإجمالي</th><th data-i18n="th_paid">المدفوع</th><th data-i18n="th_remaining">المتبقي</th><th data-i18n="th_payment_method">طريقة الدفع</th><th data-i18n="th_action">إجراء</th></tr></thead><tbody>';
  filtered.forEach(function(s) {
    const cust = state.customers.find(function(c) { return c.id === s.customerId; });
    html += '<tr>' +
      '<td>' + escapeHTML(s.id) + '</td>' +
      '<td>' + new Date(s.date).toLocaleString(currentLang === 'en' ? 'en-US' : 'ar-EG') + '</td>' +
      '<td>' + (cust ? escapeHTML(cust.name) : 'نقدي') + '</td>' +
      '<td>' + s.total.toFixed(2) + '</td>' +
      '<td>' + s.paid.toFixed(2) + '</td>' +
      '<td class="' + (s.remaining > 0 ? 'red-text' : '') + '">' + s.remaining.toFixed(2) + '</td>' +
      '<td>' + escapeHTML(s.payMethod) + '</td>' +
      '<td>' +
        '<button class="small-btn primary" onclick="printInvoiceById(\'' + s.id + '\')">طباعة</button>' +
        '<button class="small-btn red" onclick="safeDeleteRecord(\'sale\', \'' + s.id + '\')">حذف خطأ</button>' +
      '</td>' +
      '</tr>';
  });
  html += '</tbody></table></div>';
  container.innerHTML = html;
}

/* ============ إدارة الحذف الآمن ============ */
function safeDeleteRecord(type, id) {
  if (state.role !== 'manager') return showNotification('هذه العملية للمدير فقط', 'warning');
  
  if (!confirm(tr('msg_delete_mistake'))) return;

  if (type === 'sale') {
    const idx = state.sales.findIndex(function(s) { return s.id === id; });
    if (idx === -1) return;
    const s = state.sales[idx];
    s.items.forEach(function(item) {
      const prod = state.products.find(function(p) { return p.id === item.id; });
      if (prod) {
        const before = prod.stock;
        prod.stock += item.qty;
        state.stockMoves.unshift({
          id: uid('SM'), date: new Date().toISOString(),
          productId: prod.id, productName: prod.name,
          type: 'in', qty: item.qty, oldStock: before, newStock: prod.stock,
          reason: 'تصحيح خطأ إدخال - حذف فاتورة ' + s.id
        });
      }
    });

    if (s.customerId) {
      const cust = state.customers.find(function(c) { return c.id === s.customerId; });
      if (cust) cust.openingDebt = Math.max(0, (Number(cust.openingDebt) || 0) - (Number(s.remaining) || 0));
    }

    if (state.currentShift && s.shiftId === state.currentShift.id) {
      setTimeout(function() { calcExpectedShiftCash(); }, 50);
    }

    const closedShift = state.shifts.find(function(sh) { return sh.id === s.shiftId; });
    if (closedShift) {
      closedShift.totalSales = Math.max(0, (Number(closedShift.totalSales) || 0) - (Number(s.total) || 0));
      closedShift.saleCount = Math.max(0, (Number(closedShift.saleCount) || 0) - 1);
      if (s.payMethod === 'cash') closedShift.cashSales = Math.max(0, (Number(closedShift.cashSales) || 0) - (Number(s.paid) || 0));
      closedShift.difference = (Number(closedShift.actualCash) || 0) - (Number(closedShift.cashSales) || 0);
    }
    state.sales.splice(idx, 1);
  } else if (type === 'expense') {
    state.expenses = state.expenses.filter(function(e) { return e.id !== id; });
  } else if (type === 'purchase') {
    const idx = state.purchases.findIndex(function(p) { return p.id === id; });
    if (idx !== -1) {
      const p = state.purchases[idx];
      const prod = state.products.find(function(pr) { return pr.id === p.productId; });
      if (prod) {
        prod.stock = Math.max(0, prod.stock - p.qty);
      }
      state.purchases.splice(idx, 1);
    }
  }

  saveData();
  renderAll();
  showNotification('تم حذف العملية وتعديل التأثير بنجاح ✅');
}

function clearTableLog(logType) {
  if (state.role !== 'manager') return showNotification('هذه العملية للمدير فقط', 'warning');
  if (!confirm(tr('msg_clear_log'))) return;

  if (logType === 'sales') state.sales = [];
  else if (logType === 'expenses') state.expenses = [];
  else if (logType === 'purchases') state.purchases = [];

  saveData();
  renderAll();
  showNotification('تم تصفير السجل بنجاح ✅');
}

// ▲▲▲ نهاية الجزء 1/3 — انسخ الجزء 2/3 بعد ده مباشرة ▲▲▲
/* ============ المخزون والمنتجات ============ */
function saveProduct() {
  if (state.role !== 'manager') return showNotification('هذه العملية للمدير فقط', 'warning');

  const id = document.getElementById('productId').value;
  const name = document.getElementById('productName').value.trim();
  const barcode = document.getElementById('productBarcode').value.trim();
  const category = document.getElementById('productCategory').value.trim();
  const price = parseFloat(document.getElementById('productPrice').value) || 0;
  const cost = parseFloat(document.getElementById('productCost').value) || 0;
  const stock = parseInt(document.getElementById('productStock').value) || 0;
  const minStock = parseInt(document.getElementById('productMin').value) || 5;

  if (!name) return showNotification('اسم المنتج مطلوب', 'error');

  const dup = state.products.find(p => p.id !== id && barcode && normalizeBarcode(p.barcode) === normalizeBarcode(barcode));
  if (dup) return showNotification('الباركود مستخدم للمنتج: ' + dup.name, 'error');

  if (id) {
    const prod = state.products.find(function(p) { return p.id === id; });
    if (prod) {
      const oldStock = prod.stock;
      prod.name = name;
      prod.barcode = barcode;
      prod.category = category;
      prod.price = price;
      prod.cost = cost;
      prod.stock = stock;
      prod.minStock = minStock;
      if (oldStock !== stock) {
        state.stockMoves.unshift({
          id: uid('SM'), date: new Date().toISOString(),
          productId: prod.id, productName: prod.name,
          type: stock > oldStock ? 'in' : 'out',
          qty: Math.abs(stock - oldStock),
          oldStock: oldStock, newStock: stock,
          reason: 'تعديل بيانات المنتج'
        });
      }
    }
  } else {
    const newProd = { id: uid('PRD'), name: name, barcode: barcode, category: category, price: price, cost: cost, stock: stock, minStock: minStock };
    state.products.push(newProd);
    if (stock > 0) {
      state.stockMoves.unshift({
        id: uid('SM'), date: new Date().toISOString(),
        productId: newProd.id, productName: newProd.name,
        type: 'in', qty: stock, oldStock: 0, newStock: stock,
        reason: 'رصيد افتتاحي'
      });
    }
  }

  saveData();
  clearProductForm();
  renderProducts();
  renderDashboard();
  updateStockBadge();
  showNotification('تم حفظ المنتج ✅');
}

function clearProductForm() {
  ['productId', 'productName', 'productBarcode', 'productCategory', 'productPrice', 'productCost', 'productStock'].forEach(function(id) {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const min = document.getElementById('productMin');
  if (min) min.value = 5;
  const title = document.getElementById('productFormTitle');
  if (title) title.innerText = 'إضافة منتج جديد';
}

function renderProducts() {
  const container = document.getElementById('productsTable');
  if (!container) return;

  const searchEl = document.getElementById('productSearch');
  const search = (searchEl ? searchEl.value : '').toLowerCase();

  const filtered = state.products.filter(function(p) {
    return (p.name || '').toLowerCase().indexOf(search) !== -1 ||
      (p.barcode && String(p.barcode).indexOf(search) !== -1) ||
      (p.category && p.category.toLowerCase().indexOf(search) !== -1);
  });

  if (filtered.length === 0) {
    container.innerHTML = '<p class="text-muted">لا توجد منتجات.</p>';
    return;
  }

  let html = '<div class="table-wrap"><table class="data-table"><thead><tr><th data-i18n="th_name">الاسم</th><th data-i18n="th_barcode">الباركود</th><th data-i18n="th_category">التصنيف</th><th data-i18n="th_price">السعر</th><th data-i18n="th_cost">التكلفة</th><th data-i18n="th_stock">المخزن</th><th data-i18n="th_action">إجراء</th></tr></thead><tbody>';
  filtered.forEach(function(p) {
    const isLow = Number(p.stock) <= Number(p.minStock || 5);
    html += '<tr' + (isLow ? ' style="background:#fff4d9"' : '') + '>' +
      '<td>' + escapeHTML(p.name) + (isLow ? ' ⚠️' : '') + '</td>' +
      '<td>' + escapeHTML(p.barcode || '-') + '</td>' +
      '<td>' + escapeHTML(p.category || '-') + '</td>' +
      '<td>' + p.price + '</td>' +
      '<td>' + p.cost + '</td>' +
      '<td><b>' + p.stock + '</b></td>' +
      '<td>' +
        '<button class="small-btn primary" onclick="editProduct(\'' + p.id + '\')">تعديل</button>' +
        '<button class="small-btn red" onclick="deleteProduct(\'' + p.id + '\')">حذف</button>' +
      '</td>' +
      '</tr>';
  });
  html += '</tbody></table></div>';
  container.innerHTML = html;
}

function editProduct(id) {
  if (state.role !== 'manager') return showNotification('هذه العملية للمدير فقط', 'warning');
  const p = state.products.find(function(item) { return item.id === id; });
  if (!p) return;
  document.getElementById('productId').value = p.id;
  document.getElementById('productName').value = p.name || '';
  document.getElementById('productBarcode').value = p.barcode || '';
  document.getElementById('productCategory').value = p.category || '';
  document.getElementById('productPrice').value = p.price || 0;
  document.getElementById('productCost').value = p.cost || 0;
  document.getElementById('productStock').value = p.stock || 0;
  document.getElementById('productMin').value = p.minStock || 5;
  const title = document.getElementById('productFormTitle');
  if (title) title.innerText = 'تعديل: ' + p.name;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteProduct(id) {
  if (state.role !== 'manager') return showNotification('هذه العملية للمدير فقط', 'warning');
  if (!confirm(tr('msg_delete_product'))) return;
  state.products = state.products.filter(function(p) { return p.id !== id; });
  saveData();
  renderProducts();
  renderDashboard();
  updateStockBadge();
  showNotification('تم حذف المنتج');
}

function populateAdjustDropdown() {
  const sel = document.getElementById('adjustProduct');
  if (!sel) return;
  sel.innerHTML = '<option value="">' + tr('opt_select_product') + '</option>';
  state.products.forEach(function(p) {
    sel.innerHTML += '<option value="' + p.id + '">' + escapeHTML(p.name) + (currentLang === 'en' ? ' (Available: ' : ' (المتوفر: ') + p.stock + ')</option>';
  });
}

function saveStockAdjustment() {
  if (state.role !== 'manager') return showNotification('هذه العملية للمدير فقط', 'warning');

  const prodId = document.getElementById('adjustProduct').value;
  const type = document.getElementById('adjustType').value;
  const qty = parseInt(document.getElementById('adjustQty').value);
  const reason = document.getElementById('adjustReason').value.trim();

  if (!prodId || isNaN(qty) || qty < 0 || !reason) return showNotification('أكمل بيانات الحركة والسبب', 'error');

  const prod = state.products.find(function(p) { return p.id === prodId; });
  if (!prod) return;

  if (type === 'out' && qty > prod.stock) {
    return showNotification('الكمية أكبر من المخزون المتاح (' + prod.stock + ')', 'error');
  }

  const oldStock = prod.stock;
  let newStock = oldStock;
  if (type === 'in') newStock = oldStock + qty;
  if (type === 'out') newStock = Math.max(0, oldStock - qty);
  if (type === 'set') newStock = qty;

  if (newStock === oldStock) return showNotification('الكمية مطابقة للحالية', 'info');

  prod.stock = newStock;
  state.stockMoves.unshift({
    id: uid('SM'), date: new Date().toISOString(),
    productId: prod.id, productName: prod.name,
    type: type, qty: Math.abs(newStock - oldStock),
    oldStock: oldStock, newStock: newStock, reason: reason
  });

  saveData();
  document.getElementById('adjustQty').value = '';
  document.getElementById('adjustReason').value = '';
  renderStockMoves();
  renderProducts();
  renderDashboard();
  updateStockBadge();
  showNotification('تم تسجيل الحركة ✅');
}

function renderStockMoves() {
  const container = document.getElementById('stockMovesTable');
  if (!container) return;

  const searchEl = document.getElementById('moveSearch');
  const search = (searchEl ? searchEl.value : '').toLowerCase();

  const filtered = state.stockMoves.filter(function(m) {
    return (m.productName || '').toLowerCase().indexOf(search) !== -1 ||
      (m.reason || '').toLowerCase().indexOf(search) !== -1;
  });

  if (filtered.length === 0) {
    container.innerHTML = '<p class="text-muted">لا توجد حركات مسجلة.</p>';
    return;
  }

  let html = '<div class="table-wrap"><table class="data-table"><thead><tr><th data-i18n="th_date">التاريخ</th><th data-i18n="th_product">المنتج</th><th data-i18n="th_movement">الحركة</th><th data-i18n="th_quantity">الكمية</th><th data-i18n="th_before_after">قبل ➔ بعد</th><th data-i18n="th_reason">السبب</th></tr></thead><tbody>';
  filtered.forEach(function(m) {
    const label = m.type === 'in' ? 'إضافة (+)' : (m.type === 'out' ? 'خصم (-)' : 'ضبط (=)');
    html += '<tr>' +
      '<td>' + new Date(m.date).toLocaleString(currentLang === 'en' ? 'en-US' : 'ar-EG') + '</td>' +
      '<td>' + escapeHTML(m.productName) + '</td>' +
      '<td>' + label + '</td>' +
      '<td>' + m.qty + '</td>' +
      '<td>' + m.oldStock + ' ➔ ' + m.newStock + '</td>' +
      '<td>' + escapeHTML(m.reason) + '</td>' +
      '</tr>';
  });
  html += '</tbody></table></div>';
  container.innerHTML = html;
}

/* ============ المرتجعات ============ */
function populateReturnDropdowns() {
  const saleSel = document.getElementById('returnSale');
  if (!saleSel) return;
  saleSel.innerHTML = '<option value="">' + tr('opt_select_invoice') + '</option>';
  state.sales.forEach(function(s) {
    saleSel.innerHTML += '<option value="' + s.id + '">فاتورة: ' + s.id + ' (' + s.total.toFixed(2) + ' ' + state.storeSettings.currency + ')</option>';
  });
}

function updateReturnProducts() {
  const saleId = document.getElementById('returnSale').value;
  const prodSel = document.getElementById('returnProduct');
  if (!prodSel) return;
  prodSel.innerHTML = '<option value="">' + tr('opt_select_item') + '</option>';
  const sale = state.sales.find(function(s) { return s.id === saleId; });
  if (!sale) return;

  sale.items.forEach(function(i) {
    const alreadyReturned = state.returns
      .filter(function(r) { return r.saleId === saleId && r.productId === i.id; })
      .reduce(function(sum, r) { return sum + r.qty; }, 0);
    const remaining = i.qty - alreadyReturned;
    if (remaining > 0) {
      prodSel.innerHTML += '<option value="' + i.id + '">' + escapeHTML(i.name) + (currentLang === 'en' ? ' (Remaining: ' : ' (متبقي: ') + remaining + ')</option>';
    }
  });
}

function saveReturn() {
  if (state.role !== 'manager') return showNotification('هذه العملية للمدير فقط', 'warning');

  const saleId = document.getElementById('returnSale').value;
  const prodId = document.getElementById('returnProduct').value;
  const qty = parseInt(document.getElementById('returnQty').value) || 1;
  const reason = document.getElementById('returnReason').value.trim();

  if (!saleId || !prodId) return showNotification(tr('notify_select_sale_item'), 'error');
  if (qty < 1) return showNotification('كمية غير صحيحة', 'error');

  const sale = state.sales.find(function(s) { return s.id === saleId; });
  const item = sale ? sale.items.find(function(i) { return i.id === prodId; }) : null;
  if (!item) return showNotification('الصنف غير موجود', 'error');

  const alreadyReturned = state.returns
    .filter(function(r) { return r.saleId === saleId && r.productId === prodId; })
    .reduce(function(sum, r) { return sum + r.qty; }, 0);

  if (qty > item.qty - alreadyReturned) return showNotification('الكمية أكبر من المتبقي', 'error');

  const prod = state.products.find(function(p) { return p.id === prodId; });
  if (prod) {
    const before = prod.stock;
    prod.stock += qty;
    state.stockMoves.unshift({
      id: uid('SM'), date: new Date().toISOString(),
      productId: prod.id, productName: prod.name,
      type: 'in', qty: qty, oldStock: before, newStock: prod.stock,
      reason: 'مرتجع فاتورة ' + saleId
    });
  }

  state.returns.unshift({
    id: uid('RET'), date: new Date().toISOString(),
    saleId: saleId, productId: prodId,
    productName: item.name, qty: qty,
    reason: reason || 'غير محدد'
  });

  saveData();
  document.getElementById('returnQty').value = 1;
  document.getElementById('returnReason').value = '';
  renderReturns();
  renderProducts();
  renderStockMoves();
  renderDashboard();
  updateStockBadge();
  showNotification('تم تسجيل المرتجع ✅');
}

function renderReturns() {
  const container = document.getElementById('returnsTable');
  if (!container) return;
  if (state.returns.length === 0) {
    container.innerHTML = '<p class="text-muted">لا توجد مرتجعات.</p>';
    return;
  }
  let html = '<div class="table-wrap"><table class="data-table"><thead><tr><th data-i18n="th_date">التاريخ</th><th data-i18n="th_invoice_number">رقم الفاتورة</th><th data-i18n="th_item">الصنف</th><th data-i18n="th_quantity">الكمية</th><th data-i18n="th_reason">السبب</th></tr></thead><tbody>';
  state.returns.forEach(function(r) {
    html += '<tr>' +
      '<td>' + new Date(r.date).toLocaleString(currentLang === 'en' ? 'en-US' : 'ar-EG') + '</td>' +
      '<td>' + escapeHTML(r.saleId) + '</td>' +
      '<td>' + escapeHTML(r.productName) + '</td>' +
      '<td>' + r.qty + '</td>' +
      '<td>' + escapeHTML(r.reason) + '</td>' +
      '</tr>';
  });
  html += '</tbody></table></div>';
  container.innerHTML = html;
}

/* ============ العملاء ============ */
function saveCustomer() {
  if (state.role !== 'manager') return showNotification('هذه العملية للمدير فقط', 'warning');

  const id = document.getElementById('customerId').value;
  const name = document.getElementById('customerName').value.trim();
  const phone = document.getElementById('customerPhone').value.trim();
  const openingDebt = parseFloat(document.getElementById('customerOpeningDebt').value) || 0;

  if (!name) return showNotification('اسم العميل مطلوب', 'error');

  if (id) {
    const c = state.customers.find(function(item) { return item.id === id; });
    if (c) { c.name = name; c.phone = phone; c.openingDebt = openingDebt; }
  } else {
    state.customers.push({ id: uid('CUST'), name: name, phone: phone, openingDebt: openingDebt });
  }

  saveData();
  ['customerId', 'customerName', 'customerPhone'].forEach(function(i) {
    const el = document.getElementById(i);
    if (el) el.value = '';
  });
  const d = document.getElementById('customerOpeningDebt');
  if (d) d.value = 0;
  renderCustomers();
  showNotification('تم حفظ العميل ✅');
}

function renderCustomers() {
  const container = document.getElementById('customersTable');
  if (!container) return;

  const searchEl = document.getElementById('customerSearch');
  const search = (searchEl ? searchEl.value : '').toLowerCase();

  const filtered = state.customers.filter(function(c) {
    return (c.name || '').toLowerCase().indexOf(search) !== -1 ||
      (c.phone || '').indexOf(search) !== -1;
  });

  const paySel = document.getElementById('customerPaymentCustomer');
  if (paySel) {
    const currentVal = paySel.value;
    paySel.innerHTML = '';
    state.customers.forEach(function(c) {
      const isCashCustomer = c.name === 'عميل نقدي عام' || c.name === 'Cash Customer';
      const displayName = isCashCustomer ? (translations[currentLang] || translations.ar).cash_customer : c.name;
      const debtLabel = currentLang === 'en' ? ' (Debt: ' : ' (دين: ';
      paySel.innerHTML += '<option value="' + c.id + '">' + escapeHTML(displayName) + debtLabel + (c.openingDebt || 0).toFixed(2) + ')</option>';
    });
    if (currentVal) paySel.value = currentVal;
  }

  if (filtered.length === 0) {
    container.innerHTML = '<p class="text-muted">لا يوجد عملاء.</p>';
    return;
  }

  let html = '<div class="table-wrap"><table class="data-table"><thead><tr><th data-i18n="th_name">الاسم</th><th data-i18n="th_phone">الهاتف</th><th data-i18n="th_debts">الديون</th><th data-i18n="th_action">إجراء</th></tr></thead><tbody>';
  filtered.forEach(function(c) {
    const debtClass = (c.openingDebt || 0) > 0 ? 'red-text' : '';
    html += '<tr>' +
      '<td>' + escapeHTML(c.name) + '</td>' +
      '<td>' + escapeHTML(c.phone || '-') + '</td>' +
      '<td class="' + debtClass + '"><b>' + (c.openingDebt || 0).toFixed(2) + '</b></td>' +
      '<td><button class="small-btn red" onclick="deleteCustomer(\'' + c.id + '\')">حذف</button></td>' +
      '</tr>';
  });
  html += '</tbody></table></div>';
  container.innerHTML = html;
}

function deleteCustomer(id) {
  if (state.role !== 'manager') return showNotification('هذه العملية للمدير فقط', 'warning');
  if (state.customers.length <= 1) return showNotification('لا يمكن حذف آخر عميل', 'warning');
  if (!confirm(tr('msg_delete_customer'))) return;
  state.customers = state.customers.filter(function(c) { return c.id !== id; });
  saveData();
  renderCustomers();
  showNotification('تم الحذف');
}

function recordCustomerPayment() {
  if (state.role !== 'manager') return showNotification('هذه العملية للمدير فقط', 'warning');

  const customerId = document.getElementById('customerPaymentCustomer').value;
  const amount = parseFloat(document.getElementById('customerPaymentAmount').value);
  const date = document.getElementById('customerPaymentDate').value || today();
  const notes = document.getElementById('customerPaymentNotes').value.trim();

  if (!customerId || isNaN(amount) || amount <= 0) return showNotification('أدخل مبلغاً صحيحاً', 'error');

  const cust = state.customers.find(function(c) { return c.id === customerId; });
  if (!cust) return showNotification('العميل غير موجود', 'error');

  if (amount > (cust.openingDebt || 0)) {
    if (!confirm('المبلغ أكبر من الدين. تسجيل الفرق كرصيد دائن؟')) return;
    const diff = amount - (cust.openingDebt || 0);
    cust.openingDebt = (cust.openingDebt || 0) - amount;
    showNotification('تم الخصم. الفرق رصيد دائن: ' + diff.toFixed(2), 'info');
  } else {
    cust.openingDebt = Math.max(0, (cust.openingDebt || 0) - amount);
  }

  state.customerPayments.unshift({
    id: uid('CP'), customerId: customerId, customerName: cust.name,
    amount: amount, date: date, notes: notes
  });

  saveData();
  document.getElementById('customerPaymentAmount').value = '';
  document.getElementById('customerPaymentNotes').value = '';
  renderCustomers();
  renderCustomerPayments();
  showNotification('تم تسجيل التحصيل ✅');
}

function renderCustomerPayments() {
  const container = document.getElementById('customerPaymentsTable');
  if (!container) return;
  if (state.customerPayments.length === 0) {
    container.innerHTML = '<p class="text-muted">لا توجد تحصيلات مسجلة.</p>';
    return;
  }
  let html = '<div class="table-wrap"><table class="data-table"><thead><tr><th data-i18n="th_date">التاريخ</th><th data-i18n="th_customer">العميل</th><th data-i18n="th_amount">المبلغ</th><th data-i18n="th_notes">ملاحظات</th></tr></thead><tbody>';
  state.customerPayments.forEach(function(p) {
    html += '<tr>' +
      '<td>' + escapeHTML(p.date) + '</td>' +
      '<td>' + escapeHTML(p.customerName) + '</td>' +
      '<td><b>' + p.amount.toFixed(2) + '</b></td>' +
      '<td>' + escapeHTML(p.notes || '-') + '</td>' +
      '</tr>';
  });
  html += '</tbody></table></div>';
  container.innerHTML = html;
}

/* ============ الموردون والمشتريات ============ */
function saveSupplier() {
  if (state.role !== 'manager') return showNotification('هذه العملية للمدير فقط', 'warning');

  const id = document.getElementById('supplierId').value;
  const name = document.getElementById('supplierName').value.trim();
  const phone = document.getElementById('supplierPhone').value.trim();
  const openingDebt = parseFloat(document.getElementById('supplierOpeningDebt').value) || 0;

  if (!name) return showNotification('اسم المورد مطلوب', 'error');

  if (id) {
    const s = state.suppliers.find(function(item) { return item.id === id; });
    if (s) { s.name = name; s.phone = phone; s.openingDebt = openingDebt; }
  } else {
    state.suppliers.push({ id: uid('SUP'), name: name, phone: phone, openingDebt: openingDebt });
  }

  saveData();
  clearSupplierForm();
  renderSuppliers();
  showNotification('تم حفظ المورد ✅');
}

function editSupplier(id) {
  if (state.role !== 'manager') return showNotification('هذه العملية للمدير فقط', 'warning');
  const s = state.suppliers.find(function(item) { return item.id === id; });
  if (!s) return;
  document.getElementById('supplierId').value = s.id;
  document.getElementById('supplierName').value = s.name || '';
  document.getElementById('supplierPhone').value = s.phone || '';
  document.getElementById('supplierOpeningDebt').value = s.openingDebt || 0;
  const title = document.getElementById('supplierFormTitle');
  if (title) title.innerText = 'تعديل مورد: ' + s.name;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function clearSupplierForm() {
  ['supplierId', 'supplierName', 'supplierPhone', 'supplierOpeningDebt'].forEach(function(id) {
    const el = document.getElementById(id);
    if (el) el.value = (id === 'supplierOpeningDebt') ? 0 : '';
  });
  const title = document.getElementById('supplierFormTitle');
  if (title) title.innerText = 'إضافة مورد';
}

function renderSuppliers() {
  const container = document.getElementById('suppliersTable');
  if (!container) return;

  const purSupSel = document.getElementById('purchaseSupplier');
  if (purSupSel) {
    const curVal = purSupSel.value;
    purSupSel.innerHTML = '<option value="">' + tr('opt_select_supplier') + '</option>';
    state.suppliers.forEach(function(s) {
      purSupSel.innerHTML += '<option value="' + s.id + '">' + escapeHTML(s.name) + '</option>';
    });
    if (curVal) purSupSel.value = curVal;
  }

  const suppPaySel = document.getElementById('supplierPaymentSupplier');
  if (suppPaySel) {
    const curVal = suppPaySel.value;
    suppPaySel.innerHTML = '<option value="">' + tr('opt_select_supplier') + '</option>';
    state.suppliers.forEach(function(s) {
      suppPaySel.innerHTML += '<option value="' + s.id + '">' + escapeHTML(s.name) + (currentLang === 'en' ? ' (Payables: ' : ' (له مستحقات: ') + (s.openingDebt || 0).toFixed(2) + ')</option>';
    });
    if (curVal) suppPaySel.value = curVal;
  }

  const purProdSel = document.getElementById('purchaseProduct');
  if (purProdSel) {
    const curVal = purProdSel.value;
    purProdSel.innerHTML = '<option value="">' + tr('opt_select_existing_product') + '</option>';
    state.products.forEach(function(p) {
      purProdSel.innerHTML += '<option value="' + p.id + '">' + escapeHTML(p.name) + '</option>';
    });
    if (curVal) purProdSel.value = curVal;
  }

  if (state.suppliers.length === 0) {
    container.innerHTML = '<p class="text-muted">لا يوجد موردون.</p>';
    return;
  }

  let html = '<div class="table-wrap"><table class="data-table"><thead><tr><th data-i18n="th_name">الاسم</th><th data-i18n="th_phone">الهاتف</th><th data-i18n="th_payables">المستحقات (له فلوس)</th><th data-i18n="th_action">إجراء</th></tr></thead><tbody>';
  state.suppliers.forEach(function(s) {
    const debtClass = (s.openingDebt || 0) > 0 ? 'green-text' : '';
    html += '<tr>' +
      '<td>' + escapeHTML(s.name) + '</td>' +
      '<td>' + escapeHTML(s.phone || '-') + '</td>' +
      '<td class="' + debtClass + '"><b>' + (s.openingDebt || 0).toFixed(2) + '</b></td>' +
      '<td>' +
        '<button class="small-btn primary" onclick="editSupplier(\'' + s.id + '\')">تعديل</button>' +
        '<button class="small-btn red" onclick="deleteSupplier(\'' + s.id + '\')">حذف</button>' +
      '</td>' +
      '</tr>';
  });
  html += '</tbody></table></div>';
  container.innerHTML = html;
}

function deleteSupplier(id) {
  if (state.role !== 'manager') return showNotification('هذه العملية للمدير فقط', 'warning');
  if (!confirm(tr('msg_delete_supplier'))) return;
  state.suppliers = state.suppliers.filter(function(s) { return s.id !== id; });
  saveData();
  renderSuppliers();
  showNotification('تم الحذف');
}

function calcPurchaseTotal() {
  const qty = parseFloat(document.getElementById('purchaseQty').value) || 0;
  const cost = parseFloat(document.getElementById('purchaseCost').value) || 0;
  const total = qty * cost;
  const totEl = document.getElementById('purchaseTotal');
  if (totEl) totEl.value = total.toFixed(2);
}

function savePurchase() {
  if (state.role !== 'manager') return showNotification('هذه العملية للمدير فقط', 'warning');

  const supplierId = document.getElementById('purchaseSupplier').value;
  const prodId = document.getElementById('purchaseProduct').value;
  const newName = document.getElementById('purchaseNewName').value.trim();
  const qty = parseInt(document.getElementById('purchaseQty').value) || 1;
  const cost = parseFloat(document.getElementById('purchaseCost').value) || 0;
  const purchasePriceInput = document.getElementById('purchasePrice');
  const salePriceEntered = purchasePriceInput && purchasePriceInput.value.trim() !== '' ? parseFloat(purchasePriceInput.value) : cost;
  const purchaseSalePrice = Number.isFinite(salePriceEntered) && salePriceEntered >= 0 ? salePriceEntered : cost;
  const paid = parseFloat(document.getElementById('purchasePaid').value) || 0;

  if (!supplierId) return showNotification(tr('notify_select_supplier'), 'error');
  if (qty < 1 || cost < 0) return showNotification('الكمية أو التكلفة غير صحيحة', 'error');

  let targetProdId = prodId;
  let targetProdName = '';

  if (prodId) {
    const p = state.products.find(function(item) { return item.id === prodId; });
    if (p) {
      const before = p.stock;
      p.stock += qty;
      p.cost = cost;
      targetProdName = p.name;
      state.stockMoves.unshift({
        id: uid('SM'), date: new Date().toISOString(),
        productId: p.id, productName: p.name,
        type: 'in', qty: qty, oldStock: before, newStock: p.stock,
        reason: 'مشتريات'
      });
    }
  } else if (newName) {
    const newProd = { id: uid('PRD'), name: newName, barcode: '', category: 'عام', price: purchaseSalePrice, cost: cost, stock: qty, minStock: 5 };
    state.products.push(newProd);
    targetProdId = newProd.id;
    targetProdName = newProd.name;
    state.stockMoves.unshift({
      id: uid('SM'), date: new Date().toISOString(),
      productId: newProd.id, productName: newProd.name,
      type: 'in', qty: qty, oldStock: 0, newStock: qty,
      reason: 'منتج جديد - مشتريات'
    });
  } else {
    return showNotification(tr('notify_select_product_name'), 'error');
  }

  const total = qty * cost;
  const remaining = Math.max(0, total - paid);

  if (remaining > 0) {
    const sup = state.suppliers.find(function(s) { return s.id === supplierId; });
    if (sup) sup.openingDebt = (sup.openingDebt || 0) + remaining;
  }

  state.purchases.unshift({
    id: uid('PUR'), date: new Date().toISOString(),
    supplierId: supplierId, productId: targetProdId, productName: targetProdName,
    qty: qty, cost: cost, total: total, paid: paid, remaining: remaining
  });

  saveData();
  document.getElementById('purchaseNewName').value = '';
  document.getElementById('purchaseQty').value = 1;
  document.getElementById('purchaseCost').value = '';
  if (purchasePriceInput) purchasePriceInput.value = '';
  document.getElementById('purchaseTotal').value = '0.00';
  document.getElementById('purchasePaid').value = 0;
  renderSuppliers();
  renderPurchases();
  renderProducts();
  renderStockMoves();
  updateStockBadge();
  showNotification('تم تسجيل المشتريات ✅');
}

function renderPurchases() {
  const container = document.getElementById('purchasesTable');
  if (!container) return;
  if (state.purchases.length === 0) {
    container.innerHTML = '<p class="text-muted">لا توجد مشتريات.</p>';
    return;
  }
  let html = '<div class="table-wrap"><table class="data-table"><thead><tr><th data-i18n="th_date">التاريخ</th><th data-i18n="th_supplier">المورد</th><th data-i18n="th_product">المنتج</th><th data-i18n="th_quantity">الكمية</th><th data-i18n="th_cost">التكلفة</th><th data-i18n="th_total">الإجمالي</th><th data-i18n="th_remaining">المتبقي</th><th data-i18n="th_action">إجراء</th></tr></thead><tbody>';
  state.purchases.forEach(function(p) {
    const sup = state.suppliers.find(function(s) { return s.id === p.supplierId; });
    html += '<tr>' +
      '<td>' + new Date(p.date).toLocaleString(currentLang === 'en' ? 'en-US' : 'ar-EG') + '</td>' +
      '<td>' + escapeHTML(sup ? sup.name : '-') + '</td>' +
      '<td>' + escapeHTML(p.productName) + '</td>' +
      '<td>' + p.qty + '</td>' +
      '<td>' + p.cost + '</td>' +
      '<td>' + p.total.toFixed(2) + '</td>' +
      '<td class="' + (p.remaining > 0 ? 'red-text' : '') + '">' + p.remaining.toFixed(2) + '</td>' +
      '<td><button class="small-btn red" onclick="safeDeleteRecord(\'purchase\', \'' + p.id + '\')">حذف خطأ</button></td>' +
      '</tr>';
  });
  html += '</tbody></table></div>';
  container.innerHTML = html;
}

function recordSupplierPayment() {
  if (state.role !== 'manager') return showNotification('هذه العملية للمدير فقط', 'warning');

  const supplierId = document.getElementById('supplierPaymentSupplier').value;
  const amount = parseFloat(document.getElementById('supplierPaymentAmount').value);
  const date = document.getElementById('supplierPaymentDate').value || today();
  const notes = document.getElementById('supplierPaymentNotes').value.trim();

  if (!supplierId || isNaN(amount) || amount <= 0) return showNotification(tr('notify_select_supplier_amount'), 'error');

  const sup = state.suppliers.find(function(s) { return s.id === supplierId; });
  if (!sup) return showNotification('المورد غير موجود', 'error');

  sup.openingDebt = Math.max(0, (sup.openingDebt || 0) - amount);

  state.supplierPayments.unshift({
    id: uid('SUPP'), supplierId: supplierId, supplierName: sup.name,
    amount: amount, date: date, notes: notes
  });

  saveData();
  document.getElementById('supplierPaymentAmount').value = '';
  document.getElementById('supplierPaymentNotes').value = '';
  renderSuppliers();
  renderSupplierPayments();
  showNotification('تم تسجيل السداد للمورد بنجاح ✅');
}

function renderSupplierPayments() {
  const container = document.getElementById('supplierPaymentsTable');
  if (!container) return;
  if (state.supplierPayments.length === 0) {
    container.innerHTML = '<p class="text-muted">لا توجد مدفوعات للموردين مسجلة.</p>';
    return;
  }
  let html = '<div class="table-wrap"><table class="data-table"><thead><tr><th data-i18n="th_date">التاريخ</th><th data-i18n="th_supplier">المورد</th><th data-i18n="th_amount_paid">المبلغ المدفوع</th><th data-i18n="th_notes">ملاحظات</th></tr></thead><tbody>';
  state.supplierPayments.forEach(function(p) {
    html += '<tr>' +
      '<td>' + escapeHTML(p.date) + '</td>' +
      '<td>' + escapeHTML(p.supplierName) + '</td>' +
      '<td><b>' + p.amount.toFixed(2) + '</b></td>' +
      '<td>' + escapeHTML(p.notes || '-') + '</td>' +
      '</tr>';
  });
  html += '</tbody></table></div>';
  container.innerHTML = html;
}

/* ============ المصروفات ============ */
function saveExpense() {
  if (state.role !== 'manager') return showNotification('هذه العملية للمدير فقط', 'warning');

  const name = document.getElementById('expenseName').value.trim();
  const amount = parseFloat(document.getElementById('expenseAmount').value);
  const date = document.getElementById('expenseDate').value || today();
  const notes = document.getElementById('expenseNotes').value.trim();

  if (!name || isNaN(amount) || amount <= 0) return showNotification('أدخل البند والمبلغ بشكل صحيح', 'error');

  state.expenses.unshift({ id: uid('EXP'), name: name, amount: amount, date: date, notes: notes });
  saveData();
  document.getElementById('expenseName').value = '';
  document.getElementById('expenseAmount').value = '';
  document.getElementById('expenseNotes').value = '';
  renderExpenses();
  renderDashboard();
  showNotification('تم حفظ المصروف ✅');
}

function renderExpenses() {
  const container = document.getElementById('expensesTable');
  if (!container) return;
  if (state.expenses.length === 0) {
    container.innerHTML = '<p class="text-muted">لا توجد مصروفات.</p>';
    return;
  }
  let html = '<div class="table-wrap"><table class="data-table"><thead><tr><th data-i18n="th_date">التاريخ</th><th data-i18n="th_item_name">البند</th><th data-i18n="th_amount">المبلغ</th><th data-i18n="th_notes">ملاحظات</th><th data-i18n="th_action">إجراء</th></tr></thead><tbody>';
  state.expenses.forEach(function(e) {
    html += '<tr>' +
      '<td>' + escapeHTML(e.date) + '</td>' +
      '<td>' + escapeHTML(e.name) + '</td>' +
      '<td><b>' + e.amount.toFixed(2) + '</b></td>' +
      '<td>' + escapeHTML(e.notes || '-') + '</td>' +
      '<td><button class="small-btn red" onclick="safeDeleteRecord(\'expense\', \'' + e.id + '\')">حذف خطأ</button></td>' +
      '</tr>';
  });
  html += '</tbody></table></div>';
  container.innerHTML = html;
}

/* ============ التقارير ============ */
function filterByPeriod(items, dateField, from, to) {
  return items.filter(function(item) {
    const d = (item[dateField] || '').split('T')[0];
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  });
}

function renderReports() {
  const from = (document.getElementById('reportFrom') || {}).value || '';
  const to = (document.getElementById('reportTo') || {}).value || '';

  const filteredSales = filterByPeriod(state.sales, 'date', from, to);
  const filteredExpenses = filterByPeriod(state.expenses, 'date', from, to);
  const filteredReturns = filterByPeriod(state.returns, 'date', from, to);

  const totalSales = filteredSales.reduce(function(sum, s) { return sum + s.total; }, 0);
  const totalDiscount = filteredSales.reduce(function(sum, s) { return sum + (s.discount || 0); }, 0);

  let totalCost = 0;
  filteredSales.forEach(function(s) {
    s.items.forEach(function(i) { totalCost += (i.cost || 0) * i.qty; });
  });

  const totalExpenses = filteredExpenses.reduce(function(sum, e) { return sum + e.amount; }, 0);
  const netProfit = totalSales - totalCost - totalExpenses;
  const avgInvoice = filteredSales.length > 0 ? totalSales / filteredSales.length : 0;

  const cardsContainer = document.getElementById('reportCards');
  if (cardsContainer) {
    cardsContainer.innerHTML =
      '<div class="stat-card"><h3>' + (translations[currentLang] || translations.ar).dash_total_sales + '</h3><p>' + totalSales.toFixed(2) + ' ' + state.storeSettings.currency + '</p></div>' +
      '<div class="stat-card"><h3>عدد الفواتير</h3><p>' + filteredSales.length + '</p></div>' +
      '<div class="stat-card"><h3>متوسط الفاتورة</h3><p>' + avgInvoice.toFixed(2) + ' ' + state.storeSettings.currency + '</p></div>' +
      '<div class="stat-card"><h3>' + tr('total_cost') + '</h3><p>' + totalCost.toFixed(2) + ' ' + state.storeSettings.currency + '</p></div>' +
      '<div class="stat-card"><h3>' + (translations[currentLang] || translations.ar).dash_expenses + '</h3><p>' + totalExpenses.toFixed(2) + ' ' + state.storeSettings.currency + '</p></div>' +
      '<div class="stat-card" style="background:linear-gradient(135deg,#c8e5d2,#a9d5bb);border-color:#8ab99f">' +
      '<h3>' + (translations[currentLang] || translations.ar).dash_net_profit + '</h3>' +
      '<p style="color:' + (netProfit >= 0 ? '#17643a' : '#c0392b') + '">' + netProfit.toFixed(2) + ' ' + state.storeSettings.currency + '</p>' +
      '</div>';
  }

  const daily = document.getElementById('dailyReport');
  if (daily) {
    daily.innerHTML =
      '<p>عدد الفواتير: <b>' + filteredSales.length + '</b></p>' +
      '<p>' + tr('total_discounts') + ': <b>' + totalDiscount.toFixed(2) + ' ' + state.storeSettings.currency + '</b></p>' +
      '<p>عدد المرتجعات: <b>' + filteredReturns.length + '</b></p>' +
      '<p>عدد المصروفات: <b>' + filteredExpenses.length + '</b></p>';
  }

  const topContainer = document.getElementById('topProductsReport');
  if (topContainer) {
    const salesByProduct = {};
    filteredSales.forEach(function(s) {
      s.items.forEach(function(i) {
        if (!salesByProduct[i.id]) salesByProduct[i.id] = { name: i.name, qty: 0, total: 0 };
        salesByProduct[i.id].qty += i.qty;
        salesByProduct[i.id].total += i.price * i.qty;
      });
    });
    const top = Object.values(salesByProduct).sort(function(a, b) { return b.qty - a.qty; }).slice(0, 10);

    if (top.length === 0) {
      topContainer.innerHTML = '<p class="text-muted">لا توجد مبيعات في الفترة.</p>';
    } else {
      let html = '<div class="table-wrap"><table class="data-table"><thead><tr><th>#</th><th data-i18n="th_product">المنتج</th><th data-i18n="th_quantity">الكمية</th><th data-i18n="th_value">القيمة</th></tr></thead><tbody>';
      top.forEach(function(t, i) {
        html += '<tr><td>' + (i + 1) + '</td><td>' + escapeHTML(t.name) + '</td><td><b>' + t.qty + '</b></td><td>' + t.total.toFixed(2) + '</td></tr>';
      });
      html += '</tbody></table></div>';
      topContainer.innerHTML = html;
    }
  }
}

function setReportPeriod(period) {
  const end = today();
  const d = new Date(end + 'T12:00:00');
  let from = end;

  if (period === 'today') from = end;
  if (period === 'week') { d.setDate(d.getDate() - 6); from = d.toISOString().slice(0, 10); }
  if (period === 'month') { d.setDate(d.getDate() - 29); from = d.toISOString().slice(0, 10); }
  if (period === 'currentMonth') {
    const now = new Date();
    from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  }
  if (period === 'year') {
    const now = new Date();
    from = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
  }

  document.getElementById('reportFrom').value = from;
  document.getElementById('reportTo').value = end;
  renderReports();
}

function clearReportPeriod() {
  document.getElementById('reportFrom').value = '';
  document.getElementById('reportTo').value = '';
  renderReports();
}

/* ============ الورديات ============ */
function calcExpectedShiftCash() {
  const shift = state.currentShift;
  if (!shift) {
    const el = document.getElementById('shiftExpectedCash');
    if (el) el.value = '0.00 ' + state.storeSettings.currency;
    calculateShiftDiff();
    return;
  }

  const shiftStart = new Date(shift.startTime).getTime();
  let cashSales = 0;
  state.sales.forEach(function(s) {
    const saleTime = new Date(s.date).getTime();
    if (saleTime >= shiftStart && s.payMethod === 'cash') {
      cashSales += s.paid;
    }
  });
  const el = document.getElementById('shiftExpectedCash');
  if (el) el.value = cashSales.toFixed(2) + ' ' + state.storeSettings.currency;
  calculateShiftDiff();
}

function calculateShiftDiff() {
  const expEl = document.getElementById('shiftExpectedCash');
  const actEl = document.getElementById('shiftActualCash');
  const diffEl = document.getElementById('shiftDifference');
  if (!expEl || !actEl || !diffEl) return;

  const expected = parseFloat(expEl.value) || 0;
  const actual = parseFloat(actEl.value) || 0;
  const diff = actual - expected;

  if (diff < 0) {
    diffEl.value = diff.toFixed(2) + ' ' + state.storeSettings.currency + ' (عجز ⚠️)';
    diffEl.style.color = '#c62828';
  } else if (diff > 0) {
    diffEl.value = diff.toFixed(2) + ' ' + state.storeSettings.currency + ' (زيادة 🟢)';
    diffEl.style.color = '#2e7d32';
  } else {
    diffEl.value = '0.00 ' + state.storeSettings.currency + ' (مطابق ✅)';
    diffEl.style.color = '#17643a';
  }
}

function closeShift() {
  if (state.role !== 'manager') return showNotification('هذه العملية للمدير فقط', 'warning');

  const cashierName = (document.getElementById('shiftCashierName').value || '').trim();
  if (!cashierName) return showNotification('اكتب اسم الكاشير', 'error');

  const actualCash = parseFloat(document.getElementById('shiftActualCash').value) || 0;
  const notes = (document.getElementById('shiftNotes').value || '').trim();

  if (!state.currentShift) {
    state.currentShift = {
      id: uid('SHIFT'),
      name: cashierName,
      cashierName: cashierName,
      startTime: new Date().toISOString()
    };
  }

  const shiftStart = new Date(state.currentShift.startTime).getTime();
  const shiftSales = state.sales.filter(function(s) {
    return new Date(s.date).getTime() >= shiftStart;
  });

  const cashSales = shiftSales
    .filter(function(s) { return s.payMethod === 'cash'; })
    .reduce(function(sum, s) { return sum + s.paid; }, 0);

  const totalSales = shiftSales.reduce(function(sum, s) { return sum + s.total; }, 0);

  const closedShift = {
    id: state.currentShift.id,
    name: cashierName,
    cashierName: cashierName,
    startTime: state.currentShift.startTime,
    endTime: new Date().toISOString(),
    saleCount: shiftSales.length,
    totalSales: totalSales,
    cashSales: cashSales,
    actualCash: actualCash,
    difference: actualCash - cashSales,
    notes: notes
  };

  state.shifts.unshift(closedShift);
  state.currentShift = null;

  saveData();
  document.getElementById('shiftCashierName').value = '';
  document.getElementById('shiftActualCash').value = '';
  document.getElementById('shiftDifference').value = '';
  document.getElementById('shiftNotes').value = '';

  calcExpectedShiftCash();
  renderShifts();
  showNotification('تم إغلاق الوردية وحفظها ✅');
}

function renderShifts() {
  const container = document.getElementById('shiftsTable');
  if (!container) return;
  if (state.shifts.length === 0) {
    container.innerHTML = '<p class="text-muted">لا توجد ورديات مغلقة.</p>';
    return;
  }
  let html = '<div class="table-wrap"><table class="data-table"><thead><tr><th data-i18n="th_date">التاريخ</th><th data-i18n="th_cashier">الكاشير</th><th data-i18n="th_invoice_count">عدد الفواتير</th><th data-i18n="th_expected_cash">الكاش المتوقع</th><th data-i18n="th_actual_cash">الكاش الفعلي</th><th data-i18n="th_difference">الفرق</th></tr></thead><tbody>';
  state.shifts.forEach(function(s) {
    const diffClass = s.difference < 0 ? 'red-text' : (s.difference > 0 ? 'green-text' : '');
    html += '<tr>' +
      '<td>' + new Date(s.endTime).toLocaleString(currentLang === 'en' ? 'en-US' : 'ar-EG') + '</td>' +
      '<td>' + escapeHTML(s.cashierName) + '</td>' +
      '<td>' + s.saleCount + '</td>' +
      '<td>' + s.cashSales.toFixed(2) + '</td>' +
      '<td>' + s.actualCash.toFixed(2) + '</td>' +
      '<td class="' + diffClass + '"><b>' + s.difference.toFixed(2) + '</b></td>' +
      '</tr>';
  });
  html += '</tbody></table></div>';
  container.innerHTML = html;
}

function printShiftReport() {
  const current = state.currentShift;
  const shift = current || state.shifts[0] || null;
  const startTime = shift ? new Date(shift.startTime).getTime() : 0;
  const endTime = shift && shift.endTime ? new Date(shift.endTime).getTime() : Date.now();
  const sales = state.sales.filter(function(s) { const time = new Date(s.date).getTime(); return time >= startTime && time <= endTime; });
  const totalSales = sales.reduce(function(sum, sale) { return sum + (Number(sale.total) || 0); }, 0);
  const cashSales = sales.filter(function(sale) { return (sale.payMethod || sale.paymentMethod) === 'cash'; }).reduce(function(sum, sale) { return sum + (Number(sale.paid) || 0); }, 0);
  const visaSales = sales.filter(function(sale) { return (sale.payMethod || sale.paymentMethod) === 'visa'; }).reduce(function(sum, sale) { return sum + (Number(sale.paid) || 0); }, 0);
  const transferSales = sales.filter(function(sale) { return (sale.payMethod || sale.paymentMethod) === 'transfer'; }).reduce(function(sum, sale) { return sum + (Number(sale.paid) || 0); }, 0);
  const actualCash = current ? (parseFloat(document.getElementById('shiftActualCash').value) || 0) : (Number(shift && shift.actualCash) || 0);
  const difference = actualCash - cashSales;
  const en = currentLang === 'en';
  const labels = en ? {title:'Shift Report',shift:'Shift',cashier:'Cashier',start:'Start',end:'End',invoice:'Invoice',date:'Date',customer:'Customer',payment:'Payment',total:'Total',paid:'Paid',summary:'Summary',count:'Invoice Count',sales:'Total Sales',cash:'Cash Sales',visa:'Visa Sales',transfer:'Transfer Sales',actual:'Actual Cash',difference:'Difference',thanks:'Generated by Matjari'} : {title:'تقرير الوردية',shift:'الوردية',cashier:'الكاشير',start:'بداية الوردية',end:'نهاية الوردية',invoice:'رقم الفاتورة',date:'التاريخ',customer:'العميل',payment:'طريقة الدفع',total:'الإجمالي',paid:'المدفوع',summary:'الملخص',count:'عدد الفواتير',sales:'مجموع المبيعات',cash:'مبيعات كاش',visa:'مبيعات فيزا',transfer:'مبيعات تحويل',actual:'النقدية الفعلية',difference:'الفرق',thanks:'صادر من متجري'};
  const currency = escapeHTML(state.storeSettings.currency || 'ج.م');
  const shop = escapeHTML(state.storeSettings.name || (en ? 'My Store' : 'متجري'));
  const rows = sales.map(function(sale) {
    const customer = state.customers.find(function(c) { return c.id === sale.customerId; });
    return '<tr><td>' + escapeHTML(sale.id) + '</td><td>' + escapeHTML(new Date(sale.date).toLocaleString(en ? 'en-US' : 'ar-EG')) + '</td><td>' + escapeHTML(customer ? customer.name : (en ? 'Cash Customer' : 'عميل نقدي')) + '</td><td>' + escapeHTML(sale.payMethod || sale.paymentMethod || '-') + '</td><td>' + (Number(sale.total) || 0).toFixed(2) + ' ' + currency + '</td><td>' + (Number(sale.paid) || 0).toFixed(2) + ' ' + currency + '</td></tr>';
  }).join('');
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) return showNotification(en ? 'Allow pop-ups to print the report.' : 'اسمح بالنوافذ المنبثقة لطباعة التقرير.', 'warning');
  win.document.write('<!doctype html><html lang="' + (en?'en':'ar') + '" dir="' + (en?'ltr':'rtl') + '"><head><meta charset="utf-8"><title>' + labels.title + '</title><style>body{font-family:Arial,Tahoma,sans-serif;padding:24px;color:#17364c}h1{color:#176b70}table{width:100%;border-collapse:collapse;margin:18px 0}th{background:#17364c;color:white}th,td{padding:9px;border:1px solid #ccd7df;text-align:' + (en?'left':'right') + '} .summary{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.summary div{padding:12px;background:#f0f6f7;border-radius:8px} @media print{button{display:none}}</style></head><body><h1>' + shop + ' — ' + labels.title + '</h1><p>' + labels.shift + ': ' + escapeHTML(shift ? shift.name || shift.cashierName || shift.id : (en?'Current shift':'الوردية الحالية')) + '</p><p>' + labels.cashier + ': ' + escapeHTML(shift ? shift.cashierName || shift.name || '-' : '-') + '</p><p>' + labels.start + ': ' + (shift ? escapeHTML(new Date(shift.startTime).toLocaleString(en?'en-US':'ar-EG')) : '-') + ' &nbsp; ' + labels.end + ': ' + escapeHTML(new Date(endTime).toLocaleString(en?'en-US':'ar-EG')) + '</p><h2>' + labels.summary + '</h2><section class="summary"><div>' + labels.count + ': <b>' + sales.length + '</b></div><div>' + labels.sales + ': <b>' + totalSales.toFixed(2) + ' ' + currency + '</b></div><div>' + labels.cash + ': <b>' + cashSales.toFixed(2) + ' ' + currency + '</b></div><div>' + labels.visa + ': <b>' + visaSales.toFixed(2) + ' ' + currency + '</b></div><div>' + labels.transfer + ': <b>' + transferSales.toFixed(2) + ' ' + currency + '</b></div><div>' + labels.actual + ': <b>' + actualCash.toFixed(2) + ' ' + currency + '</b></div><div>' + labels.difference + ': <b>' + difference.toFixed(2) + ' ' + currency + '</b></div></section><table><thead><tr><th>' + labels.invoice + '</th><th>' + labels.date + '</th><th>' + labels.customer + '</th><th>' + labels.payment + '</th><th>' + labels.total + '</th><th>' + labels.paid + '</th></tr></thead><tbody>' + rows + '</tbody></table><p>' + labels.thanks + '</p><button onclick="window.print()">' + (en?'Print':'طباعة') + '</button><script>window.onload=function(){setTimeout(function(){window.print()},250)}<\/script></body></html>');
  win.document.close();
}

/* ============ خيارات التصدير والطباعة ============ */
function openExportModal(tableType) {
  activeExportContext.type = tableType;
  const modal = document.getElementById('exportModal');
  if (modal) modal.style.display = 'flex';
}

function closeExportModal() {
  const modal = document.getElementById('exportModal');
  if (modal) modal.style.display = 'none';
}

function toggleExportDateRange(show) {
  const box = document.getElementById('exportDateRangeBox');
  if (box) box.style.display = show ? 'grid' : 'none';
}

function executeExportAction(action) {
  const type = activeExportContext.type;
  const scope = document.querySelector('input[name="exportScope"]:checked').value;
  let from = '';
  let to = '';

  if (scope === 'custom') {
    from = document.getElementById('exportModalFrom').value || '';
    to = document.getElementById('exportModalTo').value || '';
  }

  closeExportModal();

  if (action === 'print') {
    printTableReportFiltered(type, from, to);
  } else if (action === 'excel') {
    exportTableCSVFiltered(type, from, to);
  } else if (action === 'whatsapp') {
    sendTableWhatsAppFiltered(type, from, to);
  }
}

function getFilteredDataForExport(tableType, from, to) {
  let rawData = [];
  let title = '';
  let headers = [];

  switch (tableType) {
    case 'sales':
      title = 'سجل المبيعات';
      headers = ['رقم', 'التاريخ', 'العميل', 'الإجمالي', 'المدفوع', 'المتبقي'];
      rawData = filterByPeriod(state.sales, 'date', from, to).map(s => {
        const cust = state.customers.find(c => c.id === s.customerId);
        return [s.id, new Date(s.date).toLocaleDateString(currentLang === 'en' ? 'en-US' : 'ar-EG'), cust ? ((cust.name === 'عميل نقدي عام' || cust.name === 'Cash Customer') ? (translations[currentLang] || translations.ar).cash_customer : cust.name) : ((translations[currentLang] || translations.ar).cash_customer), s.total.toFixed(2), s.paid.toFixed(2), s.remaining.toFixed(2)];
      });
      break;
    case 'products':
      title = 'قائمة المنتجات';
      headers = ['الاسم', 'الباركود', 'التصنيف', 'السعر', 'التكلفة', 'المخزون'];
      rawData = state.products.map(p => [p.name, p.barcode || '-', p.category || '-', p.price, p.cost, p.stock]);
      break;
    case 'stockMoves':
      title = 'حركات المخزون';
      headers = ['التاريخ', 'المنتج', 'النوع', 'الكمية', 'قبل', 'بعد', 'السبب'];
      rawData = filterByPeriod(state.stockMoves, 'date', from, to).map(m => [new Date(m.date).toLocaleDateString(currentLang === 'en' ? 'en-US' : 'ar-EG'), m.productName, m.type, m.qty, m.oldStock, m.newStock, m.reason]);
      break;
    case 'returns':
      title = 'المرتجعات';
      headers = ['التاريخ', 'الفاتورة', 'الصنف', 'الكمية', 'السبب'];
      rawData = filterByPeriod(state.returns, 'date', from, to).map(r => [new Date(r.date).toLocaleDateString(currentLang === 'en' ? 'en-US' : 'ar-EG'), r.saleId, r.productName, r.qty, r.reason]);
      break;
    case 'customers':
      title = 'قائمة العملاء';
      headers = ['الاسم', 'الهاتف', 'الديون'];
      rawData = state.customers.map(c => [c.name, c.phone || '-', (c.openingDebt || 0).toFixed(2)]);
      break;
    case 'customerPayments':
      title = 'تحصيلات العملاء';
      headers = ['التاريخ', 'العميل', 'المبلغ', 'ملاحظات'];
      rawData = filterByPeriod(state.customerPayments, 'date', from, to).map(p => [p.date, p.customerName, p.amount.toFixed(2), p.notes || '-']);
      break;
    case 'suppliers':
      title = 'قائمة الموردين';
      headers = ['الاسم', 'الهاتف', 'المستحقات'];
      rawData = state.suppliers.map(s => [s.name, s.phone || '-', (s.openingDebt || 0).toFixed(2)]);
      break;
    case 'purchases':
      title = 'المشتريات';
      headers = ['التاريخ', 'المورد', 'المنتج', 'الكمية', 'التكلفة', 'الإجمالي'];
      rawData = filterByPeriod(state.purchases, 'date', from, to).map(p => {
        const sup = state.suppliers.find(s => s.id === p.supplierId);
        return [new Date(p.date).toLocaleDateString(currentLang === 'en' ? 'en-US' : 'ar-EG'), sup ? sup.name : '-', p.productName, p.qty, p.cost, p.total.toFixed(2)];
      });
      break;
    case 'supplierPayments':
      title = tr('supplier_payments_title');
      headers = ['التاريخ', 'المورد', 'المبلغ', 'ملاحظات'];
      rawData = filterByPeriod(state.supplierPayments, 'date', from, to).map(p => [p.date, p.supplierName, p.amount.toFixed(2), p.notes || '-']);
      break;
    case 'expenses':
      title = 'المصروفات';
      headers = ['التاريخ', 'البند', 'المبلغ', 'ملاحظات'];
      rawData = filterByPeriod(state.expenses, 'date', from, to).map(e => [e.date, e.name, e.amount.toFixed(2), e.notes || '-']);
      break;
    case 'shifts':
      title = 'سجل الورديات';
      headers = ['التاريخ', 'الكاشير', 'عدد الفواتير', 'الكاش المتوقع', 'الفعلي', 'الفرق'];
      rawData = filterByPeriod(state.shifts, 'endTime', from, to).map(s => [new Date(s.endTime).toLocaleString(currentLang === 'en' ? 'en-US' : 'ar-EG'), s.cashierName, s.saleCount, s.cashSales.toFixed(2), s.actualCash.toFixed(2), s.difference.toFixed(2)]);
      break;
  }
  return { title, headers, rows: rawData };
}

function printTableReportFiltered(tableType, from, to) {
  const data = getFilteredDataForExport(tableType, from, to);
  openPrintWindow(data.title, data.headers, data.rows, state.storeSettings);
}

function exportTableCSVFiltered(tableType, from, to) {
  const data = getFilteredDataForExport(tableType, from, to);
  const settings = state.storeSettings;

  let csv = '\uFEFF';
  csv += '"' + settings.name + ' - ' + data.title + '"\r\n';
  csv += '"تاريخ التصدير: ' + new Date().toLocaleString(currentLang === 'en' ? 'en-US' : 'ar-EG') + '"\r\n\r\n';
  csv += data.headers.map(h => '"' + h + '"').join(',') + '\r\n';
  data.rows.forEach(r => {
    csv += r.map(c => '"' + String(c || '').replace(/"/g, '""') + '"').join(',') + '\r\n';
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = data.title + '-' + today() + '.csv';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 100);
  showNotification('تم تصدير ملف Excel ✅');
}

function sendTableWhatsAppFiltered(tableType, from, to) {
  const data = getFilteredDataForExport(tableType, from, to);
  const settings = state.storeSettings || { name: 'Matjari' };
  const esc = value => '"' + String(value == null ? '' : value).replace(/"/g, '""') + '"';
  let csv = '\uFEFF' + esc(settings.name + ' - ' + data.title) + '\r\n';
  csv += esc((currentLang === 'en' ? 'Export date: ' : 'تاريخ التصدير: ') + new Date().toLocaleString()) + '\r\n';
  csv += data.headers.map(esc).join(',') + '\r\n';
  data.rows.forEach(row => { csv += row.map(esc).join(',') + '\r\n'; });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (data.title || 'report').replace(/[\\/:*?"<>|]/g, '-') + '-' + today() + '.csv';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showNotification(currentLang === 'en' ? 'File downloaded. You can now share it on WhatsApp.' : 'تم تنزيل الملف، يمكنك الآن مشاركته على واتساب', 'success');
}

function openPrintWindow(title, headers, rows, settings) {
  const logoHTML = settings.logo
    ? '<img src="' + escapeHTML(settings.logo) + '" style="max-height:60px;max-width:150px">'
    : '';

  let headerHTML = headers.map(h => '<th>' + escapeHTML(h) + '</th>').join('');
  let bodyHTML = '';
  rows.forEach(r => {
    bodyHTML += '<tr>';
    r.forEach(c => { bodyHTML += '<td>' + escapeHTML(c) + '</td>'; });
    bodyHTML += '</tr>';
  });

  if (rows.length === 0) {
    bodyHTML = '<tr><td colspan="' + headers.length + '" style="text-align:center;padding:20px;color:#687b8b">لا توجد بيانات</td></tr>';
  }

  const w = window.open('', '_blank');
  if (!w) return showNotification('اسمح بالنوافذ المنبثقة', 'warning');

  w.document.write(
    '<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>' + escapeHTML(title) + '</title>' +
    '<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Tahoma;background:#fff;padding:20px;color:#203447}' +
    '.header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #17364c;padding-bottom:15px;margin-bottom:20px}' +
    '.header-info h1{margin:0 0 6px;font-size:20px;color:#17364c}.header-info p{margin:2px 0;font-size:12px;color:#687b8b}' +
    '.report-title{text-align:center;font-size:18px;font-weight:800;color:#17364c;margin:15px 0;padding:10px;background:#edf3f9;border-radius:8px}' +
    'table{width:100%;border-collapse:collapse;margin-top:10px}th{background:#17364c;color:#fff;padding:10px;text-align:right;font-size:12px}' +
    'td{padding:8px 10px;border-bottom:1px solid #e9eef2;font-size:12px}tbody tr:nth-child(even){background:#f8fafb}' +
    '.meta{margin-top:20px;text-align:center;font-size:11px;color:#687b8b;padding-top:15px;border-top:1px dashed #dce3ec}' +
    '.actions{margin-top:20px;text-align:center}.actions button{padding:10px 20px;border:0;border-radius:8px;font-weight:700;cursor:pointer;background:#176b70;color:#fff}' +
    '@media print{.actions{display:none}body{padding:0}}</style></head><body>' +
    '<div class="header"><div class="header-info"><h1>' + escapeHTML(settings.name) + '</h1>' +
    (settings.phone ? '<p>📞 ' + escapeHTML(settings.phone) + '</p>' : '') +
    (settings.address ? '<p>📍 ' + escapeHTML(settings.address) + '</p>' : '') +
    '</div><div>' + logoHTML + '</div></div>' +
    '<div class="report-title">' + escapeHTML(title) + '</div>' +
    '<table><thead><tr>' + headerHTML + '</tr></thead><tbody>' + bodyHTML + '</tbody></table>' +
    '<div class="meta">عدد السجلات: ' + rows.length + ' | تاريخ الطباعة: ' + new Date().toLocaleString(currentLang === 'en' ? 'en-US' : 'ar-EG') + '</div>' +
    '<div class="actions"><button onclick="window.print()">🖨️ طباعة</button></div>' +
    '</body></html>'
  );
  w.document.close();
}

// ▲▲▲ نهاية الجزء 2/3 — انسخ الجزء 3/3 بعد ده مباشرة ▲▲▲
/* ============ لوحة التحكم والهدف والتنبيهات ============ */
function renderDashboard() {
  const totalSales = state.sales.reduce(function(sum, s) { return sum + s.total; }, 0);
  const totalExpenses = state.expenses.reduce(function(sum, e) { return sum + e.amount; }, 0);
  const totalProducts = state.products.length;
  const lowStockCount = state.products.filter(function(p) { return Number(p.stock) <= Number(p.minStock || 5); }).length;

  let totalCost = 0;
  state.sales.forEach(function(s) {
    s.items.forEach(function(i) { totalCost += (i.cost || 0) * i.qty; });
  });
  const netProfit = totalSales - totalCost - totalExpenses;

  const customerDebt = state.customers.reduce(function(sum, c) { return sum + (c.openingDebt || 0); }, 0);
  const supplierDue = state.suppliers.reduce(function(sum, s) { return sum + (s.openingDebt || 0); }, 0);
  const stockValue = state.products.reduce(function(sum, p) { return sum + (p.stock * p.cost); }, 0);

  const cardsEl = document.getElementById('dashboardCards');
  if (cardsEl) {
    cardsEl.innerHTML =
      '<div class="stat-card" style="background:linear-gradient(135deg,#c8e5d2,#a9d5bb);border-color:#8ab99f"><h3>' + (translations[currentLang] || translations.ar).dash_net_profit + '</h3><p style="color:' + (netProfit >= 0 ? '#17643a' : '#c0392b') + '">' + netProfit.toFixed(2) + ' ' + state.storeSettings.currency + '</p></div>' +
      '<div class="stat-card"><h3>' + tr('dash_net_sales') + '</h3><p>' + totalSales.toFixed(2) + ' ' + state.storeSettings.currency + '</p></div>' +
      '<div class="stat-card"><h3>' + tr('dash_cost') + '</h3><p>' + totalCost.toFixed(2) + ' ' + state.storeSettings.currency + '</p></div>';
  }

  const otherCards = document.getElementById('dashboardOtherCards');
  if (otherCards) {
    otherCards.innerHTML =
      '<div class="stat-card"><h3>' + (translations[currentLang] || translations.ar).dash_products + '</h3><p>' + totalProducts + '</p></div>' +
      '<div class="stat-card"><h3>' + (translations[currentLang] || translations.ar).dash_expenses + '</h3><p>' + totalExpenses.toFixed(2) + ' ' + state.storeSettings.currency + '</p></div>' +
      '<div class="stat-card"><h3>' + (translations[currentLang] || translations.ar).dash_stock_value + '</h3><p>' + stockValue.toFixed(2) + ' ' + state.storeSettings.currency + '</p></div>' +
      '<div class="stat-card"><h3>' + (translations[currentLang] || translations.ar).dash_customer_debt + '</h3><p style="color:#c0392b">' + customerDebt.toFixed(2) + ' ' + state.storeSettings.currency + '</p></div>' +
      '<div class="stat-card"><h3>' + (translations[currentLang] || translations.ar).dash_supplier_due + '</h3><p style="color:#198754">' + supplierDue.toFixed(2) + ' ' + state.storeSettings.currency + '</p></div>' +
      '<div class="stat-card"><h3>' + (translations[currentLang] || translations.ar).dash_stock_alerts + '</h3><p style="color:' + (lowStockCount > 0 ? '#c62828' : '#17643a') + '">' + lowStockCount + ' ' + (currentLang === 'en' ? 'items' : 'صنف') + '</p></div>'; 
  }

  renderSmartAlerts();
  renderMonthlyGoal();
  renderSalesChart();
}

function renderSmartAlerts() {
  const container = document.getElementById('smartAlerts');
  if (!container) return;
  
  let alerts = [];
  const lowStock = state.products.filter(function(p) { return Number(p.stock) <= Number(p.minStock || 5); });
  
  if (lowStock.length > 0) {
    alerts.push({
      type: 'danger', icon: '📦',
      title: currentLang === 'en' ? '⚠️ ' + lowStock.length + ' products reached the alert level' : '⚠️ ' + lowStock.length + ' منتج وصل لحد التنبيه',
      subtitle: currentLang === 'en' ? 'Review inventory and reorder' : 'راجع المخزون وأعد الطلب',
      actionText: currentLang === 'en' ? 'View Inventory' : 'عرض المخزون',
      actionPage: 'invProducts'
    });
  }

  if (alerts.length === 0) {
    container.innerHTML = '';
    return;
  }

  let html = '<div class="card"><h3>' + (currentLang === 'en' ? '🔔 Smart Alerts' : '🔔 تنبيهات ذكية') + '</h3>'; 
  alerts.forEach(function(a, i) {
    html += '<div class="smart-alert ' + a.type + '">' +
      '<span class="alert-icon">' + a.icon + '</span>' +
      '<div class="alert-content"><div class="alert-title">' + a.title + '</div><div class="alert-subtitle">' + a.subtitle + '</div></div>' +
      '<button class="alert-action" data-page="' + a.actionPage + '" onclick="showPage(this.dataset.page)">' + a.actionText + '</button>' +
      '</div>';
  });
  html += '</div>';
  container.innerHTML = html;
}

function renderMonthlyGoal() {
  const container = document.getElementById('monthlyGoalCard');
  if (!container) return;
  const goal = parseFloat(state.storeSettings.monthlyGoal) || 0;
  if (goal <= 0) { container.innerHTML = ''; return; }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const monthEnd = now.toISOString().slice(0, 10);
  const monthSales = state.sales.filter(s => {
    const d = (s.date || '').split('T')[0];
    return d >= monthStart && d <= monthEnd;
  });

  const actualSales = monthSales.reduce((sum, s) => sum + s.total, 0);
  const percent = Math.min(100, (actualSales / goal * 100));
  const remaining = Math.max(0, goal - actualSales);
  const cur = state.storeSettings.currency;

  container.innerHTML =
    '<div class="goal-card">' +
    '<h3>🎯 هدف المبيعات الشهري <span class="goal-badge on-track">' + percent.toFixed(1) + '%</span></h3>' +
    '<div class="goal-header"><div class="goal-values">' +
    '<div class="goal-value"><div class="label">المبيعات</div><div class="value">' + actualSales.toFixed(2) + ' ' + cur + '</div></div>' +
    '<div class="goal-value"><div class="label">الهدف</div><div class="value">' + goal.toFixed(2) + ' ' + cur + '</div></div>' +
    '<div class="goal-value"><div class="label">المتبقي</div><div class="value">' + remaining.toFixed(2) + ' ' + cur + '</div></div>' +
    '</div></div>' +
    '<div class="goal-bar-container"><div class="goal-bar" style="width: ' + percent + '%"></div></div>' +
    '</div>';
}

function renderSalesChart() {
  const container = document.getElementById('salesChart');
  if (!container || typeof Chart === 'undefined') return;

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }

  const data = days.map(function(day) {
    return state.sales
      .filter(function(s) { return (s.date || '').split('T')[0] === day; })
      .reduce(function(sum, s) { return sum + s.total; }, 0);
  });

  const labels = days.map(function(day) {
    const d = new Date(day + 'T12:00:00');
    return d.toLocaleDateString(currentLang === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'short' });
  });

  if (salesChartInstance) salesChartInstance.destroy();

  const canvas = document.createElement('canvas');
  container.innerHTML = '';
  container.appendChild(canvas);

  salesChartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'المبيعات',
        data: data,
        borderColor: '#147d80',
        backgroundColor: 'rgba(20, 125, 128, 0.15)',
        borderWidth: 3,
        fill: true,
        tension: 0.35,
        pointBackgroundColor: '#176b70',
        pointRadius: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true },
        x: { grid: { display: false } }
      }
    }
  });
}

/* ============ الفاتورة والطباعة والـ QR ============ */
async function generateQRData(sale) {
  try {
    const profile = state.storeSettings;
    const data = JSON.stringify({
      id: sale.id,
      shop: profile.name || 'متجري',
      date: sale.date,
      total: sale.total
    });
    if (typeof QRCode !== 'undefined') {
      return await QRCode.toDataURL(data, { width: 130, margin: 1 });
    }
    return '';
  } catch (e) { return ''; }
}

function printInvoiceById(id) {
  const s = state.sales.find(function(x) { return x.id === id; });
  if (!s) return showNotification('الفاتورة غير موجودة', 'error');
  printInvoice(s);
}

async function printInvoice(sale) {
  if (!sale) return;
  const cust = state.customers.find(c => c.id === sale.customerId);
  const settings = state.storeSettings || {};
  const qrDataUrl = await generateQRData(sale);
  const w = window.open('', '_blank');
  if (!w) return showNotification(currentLang === 'en' ? 'Please allow pop-ups to print the invoice.' : 'اسمح بالنوافذ المنبثقة لطباعة الفاتورة', 'warning');
  const currency = escapeHTML(settings.currency || '');
  const shopName = escapeHTML(settings.name || (currentLang === 'en' ? 'My Store' : 'متجري'));
  const phone = escapeHTML(settings.phone || settings.storePhone || '-');
  const address = escapeHTML(settings.address || settings.storeAddress || '-');
  const customerName = escapeHTML(cust ? cust.name : (currentLang === 'en' ? 'Cash Customer' : 'عميل نقدي'));
  const dateText = new Date(sale.date).toLocaleString(currentLang === 'en' ? 'en-US' : 'ar-EG');
  const subtotal = (sale.items || []).reduce((sum, i) => sum + Number(i.qty || 0) * Number(i.price || 0), 0);
  const discount = Number(sale.discount || sale.discountAmount || 0);
  const paid = Number(sale.paid || 0);
  const total = Number(sale.total || 0);
  const remaining = Math.max(0, total - paid);
  const paymentMethod = sale.payMethod || sale.paymentMethod || 'cash';
  const cashier = escapeHTML(sale.cashier || sale.cashierName || (state.currentUser && (state.currentUser.email || state.currentUser.user_metadata?.name)) || '—');
  const en = currentLang === 'en';
  const labels = en ? {invoice:'Invoice',date:'Date',customer:'Customer',item:'Item',qty:'Qty',price:'Price',total:'Total',subtotal:'Subtotal',discount:'Discount',net:'Net Total',paid:'Paid',remaining:'Remaining',payment:'Payment Method',cashier:'Cashier',thanks:'Thank you for shopping with us!'} : {invoice:'رقم الفاتورة',date:'التاريخ',customer:'العميل',item:'الصنف',qty:'الكمية',price:'السعر',total:'الإجمالي',subtotal:'الإجمالي قبل الخصم',discount:'الخصم',net:'الصافي',paid:'المدفوع',remaining:'المتبقي',payment:'طريقة الدفع',cashier:'الكاشير',thanks:'شكراً لتعاملكم معنا!'};
  w.document.write(`<!DOCTYPE html><html lang="${en?'en':'ar'}" dir="${en?'ltr':'rtl'}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${labels.invoice} ${escapeHTML(sale.id)}</title><style>
  *{box-sizing:border-box}body{font-family:Tahoma,Arial,sans-serif;margin:0;padding:22px;background:#f3f6f8;color:#203447}.invoice{max-width:760px;margin:auto;background:white;padding:28px;border:1px solid #dce5ec;border-top:7px solid #176b70;border-radius:12px}.head{text-align:center;border-bottom:2px solid #e1e8ed;padding-bottom:16px}.head h1{color:#17364c;margin:0 0 8px}.muted{color:#687b8b;font-size:13px}.meta{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:18px 0}.meta div{padding:11px;background:#f1f6f8;border-radius:8px}.meta b{display:block;color:#176b70;margin-bottom:4px}table{width:100%;border-collapse:collapse;margin:14px 0}th{background:#17364c;color:white}th,td{padding:11px;border:1px solid #dce5ec;text-align:${en?'left':'right'}}tbody tr:nth-child(even){background:#f7fafb}.totals{margin-${en?'left':'right'}:auto;max-width:340px}.totals p{display:flex;justify-content:space-between;margin:7px 0;padding:5px}.net{font-size:23px;font-weight:bold;color:#176b70;border-top:2px solid #176b70;padding-top:12px!important}.footer{text-align:center;border-top:1px solid #dce5ec;margin-top:20px;padding-top:16px}.footer img{width:115px;height:115px}.thanks{font-weight:bold;color:#176b70;margin:10px}@media print{body{padding:0;background:#fff}.invoice{border:0;border-top:6px solid #176b70;border-radius:0;max-width:none;padding:10px;box-shadow:none}@page{margin:10mm}}@media(max-width:520px){.meta{grid-template-columns:1fr}.invoice{padding:14px}}
  </style></head><body><main class="invoice"><header class="head">${settings.logo ? `<img src="${escapeHTML(settings.logo)}" alt="logo" style="max-width:90px;max-height:70px;object-fit:contain">` : ''}<h1>${shopName}</h1><div>${en?'Phone':'الهاتف'}: ${phone} &nbsp; | &nbsp; ${en?'Address':'العنوان'}: ${address}</div></header><section class="meta"><div><b>${labels.invoice}</b>${escapeHTML(sale.id)}</div><div><b>${labels.date}</b>${dateText}</div><div><b>${labels.customer}</b>${customerName}</div></section><table><thead><tr><th>${labels.item}</th><th>${labels.qty}</th><th>${labels.price}</th><th>${labels.total}</th></tr></thead><tbody>${(sale.items||[]).map(i=>`<tr><td>${escapeHTML(i.name||'')}</td><td>${Number(i.qty||0)}</td><td>${Number(i.price||0).toFixed(2)} ${currency}</td><td>${(Number(i.qty||0)*Number(i.price||0)).toFixed(2)} ${currency}</td></tr>`).join('')}</tbody></table><section class="totals"><p><span>${labels.subtotal}</span><b>${subtotal.toFixed(2)} ${currency}</b></p><p><span>${labels.discount}</span><b>${discount.toFixed(2)} ${currency}</b></p><p class="net"><span>${labels.net}</span><span>${total.toFixed(2)} ${currency}</span></p><p><span>${labels.paid}</span><b>${paid.toFixed(2)} ${currency}</b></p><p><span>${labels.remaining}</span><b>${remaining.toFixed(2)} ${currency}</b></p><p><span>${labels.payment}</span><b>${escapeHTML(paymentMethod)}</b></p></section><footer class="footer">${qrDataUrl?`<img src="${qrDataUrl}" alt="QR Code">`:''}<p class="thanks">${labels.thanks}</p><p>${labels.cashier}: <b>${cashier}</b></p></footer></main><script>window.onload=function(){setTimeout(function(){window.print()},250)}<\/script></body></html>`);
  w.document.close();
}

/* ============ النسخ الاحتياطي (XOR + Base64) ============ */
/*
 * ملاحظة أمنية مهمة:
 * الدالتان simpleEncrypt / simpleDecrypt تعتمدان على XOR + Base64 وهما 
 * مناسبتان فقط لمنع القراءة العابرة أو الفتح الخاطئ للملف، وليستا 
 * تشفيراً آمناً. لا يُنصح بالاعتماد عليهما لحماية بيانات حساسة. 
 * للحماية الحقيقية يُفضّل استخدام Web Crypto API (AES-GCM).
 */
function simpleEncrypt(text, password) {
  if (!password) return text;
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ password.charCodeAt(i % password.length));
  }
  return btoa(unescape(encodeURIComponent(result)));
}

function simpleDecrypt(encoded, password) {
  if (!password) return encoded;
  try {
    const text = decodeURIComponent(escape(atob(encoded)));
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ password.charCodeAt(i % password.length));
    }
    return result;
  } catch (e) { throw new Error('كلمة المرور غير صحيحة'); }
}

async function exportBackup() {
  if (state.role !== 'manager') return showNotification('هذه العملية للمدير فقط', 'warning');
  const pass = prompt(tr('dlg_backup_export_password'));
  if (pass === null) return;
  if (!(await verifyCurrentUserPassword(pass))) return showNotification(currentLang === 'en' ? 'Password verification failed.' : 'فشل التحقق من كلمة المرور.', 'error');
  downloadEncryptedBackup(pass, false);
}

async function importBackup(event) {
  if (state.role !== 'manager') return;
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const pass = prompt(tr('dlg_backup_restore_password'));
  if (pass === null) { event.target.value = ''; return; }
  if (!(await verifyCurrentUserPassword(pass))) { event.target.value = ''; return showNotification(currentLang === 'en' ? 'Password verification failed.' : 'فشل التحقق من كلمة المرور.', 'error'); }

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const parsed = JSON.parse(e.target.result);
      let backup;
      if (parsed && parsed.encrypted && parsed.data) {
        backup = JSON.parse(simpleDecrypt(parsed.data, pass));
      } else {
        backup = parsed;
      }

      if (backup.version && backup.version !== 5) {
        if (!confirm('نسخة قديمة (' + backup.version + '). المتابعة قد تفقد بيانات. متابعة؟')) {
          event.target.value = '';
          return;
        }
      }

      if (backup.storeSettings) state.storeSettings = Object.assign({}, state.storeSettings, backup.storeSettings);
      if (Array.isArray(backup.products)) state.products = backup.products;
      if (Array.isArray(backup.sales)) state.sales = backup.sales;
      if (Array.isArray(backup.customers)) state.customers = backup.customers;
      if (Array.isArray(backup.suppliers)) state.suppliers = backup.suppliers;
      if (Array.isArray(backup.expenses)) state.expenses = backup.expenses;
      if (Array.isArray(backup.stockMoves)) state.stockMoves = backup.stockMoves;
      if (Array.isArray(backup.returns)) state.returns = backup.returns;
      if (Array.isArray(backup.customerPayments)) state.customerPayments = backup.customerPayments;
      if (Array.isArray(backup.supplierPayments)) state.supplierPayments = backup.supplierPayments;
      if (Array.isArray(backup.purchases)) state.purchases = backup.purchases;
      if (Array.isArray(backup.shifts)) state.shifts = backup.shifts;

      saveData();
      renderAll();
      showNotification('تمت الاستعادة بنجاح 🎉');
    } catch (err) {
      showNotification('فشل الاستعادة: ' + err.message, 'error');
    } finally {
      event.target.value = '';
    }
  };
  reader.readAsText(file);
}

/* ============ الوضع الليلي ============ */
function toggleDarkMode() {
  const isDark = document.body.classList.toggle('dark-mode');
  localStorage.setItem('matjari_dark', isDark ? '1' : '0');
  const btn = document.getElementById('settingsDarkModeBtn');
  if (btn) btn.textContent = isDark ? (currentLang === 'en' ? '☀️ Switch to Light Mode' : '☀️ التبديل للوضع النهاري') : (currentLang === 'en' ? '🌙 Switch to Dark Mode' : '🌙 التبديل للوضع الليلي');
  showNotification(isDark ? (currentLang === 'en' ? 'Dark mode enabled' : '🌙 الوضع الليلي مُفعّل') : (currentLang === 'en' ? 'Light mode enabled' : '☀️ الوضع النهاري مُفعّل'), 'info');
}

function applySavedDarkMode() {
  if (localStorage.getItem('matjari_dark') === '1') {
    document.body.classList.add('dark-mode');
  }
}

/* ============ تحديثات التطبيق ============ */
async function checkForUpdates() {
  if (!('serviceWorker' in navigator)) {
    return showNotification(currentLang === 'en' ? 'This browser does not support auto-update.' : 'المتصفح لا يدعم التحديث التلقائي', 'info');
  }
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return showNotification(currentLang === 'en' ? 'No service worker registered.' : 'لا يوجد Service Worker مسجّل', 'warning');
    await reg.update();
    if (reg.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
      showNotification(currentLang === 'en' ? 'Update ready, reloading...' : 'التحديث جاهز، جارٍ إعادة التحميل...', 'info');
    } else {
      showNotification(currentLang === 'en' ? '✅ App is up to date' : '✅ التطبيق محدّث');
    }
  } catch (e) {
    showNotification(currentLang === 'en' ? 'Update failed' : 'تعذر التحديث', 'error');
  }
}

async function clearAppCache() {
  if (!confirm(tr('msg_clear_cache'))) return;
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.active) {
        const channel = new MessageChannel();
        reg.active.postMessage({ type: 'CLEAR_CACHES' }, [channel.port2]);
        await new Promise(function(resolve) {
          let done = false;
          channel.port1.onmessage = function() { if (!done) { done = true; resolve(); } };
          setTimeout(function() { if (!done) { done = true; resolve(); } }, 1500);
        });
      }
    }
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(names.map(function(n) { return caches.delete(n); }));
    }
  } catch (e) {
    console.warn('Clear cache error:', e);
  }
  location.reload();
}

/* ============ طباعة الباركود ============ */
function openBarcodePrintModal() {
  if (state.role !== 'manager') return showNotification('هذه العملية للمدير فقط', 'warning');
  if (state.products.length === 0) return showNotification(tr('notify_no_products'), 'warning');

  const modal = document.getElementById('barcodePrintModal');
  if (!modal) return;
  const list = document.getElementById('barcodeProductList');
  let html = '';
  state.products.forEach(p => {
    html += '<label style="display:flex;align-items:center;gap:8px;padding:8px;border-bottom:1px solid #e9eef2;cursor:pointer">' +
      '<input type="checkbox" class="barcode-product-cb" value="' + p.id + '" checked>' +
      '<span><b>' + escapeHTML(p.name) + '</b> — ' + escapeHTML(p.barcode || 'بدون باركود') + '</span></label>';
  });
  list.innerHTML = html;
  modal.style.display = 'flex';
}

function closeBarcodePrintModal() {
  const modal = document.getElementById('barcodePrintModal');
  if (modal) modal.style.display = 'none';
}

function barcodeSelectAll(checked) {
  document.querySelectorAll('.barcode-product-cb').forEach(cb => { cb.checked = checked; });
}

async function printBarcodeLabels() {
  const copies = parseInt(document.getElementById('barcodeCopies').value) || 1;
  const size = document.getElementById('barcodeSize').value || 'medium';
  const type = document.getElementById('barcodeType').value || 'qr';

  const selectedIds = Array.from(document.querySelectorAll('.barcode-product-cb:checked')).map(cb => cb.value);
  if (!selectedIds.length) return showNotification(tr('notify_select_one_product'), 'warning');

  const selectedProducts = state.products.filter(p => selectedIds.includes(p.id));
  const totalLabels = selectedProducts.length * copies;
  if (totalLabels > 300) {
    if (!confirm('عدد الملصقات كبير (' + totalLabels + ' ملصق). هل تريد المتابعة؟')) return;
  }

  closeBarcodePrintModal();

  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) return showNotification('يرجى السماح بالنوافذ المنبثقة للطباعة', 'warning');

  let labelsHtml = '';

  for (const prod of selectedProducts) {
    const rawBarcode = prod.barcode ? prod.barcode.trim() : prod.id;
    let code128Svg = '';
    let qrDataUrl = '';

    if (type === 'code128' || type === 'both') {
      const container = document.createElement('div');
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      container.appendChild(svg);
      try {
        JsBarcode(svg, rawBarcode, { format: 'CODE128', width: 2, height: 40, displayValue: true, fontSize: 12 });
        code128Svg = svg.outerHTML;
      } catch (e) {
        code128Svg = '<span>' + escapeHTML(rawBarcode) + '</span>';
      }
    }

    if (type === 'qr' || type === 'both') {
      try {
        qrDataUrl = await QRCode.toDataURL(rawBarcode, { width: 100, margin: 1 });
      } catch (e) {
        qrDataUrl = '';
      }
    }

    for (let i = 0; i < copies; i++) {
      labelsHtml += '<div class="barcode-label">';
      labelsHtml += '<div class="label-name">' + escapeHTML(prod.name) + '</div>';
      labelsHtml += '<div class="label-price">' + prod.price + ' ' + escapeHTML(state.storeSettings.currency || 'ج.م') + '</div>';

      if (type === 'code128') {
        labelsHtml += '<div class="barcode-render">' + code128Svg + '</div>';
      } else if (type === 'qr') {
        if (qrDataUrl) labelsHtml += '<img src="' + qrDataUrl + '" alt="QR">';
      } else if (type === 'both') {
        labelsHtml += '<div class="both-render">';
        if (qrDataUrl) labelsHtml += '<img src="' + qrDataUrl + '" alt="QR">';
        labelsHtml += '<div class="barcode-render">' + code128Svg + '</div>';
        labelsHtml += '</div>';
      }
      labelsHtml += '</div>';
    }
  }

  const cssUrl = new URL('style.css', location.href).href;

  printWindow.document.write(
    '<!DOCTYPE html><html lang="' + (currentLang === 'ar' ? 'ar' : 'en') + '" dir="' + (currentLang === 'ar' ? 'rtl' : 'ltr') + '">' +
    '<head><meta charset="UTF-8"><title>' + (currentLang === 'en' ? 'Barcode Labels' : 'ملصقات الباركود') + '</title>' +
    '<link rel="stylesheet" href="' + cssUrl + '">' +
    '<style>body{margin:0;padding:10px;background:#fff}@media print{body{padding:0}@page{margin:8mm}}</style></head>' +
    '<body><div class="barcode-sheet size-' + size + '">' + labelsHtml + '</div>' +
    '<script>window.onload=function(){setTimeout(function(){window.print()},300)};<\/script>' +
    '</body></html>'
  );
  printWindow.document.close();
}

/* ============ تقرير المصروفات التفصيلي ============ */
function openExpensesDetailReport() {
  const modal = document.getElementById('expensesReportModal');
  if (modal) {
    setExpenseReportPeriod('currentMonth');
    modal.style.display = 'flex';
  }
}

function closeExpensesReportModal() {
  const modal = document.getElementById('expensesReportModal');
  if (modal) modal.style.display = 'none';
}

function setExpenseReportPeriod(period) {
  const end = today();
  const d = new Date(end + 'T12:00:00');
  let from = '';
  if (period === 'today') from = end;
  if (period === 'week') { d.setDate(d.getDate() - 6); from = d.toISOString().slice(0, 10); }
  if (period === 'month') { d.setDate(d.getDate() - 29); from = d.toISOString().slice(0, 10); }
  if (period === 'currentMonth') {
    const now = new Date();
    from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  }
  if (period === 'year') {
    const now = new Date();
    from = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
  }
  document.getElementById('expReportFrom').value = from;
  document.getElementById('expReportTo').value = period === 'all' ? '' : end;
}

function printExpensesDetail() {
  closeExpensesReportModal();
  window.print();
}

/* ============ مقارنة الفترات ============ */
function onCompareTypeChange() {
  const type = document.getElementById('compareType').value;
  const customDiv = document.getElementById('compareCustomPeriods');
  if (customDiv) customDiv.style.display = (type === 'custom') ? 'block' : 'none';
}

function getCompareRanges() {
  const type = document.getElementById('compareType').value;
  const now = new Date();
  if (type === 'monthVsPrev') {
    const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    return {
      labelA: 'الشهر الحالي', labelB: 'الشهر السابق',
      fromA: currentStart.toISOString().slice(0, 10), toA: now.toISOString().slice(0, 10),
      fromB: prevStart.toISOString().slice(0, 10), toB: prevEnd.toISOString().slice(0, 10)
    };
  }
  if (type === 'monthVsYear') {
    const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearAgoStart = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    const yearAgoEnd = new Date(now.getFullYear() - 1, now.getMonth() + 1, 0);
    return {
      labelA: 'الشهر الحالي', labelB: 'نفس الشهر (سنة سابقة)',
      fromA: currentStart.toISOString().slice(0, 10), toA: now.toISOString().slice(0, 10),
      fromB: yearAgoStart.toISOString().slice(0, 10), toB: yearAgoEnd.toISOString().slice(0, 10)
    };
  }
  return {
    labelA: 'الفترة الأولى', labelB: 'الفترة الثانية',
    fromA: document.getElementById('compareAFrom').value, toA: document.getElementById('compareATo').value,
    fromB: document.getElementById('compareBFrom').value, toB: document.getElementById('compareBTo').value
  };
}

function calcPeriodStats(from, to) {
  const sales = filterByPeriod(state.sales, 'date', from, to);
  const expenses = filterByPeriod(state.expenses, 'date', from, to);
  const totalSales = sales.reduce((sum, s) => sum + s.total, 0);
  let totalCost = 0;
  sales.forEach(s => s.items.forEach(i => totalCost += (i.cost || 0) * i.qty));
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  return { totalSales, netProfit: totalSales - totalCost - totalExpenses, count: sales.length };
}

function renderComparison() {
  const ranges = getCompareRanges();
  const statsA = calcPeriodStats(ranges.fromA, ranges.toA);
  const statsB = calcPeriodStats(ranges.fromB, ranges.toB);
  const cur = state.storeSettings.currency;

  const container = document.getElementById('compareResult');
  if (!container) return;

  const diffSales = statsA.totalSales - statsB.totalSales;
  const pctSales = statsB.totalSales > 0 ? (diffSales / statsB.totalSales) * 100 : 0;

  const diffCount = statsA.count - statsB.count;
  const pctCount = statsB.count > 0 ? (diffCount / statsB.count) * 100 : 0;

  const diffProfit = statsA.netProfit - statsB.netProfit;
  const pctProfit = statsB.netProfit > 0 ? (diffProfit / statsB.netProfit) * 100 : 0;

  function getDeltaClass(diff) {
    if (diff > 0) return 'delta-up';
    if (diff < 0) return 'delta-down';
    return 'delta-flat';
  }

  function formatPct(pct) {
    return (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%';
  }

  const dict = translations[currentLang] || translations.ar;
  const titleText = (dict.compare_title || 'نتائج المقارنة').replace(/^[^\w\u0600-\u06FF]+/, '').trim();

  container.innerHTML =
    '<div class="card mt-20">' +
      '<h3>📋 ' + escapeHTML(titleText) + '</h3>' +
      '<div class="table-wrap">' +
        '<table class="data-table compare-table">' +
          '<thead><tr>' +
            '<th>المؤشر</th>' +
            '<th>' + escapeHTML(ranges.labelA) + '</th>' +
            '<th>' + escapeHTML(ranges.labelB) + '</th>' +
            '<th>الفرق</th>' +
            '<th>النسبة</th>' +
          '</tr></thead>' +
          '<tbody>' +
            '<tr>' +
              '<td class="label-cell"><b>المبيعات</b></td>' +
              '<td>' + statsA.totalSales.toFixed(2) + ' ' + cur + '</td>' +
              '<td>' + statsB.totalSales.toFixed(2) + ' ' + cur + '</td>' +
              '<td class="' + getDeltaClass(diffSales) + '">' + diffSales.toFixed(2) + ' ' + cur + '</td>' +
              '<td class="' + getDeltaClass(diffSales) + '">' + formatPct(pctSales) + '</td>' +
            '</tr>' +
            '<tr>' +
              '<td class="label-cell"><b>عدد الفواتير</b></td>' +
              '<td>' + statsA.count + '</td>' +
              '<td>' + statsB.count + '</td>' +
              '<td class="' + getDeltaClass(diffCount) + '">' + diffCount + '</td>' +
              '<td class="' + getDeltaClass(diffCount) + '">' + formatPct(pctCount) + '</td>' +
            '</tr>' +
            '<tr>' +
              '<td class="label-cell"><b>صافي الربح</b></td>' +
              '<td>' + statsA.netProfit.toFixed(2) + ' ' + cur + '</td>' +
              '<td>' + statsB.netProfit.toFixed(2) + ' ' + cur + '</td>' +
              '<td class="' + getDeltaClass(diffProfit) + '">' + diffProfit.toFixed(2) + ' ' + cur + '</td>' +
              '<td class="' + getDeltaClass(diffProfit) + '">' + formatPct(pctProfit) + '</td>' +
            '</tr>' +
          '</tbody>' +
        '</table>' +
      '</div>' +
      '<div class="compare-summary mt-15" style="padding:12px;background:#f0f6f7;border-radius:8px;font-size:13px">' +
        '<b>ملخص المقارنة:</b> أظهرت الفترة الأولى (' + escapeHTML(ranges.labelA) + ') ' +
        '<span class="' + getDeltaClass(diffSales) + '">' + (diffSales >= 0 ? 'ارتفاعاً' : 'انخفاضاً') + '</span>' +
        ' في المبيعات بنسبة ' + Math.abs(pctSales).toFixed(1) + '% مقارنة بـ (' + escapeHTML(ranges.labelB) + ').' +
      '</div>' +
    '</div>';
}

function printComparisonReport() { window.print(); }
function printReportSummary() { window.print(); }

/* ============ إدارة الموظفين (Edge Function) ============ */
async function inviteStaff() {
  const email = document.getElementById('staffEmail').value.trim();
  if (!email) return showNotification('أدخل إيميل الموظف', 'error');

  const defaultPassword = '123456';

  showLoading('جارٍ إنشاء الحساب...');
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

    alert(`تم إنشاء الحساب بنجاح!\n\nأعطِ هذه البيانات للموظف ليدخل بها:\n\nالإيميل: ${email}\nالباسورد: ${defaultPassword}\n\n(ينصح بتغيير الباسورد بعد الدخول)`);
    
    document.getElementById('staffEmail').value = '';
    loadStaffList();
  } catch (e) {
    showNotification('تعذر إنشاء الحساب: ' + (e.message || ''), 'error');
  } finally {
    hideLoading();
  }
}
async function loadStaffList() {
  const container = document.getElementById('staffList');
  if (!container) return;

  try {
    const { data, error } = await supabaseClient
      .from('shop_user_roles')
      .select('user_id, role, owner_id, email') 
      .eq('owner_id', state.currentUser.id);

    if (error) throw error;

    if (!data || data.length === 0) {
      container.innerHTML = '<p class="text-muted">لا يوجد موظفين مسجلين حتى الآن.</p>';
      return;
    }

    let html = '<div class="table-wrap"><table class="data-table"><thead><tr><th>إيميل الموظف</th><th>الرتبة</th></tr></thead><tbody>';
    
    data.forEach(staff => {
      html += '<tr>' +
        '<td><b>' + (staff.email || staff.user_id) + '</b></td>' +
        '<td><span class="badge" style="background:#e0e0e0; padding:4px 8px; border-radius:4px;">' + staff.role + '</span></td>' +
        '</tr>';
    });
    
    html += '</tbody></table></div>';
    container.innerHTML = html;

  } catch (e) {
    container.innerHTML = '<p class="text-red">تعذر تحميل قائمة الموظفين.</p>';
    console.error(e);
  }
}
