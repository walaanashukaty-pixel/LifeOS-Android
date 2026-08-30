import test from 'node:test';
import assert from 'node:assert/strict';
import { decideCreationGate, effectiveLimit } from '../src/utils/ads/reward-gate-model.ts';
import { normalizeRewardSnapshot } from '../src/utils/ads/reward-state.ts';

test('tasks allow six, gate seventh, and allow four after one reward', () => {
  assert.equal(decideCreationGate({ key: 'tasks', currentCount: 5, earnedBoosts: 0, globalRewardsToday: 0, isPro: false }).kind, 'allowed');
  assert.equal(decideCreationGate({ key: 'tasks', currentCount: 6, earnedBoosts: 0, globalRewardsToday: 0, isPro: false }).kind, 'reward_available');
  assert.equal(effectiveLimit('tasks', 1), 10);
  assert.equal(decideCreationGate({ key: 'tasks', currentCount: 9, earnedBoosts: 1, globalRewardsToday: 1, isPro: false }).kind, 'allowed');
});

test('two task rewards cap free usage at fourteen', () => {
  assert.equal(effectiveLimit('tasks', 2), 14);
  assert.equal(decideCreationGate({ key: 'tasks', currentCount: 14, earnedBoosts: 2, globalRewardsToday: 2, isPro: false }).kind, 'pro_only');
});

test('global six reward cap blocks another rewarded unlock', () => {
  assert.equal(decideCreationGate({ key: 'habits', currentCount: 4, earnedBoosts: 0, globalRewardsToday: 6, isPro: false }).kind, 'daily_reward_cap');
});

test('Pro bypasses every creation quota', () => {
  assert.equal(decideCreationGate({ key: 'documents', currentCount: 999, earnedBoosts: 2, globalRewardsToday: 6, isPro: true }).kind, 'allowed');
});


test('normalizes verified server bonuses into earned boosts', () => {
  const snapshot = normalizeRewardSnapshot({
    dateKey: '2026-08-28',
    globalRewardsToday: 2,
    allowances: [
      { reward_key: 'tasks', temporary_bonus: 4, temporary_date: '2026-08-28', permanent_bonus: 0 },
      { reward_key: 'habits', temporary_bonus: 0, temporary_date: null, permanent_bonus: 2 },
    ],
  });
  assert.deepEqual(snapshot, {
    dateKey: '2026-08-28',
    globalRewardsToday: 2,
    boostsByKey: { tasks: 1, habits: 1 },
    available: true,
  });
});

test('client-earned provisional reward survives a temporary server refresh failure', async () => {
  const state = await import('../src/utils/ads/reward-state.ts');
  state.resetProvisionalRewards();
  state.addProvisionalReward('tasks');
  const snapshot = state.withProvisionalRewards({
    dateKey: '2026-08-28',
    globalRewardsToday: 0,
    boostsByKey: {},
    available: false,
    error: 'offline',
  });
  assert.equal(snapshot.available, false);
  assert.equal(snapshot.globalRewardsToday, 1);
  assert.equal(snapshot.boostsByKey.tasks, 1);
  state.resetProvisionalRewards();
});
