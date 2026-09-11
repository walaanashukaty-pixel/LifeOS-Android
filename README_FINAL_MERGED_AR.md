# LifeOS — النسخة المدمجة النهائية للاختبار على GitHub

هذه نسخة **سورس كاملة** وليست Patch وليست APK معاد تغليفه.

تتضمن المشروع الأساسي كاملًا مع:
- Free الحالي بدون حذف الواجهات الأساسية.
- LifeOS Pro P0 + P1 + P2.
- LifeOS Agent وميزات Phase 1 + Phase 2.
- Pro Onboarding وPersonalization.
- Smart Add / Day Plan / What Now / Goal to Plan / Smart Rescheduling / Morning Brief.
- Daily Review / Weekly Review / Smart Notifications / Memory & Privacy Settings.
- Pro Dashboard / AI Analytics / Adaptive Learning.
- إصلاح تنفيذ الموافقة بحيث تكتب المهام محليًا عبر نفس LifeOS API.
- إصلاح تداخل مربع الإرسال على الموبايل.
- Pro Preview للاختبار.

## RevenueCat
GitHub Actions يستخدم `VITE_REVENUECAT_ANDROID_API_KEY` من GitHub Secrets إذا كان موجودًا.
إذا لم يكن موجودًا، تستخدم هذه نسخة الاختبار مفتاح RevenueCat Test Store كـ fallback.
عند النشر الإنتاجي على Google Play، أضيفي Public Android SDK key الذي يبدأ بـ `goog_` إلى GitHub Secret بنفس الاسم، وسيأخذ الأولوية تلقائيًا.

## الرفع
ارفعي **كل محتويات هذا المجلد إلى جذر مستودع LifeOS-Android** مع الحفاظ على `.github` وبقية المجلدات كما هي.
لا ترفعي ملف ZIP نفسه داخل المستودع.
