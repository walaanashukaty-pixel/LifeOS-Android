# LifeOS Mobile App Shell + Notifications Design

## Goal
Turn the existing LifeOS Android/Capacitor experience into a senior-quality mobile app shell without changing existing section content, CRUD behavior, authentication flow, stored user data, or desktop layout.

## Approved Mobile Navigation
Bottom navigation on screens below 768px:
- الرئيسية (`dashboard`)
- المهام (`tasks`)
- العادات (`habits`)
- الأهداف (`goals`)
- حسابي (`account`)

There is no “More” tab. The mobile home screen exposes every existing LifeOS section as direct-access cards.

## Desktop Preservation
At `md` and above, preserve the existing sidebar, top bar, page components, design tokens, and behavior. The new bottom navigation and mobile home are mobile-only.

## Mobile Home
The mobile home is a purpose-built entry surface, not a redesign of the underlying sections. It contains:
- Greeting and date.
- Today progress summary using the existing tasks/habits/goals data.
- Quick access cards.
- A section directory containing direct links to all existing LifeOS sections.
- Existing emerald LifeOS identity, rounded cards, border/shadow language, RTL, and dark mode.

## Mobile App Bar
On mobile:
- Remove the sidebar/hamburger navigation.
- Keep a compact top app bar with page title, notification bell, and user avatar.
- Bell opens an in-app notification center.
- Avatar opens `account`.
- Content has bottom safe-area spacing for the fixed bottom navigation.

## Notification Scope (v1)
Native local notifications are implemented for:
- Tasks: optional `reminderTime`; reminder date is `endDate` when present, otherwise `startDate`. Recurring tasks pre-schedule matching reminders for the next 30 days.
- Habits: reuse the existing `reminderTime`; recurring habits pre-schedule matching reminders for the next 30 days based on `startDate` and recurrence.
- Events: expose the existing `reminder` field as “at time / 10 / 30 / 60 minutes before”. A reminder requires an event time.

When an item is edited, old schedules for that item are cancelled and replaced. When deleted, its schedules are cancelled. Native notification taps deep-link back to the owning LifeOS page.

## Notification Center
Maintain a lightweight local notification ledger keyed per user. Scheduled entries become “due” when their scheduled time passes. The bell badge counts due unread entries. Opening the center allows marking individual items or all items read. This works without changing the current application data backend.

## Notification Preferences
The Account page contains:
- Global notification enable/disable.
- Per-category toggles: tasks, habits, events.
- Native permission request/status.
- Existing dark mode control and logout.

## Native Integration
Use Capacitor Local Notifications. On normal web/desktop, notification APIs degrade safely and the app continues working. No push backend, FCM, database migration, or Supabase schema changes are introduced in v1.

## Constraints
- Do not alter the internal UX or visual design of existing section pages except adding reminder controls required for notifications.
- Do not alter current auth/data business logic.
- Preserve RTL and dark mode.
- Preserve desktop sidebar behavior.
- No “More” tab on mobile.
