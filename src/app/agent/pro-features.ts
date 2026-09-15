export type ProFeatureGroup = 'intelligence' | 'personalization' | 'freedom';

export interface ProFeature {
  id: string;
  title: string;
  description: string;
  group: ProFeatureGroup;
}

export const PRO_FEATURES: ProFeature[] = [
  { id: 'lifeos-personal', title: '🧠 LifeOS الشخصي', description: 'يتعلم تفضيلاتك وطريقة تنظيمك ويستخدمها لتحسين اقتراحاته.', group: 'personalization' },
  { id: 'plan-my-day', title: '✨ رتّب لي يومي', description: 'يحلل مهامك، عاداتك، مواعيدك وأهدافك ويقترح أفضل خطة لليوم.', group: 'intelligence' },
  { id: 'goal-to-plan', title: '🎯 حوّل هدفي إلى خطة', description: 'اكتب هدفك وسيحوّله LifeOS إلى مراحل ومهام وعادات ومواعيد.', group: 'intelligence' },
  { id: 'lifeos-ai', title: '💬 تحدث مع LifeOS', description: 'احكِ ما تريد القيام به بلغة طبيعية، ودعه يحوّل كلامك إلى عناصر حقيقية داخل التطبيق.', group: 'intelligence' },
  { id: 'proactive-help', title: '🔔 مساعد استباقي', description: 'ينبهك عندما تحتاج خطتك إلى تعديل أو عندما يكون هناك شيء مهم.', group: 'personalization' },
  { id: 'smart-review', title: '📊 مراجعة ذكية', description: 'تحليل يومي وأسبوعي يشرح ما الذي نجح، وما الذي تعثر، ولماذا.', group: 'personalization' },
  { id: 'what-now', title: '⚡ ماذا أفعل الآن؟', description: 'اقتراح ذكي لأفضل خطوة يمكنك القيام بها في هذه اللحظة.', group: 'intelligence' },
  { id: 'smart-add', title: 'الإضافة الذكية', description: 'اكتب طلبك بطريقتك وLifeOS يحوّله إلى مهمة أو عادة أو موعد بعد موافقتك.', group: 'intelligence' },
  { id: 'smart-rescheduling', title: 'إعادة جدولة ذكية', description: 'يقترح أقل تغييرات ممكنة لحل التعارضات وتأجيل المهام المتأخرة بعد موافقتك.', group: 'intelligence' },
  { id: 'morning-brief', title: 'ملخص الصباح', description: 'أهم ما يحتاج انتباهك اليوم في ملخص قصير وواضح.', group: 'personalization' },
  { id: 'unlimited', title: '♾️ استخدام Pro', description: 'حدود أعلى أو غير محدودة حسب نظام الاشتراك الحالي.', group: 'freedom' },
  { id: 'no-rewarded-ads', title: '🚫 بدون إعلانات مكافئة', description: 'المزايا التي كانت تحتاج مشاهدة إعلان في Free تصبح متاحة مباشرة في Pro.', group: 'freedom' },
];

export function proFeatureGroups(): Record<ProFeatureGroup, ProFeature[]> {
  return {
    intelligence: PRO_FEATURES.filter(feature => feature.group === 'intelligence'),
    personalization: PRO_FEATURES.filter(feature => feature.group === 'personalization'),
    freedom: PRO_FEATURES.filter(feature => feature.group === 'freedom'),
  };
}
