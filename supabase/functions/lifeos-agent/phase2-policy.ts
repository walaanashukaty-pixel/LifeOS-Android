export type ServerAgentMode =
  | 'chat'
  | 'smart_add'
  | 'day_plan'
  | 'what_now'
  | 'goal_plan'
  | 'reschedule'
  | 'morning_brief'
  | 'weekly_review';

export const PHASE2_SERVER_MODES = [
  'smart_add',
  'day_plan',
  'what_now',
  'goal_plan',
  'reschedule',
  'morning_brief',
] as const;

export const P1_SERVER_MODES = [
  'weekly_review',
] as const;

const ALL_CHAT_ACTIONS = [
  'CreateTask', 'UpdateTask', 'CompleteTask',
  'CreateHabit', 'UpdateHabit',
  'CreateEvent', 'UpdateEvent',
  'CreateGoal',
] as const;

const MODE_ACTIONS: Record<ServerAgentMode, readonly string[]> = {
  chat: ALL_CHAT_ACTIONS,
  smart_add: ['CreateTask', 'CreateHabit', 'CreateEvent', 'CreateGoal'],
  day_plan: ['UpdateTask'],
  what_now: [],
  goal_plan: ['CreateGoal', 'CreateTask', 'CreateHabit', 'CreateEvent'],
  reschedule: ['UpdateTask', 'UpdateEvent'],
  morning_brief: [],
  weekly_review: ['UpdateTask', 'CreateTask', 'UpdateHabit'],
};

const MODE_DOMAINS: Record<ServerAgentMode, readonly string[]> = {
  chat: ['tasks', 'habits', 'goals', 'events'],
  smart_add: ['tasks', 'habits', 'goals', 'events'],
  day_plan: ['tasks', 'habits', 'goals', 'events'],
  what_now: ['tasks', 'habits', 'goals', 'events'],
  goal_plan: ['goals', 'tasks', 'habits'],
  reschedule: ['tasks', 'habits', 'events', 'goals'],
  morning_brief: ['tasks', 'habits', 'goals', 'events'],
  weekly_review: ['tasks', 'habits', 'goals', 'events'],
};

const MAX_TITLE = 120;
const MAX_SUMMARY = 500;
const MAX_HEADING = 100;
const MAX_ITEM_TITLE = 180;
const MAX_ITEM_DETAIL = 360;
const MAX_TIME = 40;
const MAX_BADGE = 60;
const MAX_WARNING = 240;
const MAX_SECTIONS = 6;
const MAX_ITEMS = 8;
const MAX_WARNINGS = 5;

export interface ServerPresentationItem {
  title: string;
  detail?: string;
  time?: string;
  badge?: string;
}

export interface ServerPresentationSection {
  heading: string;
  items: ServerPresentationItem[];
}

export interface ServerPresentation {
  kind: Exclude<ServerAgentMode, 'chat'>;
  title: string;
  summary?: string;
  sections: ServerPresentationSection[];
  warnings: string[];
}

export function normalizeAgentMode(value: unknown): ServerAgentMode {
  if (value == null || value === '') return 'chat';
  if (value === 'chat') return 'chat';
  if (typeof value === 'string' && ((PHASE2_SERVER_MODES as readonly string[]).includes(value) || (P1_SERVER_MODES as readonly string[]).includes(value))) return value as ServerAgentMode;
  throw new Error('Agent mode is invalid');
}

export function assertActionsAllowedForMode(mode: ServerAgentMode, actions: Array<{ type: string }>): void {
  const allowed = new Set(MODE_ACTIONS[mode]);
  for (const action of actions) {
    if (!allowed.has(action.type)) {
      throw new Error(`Action ${action.type} is not allowed for ${mode}${allowed.size === 0 ? ' read-only mode' : ''}`);
    }
  }
}

export function filterContextForMode<T extends Record<string, unknown>>(context: T, mode: ServerAgentMode): Partial<T> {
  const allowed = new Set(MODE_DOMAINS[mode]);
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context)) {
    if (allowed.has(key)) result[key] = value;
  }
  return result as Partial<T>;
}

function cleanText(value: unknown, field: string, max: number, required = false): string | undefined {
  if (value == null || value === '') {
    if (required) throw new Error(`presentation ${field} is required`);
    return undefined;
  }
  if (typeof value !== 'string') throw new Error(`presentation ${field} must be text`);
  const clean = value.trim();
  if (!clean && required) throw new Error(`presentation ${field} is required`);
  if (clean.length > max) throw new Error(`presentation ${field} is too long`);
  return clean || undefined;
}

