import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('package exposes a dedicated P0 regression command', async () => {
  const pkg = JSON.parse(await readFile('package.json', 'utf8'));
  assert.match(String(pkg.scripts?.['test:pro-p0'] || ''), /tests\/pro-p0-\*\.test\.mjs/);
});

test('Android CI verifies P0 sources and runs P0 tests before build', async () => {
  const yaml = await readFile('.github/workflows/main.yml', 'utf8');
  assert.match(yaml, /src\/app\/pro\/ProOnboardingFlow\.tsx/);
  assert.match(yaml, /src\/app\/pro\/personalization-service\.ts/);
  assert.match(yaml, /supabase\/functions\/lifeos-agent\/personalization\.ts/);
  assert.match(yaml, /20260910130425_create_ai_personalization_profiles\.sql/);
  const tests = yaml.indexOf('npm run test:pro-p0');
  const build = yaml.indexOf('npm run build');
  assert.ok(tests >= 0 && build > tests, 'P0 tests must run before Vite build');
});
