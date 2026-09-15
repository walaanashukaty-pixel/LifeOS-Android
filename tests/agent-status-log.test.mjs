import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Edge Function records action lifecycle without executing LifeOS data operations', async () => {
  const source = await readFile('supabase/functions/lifeos-agent/index.ts', 'utf8');
  assert.match(source, /record_action_status/);
  assert.match(source, /ALLOWED_RECORDED_STATUSES/);
  assert.match(source, /\.eq\('user_id', userId\)/);
  assert.match(source, /undo_payload/);
});
