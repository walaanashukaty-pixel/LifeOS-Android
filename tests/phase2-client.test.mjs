import test from 'node:test';
import assert from 'node:assert/strict';
import { invokeAgentTurnCore } from '../src/app/agent/agent-client-core.ts';

test('Phase 2 client sends mode and parses structured presentation', async () => {
  let body;
  const result = await invokeAgentTurnCore(async (name, options) => {
    assert.equal(name, 'lifeos-agent');
    body = options.body;
    return {
      data: {
        conversationId: 'c1',
        reply: 'ابدأ بالمهمة الأولى.',
        clarification: null,
        actions: [],
        presentation: {
          kind: 'what_now',
          title: 'أفضل خطوة الآن',
          sections: [{ heading: 'هلا', items: [{ title: 'إنهاء التقرير', badge: '30 دقيقة' }] }],
          warnings: [],
        },
      },
      error: null,
    };
  }, {
    message: 'شو أعمل هلا؟',
    mode: 'what_now',
    timezone: 'Asia/Riyadh',
    now: '2026-09-10T08:00:00Z',
    context: { tasks: [] },
  });

  assert.equal(body.mode, 'what_now');
  assert.equal(result.presentation?.kind, 'what_now');
  assert.equal(result.presentation?.sections[0].items[0].title, 'إنهاء التقرير');
});

test('Phase 2 client fails closed when server presentation kind mismatches requested mode', async () => {
  await assert.rejects(
    invokeAgentTurnCore(async () => ({
      data: {
        conversationId: 'c1', reply: 'x', clarification: null, actions: [],
        presentation: { kind: 'day_plan', title: 'خطة', sections: [], warnings: [] },
      },
      error: null,
    }), {
      message: 'شو أعمل هلا؟', mode: 'what_now', timezone: 'UTC', now: '2026-09-10T08:00:00Z', context: {},
    }),
    /INVALID_PRESENTATION|presentation kind/i,
  );
});

test('existing chat turns remain compatible when no presentation is returned', async () => {
  const result = await invokeAgentTurnCore(async () => ({
    data: { conversationId: 'c2', reply: 'تمام', clarification: null, actions: [] }, error: null,
  }), {
    message: 'ضيفلي مهمة', timezone: 'UTC', now: '2026-09-10T08:00:00Z', context: {},
  });
  assert.equal(result.presentation, null);
});
