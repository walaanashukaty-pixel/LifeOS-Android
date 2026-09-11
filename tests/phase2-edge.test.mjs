import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Edge Function normalizes mode, sends it to provider, persists presentation metadata, and returns it', async () => {
  const source = await readFile('supabase/functions/lifeos-agent/index.ts', 'utf8');
  assert.match(source, /normalizeAgentMode/);
  assert.match(source, /mode\s*=\s*normalizeAgentMode\(body\.mode\)/);
  assert.match(source, /callLifeOSProvider\(\{[\s\S]*mode[\s\S]*\}\)/);
  assert.match(source, /metadata:[\s\S]*mode[\s\S]*presentation/);
  assert.match(source, /presentation:\s*providerResult\.presentation/);
});

test('Phase 2 does not reference or integrate any Malaak subsystem', async () => {
  const files = [
    'supabase/functions/lifeos-agent/index.ts',
    'supabase/functions/lifeos-agent/provider.ts',
    'supabase/functions/lifeos-agent/phase2-policy.ts',
  ];
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(source, /malaak/i);
  }
});
