import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildP1Launch, getAgentModePolicy, isP1AgentMode } from '../src/app/agent/phase2-modes.ts';

test('weekly review is a first-class safe agent mode', () => {
  assert.equal(isP1AgentMode('weekly_review'), true);
  const policy = getAgentModePolicy('weekly_review');
  assert.equal(policy.readOnly, false);
  assert.deepEqual(policy.allowedActionTypes, ['UpdateTask', 'CreateTask', 'UpdateHabit']);
  const launch = buildP1Launch('weekly_review');
  assert.equal(launch.autoSend, true);
  assert.match(launch.title, /مراجعة أسبوعية/);
});

test('weekly review server prompt uses recent reflections and can only propose safe planning changes', async () => {
  const policy = await readFile('supabase/functions/lifeos-agent/phase2-policy.ts', 'utf8');
  const index = await readFile('supabase/functions/lifeos-agent/index.ts', 'utf8');
  const reflections = await readFile('supabase/functions/lifeos-agent/reflections.ts', 'utf8');
  assert.match(policy, /weekly_review/);
  assert.match(policy, /UpdateTask[\s\S]*CreateTask[\s\S]*UpdateHabit/);
  assert.match(policy, /ما نجح|what worked/i);
  assert.match(index, /loadRecentLifeOSReflections/);
  assert.match(index, /recentReflections/);
  assert.match(reflections, /ai_daily_reflections/);
  assert.doesNotMatch(policy + index + reflections, /malaak/i);
});

test('Pro UI exposes weekly review and apply-suggestion batch CTA', async () => {
  const home = await readFile('src/app/agent/ProAIHomeSection.tsx', 'utf8');
  const agent = await readFile('src/app/agent/LifeOSAgentPage.tsx', 'utf8');
  assert.match(home, /مراجعة أسبوعية/);
  assert.match(agent, /طبّق الاقتراح/);
  assert.match(agent, /weekly_review/);
});
