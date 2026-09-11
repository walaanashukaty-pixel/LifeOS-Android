# LifeOS Pro P0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align LifeOS Pro P0 with the new master prompt by upgrading the paywall, adding account-linked personalization onboarding, and making Plan My Day and Goal→Plan execute real confirmed LifeOS actions.

**Architecture:** Preserve the current Free app, RevenueCat source of truth, and existing `lifeos-agent` safe action pipeline. Add one RLS-protected LifeOS personalization table and service, a Pro onboarding flow, and extend typed actions with `CreateGoal` and `plannedTime`; the Edge Function reads personalization server-side while all LifeOS core writes still occur through the client executor after confirmation.

**Tech Stack:** React 18, TypeScript, Vite 6, Capacitor 8, RevenueCat, Supabase/Postgres RLS, Supabase Edge Functions/Deno, Node built-in test runner.

**Spec:** `docs/superpowers/specs/2026-09-10-lifeos-pro-p0-design.md`

## Global Constraints

- Do not redesign or remove existing Free UI/features.
- Do not replace RevenueCat, Google Play Billing, restore purchases, account linking, app ID, signing, auth, notifications, or AdMob.
- Do not read, modify, reference, or reuse Malaak code/tables/functions.
- `isPro` remains RevenueCat-authoritative; preview state stays separate.
- AI core writes require preview + confirmation and execute only through the existing LifeOS client `api()` path.
- No secrets in client code or repository files.

---

### Task 1: Personalization Data Contract and Storage

**Files:**
- Create: `src/app/pro/personalization-types.ts`
- Create: `src/app/pro/personalization-service.ts`
- Create: `supabase/migrations/20260910130425_create_ai_personalization_profiles.sql`
- Test: `tests/pro-p0-personalization.test.mjs`

**Interfaces:**
- Produces `LifeOSPersonalizationProfile`, `loadPersonalizationProfile(userId)`, `savePersonalizationProfile(userId, input)`, `emptyPersonalizationDraft()`.

- [ ] Write tests for exact six answer fields, own-account user id, onboarding flag, field whitelist, and RLS migration.
- [ ] Run the test and confirm failure because files do not exist.
- [ ] Implement types/service/migration with no Malaak reference.
- [ ] Re-run and confirm pass.

### Task 2: Pro Activation Onboarding

**Files:**
- Create: `src/app/pro/ProOnboardingFlow.tsx`
- Modify: `src/app/monetization/MonetizationProvider.tsx`
- Modify: `src/app/components/AccountPage.tsx`
- Test: `tests/pro-p0-onboarding.test.mjs`

**Interfaces:**
- Monetization context adds `personalization`, `personalizationLoading`, `openProSetup()`.
- `ProOnboardingFlow` accepts initial profile, celebration flag, save callback, and close callback.

- [ ] Write tests for celebration, six questions, result screen, async profile load, first-time gating, Account edit entry, and no app-start blocking.
- [ ] Confirm failing test.
- [ ] Implement the flow and provider wiring.
- [ ] Re-run and confirm pass.

### Task 3: Premium Paywall Value-First UX

**Files:**
- Modify: `src/app/components/ProPaywall.tsx`
- Modify: `src/app/agent/pro-features.ts`
- Test: `tests/pro-p0-paywall.test.mjs`

**Interfaces:**
- Existing purchase/restore functions remain unchanged.
- Paywall invokes `onProActivated()` after successful real activation.

- [ ] Write tests for exact hero/tagline, smart value before packages, Free-vs-Pro example, dynamic package price, annual recommendation, restore, cancellation-safe copy, and preview disclaimer.
- [ ] Confirm failure against current paywall.
- [ ] Implement the value-first layout without hard-coded prices/discounts.
- [ ] Re-run and confirm pass.

### Task 4: CreateGoal and Planned Task Time Typed Actions

**Files:**
- Modify: `src/app/agent/agent-types.ts`
- Modify: `src/app/agent/validate-action.ts`
- Modify: `src/app/agent/action-executor.ts`
- Modify: `src/app/agent/context-builder.ts`
- Modify: `src/app/agent/agent-snapshot.ts`
- Modify: `src/app/components/TasksPage.tsx`
- Modify: `src/app/components/GoalsPage.tsx`
- Test: `tests/pro-p0-actions.test.mjs`

**Interfaces:**
- Adds `CreateGoal`.
- Task payload accepts optional `plannedTime: HH:MM`.
- Goal payload accepts optional `milestones: string[]`.

- [ ] Write failing tests for validation, executor POST `/goals`, undo, context whitelist, planned-time rendering, and milestone rendering.
- [ ] Confirm failure.
- [ ] Implement minimal support while preserving existing records/forms.
- [ ] Re-run and confirm pass.

### Task 5: Make Day Plan and Goal Plan Actionable

**Files:**
- Modify: `src/app/agent/phase2-modes.ts`
- Modify: `src/app/agent/LifeOSAgentPage.tsx`
- Modify: `src/app/agent/pro-preview.ts`
- Modify: `supabase/functions/lifeos-agent/provider.ts`
- Modify: `supabase/functions/lifeos-agent/phase2-policy.ts`
- Modify: `supabase/functions/lifeos-agent/context-policy.ts`
- Modify: `supabase/functions/lifeos-agent/index.ts`
- Test: `tests/pro-p0-planning.test.mjs`

**Interfaces:**
- `day_plan` may propose `UpdateTask` and `CreateTask` with `plannedTime`.
- `goal_plan` may propose `CreateGoal`, `CreateTask`, `CreateHabit`, `CreateEvent`.
- Agent exposes batch CTA `اعتماد الخطة` / `إضافة الخطة إلى LifeOS` and executes approved actions sequentially through the existing executor.

- [ ] Write failing tests for server restrictions, prompt semantics, preview actions, batch CTA, and executor path.
- [ ] Confirm failure.
- [ ] Implement mode/action updates and safe batch execution.
- [ ] Re-run and confirm pass.
- [ ] Deploy `lifeos-agent` only after local server tests pass, keeping `verify_jwt=true`.

### Task 6: Server-Side Personalization Context

**Files:**
- Create: `supabase/functions/lifeos-agent/personalization.ts`
- Modify: `supabase/functions/lifeos-agent/index.ts`
- Test: `tests/pro-p0-edge-personalization.test.mjs`

**Interfaces:**
- Produces `loadLifeOSPersonalization(supabase, userId)` returning whitelisted P0 preferences only.

- [ ] Write failing tests requiring own-user query, whitelist, no Malaak, and provider context inclusion.
- [ ] Confirm failure.
- [ ] Implement minimal server loader and context injection.
- [ ] Re-run and confirm pass.

### Task 7: Pro State UI and Regression Gate

**Files:**
- Modify: `src/app/components/Layout.tsx`
- Modify: `src/app/agent/AIHubPage.tsx`
- Modify: `package.json`
- Modify: `.github/workflows/main.yml`
- Test: `tests/pro-p0-state.test.mjs`
- Test: `tests/pro-p0-ci.test.mjs`

**Interfaces:**
- `npm run test:pro-p0` runs all P0 contract tests.
- CI runs it before production build.

- [ ] Write failing tests for `PRO ✨` badge only for real Pro, explicit `✨ LifeOS AI` entry, no sixth mobile tab, and CI ordering.
- [ ] Confirm failure.
- [ ] Implement state UI and CI script.
- [ ] Run all existing test suites plus P0.
- [ ] Parse all TS/TSX with TypeScript and run `npm run build`.
