# LifeOS — Product Polish & QA V1

هذه النسخة مبنية فوق UI/UX V4 وتحافظ على Motion V1–V4 وUI/UX V1–V4.

## ما تم إصلاحه

- تحسين هوية Android/Web shell: لغة عربية RTL، عنوان ووصف LifeOS حقيقيان، `viewport-fit=cover` و`theme-color` ودعم safe areas.
- حماية أفضل من تداخل Android keyboard مع Bottom Navigation؛ الشريط السفلي يختفي أثناء الكتابة ويعود بعدها.
- إضافة مؤشر Offline واضح على مستوى التطبيق مع `aria-live` بدل فشل الحفظ بدون تفسير.
- تحسين Pull-to-refresh لمنع تفعيله بالخطأ أثناء السحب الأفقي، مع حالة مسموعة لقارئات الشاشة.
- تحسين Bottom Sheets وQuick Actions: Escape، focus trap، استعادة focus بعد الإغلاق، و`aria-labelledby`.
- إضافة App Error Boundary لمنع الشاشة البيضاء عند crash غير متوقع مع شاشة Recovery وإعادة تحميل آمنة.
- تحسين touch targets لأزرار الأيقونات الشائعة (تعديل/حذف/تنقل) مع labels أوضح.
- تحسين switches في الإعدادات إلى `role="switch"` و`aria-checked` مع مساحة لمس أكبر.
- تحسين signup عند Supabase email confirmation: لا يتم فتح التطبيق بجلسة غير صالحة؛ يعود المستخدم لتسجيل الدخول برسالة تأكيد واضحة.
- تحسين حقول Auth للموبايل: required، حدود طول، `enterKeyHint`، وقيود كلمة المرور.
- حماية Document Vault من الملفات غير المدعومة أو الأكبر من 20 MB على الواجهة والسيرفر مع فتح الروابط بـ`noopener,noreferrer`.
- تحسين Focus Visible، منع zoom غير المرغوب للحقول على iOS/Android WebView، safe-area/overscroll، وتقوية `prefers-reduced-motion`.
- إضافة `test:qa` وربطه بـGitHub Actions.

## الاختبارات

- كامل الاختبارات: **319 / 319 ناجحة**.
- اختبارات Product Polish & QA V1 الجديدة: **8 / 8 ناجحة**.
- فحص TypeScript parser على ملفات TS/TSX لم يظهر أخطاء parsing/syntax.
- توجد diagnostics خاصة بحزم imports عند تشغيل `tsc --noResolve` لأن `node_modules` غير موجودة داخل بيئة الفحص؛ لذلك هذه النسخة لا تدّعي Production Vite build محليًا.

## ملاحظات للمرحلة التالية

QA V2 الأفضل يركز على تجربة الاستخدام الحقيقية شاشة-بشاشة: توحيد confirmations بدل `window.confirm`، حالات slow network/retry، validation أعمق للنماذج، Android back-button داخل modals/details، اختبار orientation/font scaling، واختبار APK فعلي على جهاز Android.
