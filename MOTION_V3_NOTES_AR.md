# LifeOS Motion V3 — Mobile UX

## الإضافات الرئيسية

- **Pull-to-refresh** على واجهة التطبيق مع مقاومة سحب، مؤشر دوران، حالة نجاح، وHaptic feedback.
- **Swipe navigation** أفقي بين أقسام التنقل الرئيسية على الموبايل، مع منع السحب داخل الحقول والنوافذ الحساسة.
- **Bottom Sheets** للنماذج على الموبايل: سحب للأسفل للإغلاق، backdrop متحرك، safe-area support، وEscape على الأجهزة المناسبة.
- **Swipe actions للمهام**: سحب باتجاه الإنجاز، وسحب بالاتجاه الآخر لفتح تأكيد الحذف بدل الحذف المباشر.
- **Haptic feedback** خفيف وآمن باستخدام Vibration API عند توفرها، وبدون إضافة Native dependency جديدة.
- **Animated Empty States** مشتركة للمهام والعادات والأهداف والمالية، مع حركة هادئة واحترام Reduce Motion.
- **Habit detail transition**: صفحة تفاصيل العادة أصبحت Bottom Sheet متحركة وقابلة للسحب للإغلاق.
- الحفاظ على **prefers-reduced-motion** وعلى سلوك سطح المكتب الحالي.

## الأمان وتجربة الاستخدام

- السحب الأفقي لا يبدأ من input / textarea / select / dialogs.
- حذف المهمة بالسحب لا يتم مباشرة؛ يتم فتح تأكيد الحذف الموجود أصلًا.
- Haptics enhancement فقط: إذا الجهاز لا يدعم Vibration API فلا يحدث خطأ.
- Pull-to-refresh يعمل فقط عند أعلى منطقة التمرير.

## الاختبارات

تم تشغيل كامل مجموعة الاختبارات باستخدام:

`node --experimental-strip-types --test tests/*.test.mjs`

النتيجة النهائية:

**281 / 281 tests passed**

كما أضيفت اختبارات Motion V3 الخاصة بالسحب، Pull-to-refresh، Bottom Sheets، Haptics، وEmpty States.


## ملاحظة البناء

تمت محاولة `npm install --ignore-scripts --no-audit --no-fund` للتحقق من Production Build، لكن تثبيت الاعتماديات تجاوز مهلة بيئة التنفيذ. لذلك الاختبارات المصدرية مكتملة وناجحة، بينما `vite build` النهائي غير مثبت داخل هذه البيئة.
