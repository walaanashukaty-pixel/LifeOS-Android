import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('LifeOS Agent edge function authenticates, verifies Pro, and persists proposed actions only', async () => {
  const source = await readFile('supabase/functions/lifeos-agent/index.ts', 'utf8');
  assert.match(source, /auth\.getUser/);
  assert.match(source, /fetchRevenueCatPro/);
  assert.match(source, /REVENUECAT_SECRET_API_KEY/);
  assert.match(source, /ai_conversations/);
  assert.match(source, /ai_messages/);
  assert.match(source, /ai_actions/);
  assert.match(source, /status:\s*'proposed'/);
  assert.doesNotMatch(source, /from\(['"]tasks['"]\)/);
  assert.doesNotMatch(source, /from\(['"]habits['"]\)/);
  assert.doesNotMatch(source, /from\(['"]events['"]\)/);
});
