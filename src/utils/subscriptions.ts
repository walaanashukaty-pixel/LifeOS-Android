import { Capacitor } from '@capacitor/core';
import {
  LOG_LEVEL,
  Purchases,
  type PurchasesPackage,
} from '@revenuecat/purchases-capacitor';
import {
  extractCustomerInfo,
  toSubscriptionState,
  unavailableSubscriptionState,
  type SubscriptionState,
} from './subscription-model';

const PRO_ENTITLEMENT_ID = 'pro';
let configured = false;
let configuredUserId: string | null = null;

export interface LifeOSSubscriptionPackage {
  id: string;
  packageType: string;
  title: string;
  description: string;
  priceString: string;
  pricePerMonthString: string | null;
  raw: PurchasesPackage;
}

function androidApiKey(): string {
  return String((import.meta as any).env?.VITE_REVENUECAT_ANDROID_API_KEY || '').trim();
}

export function subscriptionEnvironmentStatus(): { native: boolean; configured: boolean; message?: string } {
  if (!Capacitor.isNativePlatform()) {
    return { native: false, configured: false, message: 'الاشتراكات المدفوعة تعمل داخل تطبيق Android.' };
  }
  if (!androidApiKey()) {
    return { native: true, configured: false, message: 'لم يتم ربط مفتاح RevenueCat الخاص بـ Android بعد.' };
  }
  return { native: true, configured: true };
}

export async function configureSubscriptions(userId: string): Promise<SubscriptionState> {
  const env = subscriptionEnvironmentStatus();
  if (!env.configured) return unavailableSubscriptionState(env.message);
  if (!userId) return unavailableSubscriptionState('لا يوجد مستخدم مسجل الدخول.');

  try {
    if (!configured) {
      await Purchases.setLogLevel({ level: LOG_LEVEL.WARN });
      await Purchases.configure({ apiKey: androidApiKey(), appUserID: userId });
      configured = true;
      configuredUserId = userId;
    } else if (configuredUserId !== userId) {
      await Purchases.logIn({ appUserID: userId });
      configuredUserId = userId;
    }
    return getSubscriptionState();
  } catch (error: any) {
    return unavailableSubscriptionState(error?.message || 'تعذر تهيئة نظام الاشتراك.');
  }
}

export async function getSubscriptionState(): Promise<SubscriptionState> {
  const env = subscriptionEnvironmentStatus();
  if (!env.configured || !configured) return unavailableSubscriptionState(env.message || 'نظام الاشتراك غير جاهز.');
  try {
    const result: any = await Purchases.getCustomerInfo();
    return toSubscriptionState(extractCustomerInfo(result));
  } catch (error: any) {
    return unavailableSubscriptionState(error?.message || 'تعذر التحقق من الاشتراك.');
  }
}

export async function getSubscriptionPackages(): Promise<LifeOSSubscriptionPackage[]> {
  if (!configured) throw new Error('نظام الاشتراك غير مهيأ بعد.');
  const offerings = await Purchases.getOfferings();
  const packages = offerings.current?.availablePackages ?? [];
  return packages.map(pkg => ({
    id: pkg.identifier,
    packageType: String(pkg.packageType),
    title: pkg.product.title,
    description: pkg.product.description,
    priceString: pkg.product.priceString,
    pricePerMonthString: pkg.product.pricePerMonthString ?? null,
    raw: pkg,
  }));
}

export async function purchaseSubscriptionPackage(pkg: LifeOSSubscriptionPackage): Promise<SubscriptionState> {
  if (!configured) throw new Error('نظام الاشتراك غير مهيأ بعد.');
  try {
    const result = await Purchases.purchasePackage({ aPackage: pkg.raw });
    return toSubscriptionState(result.customerInfo);
  } catch (error: any) {
    if (error?.userCancelled) throw new Error('تم إلغاء عملية الشراء.');
    throw new Error(error?.message || 'تعذر إتمام عملية الاشتراك.');
  }
}

export async function restoreSubscriptionPurchases(): Promise<SubscriptionState> {
  if (!configured) throw new Error('نظام الاشتراك غير مهيأ بعد.');
  const result: any = await Purchases.restorePurchases();
  return toSubscriptionState(extractCustomerInfo(result));
}

export async function resetSubscriptionIdentity(): Promise<void> {
  if (!configured) return;
  try { await Purchases.logOut(); } catch { /* keep logout resilient */ }
  configuredUserId = null;
}

export { PRO_ENTITLEMENT_ID };
