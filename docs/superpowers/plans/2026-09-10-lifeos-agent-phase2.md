# LifeOS Agent Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add six practical LifeOS Pro intelligence modes on top of the existing safe Agent pipeline.

**Architecture:** Keep one `lifeos-agent` backend and one `LifeOSAgentPage`. Add a typed mode/presentation contract, mode-scoped context, Pro-only launch surfaces, and server policy enforcement so read-only modes cannot emit writes and write-capable modes can emit only the action families they need.

**Tech Stack:** React 18, TypeScript, Vite, Capacitor 8, Supabase Edge Functions/Deno, RevenueCat, Node built-in test runner.

**Spec:** `docs/superpowers/specs/2026-09-10-lifeos-agent-phase2-design.md`

## Global Constraints

- Do not redesign or remove existing Free UI/features.
- Do not change `com.lifeos.app`, Android signing, RevenueCat purchase flow, AdMob policy, Google auth, or current navigation destinations.
- Do not introduce a second AI backend; use `lifeos-agent` only.
- Do not read or modify Malaak code/tables/functions.
- AI never writes LifeOS core data directly.
- No provider/RevenueCat secret may be committed to the client repository.

---

### Task 1: Add Phase 2 Mode and Presentation Contracts

**Files:**
- Create: `src/app/agent/phase2-modes.ts`
- Create: `src/app/agent/agent-presentation.ts`
- Modify: `src/app/agent/agent-types.ts`
- Test: `tests/phase2-modes.test.mjs`
- Test: `tests/phase2-presentation.test.mjs`

**Interfaces:**
- Produces: `AgentMode`, `PHASE2_AGENT_MODES`, `buildPhase2Launch()`, `parseAgentPresentation()`.

- [ ] Write failing tests that require six modes, exact safe mode policies, launch prompts, and strict presentation limits.
- [ ] Run `node --experimental-strip-types --test tests/phase2-modes.test.mjs tests/phase2-presentation.test.mjs` and confirm failure because implementation is absent.
- [ ] Implement the minimal typed contracts and parsers.
- [ ] Re-run the two tests and confirm pass.
- [ ] Commit with `git commit -m "feat: add LifeOS phase 2 mode contracts"`.

### Task 2: Add Mode-Scoped Context and Launch Handoff

**Files:**
- Create: `src/app/agent/agent-launch.ts`
- Modify: `src/app/agent/context-builder.ts`
- Modify: `src/app/agent/agent-snapshot.ts`
- Test: `tests/phase2-context.test.mjs`
- Test: `tests/phase2-launch.test.mjs`

**Interfaces:**
- Consumes: `AgentMode`.
- Produces: `domainsForAgentMode(mode)`, `queueAgentLaunch()`, `consumeAgentLaunch()` and mode-aware `buildAgentContext/loadScopedSnapshot`.

- [ ] Write failing tests proving mode-based domain scoping and one-shot launch persistence.
- [ ] Run the two tests and confirm failure.
- [ ] Implement mode overrides while keeping Phase 1 message inference backward-compatible for `chat`.
- [ ] Re-run and confirm pass.
- [ ] Commit with `git commit -m "feat: scope LifeOS context by pro AI mode"`.

### Task 3: Extend Client Contract for Structured Phase 2 Turns

**Files:**
- Modify: `src/app/agent/agent-client-core.ts`
- Modify: `src/app/agent/agent-client.ts`
- Test: `tests/phase2-client.test.mjs`

**Interfaces:**
- `AgentTurnInput.mode?: AgentMode`
- `AgentTurnResult.presentation: AgentPresentation | null`

- [ ] Write failing tests proving mode is sent, a valid presentation is parsed, and malformed presentations fail closed.
- [ ] Run the test and confirm failure.
- [ ] Implement minimal client mapping through the existing `lifeos-agent` invoke path.
- [ ] Re-run and confirm pass.
- [ ] Commit with `git commit -m "feat: support structured LifeOS pro AI responses"`.

### Task 4: Enforce Phase 2 Policies in the Edge Function

**Files:**
- Create: `supabase/functions/lifeos-agent/phase2-policy.ts`
- Modify: `supabase/functions/lifeos-agent/provider.ts`
- Modify: `supabase/functions/lifeos-agent/index.ts`
- Test: `tests/phase2-provider.test.mjs`
- Test: `tests/phase2-edge.test.mjs`

**Interfaces:**
- Produces: `normalizeAgentMode()`, `assertActionsAllowedForMode()`, provider `presentation`, and mode-specific provider instructions.

- [ ] Write failing tests for read-only modes, Smart Add create-only behavior, Goal→Plan create-only behavior, Rescheduling update-only behavior, mode-specific prompt instructions, and presentation persistence in assistant metadata.
- [ ] Run tests and confirm failure.
- [ ] Implement server mode validation/policy and presentation parser with strict caps.
- [ ] Re-run and confirm pass.
- [ ] Deploy the updated `lifeos-agent` with `verify_jwt=true` only after local tests pass.
- [ ] Commit with `git commit -m "feat: enforce phase 2 AI policies on server"`.

### Task 5: Add Pro Home Launchers and Structured Agent UI

**Files:**
- Create: `src/app/agent/ProAIHomeSection.tsx`
- Create: `src/app/agent/AgentPresentationCard.tsx`
- Modify: `src/app/components/MobileHome.tsx`
- Modify: `src/app/agent/AIHubPage.tsx`
- Modify: `src/app/agent/LifeOSAgentPage.tsx`
- Test: `tests/phase2-ui-wiring.test.mjs`

**Interfaces:**
- Home/Hub call `buildPhase2Launch()` and either queue/open the existing agent.
- Agent accepts `initialLaunch?: AgentLaunchRequest | null` and auto-sends once.

- [ ] Write failing static UI tests proving Free Home only renders the new section behind `isPro`, all six launchers exist, AI Hub consumes queued launches, and Agent renders `AgentPresentationCard`.
- [ ] Run test and confirm failure.
- [ ] Implement same-design Pro surfaces without changing bottom navigation or removing Free assistant content.
- [ ] Re-run and confirm pass.
- [ ] Commit with `git commit -m "feat: add LifeOS Pro intelligence launch surfaces"`.

### Task 6: Regression, Packaging, and CI Guard

**Files:**
- Modify: `package.json`
- Modify: `.github/workflows/main.yml`
- Create: `PHASE2_STATUS_AR.md`
- Create: `UPLOAD_LIFEOS_PHASE1_PHASE2.bat` (distribution package, not committed into the app repository)
- Test: `tests/phase2-ci.test.mjs`

**Interfaces:**
- Produces `npm run test:phase2`; CI runs it before `npm run build`.

- [ ] Write failing CI contract test requiring `test:phase2` and its placement before the web build.
- [ ] Run test and confirm failure.
- [ ] Add the package script/workflow step and safe Windows uploader that pulls current main, applies only Phase 2 patch files, runs all tests + Vite build, and never force-pushes.
- [ ] Run `npm run test:mobile`, `npm run test:auth`, `npm run test:ads`, `npm run test:agent`, and `npm run test:phase2`.
- [ ] Parse all `.ts/.tsx` files with TypeScript `transpileModule` and confirm zero syntax diagnostics.
- [ ] Run `npm run build` when dependencies are available; if the environment lacks dependencies, record that exact limitation and rely on the uploader/GitHub Actions build gate before release.
- [ ] Commit with `git commit -m "test: gate LifeOS phase 2 in CI"`.
