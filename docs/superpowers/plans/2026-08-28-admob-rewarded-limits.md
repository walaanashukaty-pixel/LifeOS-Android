# LifeOS AdMob Rewarded Limits Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add voluntary AdMob rewarded ads to LifeOS so Free users can unlock additional creation capacity within approved limits, while Pro users bypass all ad gates and the religious section remains completely unlimited and ad-free.

**Architecture:** A shared pure reward-policy module defines all limits. A React monetization provider owns subscription state, server-backed allowances, pending client rewards, and a promise-based creation gate used by pages before new-item writes. Android uses `@capacitor-community/admob` v8 with rewarded ads only. Supabase stores verified reward events/allowances, and a dedicated public SSV Edge Function verifies Google callbacks before permanently granting rewards.

**Tech Stack:** React 18, TypeScript 5.9, Capacitor 8.5, `@capacitor-community/admob` 8.x, RevenueCat Capacitor 13.4, Supabase Auth/Postgres/Edge Functions, Node test runner, GitHub Actions Android build.

**Spec:** `docs/superpowers/specs/2026-08-28-admob-rewarded-limits-design.md`

## Global Constraints

- Phase 1 uses **AdMob Rewarded Ads only**; no banner, native, interstitial, rewarded-interstitial, or app-open ads.
- Free users can earn at most **6 rewarded-ad rewards per local calendar day** across the app.
- Pro users bypass all creation/capacity gates and never see rewarded-ad UI.
- Religious actions and records are unlimited and must never call the ad service.
- Finance transactions/transfers, journal entries, workout/weight logging, study-session logging, and exam-result logging remain unlimited.
- Editing/deleting existing items never invokes a reward gate.
- Created data is never hidden or deleted if a bonus later expires or fails verification.
- Sensitive LifeOS content is never passed in AdMob request metadata, SSV `userId`, SSV `customData`, or monetization analytics.
- Production APKs must use the real AdMob App ID and rewarded Ad Unit ID; development/test builds use Google's demo IDs only.
- Google demo Android App ID: `ca-app-pub-3940256099942544~3347511713`.
- Google demo Android rewarded Ad Unit ID: `ca-app-pub-3940256099942544/5224354917`.
- Do not place any AdMob production secret in source control; AdMob App/Ad Unit IDs are identifiers, not authentication secrets, but production IDs still come from CI environment/secrets so test builds cannot accidentally generate production traffic.

---

## File Structure Locked for This Feature

**New client files**

- `src/utils/ads/reward-policy.ts` — canonical quota identifiers, base/reward/max values, reset type, display copy, and pure usage helpers.
- `src/utils/ads/reward-gate-model.ts` — pure gate decisions, daily-date helpers, pending reward overlay logic; no React or native plugin imports.
- `src/utils/ads/ad-service.ts` — Capacitor/AdMob initialization and one rewarded-ad load/show operation; no page/business rules.
- `src/utils/ads/reward-state.ts` — read server allowances/events from Supabase and reconcile provisional rewards.
- `src/app/monetization/MonetizationProvider.tsx` — app-wide subscription + reward state, `guardCreation()` promise API, paywall/dialog coordination.
- `src/app/components/RewardGateDialog.tsx` — common Arabic limit/reward dialog.
- `src/app/components/RewardStatus.tsx` — compact account display `مكافآت اليوم X/6`.

**New server files**

- `supabase/migrations/20260828000100_ad_reward_state.sql` — reward event and allowance tables, constraints, indexes, RLS.
- `supabase/migrations/20260828000200_grant_ad_reward.sql` — atomic idempotent verified-reward grant RPC.
- `supabase/functions/admob-ssv/index.ts` — public Google callback endpoint.
- `supabase/functions/admob-ssv/verify.ts` — SSV URL/signature parsing and ECDSA verification.
- `supabase/config.toml` — `admob-ssv` JWT verification disabled because Google, not a Supabase user, invokes it.

**New native/CI setup**

- `scripts/patch-android-admob.mjs` — inject AdMob App ID meta-data into generated `AndroidManifest.xml`.
- `tests/reward-policy.test.mjs`
- `tests/reward-gate.test.mjs`
- `tests/admob-wiring.test.mjs`
- `tests/ssv-contract.test.mjs`

**Existing files modified**

- `package.json`, `.env.example`, `.github/workflows/main.yml`, `src/app/App.tsx`, `src/app/components/AccountPage.tsx`
- Creation handlers in `TasksPage.tsx`, `HabitsPage.tsx`, `GoalsPage.tsx`, `EventsPage.tsx`, `LanguagesPage.tsx`, `SkillsPage.tsx`, `StudyPage.tsx`, `AgreementsPage.tsx`, `DocumentVaultPage.tsx`, `FinancePage.tsx`

---

### Task 1: Add the canonical reward policy and pure gate model

