# LifeOS Agent Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first safe typed-action foundation for LifeOS Agent on top of the existing LifeOS architecture.

**Architecture:** Keep current React/Capacitor, Supabase Auth, RevenueCat, and local-first `api()` intact. Add pure typed action/context modules first, then an execution adapter, then wire secure Pro-only agent networking and UI.

**Tech Stack:** TypeScript, React 18, Vite, Capacitor 8, Supabase, RevenueCat.

**Spec:** `docs/superpowers/specs/2026-09-10-lifeos-agent-phase1-design.md`

## Global Constraints
- Do not redesign the existing app.
- Do not remove Free functionality.
- Do not replace RevenueCat or Google Play Billing.
- Do not let AI write directly to storage/database.
- Require approval before executing typed actions.
- Keep context scoped to relevant LifeOS data.

---

### Task 1: Typed actions and validation
**Files:** Create `src/app/agent/agent-types.ts`, `src/app/agent/validate-action.ts`; Test `tests/agent-actions.test.mjs`.
**Produces:** typed action contract and deterministic validation.

### Task 2: Scoped context builder
**Files:** Create `src/app/agent/context-builder.ts`; Test `tests/agent-context.test.mjs`.
**Produces:** minimal context selection for tasks, habits, goals, and events.

### Task 3: Approved action executor and undo
**Files:** Create `src/app/agent/action-executor.ts`; Test `tests/agent-executor.test.mjs`.
**Produces:** execution through an injected API adapter, plus reversible undo instructions where technically possible.

### Task 4: Secure Pro agent backend
Add a Supabase Edge Function that verifies auth and Pro entitlement server-side, calls an abstracted AI provider, persists conversation/action records, and fails closed when required server configuration is missing.

### Task 5: Native Pro Agent UI
Reuse LifeOS design primitives to add chat, action preview, confirm/edit/cancel, error/retry, activity history, and undo without changing Free navigation/workflows.

### Task 6: Regression verification
Run agent unit tests, existing mobile/auth/ads tests, TypeScript/build checks, and verify Free flows remain unchanged.

## Verification addendum
The final Phase 1 implementation also verifies current LifeOS field contracts, server-side context sanitation, action-ID ownership against the scoped snapshot, audited user-edited payloads, creation defaults, and reminder synchronization.
