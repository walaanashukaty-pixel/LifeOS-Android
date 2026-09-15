import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('P2 tests run before the production build in CI', async () => {
  const pkg = JSON.parse(await readFile('package.json', 'utf8'));
  const yaml = await readFile('.github/workflows/main.yml', 'utf8');
  assert.match(String(pkg.scripts?.['test:pro-p2'] || ''), /pro-p2-/);
  const testPos = yaml.indexOf('npm run test:pro-p2');
  const buildPos = yaml.indexOf('npm run build');
  assert.ok(testPos >= 0 && buildPos > testPos);
});