**Files:**
- Create: `src/utils/ads/reward-policy.ts`
- Create: `src/utils/ads/reward-gate-model.ts`
- Create: `tests/reward-policy.test.mjs`
- Create: `tests/reward-gate.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `RewardKey`, `RewardPolicy`, `REWARD_POLICIES`, `GLOBAL_DAILY_REWARD_CAP`, `localDateKey()`, `countCreatedOnDate()`, `effectiveLimit()`, `decideCreationGate()`.
- Consumers: Monetization provider, page integrations, SSV server validation.

- [ ] **Step 1: Add test commands before implementation**

Add to `package.json` scripts:

```json
"test:ads": "node --experimental-strip-types --test tests/reward-policy.test.mjs tests/reward-gate.test.mjs tests/admob-wiring.test.mjs tests/ssv-contract.test.mjs"
```

Do not alter the existing `test:mobile` or `test:auth` commands.

- [ ] **Step 2: Write policy tests that encode the approved product matrix**

Create `tests/reward-policy.test.mjs` with assertions for these exact policies:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GLOBAL_DAILY_REWARD_CAP,
  REWARD_POLICIES,
  localDateKey,
  countCreatedOnDate,
} from '../src/utils/ads/reward-policy.ts';

test('global rewarded cap is six per local day', () => {
  assert.equal(GLOBAL_DAILY_REWARD_CAP, 6);
});

const expected = {
  tasks:             { base: 6,  reward: 4,  max: 14, mode: 'daily',    featureAdCap: 2 },
  habits:            { base: 4,  reward: 2,  max: 8,  mode: 'capacity', featureAdCap: 2 },
  goals:             { base: 3,  reward: 2,  max: 7,  mode: 'capacity', featureAdCap: 2 },
  events:            { base: 5,  reward: 3,  max: 11, mode: 'capacity', featureAdCap: 2 },
  languages:         { base: 2,  reward: 1,  max: 4,  mode: 'capacity', featureAdCap: 2 },
  language_content:  { base: 10, reward: 10, max: 30, mode: 'daily',    featureAdCap: 2 },
  skills:            { base: 3,  reward: 2,  max: 7,  mode: 'capacity', featureAdCap: 2 },
  study_subjects:    { base: 4,  reward: 2,  max: 8,  mode: 'capacity', featureAdCap: 2 },
  study_lessons:     { base: 6,  reward: 5,  max: 16, mode: 'daily',    featureAdCap: 2 },
  agreements:        { base: 5,  reward: 3,  max: 11, mode: 'capacity', featureAdCap: 2 },
  documents:         { base: 5,  reward: 2,  max: 9,  mode: 'capacity', featureAdCap: 2 },
  finance_accounts:  { base: 3,  reward: 2,  max: 7,  mode: 'capacity', featureAdCap: 2 },
  finance_budgets:   { base: 3,  reward: 2,  max: 7,  mode: 'capacity', featureAdCap: 2 },
  savings_goals:     { base: 2,  reward: 2,  max: 6,  mode: 'capacity', featureAdCap: 2 },
};

for (const [key, value] of Object.entries(expected)) {
  test(`policy ${key} matches approved limits`, () => {
    const p = REWARD_POLICIES[key];
    assert.deepEqual(
      { base: p.base, reward: p.reward, max: p.max, mode: p.mode, featureAdCap: p.featureAdCap },
      value,
    );
  });
}

test('local date helpers count only records created on requested local day', () => {
  const date = localDateKey(new Date(2026, 7, 28, 12, 0, 0));
  const rows = [
    { createdAt: '2026-08-28T01:00:00' },
    { createdAt: '2026-08-28T20:00:00' },
    { createdAt: '2026-08-27T23:00:00' },
  ];
  assert.equal(date, '2026-08-28');
  assert.equal(countCreatedOnDate(rows, date), 2);
});
```

- [ ] **Step 3: Write pure gate tests first**

Create `tests/reward-gate.test.mjs` covering base allowance, earned bonus, max, global cap, feature cap, Pro bypass, and no destructive behavior:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { decideCreationGate, effectiveLimit } from '../src/utils/ads/reward-gate-model.ts';

test('tasks allow six, gate seventh, and allow four after one reward', () => {
  assert.equal(decideCreationGate({ key: 'tasks', currentCount: 5, earnedBoosts: 0, globalRewardsToday: 0, isPro: false }).kind, 'allowed');
  assert.equal(decideCreationGate({ key: 'tasks', currentCount: 6, earnedBoosts: 0, globalRewardsToday: 0, isPro: false }).kind, 'reward_available');
  assert.equal(effectiveLimit('tasks', 1), 10);
  assert.equal(decideCreationGate({ key: 'tasks', currentCount: 9, earnedBoosts: 1, globalRewardsToday: 1, isPro: false }).kind, 'allowed');
});

test('two task rewards cap free usage at fourteen', () => {
  assert.equal(effectiveLimit('tasks', 2), 14);
  assert.equal(decideCreationGate({ key: 'tasks', currentCount: 14, earnedBoosts: 2, globalRewardsToday: 2, isPro: false }).kind, 'pro_only');
});

test('global six reward cap blocks another rewarded unlock', () => {
  assert.equal(decideCreationGate({ key: 'habits', currentCount: 4, earnedBoosts: 0, globalRewardsToday: 6, isPro: false }).kind, 'daily_reward_cap');
});

test('Pro bypasses every creation quota', () => {
  assert.equal(decideCreationGate({ key: 'documents', currentCount: 999, earnedBoosts: 2, globalRewardsToday: 6, isPro: true }).kind, 'allowed');
});
```

- [ ] **Step 4: Run tests and verify they fail because the modules do not exist**

Run:

```bash
npm run test:ads
```

Expected: FAIL with module-not-found errors for `reward-policy.ts` / `reward-gate-model.ts`.

- [ ] **Step 5: Implement `reward-policy.ts`**

Define `RewardKey` as the exact union from the test table. Define:

```ts
export const GLOBAL_DAILY_REWARD_CAP = 6;

export interface RewardPolicy {
  key: RewardKey;
  base: number;
  reward: number;
  max: number;
  mode: 'daily' | 'capacity';
  featureAdCap: number;
  title: string;
  unitLabel: string;
}
```

Populate every policy exactly from the approved matrix. Add:

```ts
export function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function createdAtLocalDate(value: unknown): string | null {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : localDateKey(date);
}

export function countCreatedOnDate(rows: Array<{ createdAt?: unknown }>, dateKey = localDateKey()): number {
  return rows.filter(row => createdAtLocalDate(row.createdAt) === dateKey).length;
}
```

- [ ] **Step 6: Implement `reward-gate-model.ts`**

Use these exact decision names:

```ts
export type GateDecision =
  | { kind: 'allowed'; limit: number }
  | { kind: 'reward_available'; limit: number; rewardAmount: number }
  | { kind: 'daily_reward_cap'; limit: number }
  | { kind: 'pro_only'; limit: number };
