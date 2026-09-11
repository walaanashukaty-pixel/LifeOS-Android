import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const modulePath = new URL('../supabase/functions/lifeos-agent/personalization.ts', import.meta.url);

function fakeSupabase(row, error = null) {
  const calls = [];
  const builder = {
    select(columns) { calls.push(['select', columns]); return this; },
    eq(column, value) { calls.push(['eq', column, value]); return this; },
    async maybeSingle() { calls.push(['maybeSingle']); return { data: row, error }; },
  };
  return {
    calls,
    from(table) {
      calls.push(['from', table]);
      return builder;
    },
  };
}

test('edge personalization reads only the authenticated LifeOS profile row', async () => {
  const { loadLifeOSPersonalization } = await import(modulePath);
  const db = fakeSupabase({
    user_id: 'user-1',
    focus_areas: ['دراستي'],
    biggest_challenge: 'أتشتت بسهولة',
    planning_style: 'مرنة حسب اليوم',
    energy_peak: 'مساءً',
    primary_goal: 'الوصول إلى B1',
    daily_time: '30 دقيقة',
    onboarding_completed: true,
    created_at: 'should-not-leak',
  });

  const result = await loadLifeOSPersonalization(db, 'user-1');

  assert.deepEqual(result, {
    focusAreas: ['دراستي'],
    biggestChallenge: 'أتشتت بسهولة',
    planningStyle: 'مرنة حسب اليوم',
    energyPeak: 'مساءً',
    primaryGoal: 'الوصول إلى B1',
    dailyTime: '30 دقيقة',
  });
  assert.deepEqual(db.calls[0], ['from', 'ai_personalization_profiles']);
  assert.ok(db.calls.some(call => call[0] === 'eq' && call[1] === 'user_id' && call[2] === 'user-1'));
});

test('edge personalization returns null until onboarding is complete', async () => {
  const { loadLifeOSPersonalization } = await import(modulePath);
  const db = fakeSupabase({
    focus_areas: ['صحتي'],
    biggest_challenge: 'أنسى المهام',
    planning_style: 'متوازنة',
    energy_peak: 'صباحًا',
    primary_goal: 'المشي يوميًا',
    daily_time: '15 دقيقة',
    onboarding_completed: false,
  });
  assert.equal(await loadLifeOSPersonalization(db, 'user-2'), null);
});

test('LifeOS agent adds account personalization to provider context without touching Malaak', async () => {
  const source = await readFile('supabase/functions/lifeos-agent/index.ts', 'utf8');
  assert.match(source, /loadLifeOSPersonalization/);
  assert.match(source, /personalization/);
  assert.match(source, /context\s*=\s*\{[\s\S]*personalization[\s\S]*data:\s*contextData|context\s*=\s*\{[\s\S]*data:\s*contextData[\s\S]*personalization/);
  assert.doesNotMatch(source, /malaak/i);
});
