import { Capacitor } from '@capacitor/core';
import {
  AdMob,
  AdmobConsentStatus,
} from '@capacitor-community/admob';
import { localDateKey, type RewardKey } from './reward-policy.ts';

const DEMO_REWARDED_ID = 'ca-app-pub-3940256099942544/5224354917';

let initialized = false;
let initializePromise: Promise<void> | null = null;
let privacyState = {
  canRequestAds: false,
  privacyOptionsRequired: false,
  prepared: false,
};

function rewardedAdId(): string {
  return String((import.meta as any).env?.VITE_ADMOB_REWARDED_AD_UNIT_ID || '').trim();
}

export async function initializeAds(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  if (initialized) return;
  if (!initializePromise) {
    initializePromise = AdMob.initialize().then(() => { initialized = true; });
  }
  await initializePromise;
}

export async function prepareAdPrivacy(): Promise<{ canRequestAds: boolean; privacyOptionsRequired: boolean }> {
  if (!Capacitor.isNativePlatform()) {
    privacyState = { canRequestAds: false, privacyOptionsRequired: false, prepared: true };
    return { canRequestAds: false, privacyOptionsRequired: false };
  }

  await initializeAds();
  let consentInfo = await AdMob.requestConsentInfo();
  if (consentInfo.isConsentFormAvailable && consentInfo.status === AdmobConsentStatus.REQUIRED) {
    consentInfo = await AdMob.showConsentForm();
  }

  privacyState = {
    canRequestAds: consentInfo.canRequestAds === true,
    privacyOptionsRequired: consentInfo.privacyOptionsRequirementStatus === 'REQUIRED',
    prepared: true,
  };

  return {
    canRequestAds: privacyState.canRequestAds,
    privacyOptionsRequired: privacyState.privacyOptionsRequired,
  };
}

export function currentAdPrivacyState(): { canRequestAds: boolean; privacyOptionsRequired: boolean; prepared: boolean } {
  return { ...privacyState };
}

export async function showPrivacyOptions(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  await initializeAds();
  await AdMob.showPrivacyOptionsForm();
  await prepareAdPrivacy();
}

export async function showRewardedAd(input: { userId: string; rewardKey: RewardKey }): Promise<{ earned: boolean }> {
  if (!Capacitor.isNativePlatform()) throw new Error('الإعلانات المكافئة تعمل داخل تطبيق Android فقط.');
  if (!input.userId) throw new Error('يجب تسجيل الدخول قبل مشاهدة الإعلان.');

  const consent = privacyState.prepared ? privacyState : await prepareAdPrivacy();
  if (consent.canRequestAds !== true) {
    throw new Error('لا يمكن طلب إعلان قبل إكمال خيارات خصوصية الإعلانات.');
  }

  const adId = rewardedAdId();
  if (!adId) throw new Error('إعلان المكافأة غير مهيأ على هذه النسخة بعد.');

  await AdMob.prepareRewardVideoAd({
    adId,
    isTesting: adId === DEMO_REWARDED_ID,
    ssv: {
      userId: input.userId,
      customData: JSON.stringify({
        v: 1,
        rewardKey: input.rewardKey,
        localDate: localDateKey(),
        tzOffsetMinutes: new Date().getTimezoneOffset(),
      }),
    },
  });

  const reward = await AdMob.showRewardVideoAd();
  return { earned: Number(reward?.amount || 0) > 0 };
}