```

`effectiveLimit(key, earnedBoosts)` must clamp boost count to `featureAdCap` and result to `max`.

`decideCreationGate()` rules in order:

1. `isPro` → `allowed`.
2. `currentCount < effectiveLimit` → `allowed`.
3. `earnedBoosts >= featureAdCap` or effective limit already equals max → `pro_only`.
4. `globalRewardsToday >= 6` → `daily_reward_cap`.
5. otherwise `reward_available`.

- [ ] **Step 7: Run reward tests**

Run:

```bash
node --experimental-strip-types --test tests/reward-policy.test.mjs tests/reward-gate.test.mjs
```

Expected: all tests PASS.

- [ ] **Step 8: Commit**

```bash
git add package.json src/utils/ads/reward-policy.ts src/utils/ads/reward-gate-model.ts tests/reward-policy.test.mjs tests/reward-gate.test.mjs
git commit -m "feat: define rewarded ad quota policy"
```

If executing from the provided ZIP snapshot where `.git` is absent, record the files changed and skip only the commit command.

---

### Task 2: Add Supabase durable reward storage and RLS

**Files:**
- Create: `supabase/migrations/20260828000100_ad_reward_state.sql`
- Extend: `tests/ssv-contract.test.mjs`

**Interfaces:**
- Produces DB tables `public.ad_reward_events`, `public.ad_reward_allowances` readable by the authenticated owner but writable only by trusted service-role server code.
- `ad_reward_allowances` is consumed by `reward-state.ts`.

- [ ] **Step 1: Write schema contract tests**

Create `tests/ssv-contract.test.mjs` with source-level assertions that the migration contains RLS and prevents client writes:

```js
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node --experimental-strip-types --test tests/ssv-contract.test.mjs
```

Expected: FAIL because migration does not exist.

- [ ] **Step 3: Create the migration**

`ad_reward_events` columns:

```sql
id uuid primary key default gen_random_uuid(),
user_id uuid not null references auth.users(id) on delete cascade,
transaction_id text not null unique,
reward_key text not null,
reward_amount integer not null check (reward_amount > 0),
reward_kind text not null check (reward_kind in ('daily', 'capacity', 'temporary_feature')),
reward_date date not null,
granted_at timestamptz not null default now(),
verified boolean not null default true,
ad_unit text,
created_at timestamptz not null default now()
```

`ad_reward_allowances` columns:

```sql
user_id uuid not null references auth.users(id) on delete cascade,
reward_key text not null,
permanent_bonus integer not null default 0 check (permanent_bonus >= 0),
temporary_bonus integer not null default 0 check (temporary_bonus >= 0),
temporary_date date,
feature_unlock_until timestamptz,
updated_at timestamptz not null default now(),
primary key (user_id, reward_key)
```

Add indexes on `(user_id, reward_date)` for events and `(user_id, reward_key)` for allowances.

Enable RLS on both tables. Create only SELECT policies:

```sql
create policy "users_read_own_ad_reward_events"
on public.ad_reward_events for select to authenticated
using (auth.uid() = user_id);

create policy "users_read_own_ad_reward_allowances"
on public.ad_reward_allowances for select to authenticated
using (auth.uid() = user_id);
```

Do not create authenticated INSERT/UPDATE/DELETE policies.

- [ ] **Step 4: Apply migration to the connected Supabase project**

Use the connected Supabase migration action. Verify the project is `himyddwbgyxohalxlzaz` before applying. After apply, run Supabase security advisors and verify no new RLS warnings for the two reward tables.

- [ ] **Step 5: Run schema tests**

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260828000100_ad_reward_state.sql tests/ssv-contract.test.mjs
git commit -m "feat: add durable rewarded ad state"
```

---

### Task 3: Implement AdMob SSV verification and idempotent reward grants

**Files:**
- Create: `supabase/migrations/20260828000200_grant_ad_reward.sql`
- Create: `supabase/functions/admob-ssv/verify.ts`
- Create: `supabase/functions/admob-ssv/index.ts`
- Create/Modify: `supabase/config.toml`
- Modify: `tests/ssv-contract.test.mjs`

**Interfaces:**
- HTTP GET endpoint: `https://himyddwbgyxohalxlzaz.supabase.co/functions/v1/admob-ssv?...Google params...`
- Inputs from SSV: `user_id`, `custom_data`, `transaction_id`, Google's configured `reward_amount`, `timestamp`, `signature`, `key_id`, `ad_unit`. The Google reward amount is transport metadata; LifeOS grants the business amount from `REWARD_POLICIES[rewardKey].reward`.
- `custom_data` contract: URI-decoded JSON `{ "v": 1, "rewardKey": "tasks", "localDate": "2026-08-28", "tzOffsetMinutes": -180 }`; date/offset are non-sensitive quota metadata. No LifeOS user content is allowed.
- Produces exactly one verified event per Google `transaction_id` and updates allowance within policy/global caps.

- [ ] **Step 1: Extend source contract tests before implementation**

Add assertions to `tests/ssv-contract.test.mjs`:

```js
test('SSV function is public to Google but verifies signatures itself', async () => {
  const config = await readFile('supabase/config.toml', 'utf8');
  const index = await readFile('supabase/functions/admob-ssv/index.ts', 'utf8');
  assert.match(config, /\[functions\.admob-ssv\][\s\S]*verify_jwt\s*=\s*false/);
  assert.match(index, /verifyAdMobSsv/);
  assert.match(index, /transaction_id/);
  assert.match(index, /GLOBAL_DAILY_REWARD_CAP/);
});
```

- [ ] **Step 2: Run test and verify failure**

Expected: FAIL on missing files/config.

- [ ] **Step 3: Implement `verify.ts`**

Implement:

```ts
export interface VerifiedSsv {
  userId: string;
  transactionId: string;
  rewardAmount: number;
  adUnit: string | null;
  timestampMs: number;
  customData: string | null;
}

export async function verifyAdMobSsv(requestUrl: string): Promise<VerifiedSsv>
```

Required verification behavior:

1. Read the **raw query string** from `requestUrl`; do not reorder or re-encode it.
2. Locate `&signature=`; `dataToVerify` is every raw query byte before that delimiter.
3. Parse `signature` and `key_id` from the trailing parameters.
4. Fetch AdMob public verification keys from Google's key endpoint; cache in module memory with a timestamp no longer than 24 hours.
5. Select the key matching `key_id`.
6. Decode Google's URL-safe base64 DER ECDSA signature.
7. Import the PEM/SPKI P-256 public key.
8. Verify SHA-256 ECDSA. If WebCrypto requires P1363, convert DER `(r,s)` into fixed 32-byte `r || s` before `crypto.subtle.verify`.
9. Reject missing/invalid signature, missing transaction/user id, impossible timestamp, or non-positive reward amount.

