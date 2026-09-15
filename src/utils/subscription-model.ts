export type SubscriptionPlan = 'free' | 'pro';

export interface SubscriptionState {
  plan: SubscriptionPlan;
  isPro: boolean;
  available: boolean;
  expirationDate: string | null;
  willRenew: boolean;
  error?: string;
}

type CustomerInfoLike = {
  entitlements?: {
    active?: Record<string, {
      isActive?: boolean;
      expirationDate?: string | null;
      willRenew?: boolean;
    }>;
  };
} | null | undefined;


export function extractCustomerInfo(result: any): CustomerInfoLike {
  return result?.customerInfo ?? result ?? null;
}

export function hasProEntitlement(customerInfo: CustomerInfoLike): boolean {
  return customerInfo?.entitlements?.active?.pro?.isActive === true;
}

export function toSubscriptionState(customerInfo: CustomerInfoLike): SubscriptionState {
  const entitlement = customerInfo?.entitlements?.active?.pro;
  const isPro = entitlement?.isActive === true;
  return {
    plan: isPro ? 'pro' : 'free',
    isPro,
    available: true,
    expirationDate: isPro ? entitlement?.expirationDate ?? null : null,
    willRenew: isPro ? entitlement?.willRenew === true : false,
  };
}

export function unavailableSubscriptionState(error?: string): SubscriptionState {
  return {
    plan: 'free',
    isPro: false,
    available: false,
    expirationDate: null,
    willRenew: false,
    ...(error ? { error } : {}),
  };
}
