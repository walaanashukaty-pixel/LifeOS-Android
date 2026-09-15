import test from 'node:test';
import assert from 'node:assert/strict';
import { syncAgentRemindersAfterExecution, syncAgentRemindersAfterUndo } from '../src/app/agent/agent-reminders.ts';

function adapter(calls) {
  return {
    scheduleTask: async (userId, item) => calls.push(['scheduleTask', userId, item]),
    scheduleHabit: async (userId, item) => calls.push(['scheduleHabit', userId, item]),
    scheduleEvent: async (userId, item) => calls.push(['scheduleEvent', userId, item]),
    cancelEntity: async (userId, type, id) => calls.push(['cancelEntity', userId, type, id]),
  };
}

test('agent creation/update keeps current reminder system in sync', async () => {
  const calls = [];
  const action = { id: 'a1', type: 'CreateEvent', status: 'executed', risk: 'medium', payload: { title: 'دكتور', date: '2026-09-11', time: '16:00' }, result: { id: 'e1', title: 'دكتور', date: '2026-09-11', time: '16:00' }, undo: null };
  await syncAgentRemindersAfterExecution('u1', action, adapter(calls));
  assert.deepEqual(calls, [['scheduleEvent', 'u1', action.result]]);
});

test('undo of an agent-created record cancels native reminders for that record', async () => {
  const calls = [];
  const action = { id: 'a2', type: 'CreateTask', status: 'undone', risk: 'medium', payload: { title: 'T' }, result: { id: 't1', title: 'T' }, undo: { method: 'DELETE', path: '/tasks/t1' } };
  await syncAgentRemindersAfterUndo('u1', action, adapter(calls));
  assert.deepEqual(calls, [['cancelEntity', 'u1', 'task', 't1']]);
});

test('undo of an update restores reminder scheduling from previous values', async () => {
  const calls = [];
  const action = { id: 'a3', type: 'UpdateTask', status: 'undone', risk: 'medium', payload: { id: 't1', reminderTime: '18:00' }, previous: { title: 'Old', startDate: '2026-09-10', reminderTime: '09:00' }, result: {}, undo: { method: 'PUT', path: '/tasks/t1', body: {} } };
  await syncAgentRemindersAfterUndo('u1', action, adapter(calls));
  assert.deepEqual(calls, [['scheduleTask', 'u1', { id: 't1', title: 'Old', startDate: '2026-09-10', reminderTime: '09:00' }]]);
});
