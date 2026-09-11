import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('package and CI run P1 tests before build', async () => {
  const pkg = JSON.parse(await readFile('package.json', 'utf8'));
  const yaml = await readFile('.github/workflows/main.yml', 'utf8');
  assert.match(String(pkg.scripts?.['test:pro-p1'] || ''), /pro-p1-/);
  const testPos = yaml.indexOf('npm run test:pro-p1');
  const buildPos = yaml.indexOf('npm run build');
  assert.ok(testPos >= 0 && buildPos > testPos);
});
