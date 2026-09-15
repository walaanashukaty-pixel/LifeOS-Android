# LifeOS Motion V4 — Polish

هذه النسخة مبنية فوق Motion V3 وتركز على صقل تجربة الاستخدام بدل زيادة الحركة بشكل عشوائي.

## ما تمت إضافته

### 1) Header يتفاعل مع السكرول
- يصغر ارتفاع الـHeader على الموبايل بعد بدء التمرير.
- يظهر ظل أعمق وخلفية أوضح عند التمرير.
- Subtitle في Home يختفي بحركة خفيفة عند التصغير.
- شريط تقدم رفيع أعلى المحتوى يوضح موضع المستخدم داخل الصفحة.

### 2) Shared Element Transitions
- بطاقات العادات تستخدم `layoutId` مشترك مع شاشة تفاصيل العادة.
- بطاقات المهام والعادات والأهداف تستخدم `layoutId` مشترك مع نافذة التعديل على الموبايل.
- الانتقال أصبح مترابطًا بصريًا بين العنصر الذي ضغط عليه المستخدم والواجهة التي تفتح منه.

### 3) Long Press + Quick Actions
- تمت إضافة Hook موحد للضغط المطوّل مع إلغاء تلقائي عند تحريك الإصبع.
- الضغط المطوّل على المهمة يفتح إجراءات: إنجاز، لم تُنجز، تعديل، حذف.
- الضغط المطوّل على العادة يفتح: التفاصيل، إنجاز اليوم، المفضلة، تعديل، حذف.
- Quick Actions تظهر كـBottom Sheet وتسحب للأسفل للإغلاق.
- يوجد Haptic Feedback عند فتح وتنفيذ الإجراء.

### 4) Swipe أكثر ذكاءً للمهام
- خلفية الإنجاز والحذف لم تعد ثابتة.
- قوة ظهور كل Action تتغير تدريجيًا بحسب مقدار السحب.
- تم تفعيل Direction Lock وإيقاف Momentum لمنع السحب غير المقصود.

### 5) Notification Center Premium
- فتح وإغلاق متحرك باستخدام spring.
- على الموبايل أصبح Bottom Sheet قابلًا للسحب للأسفل.
- على Desktop يبقى Popup بدون سحب.
- عناصر الإشعارات تدخل بتتابع Stagger.
- جرس الإشعارات يعطي حركة خفيفة عند وجود عناصر غير مقروءة.
- Haptic feedback عند فتح إشعار أو قراءة الكل.

### 6) Toast Polish
- Toasts أصبحت ذات حواف أنعم، blur، shadow، وحدود متناسقة مع Light/Dark Mode.
- تمت إضافة Close button ومدة موحدة للحالات العادية.

### 7) Accessibility / Reduced Motion
- الميزات الجديدة تستمر باحترام `prefers-reduced-motion`.
- تم إيقاف smooth scrolling القسري للمستخدمين الذين يفضلون تقليل الحركة.

## الملفات الرئيسية الجديدة
- `src/app/components/ui/QuickActionSheet.tsx`
- `src/app/components/ui/useLongPress.ts`
- `tests/motion-v4.test.mjs`

## الملفات الرئيسية المعدلة
- `src/app/components/Layout.tsx`
- `src/app/components/NotificationCenter.tsx`
- `src/app/components/TasksPage.tsx`
- `src/app/components/HabitsPage.tsx`
- `src/app/components/GoalsPage.tsx`
- `src/app/components/ui/FormModal.tsx`
- `src/app/App.tsx`
- `src/styles/theme.css`

## الاختبارات
- Motion V1–V4 tests: 22/22 ناجحة.
- كامل Test Suite: 287/287 ناجحة.
- تم إجراء فحص TypeScript parsing للملفات المعدلة ولم تظهر Syntax/JSX parse errors.
- محاولة `npm install` لتشغيل Production Vite Build تجاوزت مهلة بيئة التنفيذ، لذلك لا يتم ادعاء نجاح production build من داخل هذه البيئة.
