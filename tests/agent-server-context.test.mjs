import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeAgentServerContext } from '../supabase/functions/lifeos-agent/context-policy.ts';

test('server context policy drops unknown domains and unknown record fields', () => {
  const result = sanitizeAgentServerContext({
    tasks: [{ id: 't1', title: 'Task', secret: 'never-send', debug: { token: 'x' } }],
    habits: [{ id: 'h1', name: 'Walk', private_note: 'drop' }],
    finance: [{ id: 'f1', balance: 9000 }],
  });
  assert.deepEqual(result, {
    tasks: [{ id: 't1', title: 'Task' }],
    habits: [{ id: 'h1', name: 'Walk' }],
  });
});

test('server context policy caps each domain and recent history arrays', () => {
  const tasks = Array.from({ length: 100 }, (_, i) => ({
    id: `t${i}`,
    title: `Task ${i}`,
    completions: Array.from({ length: 30 }, (_, j) => ({ date: `2026-08-${String(j + 1).padStart(2, '0')}`, status: 'completed' })),
  }));
  const result = sanitizeAgentServerContext({ tasks });
  assert.equal(result.tasks.length, 80);
  assert.equal(result.tasks[0].completions.length, 14);
});
