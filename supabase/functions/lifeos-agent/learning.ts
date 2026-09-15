import type { LifeOSRecentReflection } from './reflections.ts';

const HINT_BY_REASON: Record<string, string> = {
  'كانت الخطة كبيرة': 'خفف الخطة: فضّل عددًا أقل من الأولويات وخطوات أقصر وأسهل للتنفيذ.',
  'ما كان عندي وقت': 'قلل حمل اليوم واترك مساحات واقعية بين الالتزامات بدل ملء كل الوقت.',
  'كنت متعبة': 'راعِ الطاقة: ضع المهام الثقيلة في وقت الطاقة الأفضل واقترح مهامًا أخف عند التعب.',
  'نسيت': 'استخدم تذكيرات واضحة للعناصر المهمة عندما يكون ذلك مناسبًا، بدل افتراض أن المستخدم سيتذكر.',
  'حدث شيء طارئ': 'أضف هامشًا زمنيًا ومرونة أكبر في الخطط لأن الأيام الأخيرة شهدت طوارئ متكررة.',
};

export function deriveAdaptiveHints(reflections: LifeOSRecentReflection[]): string[] {
  const counts = new Map<string, number>();
  for (const reflection of reflections.slice(0, 14)) {
    const reason = String(reflection?.reason || '').trim();
    if (!reason || reason === 'سبب آخر') continue;
    counts.set(reason, (counts.get(reason) || 0) + 1);
  }

  return [...counts.entries()]
    .filter(([reason, count]) => count >= 2 && !!HINT_BY_REASON[reason])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([reason]) => HINT_BY_REASON[reason]);
}
