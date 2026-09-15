# إصلاح GitHub Android SDK — على نسخة GITHUB-READY(1)

تم تطبيق هذا الإصلاح مباشرة على النسخة التي رجعت إليها:
`LifeOS-Android-GITHUB-READY(1).zip`

## سبب الخطأ

كان كل من:

- `.github/workflows/main.yml`
- `.github/workflows/android-release.yml`

يستخدم:

```yaml
uses: android-actions/setup-android@v3
```

وكان Action يحاول تثبيت Android SDK package قديمة باسم `tools`، فتفشل خطوة
`Set up Android SDK` قبل الوصول إلى تثبيت Android 36.

## الإصلاح

أصبح الإعداد:

```yaml
uses: android-actions/setup-android@v4
with:
  packages: ''
```

ثم تثبيت الحزم المطلوبة فقط صراحة:

```bash
sdkmanager "platform-tools" "platforms;android-36" "build-tools;36.0.0"
```

كما تم تحديث Java Action من `actions/setup-java@v4` إلى `actions/setup-java@v6`.

## حماية من رجوع الخطأ

تمت إضافة:
`tests/github-android-sdk-workflow.test.mjs`

وتم ربطه مع `npm run test:qa`.

## الرفع إلى GitHub

تم أيضًا الإبقاء على `UPLOAD_TO_GITHUB.bat` بنسخة Safe Sync حتى لا يرجع خطأ
`fetch first` عند وجود commits أحدث على GitHub. لا يستخدم Force Push.

