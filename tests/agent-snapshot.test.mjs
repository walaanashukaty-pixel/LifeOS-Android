import test from 'node:test';
import assert from 'node:assert/strict';
import { loadScopedSnapshot, attachPreviousState } from '../src/app/agent/agent-snapshot.ts';

test('chat snapshot loads all core domains before semantic intent classification', async () => {
  const calls = [];
  const request = async path => { calls.push(path); return [{ id: '1' }]; };
  const snapshot = await loadScopedSnapshot('ضيفلي مهمة جديدة', request);
  assert.deepEqual(calls, ['/tasks', '/habits', '/goals', '/events']);
  assert.deepEqual(Object.keys(snapshot), ['tasks', 'habits', 'goals', 'events']);
});

test('update action is enriched with exact existing entity for undo', () => {
  const action = { id: 'a1', type: 'UpdateEvent', risk: 'medium', status: 'proposed', payload: { id: 'e1', title: 'موعد جديد' } };
  const enriched = attachPreviousState(action, { events: [{ id: 'e1', title: 'موعد قديم', date: '2026-09-10' }] });
  assert.deepEqual(enriched.previous, { title: 'موعد قديم', date: '2026-09-10' });
});

test('update action fails closed when referenced record is not in scoped snapshot', () => {
  assert.throws(() => attachPreviousState({
    id: 'a-missing',
    type: 'UpdateTask',
    status: 'proposed',
    risk: 'medium',
    payload: { id: 'task-not-owned', title: 'changed' },
  }, {
    tasks: [{ id: 'task-owned', title: 'mine' }],
  }), /not found in scoped LifeOS context/);
});

test('undo snapshot stores only fields needed to safely restore an update', () => {
  const action = attachPreviousState({
    id: 'a-safe', type: 'UpdateTask', status: 'proposed', risk: 'medium', payload: { id: 't1', title: 'new' },
  }, {
    tasks: [{ id: 't1', title: 'old', category: 'عمل', startDate: '2026-09-10', completions: [{ date: '2026-09-10', status: 'completed' }], userId: 'u1', secret: 'drop-me' }],
  });
  assert.deepEqual(action.previous, { title: 'old', category: 'عمل', startDate: '2026-09-10' });
});
