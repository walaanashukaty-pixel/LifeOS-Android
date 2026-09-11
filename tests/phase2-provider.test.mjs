import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeAgentMode,
  assertActionsAllowedForMode,
  parseServerPresentation,
  modeInstruction,
} from '../supabase/functions/lifeos-agent/phase2-policy.ts';
import { parseProviderEnvelope, callLifeOSProvider } from '../supabase/functions/lifeos-agent/provider.ts';

test('server defaults missing mode to chat and rejects unknown explicit modes', () => {
  assert.equal(normalizeAgentMode(undefined), 'chat');
  assert.equal(normalizeAgentMode(null), 'chat');
  assert.equal(normalizeAgentMode('smart_add'), 'smart_add');
  assert.throws(() => normalizeAgentMode('mystery'), /mode/i);
});

test('server enforces read-only and minimum-write policies per Phase 2 mode', () => {
  for (const mode of ['what_now', 'morning_brief']) {
    assert.doesNotThrow(() => assertActionsAllowedForMode(mode, []));
    assert.throws(() => assertActionsAllowedForMode(mode, [{ type: 'CreateTask' }]), /not allowed|read-only/i);
  }
  assert.doesNotThrow(() => assertActionsAllowedForMode('day_plan', [{ type: 'UpdateTask' }]));
  assert.throws(() => assertActionsAllowedForMode('day_plan', [{ type: 'CreateTask' }]), /not allowed/i);
  assert.doesNotThrow(() => assertActionsAllowedForMode('smart_add', [{ type: 'CreateTask' }, { type: 'CreateHabit' }, { type: 'CreateGoal' }]));
  assert.throws(() => assertActionsAllowedForMode('smart_add', [{ type: 'UpdateTask' }]), /not allowed/i);
  assert.doesNotThrow(() => assertActionsAllowedForMode('goal_plan', [{ type: 'CreateGoal' }, { type: 'CreateTask' }, { type: 'CreateHabit' }]));
  assert.throws(() => assertActionsAllowedForMode('goal_plan', [{ type: 'UpdateEvent' }]), /not allowed/i);
  assert.doesNotThrow(() => assertActionsAllowedForMode('reschedule', [{ type: 'UpdateTask' }, { type: 'UpdateEvent' }]));
  assert.throws(() => assertActionsAllowedForMode('reschedule', [{ type: 'CreateEvent' }]), /not allowed/i);
});

test('chat mode may return a structured presentation selected by semantic intent', () => {
  const result = parseServerPresentation({
    kind: 'day_plan', title: 'خطة اليوم', sections: [{ heading: 'الصباح', items: [{ title: 'التقرير', time: '09:00' }] }], warnings: [],
  }, 'chat');
  assert.equal(result?.kind, 'day_plan');
});

test('server presentation is required for explicit structured mode and capped', () => {
  assert.throws(() => parseServerPresentation(null, 'day_plan'), /presentation/i);
  const result = parseServerPresentation({
    kind: 'morning_brief', title: 'صباحك', summary: 'يوم هادئ',
    sections: [{ heading: 'الأولوية', items: [{ title: 'التقرير', time: '09:00' }] }], warnings: [],
  }, 'morning_brief');
  assert.equal(result?.kind, 'morning_brief');
  assert.throws(() => parseServerPresentation({ kind: 'morning_brief', title: 'x', sections: [], warnings: Array(6).fill('x') }, 'morning_brief'), /warnings/i);
});

test('provider envelope rejects write actions from read-only intents/modes', () => {
  assert.throws(() => parseProviderEnvelope(JSON.stringify({
    intent: 'what_now', reply: 'الخطوة الآن', clarification: null,
    presentation: { kind: 'what_now', title: 'الخطوة الآن', sections: [{ heading: 'الآن', items: [{ title: 'راجع التقرير' }] }], warnings: [] },
    actions: [{ type: 'CreateTask', payload: { title: 'غير مسموح' } }],
  }), 'what_now'), /not allowed|compatible|read-only/i);
});

test('provider accepts Smart Add event proposal with semantic intent', () => {
  const parsed = parseProviderEnvelope(JSON.stringify({
    intent: 'create_event', reply: 'فهمت عليك', clarification: null,
    presentation: {
      kind: 'smart_add', title: 'إضافة مقترحة', summary: 'موعد جديد',
      sections: [{ heading: 'المقترح', items: [{ title: 'موعد الطبيب', time: '16:00' }] }], warnings: [],
    },
    actions: [{ type: 'CreateEvent', payload: { title: 'موعد الطبيب', date: '2026-09-15', time: '16:00' } }],
  }), 'smart_add');
  assert.equal(parsed.intent, 'create_event');
  assert.equal(parsed.actions[0].type, 'CreateEvent');
});

test('mode instructions demand real-data reasoning', () => {
  assert.match(modeInstruction('day_plan'), /real supplied|existing records/i);
  assert.match(modeInstruction('what_now'), /next event|preferred energy/i);
  assert.match(modeInstruction('goal_plan'), /existing goal|duplicate/i);
  assert.match(modeInstruction('reschedule'), /before\/after|real overdue/i);
  assert.match(modeInstruction('morning_brief'), /real LifeOS data|real/i);
  assert.match(modeInstruction('chat'), /semantic/i);
});

test('provider request includes conversation history and selected mode instruction', async () => {
  let requestBody;
  const fetchImpl = async (_url, init) => {
    requestBody = JSON.parse(init.body);
    return {
      ok: true,
      async json() {
        return { choices: [{ message: { content: JSON.stringify({
          intent: 'what_now', reply: 'الآن', clarification: null,
          presentation: { kind: 'what_now', title: 'شو تعمل هلا', sections: [{ heading: 'الآن', items: [{ title: 'راجع التقرير' }] }], warnings: [] },
          actions: [],
        }) } }] };
      },
    };
  };
  const result = await callLifeOSProvider({
    endpoint: 'https://provider.invalid', apiKey: 'secret', model: 'model',
    message: 'شو أعمل هلا؟', context: {}, history: [{ role: 'user', content: 'عندي تقرير اليوم' }], mode: 'what_now', fetchImpl,
  });
  assert.match(requestBody.messages[0].content, /preferred energy|next event/i);
  const requestPayload = JSON.parse(requestBody.messages[1].content);
  assert.equal(requestPayload.conversationHistory[0].content, 'عندي تقرير اليوم');
  assert.equal(result.presentation?.kind, 'what_now');
});
