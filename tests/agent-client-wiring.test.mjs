import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('LifeOS client invokes only the dedicated lifeos-agent Edge Function', async () => {
  const source = await readFile('src/app/agent/agent-client.ts', 'utf8');
  assert.match(source, /supabase\.functions\.invoke/);
  assert.match(source, /invokeAgentTurnCore/);
  assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(source, /REVENUECAT_SECRET_API_KEY/);
});
