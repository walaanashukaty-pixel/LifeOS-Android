import test from 'node:test';
import assert from 'node:assert/strict';
import { invokeAgentTurnCore } from '../src/app/agent/agent-client-core.ts';

test('agent client maps server proposed actions into client action contract', async () => {
  const invoke = async () => ({
    data: {
      conversationId: 'c1',
      reply: 'رح أضيف المهمة بعد موافقتك.',
      clarification: null,
      actions: [{ id: 'a1', type: 'CreateTask', risk: 'medium', status: 'proposed', payload: { title: 'شراء هدية' } }],
    },
    error: null,
  });
  const result = await invokeAgentTurnCore(invoke, { message: 'ضيفلي مهمة شراء هدية', timezone: 'Asia/Damascus', now: '2026-09-10T12:00:00+03:00', context: { tasks: [] } });
  assert.equal(result.conversationId, 'c1');
  assert.equal(result.actions[0].type, 'CreateTask');
});

test('agent client fails closed on malformed server action', async () => {
  const invoke = async () => ({
    data: { conversationId: 'c1', reply: 'x', actions: [{ id: 'a1', type: 'CreateEvent', risk: 'medium', status: 'proposed', payload: { title: 'دكتور', date: 'Tuesday' } }] },
    error: null,
  });
  await assert.rejects(() => invokeAgentTurnCore(invoke, { message: 'x', timezone: 'UTC', now: '2026-09-10T00:00:00Z', context: {} }), /invalid action/i);
});

test('agent client surfaces Pro-required server code', async () => {
  const invoke = async () => ({ data: { code: 'PRO_REQUIRED', error: 'LifeOS Agent requires LifeOS Pro.' }, error: { message: 'Edge Function returned a non-2xx status code' } });
  await assert.rejects(() => invokeAgentTurnCore(invoke, { message: 'x', timezone: 'UTC', now: '2026-09-10T00:00:00Z', context: {} }), /PRO_REQUIRED/);
});

test('agent status recorder sends only lifecycle metadata to the Edge Function', async () => {
  const { recordAgentStatusCore } = await import('../src/app/agent/agent-client-core.ts');
  let body;
  const invoke = async (_name, options) => { body = options.body; return { data: { action: { id: 'a1', status: 'executed' } }, error: null }; };
  await recordAgentStatusCore(invoke, { actionId: 'a1', status: 'executed', result: { id: 't1' }, undo: { method: 'DELETE', path: '/tasks/t1' } });
  assert.equal(body.operation, 'record_action_status');
  assert.equal(body.actionId, 'a1');
  assert.equal(body.actionStatus, 'executed');
  assert.equal('message' in body, false);
});

test('approval lifecycle can record the final user-edited payload for audit', async () => {
  const { recordAgentStatusCore } = await import('../src/app/agent/agent-client-core.ts');
  let body;
  const invoke = async (_name, options) => { body = options.body; return { data: { action: { id: 'a2', status: 'approved' } }, error: null }; };
  await recordAgentStatusCore(invoke, { actionId: 'a2', status: 'approved', approvedPayload: { title: 'العنوان بعد التعديل', startDate: '2026-09-11' } });
  assert.deepEqual(body.approvedPayload, { title: 'العنوان بعد التعديل', startDate: '2026-09-11' });
});
