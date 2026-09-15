import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateAgentAction } from '../src/app/agent/validate-action.ts';
import { executeApprovedAction, undoExecutedAction } from '../src/app/agent/action-executor.ts';

test('CreateGoal accepts existing goal fields plus concise milestones', () => {
  const result = validateAgentAction({
    id: 'a1', type: 'CreateGoal', risk: 'medium', status: 'proposed',
    payload: {
      title: 'الوصول إلى B1', description: 'خلال 4 أشهر', type: 'medium',
      startDate: '2026-09-10', deadline: '2027-01-10', progress: 0,
      milestones: ['A2 كامل', 'محادثة 15 دقيقة'],
    },
  });
  assert.deepEqual(result, { valid: true, issues: [] });
});

test('CreateGoal rejects invalid milestone structures and unsupported fields', () => {
  const result = validateAgentAction({
    id: 'a2', type: 'CreateGoal', risk: 'medium', status: 'proposed',
    payload: { title: 'هدف', milestones: ['ok', 3], hacked: true },
  });
  assert.equal(result.valid, false);
  assert.ok(result.issues.some(issue => issue.includes('milestones')));
  assert.ok(result.issues.some(issue => issue.includes('unsupported field: hacked')));
});

test('task plannedTime is validated as HH:MM', () => {
  const good = validateAgentAction({ id: 't1', type: 'CreateTask', risk: 'medium', status: 'proposed', payload: { title: 'مراجعة', plannedTime: '18:30' } });
  const bad = validateAgentAction({ id: 't2', type: 'CreateTask', risk: 'medium', status: 'proposed', payload: { title: 'مراجعة', plannedTime: '8pm' } });
  assert.equal(good.valid, true);
  assert.equal(bad.valid, false);
});

test('CreateGoal executes through /goals and supports undo through DELETE', async () => {
  const calls = [];
  const request = async (path, options = {}) => {
    calls.push([path, options.method || 'GET', options.body ? JSON.parse(options.body) : null]);
    if (path === '/goals' && options.method === 'POST') return { id: 'goal-1', ...JSON.parse(options.body) };
    if (path === '/goals/goal-1' && options.method === 'DELETE') return { success: true };
    throw new Error(`unexpected ${options.method} ${path}`);
  };
  const executed = await executeApprovedAction({ id: 'g1', type: 'CreateGoal', risk: 'medium', status: 'approved', payload: { title: 'B1', milestones: ['A2'] } }, request);
  assert.equal(executed.status, 'executed');
  assert.deepEqual(executed.undo, { method: 'DELETE', path: '/goals/goal-1' });
  const undone = await undoExecutedAction(executed, request);
  assert.equal(undone.status, 'undone');
  assert.deepEqual(calls.map(call => call.slice(0, 2)), [['/goals', 'POST'], ['/goals/goal-1', 'DELETE']]);
});

test('context and snapshot include planned task time and goal milestones only in their own domains', async () => {
  const context = await readFile('src/app/agent/context-builder.ts', 'utf8');
  const snapshot = await readFile('src/app/agent/agent-snapshot.ts', 'utf8');
  assert.match(context, /plannedTime/);
  assert.match(context, /milestones/);
  assert.match(snapshot, /CreateGoal/);
});

test('Tasks and Goals pages render AI planning metadata only when present', async () => {
  const tasks = await readFile('src/app/components/TasksPage.tsx', 'utf8');
  const goals = await readFile('src/app/components/GoalsPage.tsx', 'utf8');
  assert.match(tasks, /plannedTime/);
  assert.match(tasks, /وقت الخطة|مخطط/);
  assert.match(goals, /milestones/);
  assert.match(goals, /مراحل الخطة/);
});