Do not decode/rebuild the signed content before verification.

- [ ] **Step 4: Implement `index.ts` with server policy enforcement**

Import Supabase service-role client and the canonical `REWARD_POLICIES` / `GLOBAL_DAILY_REWARD_CAP` from `../../../src/utils/ads/reward-policy.ts`.

Flow:

```ts
const verified = await verifyAdMobSsv(req.url);
const custom = JSON.parse(decodeURIComponent(verified.customData ?? ''));
const rewardKey = custom.rewardKey;
const policy = REWARD_POLICIES[rewardKey];
```

Reject if `custom.v !== 1`, unknown reward key, invalid UUID user id, or Google's configured reward amount is missing/non-positive. **Do not require Google's `reward_amount` to equal LifeOS's business bonus**: one AdMob rewarded unit can be configured as `1 reward`, while LifeOS maps that verified view to +4 tasks, +2 habits, etc. Persist the granted LifeOS amount as `policy.reward`. Validate `localDate` as `YYYY-MM-DD` and `tzOffsetMinutes` as an integer between -840 and +840. Derive the callback's local calendar date from the verified Google timestamp plus that offset and reject if it does not match `custom.localDate`; pass the derived date to the grant RPC.

Use a transaction-safe Postgres RPC rather than separate read/write requests. Create `supabase/migrations/20260828000200_grant_ad_reward.sql` with a function named:

```sql
public.grant_verified_ad_reward(
  p_user_id uuid,
  p_transaction_id text,
  p_reward_key text,
  p_reward_amount integer, -- LifeOS business bonus from policy.reward
  p_reward_kind text,
  p_ad_unit text,
  p_server_date date,
  p_feature_ad_cap integer,
  p_max_bonus integer
) returns jsonb
```

The RPC executes with `security definer`, fixed `search_path = public`, and must:

- return existing success for duplicate transaction IDs without incrementing again,
- count today's verified events and reject if already 6,
- count today's events for the reward key for daily policies or existing permanent capacity boosts for capacity policies and reject after `featureAdCap`,
- insert immutable event,
- for `daily`: upsert `temporary_bonus += reward_amount`, `temporary_date = p_server_date` but clamp at `policy.max - policy.base`,
- for `capacity`: upsert `permanent_bonus += reward_amount` but clamp at `policy.max - policy.base`,
- return `{ granted: true, duplicate: false }` or a specific non-grant reason.

Because SQL cannot safely import TypeScript constants, pass `p_feature_ad_cap` and `p_max_bonus` from the already signature-verified Edge Function into the RPC; validate both are positive in SQL. This keeps the canonical product matrix in TypeScript while the SQL remains generic.

- [ ] **Step 5: Add deployment config**

Create:

```toml
[functions.admob-ssv]
verify_jwt = false
```

No other function should have JWT disabled by this change.

- [ ] **Step 6: Add contract tests for duplicate and invalid-signature paths**

At minimum, source-level tests assert:

- unique `transaction_id` exists,
- function calls `verifyAdMobSsv` before grant RPC,
- unknown `rewardKey` returns non-2xx,
- grant RPC call passes policy cap/max bonus.

Where practical, add pure unit tests for the raw-query parser using a fabricated URL without performing network verification.

- [ ] **Step 7: Deploy function to Supabase and test with AdMob SSV testing tool**

Deploy `admob-ssv` to project `himyddwbgyxohalxlzaz`. Configure the AdMob rewarded ad unit's SSV callback URL to the function URL. Use AdMob's SSV tester before production IDs are used by the app.

- [ ] **Step 8: Run tests and security advisor**

Expected: all SSV contract tests PASS and no authenticated client can mutate reward tables/RPC directly. Revoke direct RPC execute from `anon` and `authenticated`; service role remains able to invoke it.

- [ ] **Step 9: Commit**

```bash
git add supabase/migrations/20260828000200_grant_ad_reward.sql supabase/functions/admob-ssv supabase/config.toml tests/ssv-contract.test.mjs
git commit -m "feat: verify AdMob SSV rewards"
```

---

### Task 4: Wire the Capacitor AdMob plugin, Android App ID, and CI test IDs

**Files:**
- Modify: `package.json`
- Modify: `.env.example`
- Create: `scripts/patch-android-admob.mjs`
- Modify: `.github/workflows/main.yml`
- Create: `tests/admob-wiring.test.mjs`

**Interfaces:**
- Build env: `VITE_ADMOB_REWARDED_AD_UNIT_ID`.
- Native manifest env consumed by patch script: `ADMOB_ANDROID_APP_ID`.
- Production values supplied by GitHub Secrets; local/test fallback uses Google's demo IDs.

- [ ] **Step 1: Write wiring tests first**

`tests/admob-wiring.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('package uses Capacitor 8 compatible AdMob plugin', async () => {
  const pkg = JSON.parse(await readFile('package.json', 'utf8'));
  assert.match(pkg.dependencies['@capacitor-community/admob'], /^\^?8\./);
});

test('workflow injects AdMob identifiers and patches generated Android manifest', async () => {
  const yml = await readFile('.github/workflows/main.yml', 'utf8');
  assert.match(yml, /VITE_ADMOB_REWARDED_AD_UNIT_ID/);
  assert.match(yml, /ADMOB_ANDROID_APP_ID/);
  assert.match(yml, /patch-android-admob\.mjs/);
});
```

- [ ] **Step 2: Run test and verify failure**

Expected: FAIL because dependency/env/script are absent.

- [ ] **Step 3: Install compatible plugin**

Run:

```bash
npm install @capacitor-community/admob@^8.1.0 --save
```

Then run `npm install` to refresh lockfile if a lockfile exists in the working repo. Do not add a second Google Mobile Ads Android dependency manually because the Capacitor plugin already brings it.

- [ ] **Step 4: Add environment documentation**

Append to `.env.example`:

```dotenv
# Rewarded Ad Unit ID. Use Google's demo ID for local/dev builds only.
VITE_ADMOB_REWARDED_AD_UNIT_ID=ca-app-pub-3940256099942544/5224354917

# Android manifest App ID is injected by scripts/patch-android-admob.mjs in CI.
# Production CI secret name: ADMOB_ANDROID_APP_ID
```

