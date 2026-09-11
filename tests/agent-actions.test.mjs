import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAgentAction } from '../src/app/agent/validate-action.ts';
import { defaultRiskForAction } from '../src/app/agent/agent-types.ts';

test('CreateTask requires a non-empty title', () => {
  const result = validateAgentAction({
    id: 'a1',
    type: 'CreateTask',
    status: 'proposed',
    risk: 'medium',
    payload: { title: '   ' },
  });
  assert.equal(result.valid, false);
  assert.match(result.issues.join(' '), /title/i);
});

test('CreateEvent rejects invalid ISO date', () => {
  const result = validateAgentAction({
    id: 'a2',
    type: 'CreateEvent',
    status: 'proposed',
    risk: 'medium',
    payload: { title: 'دكتور', date: 'next Tuesday', time: '16:00' },
  });
  assert.equal(result.valid, false);
  assert.match(result.issues.join(' '), /date/i);
});

test('default risk is high for destructive action and medium for creation', () => {
  assert.equal(defaultRiskForAction('DeleteTask'), 'high');
  assert.equal(defaultRiskForAction('CreateTask'), 'medium');
});

test('task actions use the real LifeOS task field names and reject unknown fields', () => {
  const ok = validateAgentAction({
    id: 'a3', type: 'CreateTask', status: 'proposed', risk: 'medium',
    payload: { title: 'مراجعة', startDate: '2026-09-11', reminderTime: '09:30', priority: 'high' },
  });
  assert.equal(ok.valid, true, ok.issues.join(', '));

  const bad = validateAgentAction({
    id: 'a4', type: 'CreateTask', status: 'proposed', risk: 'medium',
    payload: { title: 'مراجعة', date: '2026-09-11', userId: 'other-user' },
  });
  assert.equal(bad.valid, false);
  assert.match(bad.issues.join(' '), /unsupported|field/i);
});

test('habit and event actions accept current LifeOS form fields', () => {
  const habit = validateAgentAction({
    id: 'a5', type: 'CreateHabit', status: 'proposed', risk: 'medium',
    payload: { name: 'مشي', startDate: '2026-09-11', recurrence: 'daily', reminderTime: '18:00', dailyGoal: '30 دقيقة' },
  });
  assert.equal(habit.valid, true, habit.issues.join(', '));

  const event = validateAgentAction({
    id: 'a6', type: 'CreateEvent', status: 'proposed', risk: 'medium',
    payload: { title: 'دكتور', type: 'موعد', date: '2026-09-12', time: '16:00', location: 'العيادة', notes: 'أخذ التحاليل', reminder: '30' },
  });
  assert.equal(event.valid, true, event.issues.join(', '));
});
