# ربط LifeOS بـ OpenAI API

تم تجهيز `lifeos-agent` لاستخدام OpenAI Responses API مباشرة:

- Endpoint: `https://api.openai.com/v1/responses`
- المفتاح السري المطلوب على Supabase: `OPENAI_API_KEY`
- النموذج الافتراضي: `gpt-5.6-terra`
- يمكن تغيير النموذج لاحقًا عبر `LIFEOS_AI_MODEL`.

## الأمان

لا يوضع مفتاح OpenAI داخل React أو APK أو GitHub. يبقى سرًا على Backend فقط.

## بعد إضافة المفتاح

أعد نشر `lifeos-agent` إذا لزم، ثم اختبر:

- `عندي موعد دكتور بعد أسبوع وبدي أدرس`
- `رتبلي يومي`
- `شو أعمل هلا؟`

الـAgent يجب أن يقترح ولا ينفذ أي تعديل قبل موافقة المستخدم.

## التخزين الآمن للمفتاح

يمكن تخزين المفتاح باسم `lifeos.openai_api_key` داخل Supabase Vault. الدالة `public.lifeos_get_openai_api_key()` متاحة فقط لـ `service_role` وتُستخدم من Edge Function إذا لم يوجد `OPENAI_API_KEY` كـ environment secret.