- [ ] **Step 5: Create `patch-android-admob.mjs`**

Behavior:

1. Fail if `android/app/src/main/AndroidManifest.xml` does not exist.
2. Read `process.env.ADMOB_ANDROID_APP_ID` and trim it.
3. If missing, use Google's demo App ID only when `process.env.CI !== 'true'`; in CI, missing production secret must fail unless an explicit `LIFEOS_ADMOB_TEST_MODE=true` is set.
4. Insert or replace under `<application>`:

```xml
<meta-data
    android:name="com.google.android.gms.ads.APPLICATION_ID"
    android:value="ca-app-pub-...~..." />
```

5. Keep script idempotent.

- [ ] **Step 6: Update GitHub Actions**

Add job env:

```yaml
VITE_ADMOB_REWARDED_AD_UNIT_ID: ${{ secrets.VITE_ADMOB_REWARDED_AD_UNIT_ID }}
ADMOB_ANDROID_APP_ID: ${{ secrets.ADMOB_ANDROID_APP_ID }}
```

Add `npm run test:ads` after existing auth/mobile tests.

After `npx cap sync android`, run:

```yaml
- name: Apply Android AdMob App ID
  run: node scripts/patch-android-admob.mjs
```

Add required-file checks for the new script and reward-policy module.

Do not hard-code production ad IDs in workflow source.

- [ ] **Step 7: Run tests**

Run:

```bash
npm run test:ads
npm run test:auth
npm run test:mobile
```

