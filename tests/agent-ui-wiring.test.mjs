import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('AI hub preserves the existing Free assistant and adds a Pro upgrade/launch surface', async () => {
  const source = await readFile('src/app/agent/AIHubPage.tsx', 'utf8');
  assert.match(source, /AIAssistantPage/);
  assert.match(source, /useMonetization/);
  assert.match(source, /openPro/);
  assert.match(source, /LifeOSAgentPage/);
});

test('Pro agent page uses scoped context, server agent, approval, execution and undo', async () => {
  const source = await readFile('src/app/agent/LifeOSAgentPage.tsx', 'utf8');
  assert.match(source, /loadScopedSnapshot/);
  assert.match(source, /buildAgentContext/);
  assert.match(source, /sendLifeOSAgentTurn/);
  assert.match(source, /executeApprovedAction/);
  assert.match(source, /undoExecutedAction/);
  assert.match(source, /recordLifeOSAgentActionStatus/);
  assert.match(source, /isPro/);
});

test('App routes the existing AI page through AIHub without changing navigation types', async () => {
  const source = await readFile('src/app/App.tsx', 'utf8');
  assert.match(source, /import \{ AIHubPage \}/);
  assert.match(source, /ai:\s*<AIHubPage\s*\/>/);
  assert.doesNotMatch(source, /\| 'agent'/);
});
