import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  emptyPersonalizationDraft,
  normalizePersonalizationDraft,
  PERSONALIZATION_FOCUS_AREAS,
} from '../src/app/pro/personalization-types.ts';

test('personalization draft exposes exactly the six approved onboarding answer fields', () => {
  const draft = emptyPersonalizationDraft();
  assert.deepEqual(Object.keys(draft).sort(), [
    'biggestChallenge', 'dailyTime', 'energyPeak', 'focusAreas', 'planningStyle', 'primaryGoal',
  ]);
  assert.ok(PERSONALIZATION_FOCUS_AREAS.includes('صحتي'));
  assert.ok(PERSONALIZATION_FOCUS_AREAS.includes('أكثر من شيء'));
});

test('personalization normalization keeps only approved values and trims primary goal', () => {
  const normalized = normalizePersonalizationDraft({
    focusAreas: ['صحتي', 'عملي', 'غير مسموح'],
    biggestChallenge: 'أتشتت بسهولة',
    planningStyle: 'مرنة حسب اليوم',
    energyPeak: 'مساءً',
    primaryGoal: '  أوصل لمستوى B1  ',
    dailyTime: '30 دقيقة',
    injected: 'nope',
  });
  assert.deepEqual(normalized.focusAreas, ['صحتي', 'عملي']);
  assert.equal(normalized.primaryGoal, 'أوصل لمستوى B1');
  assert.equal(Object.hasOwn(normalized, 'injected'), false);
});

test('personalization service is account-scoped and writes onboarding completion without Malaak', async () => {
  const source = await readFile('src/app/pro/personalization-service.ts', 'utf8');
  assert.match(source, /from\('ai_personalization_profiles'\)/);
  assert.match(source, /\.eq\('user_id',\s*userId\)/);
  assert.match(source, /user_id:\s*userId/);
  assert.match(source, /onboarding_completed:\s*true/);
  assert.doesNotMatch(source.toLowerCase(), /malaak/);
});

test('personalization migration creates an own-row RLS protected LifeOS-only table', async () => {
  const sql = await readFile('supabase/migrations/20260910130425_create_ai_personalization_profiles.sql', 'utf8');
  assert.match(sql, /create table if not exists public\.ai_personalization_profiles/i);
  assert.match(sql, /user_id uuid primary key references auth\.users\(id\) on delete cascade/i);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /auth\.uid\(\).*user_id|auth\.uid\(\)\s*=\s*user_id/i);
  assert.match(sql, /onboarding_completed boolean not null default false/i);
  assert.doesNotMatch(sql.toLowerCase(), /malaak/);
});


test('checked-in personalization migrations mirror the applied Supabase migration history', async () => {
  const names = [
    '20260910130541_sync_lifeos_p0_agent_sources.sql',
    '20260910130548_ensure_lifeos_personalization_profile_defaults.sql',
    '20260910130557_verify_lifeos_personalization_profile_rls.sql',
    '20260910130603_lifeos_p0_profile_policy_consistency.sql',
    '20260910130617_lifeos_p0_profile_check_constraint.sql',
    '20260910130625_lifeos_p0_profile_primary_goal_limit.sql',
    '20260910130634_lifeos_p0_profile_updated_at_default.sql',
    '20260910130642_lifeos_p0_profile_biggest_challenge_limit.sql',
    '20260910130651_lifeos_p0_profile_planning_style_limit.sql',
    '20260910130659_lifeos_p0_profile_energy_peak_limit.sql',
    '20260910130707_lifeos_p0_profile_daily_time_limit.sql',
    '20260910130714_lifeos_p0_profile_focus_values_nonempty.sql',
  ];
  for (const name of names) {
    const sql = await readFile(`supabase/migrations/${name}`, 'utf8');
    assert.ok(sql.trim().length > 0, `${name} must preserve the applied migration step`);
  }
});
