import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GLOBAL_DAILY_REWARD_CAP,
  REWARD_POLICIES,
  localDateKey,
  countCreatedOnDate,
} from '../src/utils/ads/reward-policy.ts';

test('global rewarded cap is six per local day', () => {
  assert.equal(GLOBAL_DAILY_REWARD_CAP, 6);
});

const expected = {
  tasks:             { base: 6,  reward: 4,  max: 14, mode: 'daily',    featureAdCap: 2 },
  habits:            { base: 4,  reward: 2,  max: 8,  mode: 'capacity', featureAdCap: 2 },
  goals:             { base: 3,  reward: 2,  max: 7,  mode: 'capacity', featureAdCap: 2 },
  events:            { base: 5,  reward: 3,  max: 11, mode: 'capacity', featureAdCap: 2 },
  languages:         { base: 2,  reward: 1,  max: 4,  mode: 'capacity', featureAdCap: 2 },
  language_content:  { base: 10, reward: 10, max: 30, mode: 'daily',    featureAdCap: 2 },
  skills:            { base: 3,  reward: 2,  max: 7,  mode: 'capacity', featureAdCap: 2 },
  study_subjects:    { base: 4,  reward: 2,  max: 8,  mode: 'capacity', featureAdCap: 2 },
  study_lessons:     { base: 6,  reward: 5,  max: 16, mode: 'daily',    featureAdCap: 2 },
  agreements:        { base: 5,  reward: 3,  max: 11, mode: 'capacity', featureAdCap: 2 },
  documents:         { base: 5,  reward: 2,  max: 9,  mode: 'capacity', featureAdCap: 2 },
  finance_accounts:  { base: 3,  reward: 2,  max: 7,  mode: 'capacity', featureAdCap: 2 },
  finance_budgets:   { base: 3,  reward: 2,  max: 7,  mode: 'capacity', featureAdCap: 2 },
  savings_goals:     { base: 2,  reward: 2,  max: 6,  mode: 'capacity', featureAdCap: 2 },
};

for (const [key, value] of Object.entries(expected)) {
  test(`policy ${key} matches approved limits`, () => {
    const p = REWARD_POLICIES[key];
    assert.deepEqual(
      { base: p.base, reward: p.reward, max: p.max, mode: p.mode, featureAdCap: p.featureAdCap },
      value,
    );
  });
}

test('local date helpers count only records created on requested local day', () => {
  const date = localDateKey(new Date(2026, 7, 28, 12, 0, 0));
  const rows = [
    { createdAt: '2026-08-28T01:00:00' },
    { createdAt: '2026-08-28T20:00:00' },
    { createdAt: '2026-08-27T23:00:00' },
  ];
  assert.equal(date, '2026-08-28');
  assert.equal(countCreatedOnDate(rows, date), 2);
});
