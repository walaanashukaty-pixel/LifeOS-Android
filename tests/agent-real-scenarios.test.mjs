import test from 'node:test';
import assert from 'node:assert/strict';
import { LIFEOS_AGENT_SYSTEM_PROMPT, parseProviderEnvelope, callLifeOSProvider } from '../supabase/functions/lifeos-agent/provider.ts';

function envelope(intent, reply, actions = [], presentation = null, clarification = null) {
  return JSON.stringify({ intent, reply, clarification, presentation, actions });
}

function itemPresentation(kind, title) {
  return { kind, title, sections: [{ heading: 'المقترح', items: [{ title }] }], warnings: [] };
}

test('real scenario: reminder tomorrow is a task proposal, not a generic task fallback', () => {
  const parsed = parseProviderEnvelope(envelope('create_task', 'رح أعرضها عليك قبل الحفظ', [
    { type: 'CreateTask', payload: { title: 'إرسال الإيميل', startDate: '2026-09-12' } },
  ]), 'chat');
  assert.equal(parsed.intent, 'create_task');
  assert.equal(parsed.actions[0].type, 'CreateTask');
});

test('real scenario: daily reading is represented as a recurring habit', () => {
  const parsed = parseProviderEnvelope(envelope('create_habit', 'هاي عادة يومية مقترحة', [
    { type: 'CreateHabit', payload: { name: 'قراءة نصف ساعة', recurrence: 'daily', startDate: '2026-09-11' } },
  ]), 'chat');
  assert.equal(parsed.actions[0].type, 'CreateHabit');
  assert.equal(parsed.actions[0].payload.recurrence, 'daily');
});

test('real scenario: doctor appointment is an event', () => {
  const parsed = parseProviderEnvelope(envelope('create_event', 'هذا موعد، مو مهمة', [
    { type: 'CreateEvent', payload: { title: 'موعد الطبيب', date: '2026-09-17', time: '16:00' } },
  ]), 'chat');
  assert.equal(parsed.actions[0].type, 'CreateEvent');
});

test('real scenario: existing event update uses the real event id', () => {
  const parsed = parseProviderEnvelope(envelope('update_event', 'بغيّر الوقت بعد موافقتك', [
    { type: 'UpdateEvent', payload: { id: 'event-ahmad', time: '17:00' } },
  ]), 'chat');
  assert.equal(parsed.actions[0].payload.id, 'event-ahmad');
});

test('real scenario: completion uses CompleteTask and never creates another task', () => {
  const parsed = parseProviderEnvelope(envelope('complete_task', 'لقيت مهمة إرسال الإيميل', [
    { type: 'CompleteTask', payload: { id: 'task-email' } },
  ]), 'chat');
  assert.deepEqual(parsed.actions.map(a => a.type), ['CompleteTask']);
});

test('real scenario: day planning can be selected semantically from normal chat', () => {
  const parsed = parseProviderEnvelope(envelope('daily_planning', 'رتبت الموجود فعليًا، بدون اختراع مهام', [
    { type: 'UpdateTask', payload: { id: 'task-report', plannedTime: '09:30' } },
  ], itemPresentation('day_plan', 'خطة اليوم')), 'chat');
  assert.equal(parsed.presentation?.kind, 'day_plan');
  assert.deepEqual(parsed.actions.map(a => a.type), ['UpdateTask']);
});

test('real scenario: what-now remains read-only', () => {
  const parsed = parseProviderEnvelope(envelope('what_now', 'الأفضل الآن تكملي التقرير لأن موعدك بعد ساعة', [], itemPresentation('what_now', 'أفضل خطوة هلا')), 'chat');
  assert.equal(parsed.actions.length, 0);
});

test('real scenario: rescheduling proposes real updates only', () => {
  const parsed = parseProviderEnvelope(envelope('smart_rescheduling', 'هذا اقتراح قبل التطبيق', [
    { type: 'UpdateTask', payload: { id: 'task-late', startDate: '2026-09-12', plannedTime: '10:00' } },
  ], itemPresentation('reschedule', 'إعادة جدولة مقترحة')), 'chat');
  assert.deepEqual(parsed.actions.map(a => a.type), ['UpdateTask']);
});

test('real scenario: ambiguous workout request forces clarification and strips actions', () => {
  const parsed = parseProviderEnvelope(envelope(
    'multi_entity',
    'بدي أتأكد من قصدك',
    [{ type: 'CreateTask', payload: { title: 'رياضة' } }],
    null,
    'بدك أضيفها كعادة متكررة ولا كنشاط لمرة واحدة؟',
  ), 'chat');
  assert.equal(parsed.actions.length, 0);
  assert.match(parsed.clarification, /عادة|مرة واحدة/);
});

test('real scenario: read-only schedule question is blocked from mutating data', () => {
  assert.throws(() => parseProviderEnvelope(envelope('schedule_question', 'عندك بكرا موعد ومهمتين', [
    { type: 'CreateTask', payload: { title: 'خطأ' } },
  ]), 'chat'), /compatible with intent/i);
});

test('system prompt explicitly teaches all critical Arabic semantic examples', () => {
  assert.match(LIFEOS_AGENT_SYSTEM_PROMPT, /شو عندي بكرا/);
  assert.match(LIFEOS_AGENT_SYSTEM_PROMPT, /3 مرات بالأسبوع/);
  assert.match(LIFEOS_AGENT_SYSTEM_PROMPT, /موعد مع الطبيب|موعد الطبيب/);
  assert.match(LIFEOS_AGENT_SYSTEM_PROMPT, /هاي المهمة/);
  assert.match(LIFEOS_AGENT_SYSTEM_PROMPT, /Never convert every sentence into CreateTask/);
});

test('natural follow-up history is actually sent to the provider', async () => {
  let requestBody;
  const fakeFetch = async (_url, init) => {
    requestBody = JSON.parse(init.body);
    return {
      ok: true,
      async json() {
        return { choices: [{ message: { content: envelope('daily_planning', 'عدلت الخطة المقترحة', [], itemPresentation('day_plan', 'الخطة المعدلة')) } }] };
      },
    };
  };
  await callLifeOSProvider({
    endpoint: 'https://provider.invalid', apiKey: 'secret', model: 'model', mode: 'chat',
    message: 'خلي الرياضة بالليل', context: { tasks: [], habits: [], goals: [], events: [] },
    history: [
      { role: 'user', content: 'رتبلي يومي' },
      { role: 'assistant', content: 'هاي خطة اليوم', presentation: itemPresentation('day_plan', 'خطة اليوم') },
    ],
    fetchImpl: fakeFetch,
  });
  const payload = JSON.parse(requestBody.messages[1].content);
  assert.equal(payload.conversationHistory.length, 2);
  assert.equal(payload.conversationHistory[1].content, 'هاي خطة اليوم');
  assert.equal(payload.message, 'خلي الرياضة بالليل');
});
