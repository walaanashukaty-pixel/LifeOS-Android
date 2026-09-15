# LifeOS — UI/UX V4 Final Polish

هذه النسخة مبنية فوق UI/UX V3 وتحافظ على Motion V1–V4 وكل العقود الوظيفية السابقة.

## ما الذي تغيّر؟

### 1) Analytics — Life Pulse
- تحويل صفحة التحليلات من تقرير تقني إلى لوحة Life Pulse.
- إضافة مؤشر Life Score مبسط يجمع تنفيذ المهام واستمرارية العادات وتقدم الأهداف.
- تنظيم المؤشرات الأساسية: تنفيذ المهام، استمرارية العادات، متوسط الأهداف، وساعات التمرين.
- إعادة تصميم اتجاهات الفئات والعادات والتمارين والأهداف والأذكار ضمن بطاقات Insight موحدة.
- إضافة progressbar semantics لتحسين قارئات الشاشة.
- الحفاظ على نفس مصادر البيانات الحالية: analytics/tasks/habits/workouts/dhikr/goals.

### 2) Future Vision — Vision Compass
- تحويل الصفحة من 3 textareas منفصلة إلى بوصلة رؤية مرتبطة زمنيًا.
- آفاق: سنة، 5 سنوات، 10 سنوات ضمن Timeline واضح.
- مؤشرات اكتمال ووضوح وعدد الكلمات وآخر تحديث.
- Sticky save state يوضح إن كانت هناك تغييرات غير محفوظة.
- Loading skeleton + Error state وإعادة محاولة.
- الحفاظ على GET/PUT /future كما هو.

### 3) Agreements — Commitment Ledger
- Hero وملخصات للالتزامات النشطة والمكتملة والمتأخرة والقريبة خلال 7 أيام.
- بحث وفلترة موحدان مع بقية LifeOS.
- بطاقات التزام توضح الموعد/التأخير بصريًا.
- Empty state موجه للمستخدم.
- الحفاظ على RewardCapacityBar وguardCreation وجميع CRUD APIs.

### 4) Login / Auth
- إعادة بناء شاشة الدخول كمدخل بصري كامل لهوية LifeOS.
- فصل قصة المنتج عن بطاقة الدخول على الشاشات الكبيرة، مع تجربة مركزة على الموبايل.
- تحسين autocomplete / inputMode / aria labels / tab semantics.
- توضيح خصوصية تسجيل الدخول عبر Google.
- الحفاظ على signIn/signUp/signInWithGoogle بدون تغيير تدفق المصادقة.

### 5) LifeOS Pro Paywall
- تحويل النافذة إلى accessible dialog حقيقي مع aria-modal.
- Motion entrance/exit وscroll locking.
- عرض فوائد Pro ضمن hierarchy أوضح.
- Free vs Pro example محفوظ بالكامل.
- اختيار الخطط باستخدام radiogroup وradio semantics.
- Sticky checkout على الموبايل يعرض الخطة والسعر المختارين.
- الأسعار ما تزال ديناميكية من RevenueCat/Google Play.
- استعادة المشتريات ومعاينة Pro بقيتا كما هما.

### 6) Universal error/accessibility polish
- إضافة ErrorState مشترك قابل لإعادة المحاولة.
- progressbars semantics في Analytics.
- ARIA dialog/radio/tab/live status في الأماكن الجديدة.
- احترام prefers-reduced-motion في V4.

## التحقق
- كامل الاختبارات: 311 / 311 ناجحة.
- اختبارات UI/UX + Motion الخاصة: ناجحة.
- فحص syntax/parse لـ 134 ملف TypeScript/TSX: 0 أخطاء.
- لم يتم إثبات Vite production build لأن node_modules غير موجودة ضمن بيئة الفحص الحالية.
