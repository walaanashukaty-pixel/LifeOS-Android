# LifeOS — AdMob Rewarded Limits Design

**Date:** 2026-08-28  
**Status:** Approved product design, ready for implementation planning after user review  
**Scope:** Android monetization layer for the existing React + Capacitor LifeOS app  

## 1. Goal

Introduce a balanced free-to-use monetization model where LifeOS remains useful without payment, while users who need more capacity can either:

1. watch a voluntary Google AdMob Rewarded Ad and receive a clearly defined allowance, or
2. upgrade to LifeOS Pro to remove ads and free-tier capacity limits.

The religious section is completely excluded from advertising and capacity gating.

## 2. Product Principles

1. **No forced ads.** Phase 1 uses Rewarded Ads only. No banner, app-open, or forced interstitial ads.
2. **Explicit opt-in.** Every rewarded ad is shown only after the user taps a button such as “مشاهدة إعلان”.
3. **Clear reward before playback.** The dialog states the exact reward before the ad starts.
4. **Core logging must not be blocked.** Finance transactions, journal entries, workout/weight logging, study sessions, and exam-result logging remain unlimited.
5. **Created data is never hidden or deleted because a reward expires.** Capacity rewards that are defined as permanent free-tier expansions remain attached to the user account.
6. **Pro bypasses the ad system.** LifeOS Pro sees no rewarded gating and no ad UI.
7. **Religious section is ad-free.** Dhikr, Quran, memorization and religious lessons have no quotas, ad gates, banners, native ads, or Pro gates.
8. **Sensitive app data is not sent to AdMob for targeting.** Task titles, journal text, finance values, health/fitness data, religious activity, agreement text, document contents, and similar user content must never be attached to ad requests.

## 3. Phase-1 Ad Format

### Enabled

- **AdMob Rewarded Ads** only.

### Disabled in phase 1

- Banner ads
- Native ads
- Interstitial ads
- Rewarded interstitial ads
- App-open ads

Reason: LifeOS is a productivity app frequently opened for quick actions. Forced or persistent ad formats would interrupt task completion and reduce trust. Rewarded Ads let the user choose when an ad is worth the extra capacity.

## 4. Global Reward Rules

### Daily global cap

A Free user may successfully earn at most **6 rewarded-ad rewards per local calendar day** across the whole app.

Every successful reward counts toward this global cap, including:

- daily quota boosts,
- permanent capacity boosts,
- temporary advanced-analysis unlocks.

When the user reaches 6/6, LifeOS shows:

> استخدمت كل مكافآت الإعلانات المتاحة اليوم. تعود المكافآت غدًا، أو انتقل إلى LifeOS Pro بدون حدود.

### Per-feature caps

A feature can also have its own lower cap. The stricter of the global cap and feature cap always wins.

### No reward when ad does not complete

If the ad is closed before Google reports the reward event, no allowance is granted.

### Ad unavailable

If no rewarded ad is available, the user sees a non-blocking error with:

- إعادة المحاولة
- إلغاء
- LifeOS Pro

The app must not silently grant a reward merely because ad inventory is unavailable.

## 5. Quota Model

LifeOS uses two quota types.

### A. Daily creation quota

Counts only items newly created on the current local calendar date. Existing recurring items do not consume a new slot every day.

Reward boosts expire at the next local-day reset, but items already created remain visible and usable.

### B. Capacity quota

Limits the number of relevant currently stored/active items. Rewarded capacity boosts are permanent for the Free account up to the specified Free maximum.

Deleting/completing an item may free a slot where stated below.

## 6. Final Reward Matrix

