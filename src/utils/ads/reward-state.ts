import { REWARD_POLICIES, localDateKey, type RewardKey } from './reward-policy.ts';

export interface RewardAllowanceRow {
  reward_key: string;
  permanent_bonus?: number | null;
  temporary_bonus?: number | null;
  temporary_date?: string | null;
  feature_unlock_until?: string | null;
}

export interface RewardEventRow {
  reward_key: string;
}

export interface RewardSnapshot {
  dateKey: string;
  globalRewardsToday: number;
  boostsByKey: Partial<Record<RewardKey, number>>;
  adViewsByKey: Partial<Record<RewardKey, number>>;
  available: boolean;
  error?: string;
}

export interface NormalizeRewardSnapshotInput {
  dateKey: string;
  allowances: RewardAllowanceRow[];
  events?: RewardEventRow[];
  globalRewardsToday?: number;
}

const provisionalAdsByKey = new Map<RewardKey, number>();
const provisionalBaselineAds = new Map<RewardKey, number>();
let lastServerSnapshot: RewardSnapshot | null = null;

function isRewardKey(value: string): value is RewardKey {
  return Object.prototype.hasOwnProperty.call(REWARD_POLICIES, value);
}

export function normalizeRewardSnapshot(input: NormalizeRewardSnapshotInput): RewardSnapshot {
  const boostsByKey: Partial<Record<RewardKey, number>> = {};
  const adViewsByKey: Partial<Record<RewardKey, number>> = {};

  for (const row of input.allowances || []) {
    if (!isRewardKey(row.reward_key)) continue;
    const policy = REWARD_POLICIES[row.reward_key];
    const rawBonus = row.temporary_date === input.dateKey ? Number(row.temporary_bonus || 0) : 0;
    const boosts = Math.max(0, Math.floor(rawBonus / policy.reward));
    if (boosts > 0) boostsByKey[row.reward_key] = boosts;
  }

  for (const event of input.events || []) {
    if (!isRewardKey(event.reward_key)) continue;
    adViewsByKey[event.reward_key] = (adViewsByKey[event.reward_key] || 0) + 1;
  }

  const globalRewardsToday = input.events
    ? input.events.length
    : Math.max(0, Number(input.globalRewardsToday || 0));

  return {
    dateKey: input.dateKey,
    globalRewardsToday,
    boostsByKey,
    adViewsByKey,
    available: true,
  };
}

export function withProvisionalRewards(snapshot: RewardSnapshot): RewardSnapshot {
  if (provisionalAdsByKey.size === 0) return snapshot;
  const boostsByKey: Partial<Record<RewardKey, number>> = { ...snapshot.boostsByKey };
  const adViewsByKey: Partial<Record<RewardKey, number>> = { ...snapshot.adViewsByKey };
  let pendingTotal = 0;

  for (const [key, pending] of provisionalAdsByKey) {
    if (pending <= 0) continue;
    const policy = REWARD_POLICIES[key];
    const serverViews = adViewsByKey[key] || 0;
    const additionalPacks = Math.floor(((serverViews % policy.adsPerReward) + pending) / policy.adsPerReward);
    adViewsByKey[key] = serverViews + pending;
    boostsByKey[key] = (boostsByKey[key] || 0) + additionalPacks;
    pendingTotal += pending;
  }

  return {
    ...snapshot,
    globalRewardsToday: snapshot.globalRewardsToday + pendingTotal,
    boostsByKey,
    adViewsByKey,
  };
}

export function addProvisionalAdView(rewardKey: RewardKey): void {
  if (!provisionalAdsByKey.has(rewardKey)) {
    provisionalBaselineAds.set(rewardKey, lastServerSnapshot?.adViewsByKey?.[rewardKey] || 0);
  }
  provisionalAdsByKey.set(rewardKey, (provisionalAdsByKey.get(rewardKey) || 0) + 1);
}

// Backwards-compatible alias used by older call sites.
export const addProvisionalReward = addProvisionalAdView;

export function clearConfirmedProvisionalRewards(serverSnapshot: RewardSnapshot): void {
  if (!serverSnapshot.available) return;

  for (const [key, pending] of [...provisionalAdsByKey.entries()]) {
    const baseline = provisionalBaselineAds.get(key) || 0;
    const confirmedDelta = Math.max(0, (serverSnapshot.adViewsByKey[key] || 0) - baseline);
    if (confirmedDelta >= pending) {
      provisionalAdsByKey.delete(key);
      provisionalBaselineAds.delete(key);
    } else if (confirmedDelta > 0) {
      provisionalAdsByKey.set(key, pending - confirmedDelta);
      provisionalBaselineAds.set(key, serverSnapshot.adViewsByKey[key] || 0);
    }
  }

  lastServerSnapshot = serverSnapshot;
}

export function resetProvisionalRewards(): void {
  provisionalAdsByKey.clear();
  provisionalBaselineAds.clear();
  lastServerSnapshot = null;
}

export async function loadRewardSnapshot(userId: string): Promise<RewardSnapshot> {
  const dateKey = localDateKey();
  if (!userId) {
    return { dateKey, globalRewardsToday: 0, boostsByKey: {}, adViewsByKey: {}, available: false, error: 'لا يوجد مستخدم مسجل الدخول.' };
  }

  try {
    const { supabase } = await import('../api.ts');
    const [allowancesResult, eventsResult] = await Promise.all([
      supabase
        .from('ad_reward_allowances')
        .select('reward_key, permanent_bonus, temporary_bonus, temporary_date, feature_unlock_until')
        .eq('user_id', userId),
      supabase
        .from('ad_reward_events')
        .select('reward_key')
        .eq('user_id', userId)
        .eq('reward_date', dateKey)
        .eq('verified', true),
    ]);

    if (allowancesResult.error) throw allowancesResult.error;
    if (eventsResult.error) throw eventsResult.error;

    const snapshot = normalizeRewardSnapshot({
      dateKey,
      allowances: (allowancesResult.data || []) as RewardAllowanceRow[],
      events: (eventsResult.data || []) as RewardEventRow[],
    });
    clearConfirmedProvisionalRewards(snapshot);
    lastServerSnapshot = snapshot;
    return withProvisionalRewards(snapshot);
  } catch (error: any) {
    return withProvisionalRewards({
      dateKey,
      globalRewardsToday: 0,
      boostsByKey: {},
      adViewsByKey: {},
      available: false,
      error: error?.message || 'تعذر تحميل مكافآت الإعلانات.',
    });
  }
}
