# LifeOS Mobile Shell + Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a professional mobile app shell, direct-access home, account tab, and real local reminders to the existing LifeOS React/Capacitor app while preserving desktop and current section behavior.

**Architecture:** Keep every existing section component and data API. Add isolated mobile navigation/home/account components plus a notification service that safely bridges Capacitor Local Notifications and a per-user local ledger. Wire scheduling only at task/habit/event CRUD boundaries.

**Tech Stack:** React 18, TypeScript, Tailwind CSS 4, lucide-react, Capacitor 8, @capacitor/local-notifications 8.

**Spec:** `docs/superpowers/specs/2026-08-27-mobile-shell-notifications-design.md`

## Global Constraints
- Existing desktop sidebar and section pages remain unchanged except reminder inputs required for notifications.
- Existing auth/data business logic remains unchanged.
- Mobile bottom nav is exactly: الرئيسية، المهام، العادات، الأهداف، حسابي.
- No “More” tab.
- Local notifications v1 only: tasks, habits, events.
- No Supabase schema changes and no push/FCM in v1.

---

### Task 1: Pure mobile navigation + notification scheduling model
**Files:**
- Create: `src/app/mobile/navigation.ts`
- Create: `src/utils/notification-model.ts`
- Test: `tests/mobile-notifications.test.mjs`

**Interfaces:**
- Produces `MOBILE_PRIMARY_NAV`, `MOBILE_SECTION_ITEMS`, `buildReminderOccurrences`, `notificationNumericId`.

- [ ] Write failing node tests for primary navigation IDs, event lead-time calculation, and daily/weekly/monthly 30-day reminder occurrence generation.
- [ ] Run `node --test tests/mobile-notifications.test.mjs` and verify failure because modules/exports are missing.
- [ ] Implement minimal pure modules.
- [ ] Run the node tests and verify pass.

### Task 2: Capacitor notification service and in-app ledger
**Files:**
- Create: `src/utils/notifications.ts`
- Modify: `package.json`

**Interfaces:**
- Produces `requestNotificationPermission`, `scheduleTaskReminders`, `scheduleHabitReminders`, `scheduleEventReminder`, `cancelEntityReminders`, `getDueNotificationRecords`, `markNotificationRead`, `markAllNotificationsRead`, `getNotificationSettings`, `saveNotificationSettings`, `setupNotificationDeepLinkListener`.

- [ ] Add Capacitor 8 core/android/local-notifications dependencies.
- [ ] Implement safe native detection, permission handling, schedule/cancel, per-user ledger, settings, and deep-link listener.
- [ ] Keep web fallback non-throwing.

### Task 3: Mobile home and account surfaces
**Files:**
- Create: `src/app/components/MobileHome.tsx`
- Create: `src/app/components/AccountPage.tsx`
- Modify: `src/app/App.tsx`

**Interfaces:**
- `MobileHome({ setPage })` routes directly to existing Page IDs.
- `AccountPage` manages dark mode, notification preferences, native permission, and logout.

- [ ] Render MobileHome only below 768px while preserving the current Dashboard on desktop.
- [ ] Add `account` page and route.
- [ ] Verify every existing section remains directly reachable.

### Task 4: Mobile layout shell, bottom nav, and notification center
**Files:**
- Create: `src/app/components/NotificationCenter.tsx`
- Modify: `src/app/components/Layout.tsx`

**Interfaces:**
- Mobile app bar exposes bell + avatar; bottom nav uses approved five destinations.
- Desktop sidebar stays intact.

- [ ] Remove mobile sidebar/hamburger only on mobile.
- [ ] Add fixed safe-area bottom navigation and content bottom padding.
- [ ] Add notification bell badge and center.
- [ ] Register native notification action listener to call `setPage`.

### Task 5: Wire task reminders
**Files:**
- Modify: `src/app/components/TasksPage.tsx`

- [ ] Add optional `reminderTime` to task form and edit hydration.
- [ ] After successful create/update schedule task reminders.
- [ ] After delete cancel task reminders.
- [ ] Do not change existing task CRUD/filter/complete behavior.

### Task 6: Wire habit reminders
**Files:**
- Modify: `src/app/components/HabitsPage.tsx`

- [ ] After successful create/update schedule using existing `reminderTime`.
- [ ] After delete cancel habit reminders.
- [ ] Preserve habit log/streak/category behavior.

### Task 7: Wire event reminders
**Files:**
- Modify: `src/app/components/EventsPage.tsx`

- [ ] Expose the existing `reminder` state with at-time/10/30/60-minute options.
- [ ] Validate event time when reminder is selected.
- [ ] Schedule after create/update and cancel after delete.

### Task 8: Verification and packaging
**Files:**
- Modify/Create: `README_MOBILE_AR.md`

- [ ] Run pure node tests.
- [ ] Run TypeScript parse/transpile checks for changed `.ts/.tsx` files.
- [ ] Scan for existing Page IDs and verify all prior sections remain in `App.tsx`.
- [ ] Create a ZIP ready for the existing GitHub Actions Capacitor APK workflow.
