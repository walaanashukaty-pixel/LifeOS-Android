import { REWARD_POLICIES, localDateKey, type RewardKey } from './reward-policy.ts';

export interface RewardAllowanceRow {
  reward_key: string;
  permanent_bonus?: number | null;
  temporary_bonus?: number | null;
  temporary_date?: string | null;
  feature_unlock_until?: string | null;
}

export interface RewardSnapshot {
  dateKey: string;
  globalRewardsToday: number;
  boostsByKey: Partial<Record<RewardKey, number>>;
  available: boolean;
  error?: string;
}

export interface NormalizeRewardSnapshotInput {
  dateKey: string;
  globalRewardsToday: number;
  allowances: RewardAllowanceRow[];
}

const provisionalByKey = new Map<RewardKey, number>();
const provisionalBaseline = new Map<RewardKey, number>();
let lastServerSnapshot: RewardSnapshot | null = null;

function isRewardKey(value: string): value is RewardKey {
  return Object.prototype.hasOwnProperty.call(REWARD_POLICIES, value);
}

export function normalizeRewardSnapshot(input: NormalizeRewardSnapshotInput): RewardSnapshot {
  const boostsByKey: Partial<Record<RewardKey, number>> = {};

  for (const row of input.allowances || []) {
    if (!isRewardKey(row.reward_key)) continue;
    const policy = REWARD_POLICIES[row.reward_key];
    const rawBonus = policy.mode === 'daily'
      ? (row.temporary_date === input.dateKey ? Number(row.temporary_bonus || 0) : 0)
      : Number(row.permanent_bonus || 0);
    const boosts = Math.max(0, Math.min(policy.featureAdCap, Math.floor(rawBonus / policy.reward)));
    if (boosts > 0) boostsByKey[row.reward_key] = boosts;
  }

  return {
    dateKey: input.dateKey,
    globalRewardsToday: Math.max(0, Number(input.globalRewardsToday || 0)),
    boostsByKey,
    available: true,
  };
}

export function withProvisionalRewards(snapshot: RewardSnapshot): RewardSnapshot {
  if (provisionalByKey.size === 0) return snapshot;
  const boostsByKey: Partial<Record<RewardKey, number>> = { ...snapshot.boostsByKey };
  let provisionalCount = 0;

  for (const [key, pending] of provisionalByKey) {
    if (pending <= 0) continue;
    const policy = REWARD_POLICIES[key];
    boostsByKey[key] = Math.min(policy.featureAdCap, (boostsByKey[key] || 0) + pending);
    provisionalCount += pending;
  }

  return {
    ...snapshot,
    globalRewardsToday: Math.min(6, snapshot.globalRewardsToday + provisionalCount),
    boostsByKey,
  };
}

export function addProvisionalReward(rewardKey: RewardKey): void {
  if (!provisionalByKey.has(rewardKey)) {
    provisionalBaseline.set(rewardKey, lastServerSnapshot?.boostsByKey?.[rewardKey] || 0);
  }
  provisionalByKey.set(rewardKey, (provisionalByKey.get(rewardKey) || 0) + 1);
}

export function clearConfirmedProvisionalRewards(serverSnapshot: RewardSnapshot): void {
  if (!serverSnapshot.available) return;

  for (const [key, pending] of [...provisionalByKey.entries()]) {
    const baseline = provisionalBaseline.get(key) || 0;
    const confirmedDelta = Math.max(0, (serverSnapshot.boostsByKey[key] || 0) - baseline);
    if (confirmedDelta >= pending) {
      provisionalByKey.delete(key);
      provisionalBaseline.delete(key);
    } else if (confirmedDelta > 0) {
      provisionalByKey.set(key, pending - confirmedDelta);
      provisionalBaseline.set(key, serverSnapshot.boostsByKey[key] || 0);
    }
  }

  lastServerSnapshot = serverSnapshot;
}

export function resetProvisionalRewards(): void {
  provisionalByKey.clear();
  provisionalBaseline.clear();
  lastServerSnapshot = null;
}

export async function loadRewardSnapshot(userId: string): Promise<RewardSnapshot> {
  const dateKey = localDateKey();
  if (!userId) {
    return { dateKey, globalRewardsToday: 0, boostsByKey: {}, available: false, error: 'لا يوجد مستخدم مسجل الدخول.' };
  }

  try {
    // Dynamic import keeps this module's pure normalizer runnable in Node tests
    // without loading the browser/Supabase client.
    const { supabase } = await import('../api.ts');
    const [allowancesResult, eventsResult] = await Promise.all([
      supabase
        .from('ad_reward_allowances')
        .select('reward_key, permanent_bonus, temporary_bonus, temporary_date, feature_unlock_until')
        .eq('user_id', userId),
      supabase
        .from('ad_reward_events')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('reward_date', dateKey)
        .eq('verified', true),
    ]);

    if (allowancesResult.error) throw allowancesResult.error;
    if (eventsResult.error) throw eventsResult.error;

    const snapshot = normalizeRewardSnapshot({
      dateKey,
      globalRewardsToday: eventsResult.count || 0,
      allowances: (allowancesResult.data || []) as RewardAllowanceRow[],
    });
    clearConfirmedProvisionalRewards(snapshot);
    lastServerSnapshot = snapshot;
    return withProvisionalRewards(snapshot);
  } catch (error: any) {
    return withProvisionalRewards({
      dateKey,
      globalRewardsToday: 0,
      boostsByKey: {},
      available: false,
      error: error?.message || 'تعذر تحميل مكافآت الإعلانات.',
    });
  }
}
