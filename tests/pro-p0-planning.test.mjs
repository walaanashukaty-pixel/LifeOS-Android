import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getAgentModePolicy } from '../src/app/agent/phase2-modes.ts';

test('day plan schedules existing tasks instead of inventing filler tasks', async () => {
  const policy = getAgentModePolicy('day_plan');
  assert.equal(policy.readOnly, false);
  assert.deepEqual(policy.allowedActionTypes, ['UpdateTask']);
  const serverPolicy = await readFile('supabase/functions/lifeos-agent/phase2-policy.ts', 'utf8');
  assert.match(serverPolicy, /Do not invent filler tasks/i);
  assert.match(serverPolicy, /UpdateTask/);
  assert.match(serverPolicy, /plannedTime/);
});

test('goal plan can create a new goal but explicitly avoids duplicating an existing one', async () => {
  const policy = getAgentModePolicy('goal_plan');
  assert.ok(policy.allowedActionTypes.includes('CreateGoal'));
  assert.ok(policy.allowedActionTypes.includes('CreateTask'));
  assert.ok(policy.allowedActionTypes.includes('CreateHabit'));
  const serverPolicy = await readFile('supabase/functions/lifeos-agent/phase2-policy.ts', 'utf8');
  assert.match(serverPolicy, /matching existing goal/i);
  assert.match(serverPolicy, /do NOT create a duplicate goal/i);
});

test('agent page offers one batch confirmation CTA for actionable plans', async () => {
  const source = await readFile('src/app/agent/LifeOSAgentPage.tsx', 'utf8');
  assert.match(source, /اعتماد الخطة/);
  assert.match(source, /إضافة الخطة إلى LifeOS/);
  assert.match(source, /approveAllPendingActions/);
  assert.match(source, /for \(const action of actionsToRun\)/);
});

test('server policies keep structured writes minimal', async () => {
  const policy = await readFile('supabase/functions/lifeos-agent/phase2-policy.ts', 'utf8');
  const provider = await readFile('supabase/functions/lifeos-agent/provider.ts', 'utf8');
  assert.match(policy, /day_plan:\s*\['UpdateTask'\]/);
  assert.match(policy, /goal_plan:\s*\['CreateGoal',\s*'CreateTask',\s*'CreateHabit',\s*'CreateEvent'\]/);
  assert.match(provider, /plannedTime/);
  assert.match(provider, /milestones/);
  assert.match(provider, /Never convert every sentence into CreateTask/);
});
