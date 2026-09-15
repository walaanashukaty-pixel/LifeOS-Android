# LifeOS — GitHub Workflow Fix

تم تحديث إعداد GitHub بالكامل فوق نسخة **Product Polish & QA V2**.

## ما الذي تغير؟

- تم تحويل `.github/workflows/main.yml` إلى Workflow حديث لنسخة **Test APK** مع الحفاظ على توافق اختبارات المشروع القديمة.
- تمت إضافة `.github/workflows/ci.yml` للـ Push / Pull Request واختبارات المشروع وبناء Vite.
- تمت إضافة `.github/workflows/android-release.yml` لإنتاج **Signed APK + Signed AAB**.
- نسخة Test تستخدم `VITE_LIFEOS_PRO_PREVIEW=true` وAdMob Test Mode.
- نسخة Production تفرض `VITE_LIFEOS_PRO_PREVIEW=false` وترفض البناء إذا كانت Secrets الإنتاج ناقصة.
- Production Release يعمل من tags بالشكل `v1.0.0` أو يدويًا من Actions.
- تمت إضافة Android `versionName` و`versionCode` للإصدار.
- تمت إضافة Release Keystore حقيقي منفصل عن Debug Keystore.
- يتم التحقق من شهادة توقيع APK ومن توقيع AAB.
- تمت إضافة SHA-256 checksums للملفات الناتجة.
- تمت إضافة npm وGradle caching.
- عند وجود `package-lock.json` مستقبلًا يستخدم Workflow `npm ci` تلقائيًا، وإلا يستخدم `npm install`.
- تمت إضافة `npm run test:all` إلى `package.json`.
- تم تحديث `UPLOAD_TO_GITHUB.bat`: لم يعد يحذف `.git` ولا يعمل `git push --force`.
- Test GitHub Release `lifeos-mobile-latest` يتم إعادة إنشائه ليشير دائمًا إلى آخر commit فعلي.

راجع `GITHUB_ACTIONS_SETUP_AR.md` لمعرفة جميع Secrets وطريقة إصدار AAB لـGoogle Play.
