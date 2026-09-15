# إعداد GitHub Actions — LifeOS

تم استبدال الـ workflow القديم بثلاثة workflows منفصلة حتى لا تختلط نسخة الاختبار مع نسخة الإنتاج.

## 1) CI — `.github/workflows/ci.yml`

يعمل عند كل Push أو Pull Request إلى `main` / `master`:

- تثبيت dependencies.
- تشغيل كل اختبارات LifeOS عبر `npm run test:all`.
- بناء Vite production bundle.
- رفع `dist/` كـ artifact لمدة 7 أيام.

إذا كان `package-lock.json` موجودًا يستخدم `npm ci`. إذا لم يكن موجودًا يستخدم `npm install` مؤقتًا.

## 2) Test APK — `.github/workflows/main.yml`

يعمل عند Push إلى `main` / `master` أو يدويًا:

- يشغل كامل الاختبارات.
- يبني تطبيق الويب.
- ينشئ Android wrapper بواسطة Capacitor.
- يفعّل `VITE_LIFEOS_PRO_PREVIEW=true`.
- يستخدم AdMob Test Mode.
- يبني `LifeOS-Test.apk`.
- يتحقق من SHA-1 الخاص بالتوقيع.
- يرفع APK كـ artifact.
- يحدث Release ثابت باسم `lifeos-mobile-latest`.

### Secret مطلوب لنسخة الاختبار

`LIFEOS_DEBUG_KEYSTORE_BASE64`

وهو نفس الـ stable debug keystore المستخدم سابقًا حتى لا تتغير بصمة Google Sign-In.

## 3) Production Release — `.github/workflows/android-release.yml`

هذه النسخة منفصلة كليًا عن Test APK.

تعمل تلقائيًا عند إنشاء Tag بالشكل:

```text
v1.0.0
v1.1.0
v2.0.3
```

أو يمكن تشغيلها يدويًا من GitHub Actions مع تحديد `version_name` و`version_code`.

الإنتاج يستخدم:

- `VITE_LIFEOS_PRO_PREVIEW=false`
- AdMob production mode فقط.
- Release keystore حقيقي.
- `assembleRelease` لبناء APK.
- `bundleRelease` لبناء AAB الخاص بـ Google Play.
- التحقق من توقيع APK وAAB.
- SHA-256 checksums.
- رفع APK + AAB كـ artifacts.
- عند البناء من Tag ينشئ GitHub Release تلقائيًا.

## GitHub Secrets المطلوبة للإنتاج

أضفها في:

`Repository → Settings → Secrets and variables → Actions`

### خدمات التطبيق

```text
VITE_GOOGLE_WEB_CLIENT_ID
VITE_REVENUECAT_ANDROID_API_KEY
ADMOB_ANDROID_APP_ID
VITE_ADMOB_REWARDED_AD_UNIT_ID
```

### Release signing

```text
ANDROID_RELEASE_KEYSTORE_BASE64
ANDROID_RELEASE_STORE_PASSWORD
ANDROID_RELEASE_KEY_ALIAS
ANDROID_RELEASE_KEY_PASSWORD
```

**لا ترفع ملف `.jks` إلى GitHub.** خزّنه فقط كـ Base64 داخل GitHub Secret.

مثال لإنشاء Base64 محليًا:

### Windows PowerShell

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("lifeos-release.jks")) | Set-Clipboard
```

### macOS / Linux

```bash
base64 -w 0 lifeos-release.jks
```

وفي macOS إذا لم يدعم `-w`:

```bash
base64 lifeos-release.jks | tr -d '\n'
```

## طريقة إصدار نسخة Google Play

بعد ضبط Secrets:

```bash
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actions سيبني تلقائيًا:

```text
LifeOS-1.0.0-release.apk
LifeOS-1.0.0-release.aab
LifeOS-1.0.0-SHA256.txt
```

ملف `.aab` هو الملف المخصص للرفع إلى Google Play Console.

## Version code

عند استخدام Tag مثل `v1.4.2` يتم توليد versionCode تلقائيًا كالتالي:

```text
1 * 1,000,000 + 4 * 1,000 + 2 = 1,004,002
```

أما التشغيل اليدوي فيطلب `version_code` صراحة حتى تستطيع ضمان أنه أعلى من النسخة الموجودة في Google Play.

## ملاحظة حول package-lock.json

المشروع الحالي لا يحتوي `package-lock.json`. الـ workflows الجديدة تعمل رغم ذلك باستخدام `npm install`، لكن الأفضل لاحقًا إنشاء ورفع `package-lock.json` حتى تصبح dependency installs قابلة لإعادة الإنتاج بالكامل؛ عند وجوده ستتحول الـ workflows تلقائيًا إلى `npm ci`.

## Google Sign-In في نسخة Release

بعد أول Production Build، افتح Summary الخاص بالـWorkflow وخذ **Release certificate SHA-1** وأضفه إلى إعداد Android OAuth/Firebase/Google Cloud الخاص بـ `com.lifeos.app` إذا لم يكن مسجلًا مسبقًا. نسخة Test تستخدم SHA-1 مختلف عن Release.
