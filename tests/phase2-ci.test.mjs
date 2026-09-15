import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('package exposes a dedicated Phase 2 regression command', async () => {
  const pkg = JSON.parse(await readFile('package.json', 'utf8'));
  assert.match(String(pkg.scripts?.['test:phase2'] || ''), /phase2-/);
});

test('Android workflow runs Phase 2 tests before building the web app', async () => {
  const yaml = await readFile('.github/workflows/main.yml', 'utf8');
  const testIndex = yaml.indexOf('npm run test:phase2');
  const buildIndex = yaml.indexOf('npm run build');
  assert.ok(testIndex >= 0, 'workflow must run npm run test:phase2');
  assert.ok(buildIndex > testIndex, 'Phase 2 tests must run before web build');
});

test('Android workflow keeps Phase 2 verification in the normal fail-fast build path', async () => {
  const yaml = await readFile('.github/workflows/main.yml', 'utf8');
  assert.doesNotMatch(yaml, /git\s+push\s+[^\n]*(?:--force|force-with-lease)/i);
  assert.match(yaml, /npm run test:phase2/);
  assert.match(yaml, /npm run build/);
});
