import test from 'node:test';
import assert from 'node:assert/strict';
import { hasActiveEntitlement, fetchRevenueCatPro } from '../supabase/functions/lifeos-agent/revenuecat.ts';
import { parseProviderEnvelope } from '../supabase/functions/lifeos-agent/provider.ts';

test('RevenueCat entitlement with future expiry is active and past expiry is not', () => {
  const now = new Date('2026-09-10T10:00:00Z');
  assert.equal(hasActiveEntitlement({ subscriber: { entitlements: { pro: { expires_date: '2026-10-10T10:00:00Z' } } } }, 'pro', now), true);
  assert.equal(hasActiveEntitlement({ subscriber: { entitlements: { pro: { expires_date: '2026-08-10T10:00:00Z' } } } }, 'pro', now), false);
});

test('RevenueCat lifetime entitlement with null expiry is active', () => {
  assert.equal(hasActiveEntitlement({ subscriber: { entitlements: { pro: { expires_date: null } } } }, 'pro', new Date()), true);
});

test('server RevenueCat lookup uses bearer secret and encoded app user id', async () => {
  let seen;
  const fakeFetch = async (url, options) => {
    seen = { url: String(url), options };
    return new Response(JSON.stringify({ subscriber: { entitlements: { pro: { expires_date: null } } } }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const result = await fetchRevenueCatPro({ userId: 'user/1', apiKey: 'sk_test', fetchImpl: fakeFetch });
  assert.equal(result.active, true);
  assert.match(seen.url, /user%2F1$/);
  assert.equal(seen.options.headers.Authorization, 'Bearer sk_test');
});

test('provider envelope requires semantic intent and accepts a compatible typed action', () => {
  const parsed = parseProviderEnvelope(JSON.stringify({
    intent: 'create_task',
    reply: 'رح أضيف المهمة بعد موافقتك.',
    actions: [{ type: 'CreateTask', payload: { title: 'شراء هدية' } }],
  }));
  assert.equal(parsed.intent, 'create_task');
  assert.equal(parsed.actions[0].type, 'CreateTask');
});

test('provider prevents task-default behavior for read-only/general intents', () => {
  assert.throws(() => parseProviderEnvelope(JSON.stringify({
    intent: 'general_conversation', reply: 'أهلًا', actions: [{ type: 'CreateTask', payload: { title: 'أهلًا' } }],
  })), /intent|compatible/i);
  assert.throws(() => parseProviderEnvelope(JSON.stringify({
    intent: 'schedule_question', reply: 'بكرا عندك موعد', actions: [{ type: 'CreateTask', payload: { title: 'موعد' } }],
  })), /intent|compatible/i);
});

test('provider rejects actions missing required LifeOS fields before persistence', () => {
  assert.throws(() => parseProviderEnvelope(JSON.stringify({
    intent: 'create_task', reply: 'مقترح',
    actions: [{ type: 'CreateTask', payload: { description: 'بدون عنوان' } }],
  })), /title/i);
  assert.throws(() => parseProviderEnvelope(JSON.stringify({
    intent: 'create_event', reply: 'مقترح',
    actions: [{ type: 'CreateEvent', payload: { title: 'موعد', date: 'tomorrow' } }],
  })), /date/i);
});

test('provider limits the number of actions in one turn', () => {
  const actions = Array.from({ length: 9 }, (_, i) => ({ type: 'CreateTask', payload: { title: `مهمة ${i}` } }));
  assert.throws(() => parseProviderEnvelope(JSON.stringify({ intent: 'multi_entity', reply: 'كثير', actions })), /too many/i);
});

test('provider uses recurrence-aware LifeOS field contracts and rejects unknown keys', () => {
  const parsed = parseProviderEnvelope(JSON.stringify({
    intent: 'create_habit', reply: 'مقترح',
    actions: [{ type: 'CreateHabit', payload: { name: 'رياضة', startDate: '2026-09-11', recurrence: 'weekdays', repeatDays: [1, 3, 5], recurrenceEndDate: '2026-10-11' } }],
  }));
  assert.deepEqual(parsed.actions[0].payload.repeatDays, [1, 3, 5]);
  assert.throws(() => parseProviderEnvelope(JSON.stringify({
    intent: 'create_task', reply: 'مقترح',
    actions: [{ type: 'CreateTask', payload: { title: 'مراجعة', date: '2026-09-11', userId: 'x' } }],
  })), /unsupported|field/i);
});
