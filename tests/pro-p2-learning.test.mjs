import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { deriveAdaptiveHints } from '../supabase/functions/lifeos-agent/learning.ts';

test('adaptive learning derives bounded transparent hints from repeated review reasons', () => {
  const hints = deriveAdaptiveHints([
    { reviewDate: '2026-09-10', reason: 'كانت الخطة كبيرة', note: '', summary: {} },
    { reviewDate: '2026-09-09', reason: 'كانت الخطة كبيرة', note: '', summary: {} },
    { reviewDate: '2026-09-08', reason: 'نسيت', note: '', summary: {} },
    { reviewDate: '2026-09-07', reason: 'نسيت', note: '', summary: {} },
  ]);
  assert.ok(hints.length <= 4);
  assert.ok(hints.some(item => /أقل|أخف|أولوية/.test(item)));
  assert.ok(hints.some(item => /تذكير|تذكيرات/.test(item)));
});

test('adaptive learning needs repeated evidence and does not silently rewrite profile fields', () => {
  const hints = deriveAdaptiveHints([{ reviewDate: '2026-09-10', reason: 'كنت متعبة', note: '', summary: {} }]);
  assert.deepEqual(hints, []);
});

test('server sends adaptive hints only when LifeOS memory is enabled', async () => {
  const index = await readFile('supabase/functions/lifeos-agent/index.ts', 'utf8');
  const learning = await readFile('supabase/functions/lifeos-agent/learning.ts', 'utf8');
  assert.match(index, /deriveAdaptiveHints/);
  assert.match(index, /aiSettings\.memoryEnabled[\s\S]*adaptiveHints/);
  assert.match(index, /adaptiveHints/);
  assert.doesNotMatch(learning + index, /malaak/i);
});

test('provider schema advertises weekly review as a supported structured presentation', async () => {
  const provider = await readFile('supabase/functions/lifeos-agent/provider.ts', 'utf8');
  assert.match(provider, /smart_add\|day_plan\|what_now\|goal_plan\|reschedule\|morning_brief\|weekly_review/);
});
