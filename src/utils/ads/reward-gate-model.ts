import {
  GLOBAL_DAILY_REWARD_CAP,
  REWARD_POLICIES,
  type RewardKey,
} from './reward-policy.ts';

export type GateDecision =
  | { kind: 'allowed'; limit: number }
  | { kind: 'reward_available'; limit: number; rewardAmount: number }
  | { kind: 'daily_reward_cap'; limit: number }
  | { kind: 'pro_only'; limit: number };

export interface CreationGateInput {
  key: RewardKey;
  currentCount: number;
  earnedBoosts: number;
  globalRewardsToday: number;
  isPro: boolean;
}

export function effectiveLimit(key: RewardKey, earnedBoosts: number): number {
  const policy = REWARD_POLICIES[key];
  const clampedBoosts = Math.max(0, Math.min(Math.floor(earnedBoosts), policy.featureAdCap));
  return Math.min(policy.max, policy.base + clampedBoosts * policy.reward);
}

export function decideCreationGate(input: CreationGateInput): GateDecision {
  const policy = REWARD_POLICIES[input.key];
  const limit = effectiveLimit(input.key, input.earnedBoosts);

  if (input.isPro) return { kind: 'allowed', limit };
  if (input.currentCount < limit) return { kind: 'allowed', limit };
  if (input.earnedBoosts >= policy.featureAdCap || limit >= policy.max) {
    return { kind: 'pro_only', limit };
  }
  if (input.globalRewardsToday >= GLOBAL_DAILY_REWARD_CAP) {
    return { kind: 'daily_reward_cap', limit };
  }
  return { kind: 'reward_available', limit, rewardAmount: policy.reward };
}
