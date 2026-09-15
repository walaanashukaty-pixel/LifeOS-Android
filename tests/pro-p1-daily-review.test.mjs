import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildDailyReviewSummary, DAILY_REVIEW_REASONS } from '../src/app/pro/daily-review-model.ts';

test('daily review summarizes today without inventing data', () => {
  const date = '2026-09-10';
  const summary = buildDailyReviewSummary({
    date,
    tasks: [
      { id: 't1', title: 'A', startDate: date, completions: [{ date, status: 'completed' }] },
      { id: 't2', title: 'B', startDate: date, completions: [] },
    ],
    habits: [
      { id: 'h1', name: 'Walk', logs: [{ date, completed: true }] },
      { id: 'h2', name: 'Read', logs: [] },
    ],
    goals: [{ id: 'g1', title: 'Goal', progress: 40 }],
    events: [{ id: 'e1', title: 'Meeting', date }],
  });
  assert.equal(summary.tasksTotal, 2);
  assert.equal(summary.tasksCompleted, 1);
  assert.equal(summary.tasksIncomplete, 1);
  assert.equal(summary.habitsTotal, 2);
  assert.equal(summary.habitsCompleted, 1);
  assert.equal(summary.eventsToday, 1);
  assert.equal(summary.goalsActive, 1);
});

test('daily review reasons match the product prompt', () => {
  assert.deepEqual([...DAILY_REVIEW_REASONS], [
    'ما كان عندي وقت',
    'كنت متعبة',
    'نسيت',
    'كانت الخطة كبيرة',
    'حدث شيء طارئ',
    'سبب آخر',
  ]);
});

test('daily reflection service upserts one review per user/date and migration uses RLS', async () => {
  const service = await readFile('src/app/pro/daily-review-service.ts', 'utf8');
  const migration = await readFile('supabase/migrations/20260910161600_create_ai_daily_reflections.sql', 'utf8');
  const page = await readFile('src/app/pro/DailyReviewPage.tsx', 'utf8');
  assert.match(service, /from\(['"]ai_daily_reflections['"]\)/);
  assert.match(service, /onConflict:\s*['"]user_id,review_date['"]/);
  assert.match(migration, /unique\s*\(\s*user_id\s*,\s*review_date\s*\)/i);
  assert.match(migration, /enable row level security/i);
  assert.match(page, /🌙 كيف كان يومك؟/);
  assert.match(page, /ما السبب الرئيسي وراء الأشياء التي لم تنجزيها؟/);
  assert.doesNotMatch(service + migration + page, /malaak/i);
});
