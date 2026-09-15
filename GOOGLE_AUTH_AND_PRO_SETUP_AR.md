# إعداد Google المباشر وLifeOS Pro

## تسجيل Google على Android

الكود يستخدم تسجيل Google المباشر داخل Android ثم يرسل Google ID Token إلى Supabase.

### المطلوب مرة واحدة من Google
1. أنشئ OAuth Client من نوع **Web application**. هذا الـClient يُستخدم كـ Server/Web Client ID للتحقق من ID Token، وليس لأن التطبيق Web.
2. أنشئ OAuth Client من نوع **Android** بالقيم التالية:
   - Package name: `com.lifeos.app`
   - SHA-1: بصمة مفتاح توقيع التطبيق.
3. في Supabase: Authentication → Providers → Google، فعّل Google وضع Web Client ID وClient Secret.
4. في GitHub: Settings → Secrets and variables → Actions، أنشئ secret باسم:

`VITE_GOOGLE_WEB_CLIENT_ID`

وقيمته هي Web Client ID فقط (ينتهي عادةً بـ `.apps.googleusercontent.com`). لا تضع Client Secret داخل التطبيق.

> عند نشر التطبيق على Google Play، أضف أيضًا SHA-1 الخاص بـ Play App Signing كـ Android OAuth client/credential حسب إعداد مشروع Google.

## LifeOS Pro

نستخدم Google Play Billing بواسطة RevenueCat.

1. أنشئ التطبيق في Google Play بنفس Package ID: `com.lifeos.app`.
2. أنشئ اشتراك `lifeos_pro` وخطة شهرية/سنوية.
3. في RevenueCat أنشئ entitlement اسمه `pro` واربط منتجات Google Play به.
4. في GitHub أضف secret باسم `VITE_REVENUECAT_ANDROID_API_KEY` وقيمته Public Android SDK Key من RevenueCat.

## أمان
- لا تضع Google Client Secret داخل الكود أو APK.
- لا تضع RevenueCat Secret API Key داخل التطبيق.
- مفاتيح Vite هنا مفاتيح عامة للعميل فقط.

---

## توقيع Android ثابت لنسخ GitHub التجريبية

تم تحديث Workflow ليستخدم GitHub Secret باسم `LIFEOS_DEBUG_KEYSTORE_BASE64` بدلاً من مفتاح Debug عشوائي. البصمة الثابتة المسجلة لهذا المفتاح هي:

`EB:93:BC:15:53:13:12:07:0A:72:8B:B2:F9:53:47:3F:ED:2B:B5:DB`

راجع `STABLE_ANDROID_SIGNING_AR.md` لخطوات الإعداد. لا تضع ملف المفتاح نفسه داخل المستودع.
