# LifeOS Agent Phase 1 Design

## Goal
Add the first safe, Pro-only LifeOS Agent foundation without redesigning the existing Free experience or replacing RevenueCat, Supabase Auth, notifications, navigation, or the existing local-first data API.

## Architecture
The client builds a minimal context snapshot from existing LifeOS data, sends natural-language intent to a secure AI backend, receives typed proposed actions, validates them, shows a preview, and executes only after approval through the existing `api()` surface. The AI never writes directly to storage/database. Executed actions carry an undo recipe whenever the existing API can safely reverse them.

## Phase 1 action scope
- CreateTask
- UpdateTask
- CompleteTask
- CreateHabit
- UpdateHabit
- CreateEvent
- UpdateEvent

## Safety
- Unknown action types are rejected.
- Proposed actions are validated before execution.
- Execution requires `status: approved`.
- Creation undo deletes only the record created by the action.
- Update undo restores the caller-supplied previous snapshot when available.
- No Free UI or existing data storage is replaced.

## Context minimization
The client selects only modules relevant to the current user message. Planning requests may include tasks, habits, goals, and events; targeted requests include only the needed domains.

## UI
A Pro Agent experience will be added as a native LifeOS extension in a later task, reusing the current cards, buttons, colors, typography, responsive shell, and `MonetizationProvider.isPro`.

## Final integration details
- Agent task payloads use the existing LifeOS fields: `startDate`, `endDate`, `reminderTime`, `category`, `priority`, `recurrence`, and `description`.
- Habit payloads use the existing LifeOS fields: `startDate`, `reminderTime`, `dailyGoal`, `category`, `icon`, `color`, and `recurrence`.
- Event payloads use the existing LifeOS fields: `date`, `time`, `type`, `location`, `notes`, and `reminder`.
- Unknown payload fields are rejected on both client and server.
- Update/complete actions must reference an ID present in the scoped snapshot; unknown IDs fail closed before preview/execution.
- Undo snapshots contain only fields necessary to restore the affected record.
- Creation defaults mirror the current manual LifeOS forms so Agent-created records render normally.
- Existing native reminder scheduling is kept in sync after Agent create/update and after undo.
- When the user edits a proposed action, the final approved payload is validated and persisted to the action audit record before execution.
- Server context is re-sanitized independently of client context minimization.
