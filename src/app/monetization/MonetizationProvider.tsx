import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { configureSubscriptions } from '../../utils/subscriptions.ts';
import { unavailableSubscriptionState, type SubscriptionState } from '../../utils/subscription-model.ts';
import { REWARD_POLICIES, localDateKey, type RewardKey } from '../../utils/ads/reward-policy.ts';
import { decideCreationGate, type GateDecision } from '../../utils/ads/reward-gate-model.ts';
import {
  addProvisionalReward,
  loadRewardSnapshot,
  resetProvisionalRewards,
  type RewardSnapshot,
} from '../../utils/ads/reward-state.ts';
import {
  prepareAdPrivacy,
  showPrivacyOptions,
  showRewardedAd,
} from '../../utils/ads/ad-service.ts';
import { RewardGateDialog } from '../components/RewardGateDialog.tsx';
import { ProPaywall } from '../components/ProPaywall.tsx';

interface GuardCreationInput {
  key: RewardKey;
  currentCount: number;
}

interface MonetizationContextValue {
  isPro: boolean;
  subscription: SubscriptionState;
  subscriptionLoading: boolean;
  rewards: RewardSnapshot;
  guardCreation: (input: GuardCreationInput) => Promise<boolean>;
  openPro: () => void;
  refresh: () => Promise<void>;
  privacyOptionsRequired: boolean;
  openPrivacyOptions: () => Promise<void>;
}

const emptyRewards = (): RewardSnapshot => ({
  dateKey: localDateKey(),
  globalRewardsToday: 0,
  boostsByKey: {},
  available: false,
});

const MonetizationContext = createContext<MonetizationContextValue | null>(null);

type ActiveGate = {
  input: GuardCreationInput;
  decision: GateDecision;
  resolve: (allowed: boolean) => void;
  serverUnavailable: boolean;
};