| Section | Counted action/state | Base Free | Reward per ad | Max Free | Reset / release rule | Per-feature ad cap |
|---|---|---:|---:|---:|---|---:|
| Tasks | New tasks created today | 6/day | +4 today | 14/day | Daily | 2/day |
| Habits | Stored habits | 4 | +2 capacity | 8 | No reset; deleting a habit frees a slot | 2 total capacity boosts |
| Goals | Goals with progress < 100 | 3 | +2 capacity | 7 | Completed goal frees a slot | 2 total capacity boosts |
| Events | Future/upcoming events | 5 | +3 capacity | 11 | Past event frees a slot | 2 total capacity boosts |
| Languages | Language profiles | 2 | +1 capacity | 4 | Deleting a language frees a slot | 2 total capacity boosts |
| Language content | New vocabulary + grammar + conversation items combined today | 10/day | +10 today | 30/day | Daily | 2/day |
| Skills | Stored skills | 3 | +2 capacity | 7 | Deleting a skill frees a slot | 2 total capacity boosts |
| Study subjects | Stored subjects | 4 | +2 capacity | 8 | Deleting a subject frees a slot | 2 total capacity boosts |
| Study lessons | New lessons created today | 6/day | +5 today | 16/day | Daily | 2/day |
| Agreements | Active + overdue agreements | 5 | +3 capacity | 11 | Completed agreement frees a slot | 2 total capacity boosts |
| Documents | Stored documents | 5 | +2 capacity | 9 | Deleting a document frees a slot | 2 total capacity boosts |
| Finance accounts | Stored accounts | 3 | +2 capacity | 7 | Deleting an account frees a slot | 2 total capacity boosts |
| Finance budgets | Stored budgets | 3 | +2 capacity | 7 | Deleting a budget frees a slot | 2 total capacity boosts |
| Savings goals | Stored savings goals | 2 | +2 capacity | 6 | Deleting/completing according to current model frees a slot | 2 total capacity boosts |
| Religious | Everything | Unlimited | None | Unlimited | Never gated | 0 |

## 7. Unlimited Core Actions

The following remain unlimited for Free users and must not be blocked by quota ads:

- Finance income/expense transactions
- Finance transfers
- Journal writing/editing and archive access
- Fitness workout logging
- Weight logging
- Study-session logging
- Exam/test-result logging
- Religious-page actions and records
- Authentication and account recovery
- Notification opening and reminder handling
- Editing/deleting previously created items

The monetization opportunity in these sections is optional advanced output, not basic logging.

## 8. Optional Rewarded Feature Unlocks

These do not count item creation. They spend one rewarded-ad reward and therefore also count toward the global 6/day cap.

### Analytics

- Basic analytics remain free.
- A future “Advanced Analytics” area may be unlocked until the end of the current day by one rewarded ad.
- Religious analytics remain free and are excluded from paid/ad gating.

### Finance

- Transaction entry remains unlimited.
- A future advanced financial report may be opened by one rewarded ad.
- No financial value/category is sent to the ad network.

### Fitness

- Workout and weight logging remain unlimited.
- A future advanced weekly fitness analysis may be opened by one rewarded ad.

### Journal

- Journal remains unlimited.
- A future weekly summary/analysis may be opened by one rewarded ad.

### Future Vision

- The existing one-year/five-year/ten-year vision editor remains free.
- A future “turn my vision into an action plan” feature may use one rewarded ad.

### AI Assistant

The current `AIAssistantPage` is rule-based and does not call a paid external LLM. Its current insights remain free.

When a real paid AI provider is added later, AI credits become a separate monetization design. The previously discussed starting concept is 3 free AI requests/day plus +3 per rewarded ad, but this is **not part of the phase-1 AdMob implementation** and requires its own cost-aware design.

## 9. Religious Section Exclusion

The existing `ReligiousPage` and its data routes are excluded from all monetization gates:

- `/dhikr`
- `/quran`
- `/memorization`
- `/lessons`

No ads are shown while reading, recording, editing, counting, memorizing, or viewing religious progress.

The generic Habits page contains a `spiritual` habit category. Those entries remain part of the general Habits quota because they are stored as generic habits, but **their category/name/content must never be passed to AdMob or used for ad targeting**.

## 10. User Experience at a Limit

### Example: Tasks

When a Free user attempts to create task 7:

**Title**  
وصلت للحد المجاني لليوم

**Body**  
استخدمت 6 من 6 مهام مجانية اليوم. شاهد إعلانًا واحصل على 4 مهام إضافية اليوم.

**Actions**

- `🎬 مشاهدة إعلان (+4 مهام)`
- `⭐ LifeOS Pro`
- `إلغاء`

If the user completes the ad:

1. apply the reward,
2. close the reward dialog,
3. immediately continue the interrupted action by reopening/continuing the add form.

The user should never need to navigate back manually after earning the reward.

### Example: Capacity feature

Habits at 4/4:

> لديك 4 من 4 عادات في الخطة المجانية. شاهد إعلانًا لفتح مكان لعادتين إضافيتين.

After the first successful reward, the account capacity becomes 6. After the second, it becomes 8. Capacity does not revert to 4 later.

### Early warning

For daily quotas only, UI may show a lightweight warning when one free slot remains, for example:

> بقيت لك مهمة مجانية واحدة اليوم.

No ad is shown at this stage.

## 11. Pro Behavior

The app already has a RevenueCat-based `free | pro` subscription model.

When `subscription.isPro === true`:

