import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAgentContext, domainsForAgentMode } from '../src/app/agent/context-builder.ts';

test('semantic modes receive the full core LifeOS picture when entity meaning may cross domains', () => {
  assert.deepEqual(domainsForAgentMode('smart_add'), ['tasks', 'habits', 'goals', 'events']);
  assert.deepEqual(domainsForAgentMode('day_plan'), ['tasks', 'habits', 'goals', 'events']);
  assert.deepEqual(domainsForAgentMode('what_now'), ['tasks', 'habits', 'goals', 'events']);
  assert.deepEqual(domainsForAgentMode('reschedule'), ['tasks', 'habits', 'goals', 'events']);
});

test('goal planning also sees events so it can avoid schedule conflicts', () => {
  const context = buildAgentContext({
    message: 'ساعدني أخطط لهدفي', mode: 'goal_plan', timezone: 'Asia/Damascus', now: '2026-09-11T12:00:00+03:00',
    snapshot: {
      goals: [{ id: 'g1', title: 'رياضة' }],
      tasks: [{ id: 't1', title: 'عمل' }],
      habits: [{ id: 'h1', name: 'مشي' }],
      events: [{ id: 'e1', title: 'موعد' }],
    },
  });
  assert.deepEqual(context.domains, ['goals', 'tasks', 'habits', 'events']);
  assert.ok(context.data.events?.length);
});

test('chat mode no longer narrows context from keywords before semantic classification', () => {
  const context = buildAgentContext({
    message: 'ضيفلي مهمة', mode: 'chat', timezone: 'Asia/Damascus', now: '2026-09-11T12:00:00+03:00',
    snapshot: { tasks: [], habits: [], goals: [], events: [] },
  });
  assert.deepEqual(context.domains, ['tasks', 'habits', 'goals', 'events']);
});
