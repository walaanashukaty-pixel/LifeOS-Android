import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyAdMobSsv } from './verify.ts';
import { GLOBAL_DAILY_REWARD_CAP, REWARD_POLICIES, type RewardKey } from './reward-policy.ts';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'GET') return json({ error: 'method_not_allowed' }, 405);
  try {
    const verified = await verifyAdMobSsv(req.url);
    let custom: any;
    try { custom = JSON.parse(verified.customData ?? ''); }
    catch { return json({ error: 'invalid_custom_data' }, 400); }

    const rewardKey = String(custom?.rewardKey ?? '') as RewardKey;
    const policy = REWARD_POLICIES[rewardKey];
    if (custom?.v !== 1 || !policy) return json({ error: 'unknown_reward_key' }, 400);
    if (!UUID_RE.test(verified.userId)) return json({ error: 'invalid_user_id' }, 400);
    if (!DATE_RE.test(String(custom?.localDate ?? ''))) return json({ error: 'invalid_local_date' }, 400);
    const tzOffsetMinutes = Number(custom?.tzOffsetMinutes);
    if (!Number.isInteger(tzOffsetMinutes) || tzOffsetMinutes < -840 || tzOffsetMinutes > 840) return json({ error: 'invalid_timezone' }, 400);

    const localMs = verified.timestampMs - tzOffsetMinutes * 60_000;
    const derivedDate = new Date(localMs).toISOString().slice(0, 10);
    if (derivedDate !== custom.localDate) return json({ error: 'date_mismatch' }, 400);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    );
    const maxBonus = policy.max - policy.base;
    const { data, error } = await supabase.rpc('grant_verified_ad_reward', {
      p_user_id: verified.userId,
      p_transaction_id: verified.transactionId,
      p_reward_key: rewardKey,
      p_reward_amount: policy.reward,
      p_reward_kind: policy.mode,
      p_ad_unit: verified.adUnit,
      p_server_date: derivedDate,
      p_feature_ad_cap: policy.featureAdCap,
      p_max_bonus: maxBonus,
    });
    if (error) throw error;
    void GLOBAL_DAILY_REWARD_CAP; // shared canonical cap is imported intentionally and SQL enforces the same value.
    return json(data ?? { granted: false }, 200);
  } catch (error) {
    console.error('admob-ssv', error);
    return json({ error: 'verification_failed' }, 400);
  }
});
