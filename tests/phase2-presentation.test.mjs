import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAgentPresentation } from '../src/app/agent/agent-presentation.ts';

test('presentation parser accepts a compact structured LifeOS day plan', () => {
  const value = parseAgentPresentation({
    kind: 'day_plan',
    title: 'خطة اليوم',
    summary: 'ابدأ بالمهمة الأعلى أولوية.',
    sections: [
      { heading: 'الصباح', items: [{ title: 'إنهاء التقرير', time: '09:00', badge: 'أولوية عالية' }] },
    ],
    warnings: ['عندك موعد الساعة 14:00'],
  }, 'day_plan');

  assert.equal(value?.kind, 'day_plan');
  assert.equal(value?.sections[0].items[0].time, '09:00');
});

test('presentation parser rejects mismatched mode and oversized structures', () => {
  assert.throws(() => parseAgentPresentation({ kind: 'what_now', title: 'الآن', sections: [] }, 'day_plan'), /kind/i);
  assert.throws(() => parseAgentPresentation({
    kind: 'day_plan',
    title: 'خطة',
    sections: Array.from({ length: 7 }, (_, i) => ({ heading: `h${i}`, items: [] })),
  }, 'day_plan'), /sections/i);
  assert.throws(() => parseAgentPresentation({
    kind: 'day_plan',
    title: 'خطة',
    sections: [{ heading: 'x', items: Array.from({ length: 9 }, (_, i) => ({ title: `i${i}` })) }],
  }, 'day_plan'), /items/i);
});

test('presentation parser treats null as no structured card', () => {
  assert.equal(parseAgentPresentation(null), null);
  assert.equal(parseAgentPresentation(undefined), null);
});
