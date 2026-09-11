# LifeOS Pro AI Intelligence Rework

هذه النسخة تعدّل نظام LifeOS Agent الموجود ولا تنشئ بنية AI ثانية.

## ما تم إصلاحه

- إضافة طبقة Intent Classification دلالية تميز المحادثة العامة، المهام، العادات، المواعيد، الأهداف، التخطيط اليومي، What Now، إعادة الجدولة، أسئلة الجدول وطلبات البيانات متعددة الكيانات.
- منع التحويل التلقائي لأي جملة إلى Task على مستوى الـprompt وعلى مستوى validation البرمجي.
- Chat يرسل Snapshot أساسي حقيقي للمهام والعادات والأهداف والمواعيد، ثم يقرر السيرفر الدومين المناسب دلاليًا.
- إضافة سجل المحادثة الفعلي إلى الـprovider لفهم المراجع والمتابعات مثل: «هاي المهمة»، «خليها للمسا»، «أجلها».
- Plan My Day يعتمد على بيانات LifeOS الحقيقية ولا ينشئ filler tasks؛ يمكنه اقتراح UpdateTask للمهمات الموجودة فقط.
- What Now أصبح read-only ويعطي توصية مبررة من الوضع الحقيقي، بدون حالة «بدأنا» وهمية.
- Smart Rescheduling يقترح UpdateTask / UpdateEvent على سجلات حقيقية وبـIDs موجودة في السياق، مع validation إضافي في السيرفر.
- Goal → Plan يفحص الهدف الموجود أولاً لتجنب الهدف المكرر.
- Morning Brief يعتمد على بيانات اليوم الفعلية وبدون filler تحفيزي عام.
- Smart Add يميز Task/Habit/Event/Goal ويسأل توضيحًا إذا كان القصد مبهمًا.
- دعم recurrence / repeatDays / recurrenceEndDate في سياق الـAgent.
- السماح للمحادثة الطبيعية أن تتحول تلقائيًا إلى Day Plan / What Now / Goal Plan / Reschedule presentation حسب النية، بدل الاعتماد على الزر وحده.
- إزالة كل الردود والخطط والإجراءات الوهمية من pro-preview.ts؛ معاينة Pro الآن واجهة فقط.
- إعادة تصميم LifeOS Intelligence كطبقة واحدة متماسكة بدل مجموعة أزرار منفصلة، وتقليل Home إلى أهم 4 اختصارات AI فقط.
- الحفاظ على مسار Proposal → Validation → Preview → Confirmation → Existing LifeOS API → Reminder sync → Undo.

## Supabase

تم نشر `lifeos-agent` على مشروع LifeOS كـ Version 7 وحالته ACTIVE.

## الاختبارات

- Agent: 120/120
- Phase2: 34/34
- Pro P0: 30/30
- Pro P1: 15/15
- Pro P2: 10/10
- Mobile: 21/21
- Recurrence: 12/12
- Auth: 14/14
- Ads: 51/51
- Cloud/Data: 11/11
- سيناريوهات AI الواقعية الجديدة: 12/12 (ضمن Agent suite)

## ملاحظة build

لم يتم تشغيل Vite production build محليًا لأن مجلد node_modules غير موجود في النسخة المستخرجة وVite غير مثبت في بيئة التنفيذ. GitHub Action في المشروع يبقى مسؤولًا عن production build النهائي عند الرفع.
