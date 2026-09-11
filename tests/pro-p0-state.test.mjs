import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('real Pro state shows a refined PRO badge without turning preview into a paid subscription', async () => {
  const layout = await readFile('src/app/components/Layout.tsx', 'utf8');
  assert.match(layout, /useMonetization/);
  assert.match(layout, /const\s*\{\s*isPro\s*\}\s*=\s*useMonetization\(\)/);
  assert.match(layout, /PRO\s*✨/);
  assert.match(layout, /isPro\s*&&/);
  assert.doesNotMatch(layout, /proPreviewActive[\s\S]{0,160}PRO\s*✨/);
});

test('AI hub has a clear LifeOS AI entry while keeping the existing free assistant', async () => {
  const hub = await readFile('src/app/agent/AIHubPage.tsx', 'utf8');
  assert.match(hub, /LifeOS Intelligence/);
  assert.match(hub, /AIAssistantPage/);
  assert.match(hub, /ProAIHomeSection/);
});

test('mobile primary navigation remains the existing five destinations', async () => {
  const nav = await readFile('src/app/mobile/navigation.ts', 'utf8');
  const block = nav.match(/MOBILE_PRIMARY_NAV[\s\S]*?\];/)?.[0] || '';
  const ids = [...block.matchAll(/id:\s*'([^']+)'/g)].map(match => match[1]);
  assert.deepEqual(ids.slice(0, 5), ['dashboard', 'tasks', 'habits', 'goals', 'account']);
  assert.equal(ids.length, 5);
});
