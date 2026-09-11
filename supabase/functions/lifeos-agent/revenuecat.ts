export interface RevenueCatLookupResult {
  active: boolean;
  entitlement: Record<string, unknown> | null;
}

export function hasActiveEntitlement(
  customerInfo: any,
  entitlementId = 'pro',
  now = new Date(),
): boolean {
  const entitlement = customerInfo?.subscriber?.entitlements?.[entitlementId];
  if (!entitlement || typeof entitlement !== 'object') return false;

  const expiresDate = entitlement.expires_date;
  const graceDate = entitlement.grace_period_expires_date;

  if (expiresDate === null) return true;

  const expiry = typeof expiresDate === 'string' ? Date.parse(expiresDate) : Number.NaN;
  if (Number.isFinite(expiry) && expiry > now.getTime()) return true;

  const graceExpiry = typeof graceDate === 'string' ? Date.parse(graceDate) : Number.NaN;
  return Number.isFinite(graceExpiry) && graceExpiry > now.getTime();
}

export async function fetchRevenueCatPro({
  userId,
  apiKey,
  entitlementId = 'pro',
  fetchImpl = fetch,
}: {
  userId: string;
  apiKey: string;
  entitlementId?: string;
  fetchImpl?: typeof fetch;
}): Promise<RevenueCatLookupResult> {
  if (!userId) throw new Error('RevenueCat user id is required');
  if (!apiKey) throw new Error('RevenueCat secret API key is not configured');

  const response = await fetchImpl(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`RevenueCat lookup failed (${response.status})`);
  }

  const body: any = await response.json();
  const entitlement = body?.subscriber?.entitlements?.[entitlementId] ?? null;
  return {
    active: hasActiveEntitlement(body, entitlementId),
    entitlement,
  };
}
