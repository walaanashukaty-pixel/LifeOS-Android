# LifeOS Pro P0 Design — New Master Prompt Alignment

## Goal

Align the existing LifeOS Pro implementation with the new master prompt without redesigning the Free app. P0 must make Pro feel like the intelligent version of LifeOS: explain its value before price, personalize it after activation, provide a clear AI entry point, and make the two primary planning flows create or update real LifeOS data only after confirmation.

## Existing Foundation We Keep

- Existing React/Vite/Capacitor app and current RTL LifeOS design tokens.
- Existing Free pages, limits, rewarded ads, and the current Free AI insights page.
- Existing RevenueCat + Google Play billing, restore purchases, user linking, expiration and renewal state.
- Existing `lifeos-agent` Supabase Edge Function, typed action preview/confirm/undo pipeline, `ai_conversations`, `ai_messages`, and `ai_actions`.
- Existing local LifeOS core data store through `api()` for tasks, habits, goals, and events.
- Existing Pro preview test mode, but updated so its copy accurately states that approved preview actions may write only to local test-device LifeOS data.
- No Malaak code, data, tables, functions, or concepts are used.

## P0 Scope

### 1. Premium Paywall

Keep the current upgrade entry point and RevenueCat package logic, but replace the content hierarchy so value comes before price:

1. Hero: `✨ LifeOS Pro`
2. Tagline: `مو بس تنظّمي حياتك... خلي LifeOS يساعدك تعيشيها.`
3. Short value description.
4. Smart feature cards led by LifeOS AI, Plan My Day, Goal→Plan, What Now, proactive help, and reviews.
5. `شوفي الفرق` Free-vs-Pro example using a Turkish B1 goal.
6. Dynamic package selection from RevenueCat/Google Play only; no hard-coded prices.
7. Annual package visually recommended when an annual package actually exists; no invented discount percentage.
8. Primary purchase CTA with the dynamic selected price.
9. Existing restore purchases path retained.

Purchase cancellation stays quiet; purchase failures use a short user-facing message; missing configuration/packages stay understandable without exposing unnecessary technical details.

### 2. Pro Activation and Personal Setup

A successful Pro activation must not end with only a toast. The first incomplete Pro setup opens a short flow:

- Celebration screen with `✨ أهلًا بك في LifeOS Pro` and `لنبدأ`.
- Six questions from the master prompt: focus areas, biggest organization problem, planning style, energy peak, primary goal, daily available time.
- Result screen: `عرفت من وين نبدأ ✨` with a concise profile summary.
- Save to account-linked Supabase table `ai_personalization_profiles`.
- Persist `onboarding_completed` so the flow is not repeated after completion.
- Pro users can reopen and edit the personal setup from Account.
- Loading this profile is asynchronous and must not block app startup or Dashboard rendering.

### 3. Personalization Storage and Privacy Boundary

Create one LifeOS-only table:

`ai_personalization_profiles`

- `user_id uuid primary key references auth.users(id) on delete cascade`
- `focus_areas text[]`
- `biggest_challenge text`
- `planning_style text`
- `energy_peak text`
- `primary_goal text`
- `daily_time text`
- `onboarding_completed boolean not null default false`
- timestamps

Enable RLS with an authenticated own-row policy. No Malaak table is read or reused.

The `lifeos-agent` backend loads this profile server-side for the authenticated user and adds only the whitelisted personalization fields to the provider context. The client never sends another user's profile and the AI never invents missing preferences.

### 4. Pro State Integration

`isPro` remains RevenueCat-authoritative. Add only Pro-visible UI:

- compact `PRO ✨` badge near the account/header where it fits the current layout;
- existing Pro AI home surfaces stay hidden for normal Free users;
- no unnecessary Pro upsell while `isPro === true`;
- test preview remains separate from real `isPro`.

### 5. LifeOS AI Entry

Keep the existing AI destination and Pro AI Home section. Make the Pro entry label explicit as `✨ LifeOS AI`; do not create a sixth mobile bottom-navigation tab or replace the Free assistant.

### 6. Plan My Day Becomes Actionable

The old Phase 2 `day_plan` read-only policy no longer matches the new master prompt. Update it so:

- AI can return a structured proposed day plan plus a minimal set of `UpdateTask` / `CreateTask` actions.
- Add optional task field `plannedTime` (`HH:MM`) for AI scheduling without misusing reminder time.
- Existing Tasks UI may display `plannedTime` only when present; existing manual task form remains otherwise unchanged.
- UI shows a clear `اعتماد الخطة` batch action when day-plan actions exist.
- No action executes before confirmation.

### 7. Goal → Plan Creates Real LifeOS Structure

Update Goal→Plan from “plan an existing goal” to “accept a natural-language goal and propose a complete LifeOS plan”:

- Add typed `CreateGoal` action.
- `CreateGoal` payload supports existing goal fields plus an optional `milestones` array of concise strings.
- Goal→Plan may propose `CreateGoal`, `CreateTask`, `CreateHabit`, and `CreateEvent` (for a review date/scheduled checkpoint).
- Goal preview is shown before writes.
- UI shows one batch CTA: `إضافة الخطة إلى LifeOS`.
- Goals page renders milestones only when they exist; current goals without milestones remain unchanged.

### 8. Action Safety

The existing safe pipeline remains authoritative:

`AI → typed proposal → validation → preview → confirmation → executor → api() → LifeOS local data → optional undo`

New actions are strictly validated client- and server-side. No deletes are enabled in P0. The backend does not mutate LifeOS core tasks/habits/goals/events directly.

## Error Handling

- Missing AI provider or server-side RevenueCat secret fails closed for real Pro AI requests.
- Test Pro preview uses local deterministic responses and never pretends it is a real subscription.
- Failed batch execution reports the failed item and does not claim full success.
- Personalization save failure keeps the setup open and preserves the user's selected answers in memory for retry.
- Profile load failure does not block the app.

## Performance

- Do not wait for AI on app launch.
- Personalization profile loads asynchronously after auth/subscription state resolution.
- AI work starts only when the user invokes a Pro feature.
- No new dependency is required for P0.

## Testing

P0 requires tests for:

- paywall value hierarchy, dynamic package price use, annual recommendation, restore path;
- activation onboarding flow and six questions;
- profile service field whitelist and onboarding-completed behavior;
- Supabase migration RLS contract;
- server personalization context loading without Malaak references;
- `CreateGoal`, milestones, task `plannedTime`, and executor/undo behavior;
- day-plan and goal-plan server mode action restrictions;
- batch confirmation CTAs and real execution path;
- Pro badge/state behavior;
- existing mobile/auth/ads/agent/phase2 regressions;
- TypeScript syntax and Vite production build.

## Out of Scope for P0

Daily review, weekly review, smart notifications, LifeOS memory controls, AI analytics, and long-term adaptive personalization are P1/P2. Gmail, Instagram, banking integrations, browser agents, social media agents, and generic ChatGPT-style AI remain out of scope.
