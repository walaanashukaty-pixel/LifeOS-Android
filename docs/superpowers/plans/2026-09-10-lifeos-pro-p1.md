# LifeOS Pro P1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development task-by-task and verification-before-completion before claiming completion.

**Goal:** Add What Now polish, Daily Review, Weekly AI Review, Smart Notifications, and transparent LifeOS memory/privacy controls without changing Free behavior.

**Architecture:** Extend the current LifeOS Agent with one new `weekly_review` mode and server-side privacy settings/reflection context. Add separate account-linked Supabase tables for AI settings and daily reflections. Keep all core LifeOS data local and all AI writes behind the existing typed-action executor. Smart notifications remain a separate deterministic layer over existing local notifications.

**Tech Stack:** React 18, TypeScript, Vite, Capacitor Local Notifications, RevenueCat, Supabase/Postgres RLS, Supabase Edge Functions, Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-10-lifeos-pro-p1-design.md`

### Task 1 — AI Settings and Memory Controls
- [ ] Write failing tests for settings defaults/normalization, Supabase service, RLS migration, Account controls, delete-memory confirmation.
- [ ] Implement `ai_user_settings`, client service/types, provider context integration hooks, Account UI.
- [ ] Re-run tests.

### Task 2 — Daily Review Feedback
- [ ] Write failing tests for daily summary model, reason options, upsert-by-user/date, RLS.
- [ ] Implement review types/service/model and Daily Review UI.
- [ ] Re-run tests.

### Task 3 — Weekly AI Review
- [ ] Write failing tests for `weekly_review` mode, provider prompt, actions whitelist, presentation, batch CTA.
- [ ] Implement mode/UI/server wiring and recent reflection context.
- [ ] Re-run tests.

### Task 4 — What Now UX
- [ ] Write failing tests requiring max three suggestions, personalization/time-aware prompt, `ابدأ` CTA.
- [ ] Implement UI/server constraints with no core data mutation.
- [ ] Re-run tests.

### Task 5 — Smart Notifications
- [ ] Write failing tests for quiet hours, daily cap, dedupe, useful candidates, no AI call on launch.
- [ ] Implement smart notification model/coordinator and generic smart notification scheduling.
- [ ] Wire to Pro lifecycle asynchronously and Account settings.
- [ ] Re-run tests.

### Task 6 — Regression Gate
- [ ] Add `npm run test:pro-p1` and CI step before build.
- [ ] Run all existing suites plus P1.
- [ ] Run TypeScript syntax/type/build checks available in the environment.
- [ ] Verify Supabase migrations/function source; deploy `lifeos-agent` with JWT after server tests are green.
