import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { configureSubscriptions } from '../../utils/subscriptions.ts';
import { unavailableSubscriptionState, type SubscriptionState } from '../../utils/subscription-model.ts';
import { REWARD_POLICIES, localDateKey, type RewardKey } from '../../utils/ads/reward-policy.ts';
import { decideCreationGate, type GateDecision } from '../../utils/ads/reward-gate-model.ts';
import {
  addProvisionalAdView,
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
import { isProPreviewBuild } from '../agent/pro-preview.ts';
import { ProOnboardingFlow } from '../pro/ProOnboardingFlow.tsx';
import { deletePersonalizationProfile, loadPersonalizationProfile, savePersonalizationProfile } from '../pro/personalization-service.ts';
import type { LifeOSPersonalizationDraft, LifeOSPersonalizationProfile } from '../pro/personalization-types.ts';
import { defaultAIUserSettingsForUser, loadAIUserSettings, saveAIUserSettings } from '../pro/ai-settings-service.ts';
import type { LifeOSAIUserSettings, LifeOSAIUserSettingsDraft } from '../pro/ai-settings-types.ts';
import { refreshSmartNotifications } from '../pro/smart-notifications.ts';

interface GuardCreationInput {
  key: RewardKey;
  currentCount: number;
}

interface MonetizationContextValue {
  isPro: boolean;
  proPreviewAllowed: boolean;
  proPreviewActive: boolean;
  proExperienceEnabled: boolean;
  startProPreview: () => void;
  stopProPreview: () => void;
  subscription: SubscriptionState;
  subscriptionLoading: boolean;
  rewards: RewardSnapshot;
  guardCreation: (input: GuardCreationInput) => Promise<boolean>;
  openPro: () => void;
  refresh: () => Promise<void>;
  privacyOptionsRequired: boolean;
  openPrivacyOptions: () => Promise<void>;
  personalization: LifeOSPersonalizationProfile | null;
  personalizationLoading: boolean;
  openProSetup: () => void;
  forgetPersonalization: () => Promise<void>;
  aiSettings: LifeOSAIUserSettings;
  aiSettingsLoading: boolean;
  saveAISettings: (next: LifeOSAIUserSettingsDraft) => Promise<void>;
}

const emptyRewards = (): RewardSnapshot => ({
  dateKey: localDateKey(),
  globalRewardsToday: 0,
  boostsByKey: {},
  adViewsByKey: {},
  available: false,
});

const MonetizationContext = createContext<MonetizationContextValue | null>(null);

type ActiveGate = {
  input: GuardCreationInput;
  decision: GateDecision;
  resolve: (allowed: boolean) => void;
  serverUnavailable: boolean;
  adsInCurrentPack: number;
};

export function MonetizationProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [subscription, setSubscription] = useState<SubscriptionState>(() => unavailableSubscriptionState('جاري التحقق من خطة الحساب...'));
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [rewards, setRewards] = useState<RewardSnapshot>(() => emptyRewards());
  const [privacyOptionsRequired, setPrivacyOptionsRequired] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [personalization, setPersonalization] = useState<LifeOSPersonalizationProfile | null>(null);
  const [personalizationLoading, setPersonalizationLoading] = useState(true);
  const [aiSettings, setAISettings] = useState<LifeOSAIUserSettings>(() => defaultAIUserSettingsForUser(userId));
  const [aiSettingsLoading, setAISettingsLoading] = useState(true);
  const [proSetupOpen, setProSetupOpen] = useState(false);
  const [proSetupCelebration, setProSetupCelebration] = useState(false);
  const setupPromptedRef = useRef(false);
  const proPreviewAllowed = isProPreviewBuild();
  const [proPreviewActive, setProPreviewActive] = useState(false);
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
    setProPreviewActive(false);
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
        if (state.isPro) setProPreviewActive(false);
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


  useEffect(() => {
    if (!userId || typeof document === 'undefined') return;

    const refreshIfDateChanged = () => {
      if (document.visibilityState === 'hidden') return;
      if (rewards.dateKey !== localDateKey()) void refresh();
    };

    document.addEventListener('visibilitychange', refreshIfDateChanged);
    window.addEventListener('focus', refreshIfDateChanged);
    const timer = window.setInterval(refreshIfDateChanged, 60_000);

    return () => {
      document.removeEventListener('visibilitychange', refreshIfDateChanged);
      window.removeEventListener('focus', refreshIfDateChanged);
      window.clearInterval(timer);
    };
  }, [userId, rewards.dateKey, refresh]);

  useEffect(() => {
    let active = true;
    setupPromptedRef.current = false;
    setPersonalization(null);
    setPersonalizationLoading(true);
    if (!userId) {
      setPersonalizationLoading(false);
      return () => { active = false; };
    }
    void loadPersonalizationProfile(userId)
      .then(profile => { if (active) setPersonalization(profile); })
      .catch(() => { if (active) setPersonalization(null); })
      .finally(() => { if (active) setPersonalizationLoading(false); });
    return () => { active = false; };
  }, [userId]);

  useEffect(() => {
    let active = true;
    setAISettings(defaultAIUserSettingsForUser(userId));
    setAISettingsLoading(true);
    if (!userId) {
      setAISettingsLoading(false);
      return () => { active = false; };
    }
    void loadAIUserSettings(userId)
      .then(next => { if (active) setAISettings(next); })
      .catch(() => { if (active) setAISettings(defaultAIUserSettingsForUser(userId)); })
      .finally(() => { if (active) setAISettingsLoading(false); });
    return () => { active = false; };
  }, [userId]);

  useEffect(() => {
    if (!subscription.isPro || aiSettingsLoading || !userId) return;
    void refreshSmartNotifications(userId).catch(() => undefined);
  }, [subscription.isPro, aiSettingsLoading, aiSettings, userId]);

  useEffect(() => {
    if (!subscription.isPro || personalizationLoading || setupPromptedRef.current) return;
    if (personalization?.onboardingCompleted) return;
    setupPromptedRef.current = true;
    setProSetupCelebration(true);
    setProSetupOpen(true);
  }, [subscription.isPro, personalizationLoading, personalization]);

  const openProSetup = useCallback(() => {
    if (!subscription.isPro) return;
    setProSetupCelebration(false);
    setProSetupOpen(true);
  }, [subscription.isPro]);

  const saveProSetup = useCallback(async (draft: LifeOSPersonalizationDraft) => {
    const saved = await savePersonalizationProfile(userId, draft);
    setPersonalization(saved);
    setProSetupOpen(false);
    setProSetupCelebration(false);
    window.dispatchEvent(new CustomEvent('lifeos:pro-onboarding-complete'));
  }, [userId]);

  const forgetPersonalization = useCallback(async () => {
    await deletePersonalizationProfile(userId);
    setPersonalization(null);
  }, [userId]);

  const saveAISettingsValue = useCallback(async (next: LifeOSAIUserSettingsDraft) => {
    const saved = await saveAIUserSettings(userId, next);
    setAISettings(saved);
    if (subscription.isPro) void refreshSmartNotifications(userId).catch(() => undefined);
  }, [userId, subscription.isPro]);

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
      const request: ActiveGate = {
        input: { key, currentCount },
        decision,
        resolve,
        serverUnavailable,
        adsInCurrentPack: (currentRewards.adViewsByKey[key] || 0) % REWARD_POLICIES[key].adsPerReward,
      };
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
      addProvisionalAdView(pending.input.key);
      const nextInPack = pending.adsInCurrentPack + 1;
      const completedPack = nextInPack >= policy.adsPerReward;
      setRewards(prev => ({
        ...prev,
        globalRewardsToday: prev.globalRewardsToday + 1,
        adViewsByKey: {
          ...prev.adViewsByKey,
          [pending.input.key]: (prev.adViewsByKey[pending.input.key] || 0) + 1,
        },
        boostsByKey: completedPack ? {
          ...prev.boostsByKey,
          [pending.input.key]: (prev.boostsByKey[pending.input.key] || 0) + 1,
        } : prev.boostsByKey,
      }));

      if (completedPack) {
        const nextLimit = pending.decision.limit + policy.reward;
        if (pending.input.currentCount < nextLimit) {
          closeGate(true);
        } else {
          const nextGate: ActiveGate = {
            ...pending,
            decision: { kind: 'reward_available', limit: nextLimit, rewardAmount: policy.reward },
            adsInCurrentPack: 0,
          };
          gateRef.current = nextGate;
          setActiveGate(nextGate);
          setAdBusy(false);
          setAdError('');
        }
      } else {
        const nextGate = { ...pending, adsInCurrentPack: nextInPack };
        gateRef.current = nextGate;
        setActiveGate(nextGate);
        setAdBusy(false);
        setAdError('');
      }
      window.setTimeout(() => { void refresh(); }, 2500);
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

  const proExperienceEnabled = subscription.isPro || proPreviewActive;

  const value = useMemo<MonetizationContextValue>(() => ({
    isPro: subscription.isPro,
    proPreviewAllowed,
    proPreviewActive,
    proExperienceEnabled,
    startProPreview: () => {
      if (proPreviewAllowed && !subscription.isPro) setProPreviewActive(true);
    },
    stopProPreview: () => setProPreviewActive(false),
    subscription,
    subscriptionLoading,
    rewards,
    guardCreation,
    openPro: () => setPaywallOpen(true),
    refresh,
    privacyOptionsRequired,
    openPrivacyOptions,
    personalization,
    personalizationLoading,
    openProSetup,
    forgetPersonalization,
    aiSettings,
    aiSettingsLoading,
    saveAISettings: saveAISettingsValue,
  }), [subscription, subscriptionLoading, rewards, guardCreation, refresh, privacyOptionsRequired, openPrivacyOptions, proPreviewAllowed, proPreviewActive, proExperienceEnabled, personalization, personalizationLoading, openProSetup, forgetPersonalization, aiSettings, aiSettingsLoading, saveAISettingsValue]);

  const policy = activeGate ? REWARD_POLICIES[activeGate.input.key] : null;

  return (
    <MonetizationContext.Provider value={value}>
      {children}
      <RewardGateDialog
        open={!!activeGate}
        policy={policy}
        decision={activeGate?.decision || null}
        currentCount={activeGate?.input.currentCount || 0}
        adsInCurrentPack={activeGate?.adsInCurrentPack || 0}
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
        previewAllowed={proPreviewAllowed && !subscription.isPro}
        onPreview={() => {
          if (proPreviewAllowed && !subscription.isPro) {
            setProPreviewActive(true);
            setPaywallOpen(false);
          }
        }}
        onClose={() => setPaywallOpen(false)}
        onProActivated={() => {
          setProSetupCelebration(true);
          setProSetupOpen(true);
        }}
        onStateChange={(next) => {
          setSubscription(next);
          if (next.isPro) {
            const pending = gateRef.current;
            if (pending) closeGate(true);
          }
        }}
      />
      <ProOnboardingFlow
        open={proSetupOpen && subscription.isPro}
        showCelebration={proSetupCelebration}
        initialProfile={personalization}
        onSave={saveProSetup}
        onClose={() => { setProSetupOpen(false); setProSetupCelebration(false); }}
      />
    </MonetizationContext.Provider>
  );
}

export function useMonetization(): MonetizationContextValue {
  const value = useContext(MonetizationContext);
  if (!value) throw new Error('useMonetization must be used inside MonetizationProvider');
  return value;
}
