# LifeOS — UI/UX V1

هذه المرحلة مبنية مباشرة فوق **Motion V4** وتركّز على تحسين التصميم وتجربة الاستخدام، مع الحفاظ على الحركات والإيماءات الموجودة وعدم تغيير منطق البيانات أو الـBackend.

## ما تم تحسينه

### 1) نظام بصري موحّد
- إضافة `LifeOSPrimitives.tsx` كمجموعة مكونات مشتركة للواجهة:
  - `PageHero`
  - `MetricTile`
  - `SectionHeading`
- إضافة Design Tokens وCSS surfaces مشتركة داخل `theme.css`:
  - Page hero
  - Metric cards
  - Panels
  - Toolbars
  - Controls
  - Segmented filters
  - Progress surfaces
  - List cards
- دعم Light/Dark Mode مع نفس الهوية الحالية للتطبيق.

### 2) Home / Mobile Dashboard
- تحسين التسلسل البصري للبطاقة الرئيسية.
- إضافة Progress Ring واضح لتقدم اليوم.
- الحفاظ على Progress animation الموجود سابقًا.
- إضافة بطاقة **"التالي اليوم"** التي تعرض أول مهمة غير مكتملة اليوم وتنتقل مباشرة لقسم المهام.
- تحسين Summary cells وإظهار عدد العادات المطلوبة اليوم بدل إجمالي العادات.
- تحسين عناوين الأقسام باستخدام `SectionHeading` موحّد.
- تحسين شكل بطاقات الوصول السريع وكل الأقسام مع surfaces أهدأ وأكثر وضوحًا.

### 3) Tasks
- تحويل رأس الصفحة إلى Hero واضح يحتوي:
  - عنوان ووصف اليوم.
  - عدد مهام اليوم.
  - عدد المهام عالية الأولوية.
  - زر مهمة جديدة كـPrimary CTA واضح.
- إعادة تنظيم الإحصائيات إلى 4 مؤشرات مفيدة:
  - المتبقي اليوم.
  - مكتملة اليوم.
  - فائتة اليوم.
  - نسبة الإنجاز.
- إضافة بطاقة **تركيز اليوم** بدل تكرار الأرقام فقط.
- تحسين Search / Filter / Sort داخل Toolbar موحّد.
- تحويل Tabs إلى Segmented Control مع active indicator متحرك.
- تحسين شكل Task cards والمسافات والـshadow بدون إزالة swipe/long-press/quick actions.
- تحسين حالة التحميل بصريًا بدل spinner معزول.

### 4) Habits
- رأس صفحة موحّد مع رسالة أوضح حول الاستمرارية.
- عرض عدد العادات المطلوبة اليوم وأطول streak مباشرة.
- توحيد الإحصائيات باستخدام نفس MetricTile الخاص بالمهام.
- تحسين Search / filters / custom category actions.
- تحويل Tabs إلى Segmented Control متحرك.
- تحسين Habit cards مع الحفاظ على shared transitions وquick actions.
- تحسين loading state.

### 5) Mobile Navigation
- تحويل Bottom Navigation من شريط جامد بعرض الشاشة إلى Floating navigation surface.
- زيادة الفصل البصري بين محتوى الشاشة والتنقل.
- الحفاظ على active shared indicator والحركات والهزات Haptics.
- زيادة مساحة المحتوى السفلية لمنع تداخل القوائم مع الـfloating nav.

## الاختبارات
- كامل اختبارات LifeOS بعد UI/UX V1: **292 / 292 ناجحة**.
- Motion V1–V4 + UI/UX V1 regression tests ناجحة.
- تم فحص TSX بحثًا عن parse/syntax errors ولم تظهر أخطاء parsing.
- لم يتم إثبات Vite production build داخل البيئة لأن `node_modules` غير مثبتة؛ تشخيصات TypeScript الناتجة كانت missing dependencies وليست أخطاء syntax في التعديلات.

## نطاق المرحلة التالية المقترح
UI/UX V2:
- Goals
- Finance
- AI / LifeOS Intelligence
- Events
- Account / Settings
- توحيد Forms وempty states وdetail screens عبر كل التطبيق.