export function parseServerPresentation(input: unknown, mode: ServerAgentMode): ServerPresentation | null {
  if (input == null) {
    if (mode === 'chat') return null;
    throw new Error('presentation is required for structured LifeOS mode');
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('presentation must be an object');
  const source = input as Record<string, unknown>;
  const requestedKind = source.kind;
  const structuredKinds = [...PHASE2_SERVER_MODES, ...P1_SERVER_MODES] as readonly string[];
  if (typeof requestedKind !== 'string' || !structuredKinds.includes(requestedKind)) throw new Error('presentation kind is invalid');
  if (mode !== 'chat' && requestedKind !== mode) throw new Error('presentation kind does not match agent mode');
  const effectiveKind = requestedKind as Exclude<ServerAgentMode, 'chat'>;

  const rawSections = source.sections == null ? [] : source.sections;
  if (!Array.isArray(rawSections)) throw new Error('presentation sections must be an array');
  if (rawSections.length > MAX_SECTIONS) throw new Error('presentation sections exceed limit');
  const sections = rawSections.map((raw, sectionIndex) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error(`presentation section ${sectionIndex} is invalid`);
    const section = raw as Record<string, unknown>;
    const rawItems = section.items == null ? [] : section.items;
    if (!Array.isArray(rawItems)) throw new Error('presentation items must be an array');
    if (rawItems.length > MAX_ITEMS) throw new Error('presentation items exceed limit');
    return {
      heading: cleanText(section.heading, 'heading', MAX_HEADING, true)!,
      items: rawItems.map((rawItem, itemIndex) => {
        if (!rawItem || typeof rawItem !== 'object' || Array.isArray(rawItem)) throw new Error(`presentation item ${itemIndex} is invalid`);
        const item = rawItem as Record<string, unknown>;
        const parsed: ServerPresentationItem = { title: cleanText(item.title, 'item title', MAX_ITEM_TITLE, true)! };
        const detail = cleanText(item.detail, 'item detail', MAX_ITEM_DETAIL);
        const time = cleanText(item.time, 'item time', MAX_TIME);
        const badge = cleanText(item.badge, 'item badge', MAX_BADGE);
        if (detail) parsed.detail = detail;
        if (time) parsed.time = time;
        if (badge) parsed.badge = badge;
        return parsed;
      }),
    };
  });

  const rawWarnings = source.warnings == null ? [] : source.warnings;
  if (!Array.isArray(rawWarnings)) throw new Error('presentation warnings must be an array');
  if (rawWarnings.length > MAX_WARNINGS) throw new Error('presentation warnings exceed limit');
  const warnings = rawWarnings.map((warning, index) => cleanText(warning, `warning ${index}`, MAX_WARNING, true)!);
  const totalItems = sections.reduce((sum, section) => sum + section.items.length, 0);
  if (effectiveKind === 'what_now' && (totalItems < 1 || totalItems > 3)) throw new Error('what_now must contain one to three suggestions');

  const result: ServerPresentation = {
    kind: effectiveKind,
    title: cleanText(source.title, 'title', MAX_TITLE, true)!,
    sections,
    warnings,
  };
  const summary = cleanText(source.summary, 'summary', MAX_SUMMARY);
  if (summary) result.summary = summary;
  return result;
}

export function modeInstruction(mode: ServerAgentMode): string {
  switch (mode) {
    case 'smart_add':
      return 'MODE Smart Add: semantically decide whether the request is a task, habit, event/appointment, or goal. Never default to Task. If the user intent could reasonably be one-time or recurring, ask one concise clarification instead of guessing. Propose only the single best matching create action and return a smart_add presentation.';
    case 'day_plan':
      return 'MODE Plan My Day: inspect the real supplied tasks, habits, goals, events, completion state, current time, priorities, deadlines, recurrence, and personalization. Build a realistic plan from existing records. Do not invent filler tasks. Existing events and due habits are fixed context; only propose UpdateTask actions when an existing task needs a plannedTime adjustment. If the day is overloaded, prioritize and explicitly say what is deferred. Return a day_plan presentation.';
    case 'what_now':
      return 'MODE What Now: READ-ONLY. Reason over the real current LifeOS state and current time. Recommend one best next action, with up to two alternatives only when genuinely useful. Use the next event, urgency, deadlines, unfinished work, preferred energy period, goal relevance, and available daily time when present. Explain why it is best now. Never pretend a recommendation was started or completed. Return a what_now presentation and no actions.';
    case 'goal_plan':
      return 'MODE Goal to Plan: first look for a matching existing goal in context. If one exists, do NOT create a duplicate goal; build a practical plan around it using the minimum new tasks/habits/events. Only CreateGoal when the user is clearly defining a new goal and no matching goal exists. Never modify or delete a goal automatically. Return a goal_plan presentation.';
    case 'reschedule':
      return 'MODE Smart Rescheduling: read real overdue/unfinished tasks, fixed events, relevant recurring commitments and deadlines. Propose the minimum useful UpdateTask/UpdateEvent changes, using only IDs present in context. Show before/after timing and explain conflicts. Never claim the schedule changed until the client confirms and executes. Return a reschedule presentation.';
    case 'morning_brief':
      return 'MODE Morning Brief: READ-ONLY. Summarize only useful facts from today’s real LifeOS data: important commitments, top priorities, upcoming events, important deadlines, relevant habits, conflicts, and one practical recommendation. No generic motivation and no actions. Return a morning_brief presentation.';
    case 'weekly_review':
      return 'MODE Weekly Review: Review real last-seven-day completion/log history plus reflections. Explain what worked, what struggled, one observed pattern, and one practical recommendation. If a small plan change is useful, propose only the minimum allowed actions and never execute them directly. Return a weekly_review presentation.';
    case 'chat':
    default:
      return 'MODE Chat: classify the user intent semantically first. If the intent is daily planning, what-now, goal planning, smart rescheduling, or morning brief, behave exactly like that capability and return its structured presentation even though the user entered through chat. For ordinary conversation or data questions, reply naturally with no presentation unless one genuinely improves clarity. Never default every request to a task.';
  }
}
