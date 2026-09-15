# LifeOS Pro P1 Design — Reviews, Smart Notifications, Memory Controls

## Goal

Extend the approved LifeOS Pro experience without redesigning Free. P1 adds an actionable “What Now” experience, end-of-day reflection, weekly AI review, a quiet bounded smart-notification layer over the existing notification system, and transparent user controls for AI data access and personal memory.

## Existing Foundation We Keep

- Current React/Vite/Capacitor UI and RTL design language.
- RevenueCat `isPro` as the real subscription source of truth; preview remains separate.
- Existing local LifeOS data through `api()` for tasks/habits/goals/events.
- Existing local notification scheduling and Notification Center.
- Existing `lifeos-agent` typed proposal/preview/confirm/execute/undo pipeline.
- P0 `ai_personalization_profiles` and Pro onboarding.
- No Malaak code, tables, functions, or data.

## P1 Scope

### 1. What Now

Keep the existing `what_now` agent mode read-only. Strengthen its server instruction so it uses current time, next event, priorities, unfinished tasks, preferred energy period, and daily time preference. Return one to three suggestions maximum. The UI adds a clear `ابدأ` action that acknowledges the selected next step without mutating LifeOS data.

### 2. Daily Review

Add a Pro Daily Review view that loads the current day’s tasks, habits, goals, and events from the existing `api()` layer and shows concise completion context. Ask one reason for what did not go well, using the exact P1 options from the master prompt plus optional short note. Save one reflection per user/date to a LifeOS-only Supabase table with RLS. These reflections are included server-side in future AI context only when AI data use and personal memory are enabled.

### 3. Weekly AI Review

Add `weekly_review` as an agent mode. It receives the existing scoped LifeOS data plus recent daily reflections loaded server-side. The provider must return: what worked, what struggled, a pattern noticed, and one recommendation. It may propose a small set of `UpdateTask`, `CreateTask`, or `UpdateHabit` actions. Those remain proposals and are applied only after the user taps `طبّق الاقتراح` and confirms through the existing safe executor.

### 4. Smart Notifications

Do not replace existing reminders. Add a separate Pro smart-notification layer that:

- is disabled when user disables Smart AI notifications;
- respects quiet hours;
- caps scheduled smart notifications per day (1–3, default 2);
- schedules at most a small set of deterministic useful prompts: overloaded day, overdue priority item, and end-of-day review;
- uses local LifeOS data and native/local notifications without waiting for AI at app launch;
- deep-links to the AI hub or relevant page;
- does not schedule duplicates.

### 5. Memory and AI Privacy Settings

Create one LifeOS-only `ai_user_settings` row per user with:

- `ai_data_access_enabled`
- `memory_enabled`
- `smart_notifications_enabled`
- `quiet_hours_enabled`
- `quiet_hours_start`
- `quiet_hours_end`
- `max_smart_notifications_per_day`
- timestamps

Enable RLS with authenticated own-row access.

Account/Settings adds a `🧠 ذاكرة LifeOS` section showing a short transparent summary of the saved personalization profile, plus controls to edit setup, turn AI data use on/off, turn memory on/off, turn smart notifications on/off, configure quiet hours and daily cap, and delete saved personalization after explicit confirmation.

Server behavior:

- If `ai_data_access_enabled` is false, ignore client LifeOS context and call the provider with empty LifeOS data.
- If `memory_enabled` is false, do not include personalization or past daily reflections.
- If settings are missing, use privacy-preserving documented defaults: data access on, memory on, smart notifications on, quiet hours on 22:00–08:00, max 2/day.

## Safety

- P1 does not add delete actions to the AI action catalog.
- Deleting memory is a direct user settings action with explicit confirmation, not an AI action.
- Weekly review changes still use typed proposal → preview → confirmation → executor.
- Smart notifications never modify LifeOS tasks/habits/goals/events.

## Performance

- P1 settings/profile/review loading is asynchronous and must not block app startup.
- Smart-notification refresh runs after Pro resolution and uses local deterministic analysis; no provider call on launch.
- AI is invoked only when user opens What Now/Weekly Review or other existing agent features.

## Testing

P1 needs tests for settings normalization/RLS, daily-review upsert, server privacy gating, recent reflection context, weekly-review mode/action restrictions, What Now 1–3 limit and Start CTA, smart notification quiet-hours/cap/dedupe logic, Notification Center smart records, Account memory controls, CI wiring, and regression tests for all previous suites.
