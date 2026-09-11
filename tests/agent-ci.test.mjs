import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('package exposes a dedicated agent test command', async () => {
  const pkg = JSON.parse(await readFile('package.json', 'utf8'));
  assert.match(pkg.scripts['test:agent'], /agent-.*\.test\.mjs|tests\/\*\.test\.mjs/);
});

test('Android build workflow runs LifeOS Agent tests before web build', async () => {
  const workflow = await readFile('.github/workflows/main.yml', 'utf8');
  const testIndex = workflow.indexOf('npm run test:agent');
  const buildIndex = workflow.indexOf('npm run build');
  assert.ok(testIndex > -1);
  assert.ok(buildIndex > testIndex);
});
