import { REWARD_POLICIES, type RewardKey } from './reward-policy.ts';

export type GateDecision =
  | { kind: 'allowed'; limit: number }
  | { kind: 'reward_available'; limit: number; rewardAmount: number };

export interface CreationGateInput {
  key: RewardKey;
  currentCount: number;
  earnedBoosts: number;
  globalRewardsToday: number;
  isPro: boolean;
}

export function effectiveLimit(key: RewardKey, earnedBoosts: number): number {
  const policy = REWARD_POLICIES[key];
  const packs = Math.max(0, Math.floor(earnedBoosts || 0));
  return policy.base + packs * policy.reward;
}

export function decideCreationGate(input: CreationGateInput): GateDecision {
  const policy = REWARD_POLICIES[input.key];
  const limit = effectiveLimit(input.key, input.earnedBoosts);

  if (input.isPro || input.currentCount < limit) return { kind: 'allowed', limit };
  return { kind: 'reward_available', limit, rewardAmount: policy.reward };
}
