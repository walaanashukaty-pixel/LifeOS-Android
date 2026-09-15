# إصلاح Test Pro / LifeOS Agent

## المشكلة
نسخة الاختبار كانت تفتح واجهة Pro عبر `VITE_LIFEOS_PRO_PREVIEW=true`، لكن صفحة Agent كانت توقف الطلب محليًا وتعرض رسالة أن المعاينة لا تشغّل AI. وحتى لو أزيل هذا الحاجز، الخادم كان يطلب RevenueCat Pro حقيقي.

## الإصلاح
- أزيل الحاجز المحلي من `LifeOSAgentPage`.
- Test Pro يستخدم الآن `sendLifeOSAgentTurn` الحقيقي وبيانات LifeOS الحقيقية.
- أضيفت قائمة سماح خادمية `ai_preview_access` للمختبرين فقط.
- المستخدم العادي يبقى بحاجة إلى اشتراك RevenueCat Pro فعال.
- قائمة الاختبار لا يمكن فتحها من العميل، وهي محمية بـ RLS ورفض صريح للـ anon/authenticated.
- لا توجد ردود AI وهمية أو خطط hardcoded.

## النشر الحالي
`lifeos-agent` منشور على Supabase كنسخة v8.

## ملاحظة
ملف `supabase/qa_preview_access.sql` ينشئ البنية فقط ولا يحتوي أي User ID حقيقي داخل المستودع. إضافة مستخدم اختبار تتم على Supabase بشكل صريح.