Expected: all PASS.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json .env.example scripts/patch-android-admob.mjs .github/workflows/main.yml tests/admob-wiring.test.mjs
git commit -m "feat: wire AdMob rewarded Android build"
```

---

### Task 5: Implement native rewarded-ad service and server reward-state client

**Files:**
- Create: `src/utils/ads/ad-service.ts`
- Create: `src/utils/ads/reward-state.ts`
- Modify: `tests/reward-gate.test.mjs`

**Interfaces:**
- `initializeAds(): Promise<void>`
- `showRewardedAd(input: { userId: string; rewardKey: RewardKey }): Promise<{ earned: boolean }>`
- `loadRewardSnapshot(userId: string): Promise<RewardSnapshot>`
- `RewardSnapshot` includes `globalRewardsToday`, `boostsByKey`, and pending state.

- [ ] **Step 1: Add model tests for allowance normalization**

Extend `tests/reward-gate.test.mjs` with a pure `normalizeRewardSnapshot()` test that converts Supabase rows into:

```ts
{
  dateKey: '2026-08-28',
  globalRewardsToday: 2,
  boostsByKey: { tasks: 1, habits: 1 }
}
```

For daily policies, divide/clamp server `temporary_bonus` by each policy reward increment to derive `earnedBoosts`; for capacity policies derive it from `permanent_bonus`.

- [ ] **Step 2: Implement `ad-service.ts`**

Use `Capacitor.isNativePlatform()` and `@capacitor-community/admob`.

`initializeAds()` calls `AdMob.initialize()` once. It must not initialize/load ads on web.

`showRewardedAd()`:

```ts
const adId = String((import.meta as any).env?.VITE_ADMOB_REWARDED_AD_UNIT_ID || '').trim();
```

Fail with a user-safe error if native platform and ID missing.

Prepare with:

```ts
await AdMob.prepareRewardVideoAd({
  adId,
  isTesting: adId === 'ca-app-pub-3940256099942544/5224354917',
  ssv: {
    userId,
    customData: JSON.stringify({
      v: 1,
      rewardKey,
      localDate: localDateKey(),
      tzOffsetMinutes: new Date().getTimezoneOffset(),
    }),
  },
});
```

Then call `AdMob.showRewardVideoAd({ adId })`. Treat resolution with a valid reward item as earned. If user closes/cancels before reward, return `{ earned: false }`; load/show failures throw.

Never include title, category, finance, health, religious, journal, document, or agreement content in options.

- [ ] **Step 3: Implement `reward-state.ts`**

Use the existing exported `supabase` client from `src/utils/api.ts`.

`loadRewardSnapshot(userId)`:

1. Query `ad_reward_allowances` for `user_id = userId`.
2. Query today's `ad_reward_events` count for `user_id = userId` and `reward_date = localDateKey()`; SSV stores reward_date using the verified callback's signed custom local date/offset validation, so client and server use the same product day.
3. Normalize into a pure snapshot.
4. If network fails, return an explicit unavailable state; do not invent verified server rewards.

Add an in-memory provisional overlay keyed by `{dateKey,rewardKey}` so the client callback can resume immediately while SSV is pending. Export:

```ts
addProvisionalReward(rewardKey: RewardKey): void;
clearConfirmedProvisionalRewards(serverSnapshot: RewardSnapshot): void;
```

Provisional rewards are process-memory only, never trusted localStorage.

- [ ] **Step 4: Run tests**

Expected: all pure reward tests PASS; web build must not crash from native imports.

- [ ] **Step 5: Commit**

```bash
git add src/utils/ads/ad-service.ts src/utils/ads/reward-state.ts tests/reward-gate.test.mjs
git commit -m "feat: add rewarded ad service and state client"
```

---

### Task 6: Add a single app-wide monetization provider and reusable gate dialog

**Files:**
- Create: `src/app/monetization/MonetizationProvider.tsx`
- Create: `src/app/components/RewardGateDialog.tsx`
- Create: `src/app/components/RewardStatus.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/app/components/AccountPage.tsx`
- Modify: `tests/admob-wiring.test.mjs`

**Interfaces:**
- `useMonetization()` returns:

```ts
{
  isPro: boolean;
  subscription: SubscriptionState;
  rewards: RewardSnapshot;
  guardCreation(input: { key: RewardKey; currentCount: number }): Promise<boolean>;
  openPro(): void;
  refresh(): Promise<void>;
}
```

- `guardCreation` either resolves immediately `true`, opens a rewarded dialog and resolves after earned reward, or resolves `false` on cancel/failure/pro-only dismissal.

- [ ] **Step 1: Add source contract tests**

Assert `App.tsx` wraps authenticated app content in `MonetizationProvider`, and `AccountPage.tsx` uses `RewardStatus` and provider subscription rather than separately configuring RevenueCat a second time.

- [ ] **Step 2: Implement provider initialization**

On authenticated `user.id` change:

1. call `configureSubscriptions(user.id)`,
2. call `initializeAds()` only after app/user is ready and consent state permits ad requests,
3. load server reward snapshot,
4. store `subscription.isPro` and reward state.

Do not show any ad at app start.

- [ ] **Step 3: Implement `guardCreation()`**

Given `{ key, currentCount }`:

1. compute earned boosts from verified + provisional snapshot,
2. call pure `decideCreationGate`,
3. return `true` for `allowed`,
4. for `reward_available`, open `RewardGateDialog` and wait for user action,
5. if user chooses reward: call `showRewardedAd`, and only if `{ earned: true }`, add provisional reward, increment local daily display count, refresh server state asynchronously, close dialog and resolve `true`,
6. if cancelled/failed, resolve `false`,
7. for `daily_reward_cap` / `pro_only`, show the appropriate copy and Pro button but no ad load.

Ensure only one gate promise can be active at a time; reject/dismiss stale requests on user logout.

- [ ] **Step 4: Implement Arabic dialog copy**

`RewardGateDialog` gets the policy and current decision. For reward available:

```text
Title: وصلت للحد المجاني
Body: استخدمت الحد المجاني لهذه الميزة. شاهد إعلانًا واحصل على {reward} {unitLabel} إضافية.
Buttons:
🎬 مشاهدة إعلان (+{reward})
⭐ LifeOS Pro
إلغاء
```

For global cap:

```text
استخدمت كل مكافآت الإعلانات المتاحة اليوم. تعود المكافآت غدًا، أو انتقل إلى LifeOS Pro بدون حدود.
```

Ad unavailable:

```text
الإعلان غير متاح حاليًا. جرّب مرة أخرى بعد قليل.
```

Actions: Retry / Pro / Cancel.

- [ ] **Step 5: Refactor AccountPage subscription state**

Use provider `subscription` so account and page gates share one authoritative RevenueCat state. Add `RewardStatus` only for Free users:

```text
🎬 مكافآت اليوم 2/6
```

Hide it entirely for Pro.

Keep existing `ProPaywall` behavior; provider should expose the same `onStateChange` path so a successful purchase immediately removes ad gates.

- [ ] **Step 6: Run build/tests**

Run:

```bash
npm run test:ads
npm run test:auth
npm run build
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/monetization src/app/components/RewardGateDialog.tsx src/app/components/RewardStatus.tsx src/app/App.tsx src/app/components/AccountPage.tsx tests/admob-wiring.test.mjs
git commit -m "feat: add LifeOS monetization provider"
```

---

### Task 7: Gate Tasks, Habits, Goals, Events, Skills, Agreements, and Documents

**Files:**
- Modify: `src/app/components/TasksPage.tsx`
- Modify: `src/app/components/HabitsPage.tsx`
- Modify: `src/app/components/GoalsPage.tsx`
- Modify: `src/app/components/EventsPage.tsx`
- Modify: `src/app/components/SkillsPage.tsx`
- Modify: `src/app/components/AgreementsPage.tsx`
- Modify: `src/app/components/DocumentVaultPage.tsx`
- Create: `tests/page-gates.test.mjs`

**Interfaces:**
- All pages call `await guardCreation({ key, currentCount })` **only on creation**, immediately before existing POST/upload operations.
- Edit/update/delete remains untouched.

- [ ] **Step 1: Write source contract tests first**

`tests/page-gates.test.mjs` reads each page and checks the expected reward key appears in its creation handler and that religious page contains no `guardCreation` / `showRewardedAd` import.

- [ ] **Step 2: Gate Tasks**

In `saveTask()`, only in `else` branch where `editTask` is null:

```ts
const todayCount = countCreatedOnDate(tasks);
if (!await guardCreation({ key: 'tasks', currentCount: todayCount })) return;
```

Keep edit branch ungated.

- [ ] **Step 3: Gate Habits**

In `saveHabit(data)`, only before POST new habit:

```ts
if (!await guardCreation({ key: 'habits', currentCount: habits.length })) return;
```

Category creation is not a habit and remains unlimited.

- [ ] **Step 4: Gate Goals**

Before POST new goal:

```ts
const activeGoals = goals.filter(goal => Number(goal.progress ?? 0) < 100).length;
if (!await guardCreation({ key: 'goals', currentCount: activeGoals })) return;
```

Editing progress or completing a goal stays free.

- [ ] **Step 5: Gate Events**

Match the page's existing upcoming semantics exactly: `EventsPage` stores `date` as `YYYY-MM-DD` and currently treats `e.date >= today` as upcoming. Reuse the same local `today` value already in the page.

Before POST:

```ts
const upcoming = events.filter(event => event.date >= today).length;
if (!await guardCreation({ key: 'events', currentCount: upcoming })) return;
```

Editing/deleting stays free.

- [ ] **Step 6: Gate Skills**

Only new skills:

```ts
if (!await guardCreation({ key: 'skills', currentCount: skills.length })) return;
```

Adding logged hours remains unlimited.

- [ ] **Step 7: Gate Agreements**

Before POST:

```ts
const openCount = agreements.filter(item => item.status === 'active' || item.status === 'overdue').length;
if (!await guardCreation({ key: 'agreements', currentCount: openCount })) return;
```

Status changes remain unlimited.

- [ ] **Step 8: Gate Documents**

In `uploadDocument()`, after file/name validation but before setting `uploading` and before `apiUpload`:

```ts
if (!await guardCreation({ key: 'documents', currentCount: documents.length })) return;
```

Download, preview, delete remain unlimited and never show ads.

- [ ] **Step 9: Run page contracts, existing tests, and build**

Run:

```bash
node --experimental-strip-types --test tests/page-gates.test.mjs
npm run test:ads
npm run build
```

Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add src/app/components/TasksPage.tsx src/app/components/HabitsPage.tsx src/app/components/GoalsPage.tsx src/app/components/EventsPage.tsx src/app/components/SkillsPage.tsx src/app/components/AgreementsPage.tsx src/app/components/DocumentVaultPage.tsx tests/page-gates.test.mjs
git commit -m "feat: gate core free-tier capacities"
```

