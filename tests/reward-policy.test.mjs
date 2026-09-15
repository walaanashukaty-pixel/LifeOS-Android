import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GLOBAL_DAILY_REWARD_CAP,
  REWARD_ADS_PER_PACK,
  REWARD_CAPACITY_PER_PACK,
  REWARD_POLICIES,
  localDateKey,
  countCreatedOnDate,
} from '../src/utils/ads/reward-policy.ts';

test('reward packs have no global daily cap', () => {
  assert.equal(GLOBAL_DAILY_REWARD_CAP, Number.POSITIVE_INFINITY);
  assert.equal(REWARD_ADS_PER_PACK, 2);
  assert.equal(REWARD_CAPACITY_PER_PACK, 4);
});

const expectedBases = {
  tasks: 6,
  habits: 4,
  goals: 3,
  events: 5,
  languages: 2,
  language_content: 10,
  skills: 3,
  study_subjects: 4,
  study_lessons: 6,
  agreements: 5,
  documents: 5,
  finance_accounts: 3,
  finance_budgets: 3,
  savings_goals: 2,
};

for (const [key, base] of Object.entries(expectedBases)) {
  test(`policy ${key} uses whole-list base capacity and +4 per two ads`, () => {
    const p = REWARD_POLICIES[key];
    assert.deepEqual(
      { base: p.base, reward: p.reward, mode: p.mode, adsPerReward: p.adsPerReward },
      { base, reward: 4, mode: 'daily', adsPerReward: 2 },
    );
  });
}

test('legacy local date helper remains available for migration compatibility', () => {
  const date = localDateKey(new Date(2026, 7, 28, 12, 0, 0));
  const rows = [
    { createdAt: '2026-08-28T01:00:00' },
    { createdAt: '2026-08-28T20:00:00' },
    { createdAt: '2026-08-27T23:00:00' },
  ];
  assert.equal(date, '2026-08-28');
  assert.equal(countCreatedOnDate(rows, date), 2);
});
