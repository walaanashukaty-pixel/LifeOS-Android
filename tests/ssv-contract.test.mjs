import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('reward tables use RLS and owner-select-only policies', async () => {
  const sql = await readFile('supabase/migrations/20260828000100_ad_reward_state.sql', 'utf8');
  assert.match(sql, /create table if not exists public\.ad_reward_events/i);
  assert.match(sql, /transaction_id\s+text\s+not null\s+unique/i);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /for select\s+to authenticated/i);
  assert.doesNotMatch(sql, /for insert\s+to authenticated/i);
  assert.doesNotMatch(sql, /for update\s+to authenticated/i);
});

test('SSV function is public to Google but verifies signatures itself', async () => {
  const config = await readFile('supabase/config.toml', 'utf8');
  const index = await readFile('supabase/functions/admob-ssv/index.ts', 'utf8');
  assert.match(config, /\[functions\.admob-ssv\][\s\S]*verify_jwt\s*=\s*false/);
  assert.match(index, /verifyAdMobSsv/);
  assert.match(index, /transactionId/);
  assert.match(index, /policy\.adsPerReward/);
});

test('latest verified grant is idempotent, daily, unlimited, and grants on every second ad', async () => {
  const sql = await readFile('supabase/migrations/20260910230900_daily_reward_packs.sql', 'utf8');
  const index = await readFile('supabase/functions/admob-ssv/index.ts', 'utf8');
  assert.match(sql, /grant_verified_ad_reward/i);
  assert.match(sql, /on conflict \(transaction_id\)/i);
  assert.match(sql, /mod\(v_feature_count, v_pack_size\)\s*=\s*0/i);
  assert.match(sql, /temporary_date\s*=\s*p_server_date/i);
  assert.match(sql, /permanent_bonus\s*=\s*0/i);
  assert.doesNotMatch(sql, /daily_reward_cap|v_global_count|p_global_cap/i);
  assert.match(index, /REWARD_POLICIES\[rewardKey\]/);
  assert.match(index, /grant_verified_ad_reward/);
  assert.match(index, /policy\.adsPerReward/);
});

test('server SSV reward policy stays identical to client reward matrix', async () => {
  const client = await import('../src/utils/ads/reward-policy.ts');
  const server = await import('../supabase/functions/admob-ssv/reward-policy.ts');
  assert.equal(server.REWARD_ADS_PER_PACK, client.REWARD_ADS_PER_PACK);
  assert.equal(server.REWARD_CAPACITY_PER_PACK, client.REWARD_CAPACITY_PER_PACK);
  for (const [key, policy] of Object.entries(client.REWARD_POLICIES)) {
    const s = server.REWARD_POLICIES[key];
    assert.ok(s, `missing server policy ${key}`);
    assert.deepEqual(
      { base: s.base, reward: s.reward, mode: s.mode, adsPerReward: s.adsPerReward },
      { base: policy.base, reward: policy.reward, mode: policy.mode, adsPerReward: policy.adsPerReward },
    );
  }
});

test('latest grant is serialized per user under concurrent callbacks', async () => {
  const sql = await readFile('supabase/migrations/20260910230900_daily_reward_packs.sql', 'utf8');
  assert.match(sql, /pg_advisory_xact_lock/i);
  assert.match(sql, /hashtextextended\(p_user_id::text/i);
});

test('SSV verifier slices the raw request query before signature without URL reserialization', async () => {
  const verify = await readFile('supabase/functions/admob-ssv/verify.ts', 'utf8');
  assert.match(verify, /requestUrl\.indexOf\('\?'\)/);
  assert.doesNotMatch(verify, /new URL\(requestUrl\)/);
});

test('SSV custom data is parsed once after URLSearchParams decoding', async () => {
  const index = await readFile('supabase/functions/admob-ssv/index.ts', 'utf8');
  assert.match(index, /JSON\.parse\(verified\.customData \?\? ''\)/);
  assert.doesNotMatch(index, /decodeURIComponent\(verified\.customData/);
});
