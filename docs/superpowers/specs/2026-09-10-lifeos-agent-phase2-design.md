# LifeOS Agent Phase 2 Design

## Goal

Extend the approved Phase 1 LifeOS Agent into six practical Pro intelligence experiences without redesigning the existing Free app or creating a second AI subsystem.

## Scope

Phase 2 includes exactly these Pro capabilities:

1. Smart Add (`smart_add`)
2. رتبلي يومي / Plan My Day (`day_plan`)
3. شو أعمل هلا؟ / What Now (`what_now`)
4. Goal → Plan (`goal_plan`)
5. Smart Rescheduling (`reschedule`)
6. Morning Brief (`morning_brief`)

Phase 3 personalization/memory is out of scope. Coaching and any Malaak subsystem are explicitly out of scope and must not be read, modified, referenced, or reused by Phase 2 code.

## Product Rules

- Free manual functionality and the existing Free AI insights remain available exactly as before.
- Pro adds intelligence using the existing LifeOS visual language; it does not introduce a separate theme or permanent sixth bottom-navigation tab.
- The existing RevenueCat purchase/restore flow remains the subscription source of truth on the client.
- The `lifeos-agent` Supabase Edge Function remains the only Phase 1/2 AI backend.
- AI never mutates LifeOS core data directly. It returns typed proposals; client validation, preview, confirmation, existing API execution, reminder sync, activity status, and undo remain authoritative.
- Provider and RevenueCat secrets remain server-side only.

## Architecture

Phase 2 is implemented as modes on the existing Agent, not six separate agents. A launch request contains an `AgentMode`, a user-facing title, and an initial prompt. Home/AI Hub surfaces queue a launch request, then the existing AI page opens `LifeOSAgentPage` with that mode.

The request pipeline is:

`Pro feature launcher → AgentMode → mode-scoped Context Builder → lifeos-agent → mode policy → provider → validated presentation + typed actions → client validation → preview → user confirmation → Phase 1 executor → existing api() → reminder sync → action status → undo`

## Mode Policies

### Smart Add

Loads tasks, habits, and events. The provider chooses the single best entity type and proposes only create actions. Ambiguous date/time/entity requests require clarification. No write occurs before confirmation.

### Plan My Day

Loads tasks, habits, goals, and events. Returns a structured day plan with priorities and schedule blocks. This mode is read-only: it cannot emit actions. If the user wants a proposed schedule applied, they can continue in normal chat or Smart Rescheduling.

### What Now

Loads tasks, habits, goals, and events. Returns one or two immediate recommendations based on time, priority, deadlines, completion state, and upcoming events. This mode is read-only.

### Goal → Plan

Loads goals plus tasks and habits. If the target goal is ambiguous, asks which goal. Otherwise returns milestones/steps and may propose creating tasks/habits that implement the plan. It never edits or deletes the goal in Phase 2.

### Smart Rescheduling

Loads tasks and events, plus goals for priority context. Returns a before/after summary and may propose only `UpdateTask` or `UpdateEvent`. Every proposed update uses an ID present in scoped context and still requires Phase 1 confirmation.

### Morning Brief

Loads tasks, habits, goals, and events. Returns a concise daily brief: today summary, top three priorities, upcoming commitments, conflicts/risks, and one practical recommendation. It is read-only.

## Structured Presentation Contract

The backend may return a validated `presentation` object:

- `kind`: one of the six Phase 2 modes
- `title`: short Arabic title
- `summary`: optional concise summary
- `sections`: 0–6 sections
- each section has `heading` and 0–8 items
- each item has `title` and optional `detail`, `time`, and `badge`
- `warnings`: 0–5 concise warnings

All strings are capped server-side/client-side. Unknown fields are ignored or rejected by the parser. The existing plain `reply` remains mandatory, so chat still works if no presentation is returned.

## Context Privacy

Mode-specific domain selection overrides text inference so a generic button prompt still sends only what the feature needs. Existing field whitelists and history caps remain in force. Finance, documents, journal, religious data, and unrelated modules are never sent in Phase 2.

## UI

- Mobile Home: render `ProAIHomeSection` only when `isPro === true`; Free Home markup remains otherwise unchanged.
- Pro AI Home section: compact command card plus six same-style LifeOS feature chips/cards.
- AI Hub: retains the existing Free assistant and existing Pro Agent CTA, while Pro users also get the six Phase 2 launchers.
- Agent chat: supports an initial launch mode, displays the structured presentation as native cards, then displays Phase 1 action previews underneath when applicable.

## Error Handling

- Invalid/unknown mode → fail closed to `chat` on client, reject invalid server mode values.
- Invalid provider presentation/action → reject response; no execution.
- Missing provider secret → existing `AI_PROVIDER_UNCONFIGURED` response; no fake AI.
- Missing RevenueCat server secret → existing fail-closed Pro verification error.
- Network/provider failure preserves user data and executes nothing.

## Testing

Phase 2 adds Node tests for mode contracts, context scoping, launch persistence, client presentation parsing, provider mode restrictions, UI wiring, and Edge Function wiring. Existing mobile/auth/ads/Phase 1 agent tests remain mandatory. Static TypeScript syntax parsing is run across all TS/TSX files. Full Vite/Android build is required in GitHub Actions or a dependency-equipped environment before release.
