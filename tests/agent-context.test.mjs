import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAgentContext, inferContextDomains } from '../src/app/agent/context-builder.ts';

const snapshot = {
  tasks: [{ id: 't1', title: 'تقرير' }],
  habits: [{ id: 'h1', name: 'مشي' }],
  goals: [{ id: 'g1', title: 'تركي B1' }],
  events: [{ id: 'e1', title: 'دكتور' }],
};

test('planning request includes core planning domains', () => {
  assert.deepEqual(inferContextDomains('رتبلي يومي'), ['tasks', 'habits', 'goals', 'events']);
});

test('ordinary chat still sends the full core snapshot so semantic intent can choose the right entity', () => {
  const context = buildAgentContext({ message: 'ضيفلي مهمة أشتري هدية', timezone: 'Asia/Damascus', now: '2026-09-10T12:00:00+03:00', snapshot });
  assert.deepEqual(Object.keys(context.data), ['tasks', 'habits', 'goals', 'events']);
  assert.equal(context.data.tasks.length, 1);
  assert.equal(context.data.habits.length, 1);
  assert.equal(context.data.goals.length, 1);
  assert.equal(context.data.events.length, 1);
});

test('context builder strips unrelated fields before sending LifeOS data to AI', () => {
  const context = buildAgentContext({
    message: 'رتبلي يومي',
    timezone: 'Europe/Istanbul',
    now: '2026-09-10T10:00:00Z',
    snapshot: {
      tasks: [{ id: 't1', title: 'مهمة', description: 'تفاصيل', priority: 'high', secretNote: 'لا ترسلني', completions: [{ date: '2026-09-10', status: 'completed' }] }],
      habits: [{ id: 'h1', name: 'مشي', time: '18:00', internalDebug: 'drop' }],
      goals: [{ id: 'g1', title: 'هدف', progress: 40, privateBlob: { huge: true } }],
      events: [{ id: 'e1', title: 'موعد', date: '2026-09-10', time: '14:00', rawAttachment: 'drop' }],
    },
  });
  assert.equal(context.data.tasks?.[0]?.secretNote, undefined);
  assert.equal(context.data.habits?.[0]?.internalDebug, undefined);
  assert.equal(context.data.goals?.[0]?.privateBlob, undefined);
  assert.equal(context.data.events?.[0]?.rawAttachment, undefined);
  assert.equal(context.data.tasks?.[0]?.title, 'مهمة');
});

test('context builder preserves the current LifeOS scheduling fields', () => {
  const context = buildAgentContext({
    message: 'رتبلي يومي', timezone: 'Asia/Damascus', now: '2026-09-10T12:00:00+03:00',
    snapshot: {
      tasks: [{ id: 't1', title: 'T', startDate: '2026-09-10', endDate: '', reminderTime: '09:00', category: 'عمل', priority: 'high', recurrence: 'weekdays', repeatDays: [1, 3], recurrenceEndDate: '2026-10-01' }],
      habits: [{ id: 'h1', name: 'H', startDate: '2026-09-01', reminderTime: '18:00', dailyGoal: '20 دقيقة', recurrence: 'daily' }],
      goals: [{ id: 'g1', title: 'G', type: 'short', startDate: '2026-09-01', deadline: '2026-10-01', progress: 25 }],
      events: [{ id: 'e1', title: 'E', date: '2026-09-10', time: '16:00', type: 'موعد', location: 'X', notes: 'N', reminder: '30', recurrence: 'monthly' }],
    },
  });
  assert.equal(context.data.tasks?.[0].startDate, '2026-09-10');
  assert.deepEqual(context.data.tasks?.[0].repeatDays, [1, 3]);
  assert.equal(context.data.tasks?.[0].recurrenceEndDate, '2026-10-01');
  assert.equal(context.data.habits?.[0].dailyGoal, '20 دقيقة');
  assert.equal(context.data.goals?.[0].type, 'short');
  assert.equal(context.data.events?.[0].location, 'X');
  assert.equal(context.data.events?.[0].recurrence, 'monthly');
});
