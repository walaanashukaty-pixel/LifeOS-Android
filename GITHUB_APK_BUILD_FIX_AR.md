# إصلاح GitHub Actions لبناء LifeOS APK

تم إصلاح مرحلة إعداد Android التي كانت تتوقف عند `Set up Android SDK`.

## ما تم تغييره

- ترقية `android-actions/setup-android` من `v3` إلى `v4` المتوافق مع Node 24.
- تثبيت Android SDK 36 وBuild Tools 36.0.0 مباشرة ضمن خطوة الإعداد.
- تثبيت إصدار Android command-line tools بشكل صريح لتقليل مشاكل تغيّر GitHub runner.
- ترقية GitHub Actions الأساسية إلى الإصدارات الحديثة المتوافقة مع Node 24:
  - `actions/checkout@v7`
  - `actions/setup-node@v7`
  - `actions/setup-java@v6`
  - `actions/upload-artifact@v7`
- إضافة فحص مباشر بعد إعداد Android للتأكد من وجود SDK 36 و`apksigner` قبل متابعة الاختبارات والبناء.

## النتيجة المتوقعة

بعد رفع المشروع إلى GitHub، شغّل Workflow باسم `Build LifeOS APK`.
عند اكتمال البناء سيظهر Artifact باسم `LifeOS-Mobile-APK` ويحتوي على:

- `LifeOS-Mobile.apk`
- `LifeOS-SHA1.txt`

كما سيحاول الـWorkflow تحديث Release باسم `lifeos-mobile-latest`.

> ملاحظة: إذا كان Secret باسم `LIFEOS_DEBUG_KEYSTORE_BASE64` موجوداً فسيُستخدم كما في النسخة الأصلية ويحافظ على SHA-1 الثابت. وإذا لم يكن موجوداً فلن يتوقف البناء: سيُنشئ الـWorkflow مفتاح Debug مؤقتاً ويكمل إنشاء APK، لكن Google Sign-In يحتاج لاحقاً إلى مفتاح ثابت مسجّل في Google Cloud.
