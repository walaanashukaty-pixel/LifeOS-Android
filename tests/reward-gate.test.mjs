import test from 'node:test';
import assert from 'node:assert/strict';
import { decideCreationGate, effectiveLimit } from '../src/utils/ads/reward-gate-model.ts';
import { normalizeRewardSnapshot } from '../src/utils/ads/reward-state.ts';

test('tasks use whole-list capacity: six free, then +4 per completed reward pack', () => {
  assert.equal(decideCreationGate({ key: 'tasks', currentCount: 5, earnedBoosts: 0, globalRewardsToday: 0, isPro: false }).kind, 'allowed');
  assert.equal(decideCreationGate({ key: 'tasks', currentCount: 6, earnedBoosts: 0, globalRewardsToday: 0, isPro: false }).kind, 'reward_available');
  assert.equal(effectiveLimit('tasks', 1), 10);
  assert.equal(effectiveLimit('tasks', 2), 14);
  assert.equal(effectiveLimit('tasks', 10), 46);
});

test('there is no daily or per-feature maximum reward-pack cap', () => {
  assert.equal(decideCreationGate({ key: 'habits', currentCount: 40, earnedBoosts: 9, globalRewardsToday: 99, isPro: false }).kind, 'reward_available');
  assert.equal(decideCreationGate({ key: 'habits', currentCount: 39, earnedBoosts: 9, globalRewardsToday: 99, isPro: false }).kind, 'allowed');
});

test('Pro bypasses every creation quota', () => {
  assert.equal(decideCreationGate({ key: 'documents', currentCount: 999, earnedBoosts: 0, globalRewardsToday: 0, isPro: true }).kind, 'allowed');
});

test('only same-day temporary bonuses count; old permanent bonuses are ignored', () => {
  const snapshot = normalizeRewardSnapshot({
    dateKey: '2026-09-10',
    allowances: [
      { reward_key: 'tasks', temporary_bonus: 8, temporary_date: '2026-09-10', permanent_bonus: 100 },
      { reward_key: 'habits', temporary_bonus: 12, temporary_date: '2026-09-09', permanent_bonus: 100 },
    ],
    events: [
      { reward_key: 'tasks' }, { reward_key: 'tasks' },
      { reward_key: 'tasks' }, { reward_key: 'tasks' },
    ],
  });
  assert.deepEqual(snapshot, {
    dateKey: '2026-09-10',
    globalRewardsToday: 4,
    boostsByKey: { tasks: 2 },
    adViewsByKey: { tasks: 4 },
    available: true,
  });
});

test('one provisional ad records progress but two provisional ads unlock one +4 pack', async () => {
  const state = await import('../src/utils/ads/reward-state.ts');
  state.resetProvisionalRewards();
  state.addProvisionalAdView('tasks');
  let snapshot = state.withProvisionalRewards({
    dateKey: '2026-09-10', globalRewardsToday: 0, boostsByKey: {}, adViewsByKey: {}, available: false, error: 'offline',
  });
  assert.equal(snapshot.globalRewardsToday, 1);
  assert.equal(snapshot.adViewsByKey.tasks, 1);
  assert.equal(snapshot.boostsByKey.tasks || 0, 0);

  state.addProvisionalAdView('tasks');
  snapshot = state.withProvisionalRewards({
    dateKey: '2026-09-10', globalRewardsToday: 0, boostsByKey: {}, adViewsByKey: {}, available: false, error: 'offline',
  });
  assert.equal(snapshot.globalRewardsToday, 2);
  assert.equal(snapshot.adViewsByKey.tasks, 2);
  assert.equal(snapshot.boostsByKey.tasks, 1);
  state.resetProvisionalRewards();
});
