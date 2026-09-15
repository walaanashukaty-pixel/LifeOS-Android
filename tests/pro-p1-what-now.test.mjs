import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('What Now is limited to one-to-three suggestions and uses current-life context', async () => {
  const policy = await readFile('supabase/functions/lifeos-agent/phase2-policy.ts', 'utf8');
  assert.match(policy, /what_now/);
  assert.match(policy, /one to three|1.?3|one best.*two alternatives/i);
  assert.match(policy, /energy|طاقة/i);
  assert.match(policy, /next event|أقرب موعد/i);
  assert.match(policy, /current time|الوقت الحالي/i);
});

test('What Now remains read-only and does not fake a started state', async () => {
  const card = await readFile('src/app/agent/AgentPresentationCard.tsx', 'utf8');
  const agent = await readFile('src/app/agent/LifeOSAgentPage.tsx', 'utf8');
  assert.doesNotMatch(card, /onStart|ابدأ/);
  assert.doesNotMatch(agent, /بلّشنا بهالخطوة|بدأنا بهالخطوة/);
  assert.match(agent, /AgentPresentationCard/);
});