export function MonetizationProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [subscription, setSubscription] = useState<SubscriptionState>(() => unavailableSubscriptionState('جاري التحقق من خطة الحساب...'));
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [rewards, setRewards] = useState<RewardSnapshot>(() => emptyRewards());
  const [privacyOptionsRequired, setPrivacyOptionsRequired] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [activeGate, setActiveGate] = useState<ActiveGate | null>(null);
  const [adBusy, setAdBusy] = useState(false);
  const [adError, setAdError] = useState('');
  const gateRef = useRef<ActiveGate | null>(null);
  const subscriptionReadyRef = useRef<Promise<SubscriptionState> | null>(null);
  const rewardReadyRef = useRef<Promise<RewardSnapshot> | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const next = await loadRewardSnapshot(userId);
    setRewards(next);
  }, [userId]);

  useEffect(() => {
    let active = true;
    resetProvisionalRewards();
    setRewards(emptyRewards());
    setSubscriptionLoading(true);

    if (!userId) {
      setSubscription(unavailableSubscriptionState('لا يوجد مستخدم مسجل الدخول.'));
      setSubscriptionLoading(false);
      return () => { active = false; };
    }

    const subscriptionPromise = configureSubscriptions(userId);
    subscriptionReadyRef.current = subscriptionPromise;
    void (async () => {
      try {
        const state = await subscriptionPromise;
        if (!active) return;
        setSubscription(state);
        if (!state.isPro) {
          try {
            const info = await prepareAdPrivacy();
            if (active) setPrivacyOptionsRequired(info.privacyOptionsRequired);
          } catch {
            if (active) setPrivacyOptionsRequired(false);
          }
        } else {
          setPrivacyOptionsRequired(false);
        }
      } finally {
        if (active) setSubscriptionLoading(false);
      }
    })();

    const rewardPromise = loadRewardSnapshot(userId);
    rewardReadyRef.current = rewardPromise;
    void rewardPromise.then(next => { if (active) setRewards(next); });

    return () => {
      active = false;
      const pending = gateRef.current;
      if (pending) pending.resolve(false);
      gateRef.current = null;
      subscriptionReadyRef.current = null;
      rewardReadyRef.current = null;
      resetProvisionalRewards();
    };
  }, [userId]);

  const closeGate = useCallback((allowed: boolean) => {
    const pending = gateRef.current;
    if (!pending) return;
    gateRef.current = null;
    setActiveGate(null);
    setAdBusy(false);
    setAdError('');
    pending.resolve(allowed);
  }, []);

  const guardCreation = useCallback(async ({ key, currentCount }: GuardCreationInput): Promise<boolean> => {
    let currentSubscription = subscription;
    if (subscriptionLoading && subscriptionReadyRef.current) {
      try {
        currentSubscription = await subscriptionReadyRef.current;
        setSubscription(currentSubscription);
      } catch {
        // Keep the conservative unavailable/free state when billing lookup fails.
      }
    }
    if (currentSubscription.isPro) return true;
    if (gateRef.current) return false;

    let currentRewards = rewards;
    if (!currentRewards.available && rewardReadyRef.current) {
      try {
        currentRewards = await rewardReadyRef.current;
        setRewards(currentRewards);
      } catch {
        // The normal unavailable state below will prevent offering an unverifiable reward.
      }
    }
    const dateChanged = rewards.dateKey !== localDateKey();
    if (dateChanged || currentRewards.dateKey !== localDateKey()) {
      currentRewards = await loadRewardSnapshot(userId);
      setRewards(currentRewards);
    }

    const earnedBoosts = currentRewards.boostsByKey[key] || 0;
    const decision = decideCreationGate({
      key,
      currentCount,
      earnedBoosts,
      globalRewardsToday: currentRewards.globalRewardsToday,
      isPro: currentSubscription.isPro,
    });
    if (decision.kind === 'allowed') return true;

    return new Promise<boolean>((resolve) => {
      // At/over the base limit we require a server snapshot before offering
      // an ad, so an unknown server cap can never be treated as zero.
      const serverUnavailable = !currentRewards.available && decision.kind === 'reward_available';
      const request: ActiveGate = { input: { key, currentCount }, decision, resolve, serverUnavailable };
      gateRef.current = request;
      setAdError('');
      setActiveGate(request);
    });
  }, [rewards, subscription, subscriptionLoading, userId]);

  const watchReward = useCallback(async () => {
    const pending = gateRef.current;
    if (!pending || pending.decision.kind !== 'reward_available' || pending.serverUnavailable) return;
    setAdBusy(true);
    setAdError('');
    try {
      const result = await showRewardedAd({ userId, rewardKey: pending.input.key });
      if (!result.earned) {
        setAdBusy(false);
        setAdError('لم يكتمل الإعلان، لذلك لم تُضف المكافأة.');
        return;
      }

      const policy = REWARD_POLICIES[pending.input.key];
      addProvisionalReward(pending.input.key);
      setRewards(prev => ({
        ...prev,
        globalRewardsToday: Math.min(6, prev.globalRewardsToday + 1),
        boostsByKey: {
          ...prev.boostsByKey,
          [pending.input.key]: Math.min(policy.featureAdCap, (prev.boostsByKey[pending.input.key] || 0) + 1),
        },
      }));
      closeGate(true);
      window.setTimeout(() => { void refresh(); }, 1500);
    } catch (error: any) {
      setAdBusy(false);
      setAdError(error?.message || 'الإعلان غير متاح حاليًا. جرّب مرة أخرى بعد قليل.');
    }
  }, [closeGate, refresh, userId]);

  const openPrivacyOptions = useCallback(async () => {
    await showPrivacyOptions();
    const info = await prepareAdPrivacy();
    setPrivacyOptionsRequired(info.privacyOptionsRequired);
  }, []);

  const value = useMemo<MonetizationContextValue>(() => ({
    isPro: subscription.isPro,
    subscription,
    subscriptionLoading,
    rewards,
    guardCreation,
    openPro: () => setPaywallOpen(true),
    refresh,
    privacyOptionsRequired,
    openPrivacyOptions,
  }), [subscription, subscriptionLoading, rewards, guardCreation, refresh, privacyOptionsRequired, openPrivacyOptions]);

  const policy = activeGate ? REWARD_POLICIES[activeGate.input.key] : null;

  return (
    <MonetizationContext.Provider value={value}>
      {children}
      <RewardGateDialog
        open={!!activeGate}
        policy={policy}
        decision={activeGate?.decision || null}
        busy={adBusy}
        error={adError}
        serverUnavailable={activeGate?.serverUnavailable || false}
        onReward={watchReward}
        onPro={() => { closeGate(false); setPaywallOpen(true); }}
        onCancel={() => closeGate(false)}
      />
      <ProPaywall
        open={paywallOpen}
        state={subscription}
        onClose={() => setPaywallOpen(false)}
        onStateChange={(next) => {
          setSubscription(next);
          if (next.isPro) {
            const pending = gateRef.current;
            if (pending) closeGate(true);
          }
        }}
      />
    </MonetizationContext.Provider>
  );
}

export function useMonetization(): MonetizationContextValue {
  const value = useContext(MonetizationContext);
  if (!value) throw new Error('useMonetization must be used inside MonetizationProvider');
  return value;
}