---

### Task 8: Gate Languages and Study with accurate nested daily timestamps

**Files:**
- Modify: `src/app/components/LanguagesPage.tsx`
- Modify: `src/app/components/StudyPage.tsx`
- Modify: `tests/page-gates.test.mjs`

**Interfaces:**
- Language profiles use capacity quota `languages`.
- Vocabulary + grammar + conversation share one daily quota `language_content` across all language profiles.
- Study subjects use capacity quota `study_subjects`.
- New lessons share daily quota `study_lessons` across all subjects.
- Study sessions and exams stay unlimited.

- [ ] **Step 1: Add failing source contract tests**

Assert that language new items and study lessons write a `createdAt` timestamp, while study sessions/exams contain no reward gate.

- [ ] **Step 2: Gate new language profiles**

Before `api('/languages', POST)`:

```ts
if (!await guardCreation({ key: 'languages', currentCount: languages.length })) return;
```

- [ ] **Step 3: Add `createdAt` to every newly created language content item**

When building vocab/grammar/conversation `newItem`, include:

```ts
createdAt: new Date().toISOString()
```

Do not alter existing stored rows that lack timestamps; they simply do not count toward today's creation quota.

- [ ] **Step 4: Count today's combined content across all languages and gate before PUT**

```ts
const allContent = languages.flatMap(lang => [
  ...(lang.vocab || []),
  ...(lang.grammar || []),
  ...(lang.conversation || []),
]);
const todayCount = countCreatedOnDate(allContent);
if (!await guardCreation({ key: 'language_content', currentCount: todayCount })) return;
```

Only new content is gated. `deleteItem` and level changes remain free.

- [ ] **Step 5: Gate new study subjects only**

In `saveSubject`, only POST branch:

```ts
if (!await guardCreation({ key: 'study_subjects', currentCount: subjects.length })) return;
```

- [ ] **Step 6: Add timestamp and gate new lessons**

Before updating selected subject:

```ts
const allLessons = subjects.flatMap(subject => subject.lessons || []);
const todayCount = countCreatedOnDate(allLessons);
if (!await guardCreation({ key: 'study_lessons', currentCount: todayCount })) return;
const lesson = { id: crypto.randomUUID(), ...lessonForm, createdAt: new Date().toISOString() };
```

Use `crypto.randomUUID()` where available rather than `Date.now()` for new nested IDs.

Do not gate `addSession()`, `addExam()`, lesson completion toggle, or grade recording.

- [ ] **Step 7: Run tests/build**

Expected: page contracts PASS and app builds.

- [ ] **Step 8: Commit**

```bash
git add src/app/components/LanguagesPage.tsx src/app/components/StudyPage.tsx tests/page-gates.test.mjs
git commit -m "feat: gate learning capacities"
```

---

### Task 9: Gate Finance account/budget/savings capacities while keeping transactions unlimited

**Files:**
- Modify: `src/app/components/FinancePage.tsx`
- Modify: `tests/page-gates.test.mjs`

**Interfaces:**
- `finance_accounts`, `finance_budgets`, `savings_goals` are capacity-gated on create.
- `saveTxn`, transfer operations, finance settings, and savings-goal edits remain ungated.

- [ ] **Step 1: Add failing finance contract test**

Assert source contains `guardCreation` for the three allowed reward keys but does not call it inside the `saveTxn()` source range.

- [ ] **Step 2: Gate account creation**

In `saveAcc()` after validation and before POST:

```ts
if (!await guardCreation({ key: 'finance_accounts', currentCount: accounts.length })) return;
```

- [ ] **Step 3: Gate budget creation**

In `saveBud()` after validation and before POST:

```ts
if (!await guardCreation({ key: 'finance_budgets', currentCount: budgets.length })) return;
```

- [ ] **Step 4: Gate only new savings goals**

In `saveSav()`, keep edit branch fully free. In the create `else` branch:

```ts
if (!await guardCreation({ key: 'savings_goals', currentCount: savingsGoals.length })) return;
```

- [ ] **Step 5: Verify unlimited finance logging**

No calls to `guardCreation()` are added to:

- income/expense transaction creation,
- transfers,
- account balance updates,
- settings/rates,
- editing/deleting existing records.

- [ ] **Step 6: Run page test and build**

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/components/FinancePage.tsx tests/page-gates.test.mjs
git commit -m "feat: gate finance setup capacities"
```

---

### Task 10: Add consent/privacy gate before requesting AdMob ads

**Files:**
- Modify: `src/utils/ads/ad-service.ts`
- Modify: `src/app/components/AccountPage.tsx`
- Modify: `tests/admob-wiring.test.mjs`

**Interfaces:**
- `prepareAdPrivacy(): Promise<{ canRequestAds: boolean; privacyOptionsRequired: boolean }>`.
- `showPrivacyOptions(): Promise<void>` exposed only when Google indicates it is required.

- [ ] **Step 1: Add tests that no ad can be requested before `canRequestAds`**

Use the Capacitor Community AdMob v8 UMP API exactly as shipped: `AdMob.requestConsentInfo()`, `AdMob.showConsentForm()`, `AdMob.showPrivacyOptionsForm()`, `AdmobConsentStatus.REQUIRED`, and `privacyOptionsRequirementStatus`. Source contract must ensure `prepareRewardVideoAd` is called only after `canRequestAds === true`.

- [ ] **Step 2: Implement consent initialization in `ad-service.ts`**

Source contract must ensure `prepareRewardVideoAd` is called only after consent initialization resolves true.

At app startup/native initialization, after `AdMob.initialize()`:

```ts
let consentInfo = await AdMob.requestConsentInfo();
if (consentInfo.isConsentFormAvailable && consentInfo.status === AdmobConsentStatus.REQUIRED) {
  consentInfo = await AdMob.showConsentForm();
}
```

Store `consentInfo.canRequestAds` and `consentInfo.privacyOptionsRequirementStatus`. `showRewardedAd()` must fail with a user-safe message rather than call `prepareRewardVideoAd()` when `canRequestAds !== true`. On web, return `canRequestAds: false` without error.

- [ ] **Step 3: Add Account privacy option when required**

In AccountPage add a row:

```text
خصوصية الإعلانات
راجع أو غيّر خيارات موافقة الإعلانات
```

Render it only when the consent API says privacy options are required. Clicking calls the plugin privacy-options form method.

- [ ] **Step 4: Test/build**

Run all ads/auth/mobile tests and build. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/ads/ad-service.ts src/app/components/AccountPage.tsx tests/admob-wiring.test.mjs
git commit -m "feat: add AdMob consent controls"
```

