# LifeOS Mobile Stability Hotfix

تم تنفيذ هذه الجولة بناءً على اختبار الجهاز الفعلي، وتركز على الثبات قبل إضافة مؤثرات جديدة.

## 1. الكيبورد والكتابة
- إصلاح إعادة تشغيل focus-trap داخل `FormModal` مع كل حرف في controlled inputs.
- `onClose` أصبح محفوظًا في ref، لذلك الكتابة لا تعيد تهيئة النافذة ولا تسحب التركيز.
- عدم إجبار أول input على focus عند فتح الـBottom Sheet.
- تمرير الحقل المراد تحريره إلى منتصف الجزء المرئي عند ظهور الكيبورد.
- Android MainActivity يحصل على `windowSoftInputMode=adjustResize` أثناء GitHub build.

## 2. الشريط العلوي
- خفض الجزء المرئي إلى 44px + safe-area.
- وضع حد أقصى 24px للـsafe-area حتى لا يتمدد الشريط بسبب WebView/vendor inset غير طبيعي.
- إزالة السطر الثانوي من Header على الهاتف وإخفاء PRO badge الصغيرة من المقاسات الضيقة.
- الشريط لا يغيّر ارتفاعه أثناء السكرول؛ التغيير يصبح shadow فقط.

## 3. الأداء والحركة
- Goals لا تستخدم shared-layout calculations على الهاتف.
- بطاقات Goals على الهاتف أصبحت DOM عاديًا بدل motion layout لكل بطاقة.
- الإحصاءات وتجميع الأهداف أصبحت `useMemo` بدل إعادة الحساب عدة مرات في كل render.
- المحافظة على الحركة الكاملة على Desktop، وحركة خفيفة وسريعة للصفحات على الهاتف.

## 4. GitHub
- حذف `.github/workflows/ci.yml`.
- Push عادي إلى main/master يشغّل Android Test APK فقط.
- لا يوجد `lifeos-web-dist` artifact بعد الآن.
- Production release يبقى منفصلًا ويعمل فقط عند tag `vMAJOR.MINOR.PATCH` أو تشغيل يدوي.

## التحقق
- جميع ملفات الاختبارات: 341/341 ناجحة.
- Production Vite build غير مثبت محليًا لأن `node_modules` غير موجودة في بيئة الفحص؛ GitHub workflow ما زال يبني Vite كخطوة داخل بناء APK.