- all creation/capacity gates return “allowed”,
- no Rewarded Ad offer is shown,
- no daily rewarded-ad cap UI is shown,
- optional ad-unlocked advanced features are treated as unlocked,
- account page shows Pro status normally.

No client setting may be allowed to manually set Pro.

## 12. Technical Architecture

### Existing architecture constraints

- App: React 18 + Capacitor 8 Android.
- Authentication: Supabase Auth.
- Most current LifeOS content data: localStorage via `src/utils/api.ts`.
- Subscription entitlement: RevenueCat via `src/utils/subscriptions.ts`.

Because content is local but rewarded capacity must survive reinstalls and must not be trivially editable, ad reward state should be account-backed in Supabase rather than stored only in localStorage.

### New client units

Suggested boundaries:

- `src/utils/ads/reward-policy.ts`
  - canonical quota IDs and limits
  - base allowance, reward amount, maximum allowance, reset type

- `src/utils/ads/ad-service.ts`
  - native Rewarded Ad load/show lifecycle
  - no product/business-rule knowledge

- `src/utils/ads/reward-state.ts`
  - fetch current rewarded allowances
  - calculate effective Free limit
  - request/refresh reward state

- `src/utils/ads/gate.ts`
  - pure `canCreate(...)` / `getGateReason(...)` business logic
  - Pro bypass

- `src/app/components/RewardGateDialog.tsx`
  - common reusable dialog
  - exact reward disclosure before ad
  - Retry / Pro / Cancel states

- `src/app/components/RewardStatus.tsx` (optional)
  - account-level `مكافآت اليوم X/6`

### Page integration

Creation gates are inserted only on new-item paths, before the existing POST operation. Edit and delete flows bypass the gate.

Examples:

- `TasksPage.saveTask()` — gate only when `editTask` is null
- `GoalsPage.saveGoal()` — gate only for new goal
- equivalent new-item save handlers in Habits, Events, Languages, Skills, Study, Agreements, Documents and Finance

Business rules should not be duplicated in page components. Pages ask a shared gate service whether creation is allowed.

## 13. Supabase Reward State

Recommended server-side tables:

### `ad_reward_events`

Immutable/idempotent reward history.

Suggested fields:

- `id uuid primary key`
- `user_id uuid not null`
- `transaction_id text unique not null`
- `reward_key text not null`
- `reward_amount integer not null`
- `reward_kind text not null` (`daily` / `capacity` / `temporary_feature`)
- `reward_date date not null`
- `granted_at timestamptz not null`
- `verified boolean not null`

### `ad_reward_allowances`

Fast account-level durable capacity/temporary state.

Suggested fields:

- `user_id uuid`
- `reward_key text`
- `permanent_bonus integer default 0`
- `temporary_bonus integer default 0`
- `temporary_date date nullable`
- `feature_unlock_until timestamptz nullable`
- `updated_at timestamptz`
- composite primary key `(user_id, reward_key)`

### Security

- users may read only their own allowance state,
- clients may not insert/update verified reward rows directly,
- only trusted server code may grant a reward,
- unique `transaction_id` prevents replay/double reward,
- RLS enabled.

## 14. Reward Verification Flow

Recommended flow:

1. User taps the explicit rewarded-ad button.
2. App loads/shows the rewarded ad.
3. Google SDK signals the client reward event.
4. UI can optimistically continue the interrupted action for responsiveness.
5. AdMob also sends Server-Side Verification (SSV) data to a Supabase Edge Function.
6. Edge Function validates the AdMob signature and transaction ID.
7. Server stores the idempotent reward event and updates the user allowance.
8. Client refreshes reward state.

For permanent capacity and cross-reinstall consistency, the verified server state is authoritative. Client optimism must reconcile against server state. If a provisional reward later fails verification, LifeOS revokes only unused bonus capacity; it never deletes or hides an item the user already created while the SDK had reported an earned reward.

The SSV payload must carry only a non-sensitive user identifier/reward identifier. It must never contain LifeOS content.

## 15. Consent and Privacy

Before requesting ads, LifeOS must integrate Google's consent flow as required for users in regions such as EEA/UK/Switzerland.

Requirements:

- use Google's UMP/CMP flow where applicable,
- do not request ads before the SDK indicates ads may be requested,
- expose “خيارات الخصوصية للإعلانات” in Account/Privacy when required so consent can be revisited,
- do not personalize based on LifeOS sensitive content,
- do not pass task names, religious data, health data, finance data, journal data, document data, or agreement text to AdMob,
- configure Play Console target-audience/age settings correctly before production rollout.