---

### Task 11: End-to-end verification, Android test APK, and production handoff checklist

**Files:**
- Modify: `README_MOBILE_AR.md`
- Modify: `.github/workflows/main.yml` release notes only
- No business-logic changes unless a failing verification exposes a defect.

**Interfaces:**
- Final deliverable is a test APK using Google demo ads plus instructions for switching two IDs to production after AdMob console setup.

- [ ] **Step 1: Run every automated test freshly**

```bash
npm run test:mobile
npm run test:auth
npm run test:ads
npm run build
```

Expected: all PASS, no skipped failing tests.

- [ ] **Step 2: Generate/sync Android locally if Android SDK is available**

```bash
rm -rf android
npx cap add android
npx cap sync android
ADMOB_ANDROID_APP_ID=ca-app-pub-3940256099942544~3347511713 node scripts/patch-android-admob.mjs
node scripts/patch-android-auth-deeplink.mjs
node scripts/patch-android-notifications.mjs
```

Inspect `android/app/src/main/AndroidManifest.xml` and verify exactly one `com.google.android.gms.ads.APPLICATION_ID` entry exists.

- [ ] **Step 3: Verify test rewarded flow manually on Android**

Using demo IDs only:

1. Free user creates six tasks.
2. Seventh task opens LifeOS reward dialog, not an automatic ad.
3. Cancel does not grant capacity.
4. Watch test rewarded ad → task form resumes and task 7 saves.
5. First task reward gives limit 10; second gives limit 14.
6. Fifteenth task shows Pro-only state.
7. Earn rewards in other categories until global display reaches 6/6; seventh reward offer is blocked for the day.
8. Edit/delete existing task never triggers an ad.
9. Habit capacity 4 → 6 → 8 and survives app restart after server verification.
10. Goal at 100% frees an active slot.
11. Past event frees an upcoming slot.
12. Study session and exam entry are always free.
13. Finance transaction entry is always free.
14. Religious page never initializes, offers, or loads an ad.
15. Pro test entitlement makes every gate disappear.
16. Closing a rewarded ad before earned callback grants nothing.
17. Network/ad-unavailable path shows Retry / Pro / Cancel.

- [ ] **Step 4: Verify SSV durability**

After a rewarded capacity grant:

1. confirm one row in `ad_reward_events`,
2. confirm matching `ad_reward_allowances` bonus,
3. replay same `transaction_id` via tester and confirm no second increment,
4. confirm client user cannot insert/update either table,
5. sign out/in and confirm capacity remains,
6. uninstall/reinstall test app, sign in, and confirm server capacity reloads.

- [ ] **Step 5: Run GitHub Actions with test mode**

Before production IDs are created, temporarily use repository secrets containing Google's demo App ID and rewarded unit ID, or set the workflow's explicit test mode. Confirm build, APK signing SHA-1 verification, and ad tests all pass.

- [ ] **Step 6: Document production switch**

In `README_MOBILE_AR.md`, add simple Arabic setup:

```text
1. أنشئ تطبيق Android داخل Google AdMob بالحزمة com.lifeos.app.
2. أنشئ Rewarded Ad Unit واحد للنسخة الأولى.
3. فعّل SSV وحط رابط Supabase admob-ssv.
4. أضف GitHub Secret باسم ADMOB_ANDROID_APP_ID.
5. أضف GitHub Secret باسم VITE_ADMOB_REWARDED_AD_UNIT_ID.
6. لا تستخدم الإعلان الحقيقي أثناء التطوير؛ استخدم Test Ads فقط.
```

Do not document or commit actual private account values.

- [ ] **Step 7: Final verification before claiming completion**

Run the full tests/build one last time after documentation/workflow edits. Save command output as evidence. Do not claim “جاهز” unless the fresh test/build and Android manual checks succeed.

- [ ] **Step 8: Commit/release**

```bash
git add README_MOBILE_AR.md .github/workflows/main.yml
git commit -m "docs: finalize LifeOS rewarded ads rollout"
```

Then build/release the signed test APK through the existing GitHub Actions workflow.

---

## Plan Self-Review

### Spec coverage

- Reward policy matrix: Tasks 1, 7, 8, 9.
- Global 6/day cap and per-feature caps: Tasks 1, 3, 6.
- Pro bypass: Tasks 1, 6, 11.
- Religious full exclusion: Tasks 7 and 11 verification; no religious source modification required.
- Unlimited core logging: Tasks 8, 9 and 11 verification.
- SSV + durable capacity + replay prevention: Tasks 2 and 3.
- Rewarded-only AdMob Android integration: Tasks 4 and 5.
- Consent/privacy: Task 10.
- Account reward status: Task 6.
- Existing edit/delete flows remain free: Tasks 7–9 and manual QA.
- No sensitive content in AdMob payloads: Task 5, enforced by API shape accepting only `userId`, `rewardKey`, local date, and timezone offset.
- Test ads before release: Tasks 4 and 11.

### Placeholder scan

No `TBD`, `TODO`, “implement later”, or unspecified code steps are required for phase 1. Production AdMob identifiers are intentionally external configuration because they must be created in the owner's AdMob account; the exact GitHub secret names and test fallbacks are specified.

### Type consistency

- Reward keys are canonical from `reward-policy.ts`.
- Client, provider and SSV all use the same `RewardKey` values.
- `guardCreation({ key, currentCount }): Promise<boolean>` is the only page gate API.
- Pro state remains RevenueCat `SubscriptionState.isPro`.
