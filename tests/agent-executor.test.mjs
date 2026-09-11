import test from 'node:test';
import assert from 'node:assert/strict';
import { executeApprovedAction, undoExecutedAction } from '../src/app/agent/action-executor.ts';

function fakeApi() {
  const calls = [];
  return {
    calls,
    request: async (path, options = {}) => {
      calls.push({ path, method: options.method || 'GET', body: options.body ? JSON.parse(options.body) : undefined });
      if (path === '/tasks' && options.method === 'POST') return { id: 'created-1', ...JSON.parse(options.body) };
      if (path === '/tasks/created-1' && options.method === 'DELETE') return { success: true };
      return { ok: true };
    },
  };
}

test('executor refuses a proposed action that was not approved', async () => {
  const api = fakeApi();
  await assert.rejects(() => executeApprovedAction({
    id: 'a1', type: 'CreateTask', status: 'proposed', risk: 'medium', payload: { title: 'اختبار' },
  }, api.request), /approved/i);
  assert.equal(api.calls.length, 0);
});

test('approved CreateTask executes through existing API and can be undone', async () => {
  const api = fakeApi();
  const executed = await executeApprovedAction({
    id: 'a2', type: 'CreateTask', status: 'approved', risk: 'medium', payload: { title: 'شراء هدية' },
  }, api.request);

  assert.equal(api.calls[0].path, '/tasks');
  assert.equal(api.calls[0].method, 'POST');
  assert.equal(executed.status, 'executed');
  assert.deepEqual(executed.undo, { method: 'DELETE', path: '/tasks/created-1' });

  await undoExecutedAction(executed, api.request);
  assert.equal(api.calls[1].path, '/tasks/created-1');
  assert.equal(api.calls[1].method, 'DELETE');
});

test('agent creations inherit the same safe defaults as current LifeOS forms', async () => {
  const calls = [];
  const request = async (path, options = {}) => {
    const body = options.body ? JSON.parse(options.body) : {};
    calls.push({ path, method: options.method || 'GET', body });
    return { id: path === '/habits' ? 'h-new' : 't-new', ...body };
  };

  await executeApprovedAction({
    id: 'a-task', type: 'CreateTask', status: 'approved', risk: 'medium', payload: { title: 'شراء حليب' },
  }, request);
  await executeApprovedAction({
    id: 'a-habit', type: 'CreateHabit', status: 'approved', risk: 'medium', payload: { name: 'مشي' },
  }, request);

  assert.equal(calls[0].body.category, 'أخرى');
  assert.equal(calls[0].body.priority, 'medium');
  assert.match(calls[0].body.startDate, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(calls[1].body.category, 'personal');
  assert.equal(calls[1].body.icon, '⭐');
  assert.equal(calls[1].body.color, '#10b981');
  assert.equal(calls[1].body.recurrence, 'daily');
});