## 16. Time and Reset Rules

### Daily limits

Daily counters are based on a single well-defined app-local date key (`YYYY-MM-DD`) derived from the device timezone for product UX.

To reduce simple clock abuse, rewarded-event grants and the 6/day ad-reward cap are validated using server timestamps/date policy. Implementation must avoid relying exclusively on a mutable localStorage counter.

### Capacity rewards

Capacity rewards do not reset. They remain associated with the authenticated user account even if the user later becomes Pro. While Pro is active the limits are bypassed; if Pro later ends, the previously earned Free capacity is still preserved unless a deliberate future product migration changes the rules.

## 17. Error Handling

### Ad load failure

Show:

> الإعلان غير متاح حاليًا. جرّب مرة أخرى بعد قليل.

Actions: Retry / Pro / Cancel.

### User closes before earning reward

Return to the gate dialog. No reward.

### Network loss after reward callback

Allow the current interrupted action optimistically only if the SDK emitted the earned-reward callback; mark state pending and reconcile when connectivity returns.

### SSV duplicate

Ignore safely using unique `transaction_id`.

### Subscription state unavailable

Do not assume Pro. Retry entitlement refresh; if still unavailable, preserve existing data and avoid destructive behavior.

## 18. Monetization Analytics

Track only non-sensitive operational events, for example:

- `reward_gate_shown`
- `reward_ad_requested`
- `reward_ad_loaded`
- `reward_ad_earned`
- `reward_ad_failed`
- `reward_applied`
- `reward_daily_cap_reached`
- `pro_offer_opened_from_gate`

Allowed dimensions:

- generic `reward_key` such as `tasks_daily_bonus`
- app version
- platform

Forbidden analytics payloads:

- task title/description
- habit name/category when sensitive
- goal text
- journal text
- finance amounts/categories tied to a user
- health/fitness measurements
- religious records
- agreement contents
- document metadata/content beyond a generic feature event

## 19. Test Strategy

### Unit tests

Pure quota policy tests must cover:

- each base limit,
- each reward increment,
- each maximum Free limit,
- daily reset behavior,
- permanent capacity behavior,
- completed goal frees a slot,
- past event frees a slot,
- completed agreement frees a slot,
- global 6/day cap,
- Pro bypass,
- Religious section always allowed.

### Component tests

- gate dialog has exact reward text,
- Cancel never starts an ad,
- earned reward resumes interrupted add flow,
- failed/unavailable ad does not create an allowance,
- no rewarded gate on edit/delete.

### Integration tests

- SSV valid signature → one reward,
- repeated transaction ID → still one reward,
- invalid signature → no reward,
- wrong user/reward key → rejected,
- RLS prevents client reward mutation.

### Android manual QA

Use official AdMob test ad units until production release. Verify:

- load/show/close lifecycle,
- reward callback,
- background/foreground behavior,
- no double dialogs,
- process restart after reward,
- offline behavior,
- consent flow,
- Pro removes all ad gates,
- Religious page never loads or offers an ad.

## 20. Rollout

### Phase 1

Implement rewarded capacity gates only for:

- Tasks
- Habits
- Goals
- Events
- Languages + language-content daily quota
- Skills
- Study subjects + lessons
- Agreements
- Documents
- Finance accounts/budgets/savings goals

Keep all unlimited-core actions unchanged.

### Phase 2

After real usage data is available, add optional rewarded advanced analysis features only where users actually value them.

### Phase 3

Evaluate whether any second ad format is justified. No banner/interstitial should be added merely to increase impression count without retention data.

## 21. Success Metrics

The implementation is successful when:

- Free users can use every core LifeOS category without forced ads.
- Rewarded ads are always voluntary and state the exact reward.
- No more than 6 rewards can be earned per Free user per day.
- Rewarded capacity survives restart/reinstall/account login through server-backed state.
- Pro users never see an ad gate.
- Religious functionality remains unlimited and ad-free.
- Sensitive LifeOS content is never sent as ad targeting/context payload.
- Existing app data is never deleted or hidden because a quota changes.

## 22. Official Google References Used for Implementation Constraints

- AdMob rewarded ads overview: https://support.google.com/admob/answer/7372450
- Rewarded ad unit reward policies: https://support.google.com/admob/answer/7313578
- Android rewarded ads: https://developers.google.com/admob/android/rewarded
- Server-side verification: https://developers.google.com/admob/android/next-gen/ssv
- EEA/UK/Switzerland consent disclosure: https://developers.google.com/admob/android/next-gen/privacy/gdpr

