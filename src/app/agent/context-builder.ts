import type {
  AgentContext,
  AgentContextDomain,
  AgentMode,
  AgentSnapshot,
} from './agent-types.ts';

const PLANNING_TERMS = [
  'رتبلي يومي', 'رتب يومي', 'رتبلي الأسبوع', 'رتب اسبوعي', 'شو أعمل هلا',
  'plan my day', 'plan my week', 'what should i do now',
];


const ALL_CORE_DOMAINS: AgentContextDomain[] = ['tasks', 'habits', 'goals', 'events'];

const MODE_DOMAINS: Record<AgentMode, AgentContextDomain[]> = {
  // Chat must receive the full core LifeOS picture. Intent is classified semantically on
  // the server, so keyword matching here must never hide the entity the user refers to.
  chat: ALL_CORE_DOMAINS,
  smart_add: ALL_CORE_DOMAINS,
  day_plan: ALL_CORE_DOMAINS,
  what_now: ALL_CORE_DOMAINS,
  goal_plan: ['goals', 'tasks', 'habits', 'events'],
  reschedule: ALL_CORE_DOMAINS,
  morning_brief: ALL_CORE_DOMAINS,
  weekly_review: ALL_CORE_DOMAINS,
};

export function domainsForAgentMode(mode: AgentMode): AgentContextDomain[] {
  return [...MODE_DOMAINS[mode]];
}


const CONTEXT_FIELDS: Record<AgentContextDomain, readonly string[]> = {
  tasks: ['id', 'title', 'category', 'priority', 'startDate', 'endDate', 'recurrence', 'repeatDays', 'recurrenceEndDate', 'reminderTime', 'plannedTime', 'description', 'completions'],
  habits: ['id', 'name', 'category', 'icon', 'color', 'description', 'startDate', 'recurrence', 'repeatDays', 'recurrenceEndDate', 'reminderTime', 'dailyGoal', 'favorite', 'logs'],
  goals: ['id', 'title', 'description', 'type', 'startDate', 'deadline', 'progress', 'milestones'],
  events: ['id', 'title', 'type', 'date', 'time', 'location', 'notes', 'reminder', 'recurrence', 'repeatDays', 'recurrenceEndDate'],
};

function sanitizeItem(domain: AgentContextDomain, value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const clean: Record<string, unknown> = {};
  for (const field of CONTEXT_FIELDS[domain]) {
    if (source[field] !== undefined) clean[field] = source[field];
  }
  if (domain === 'tasks' && Array.isArray(clean.completions)) clean.completions = clean.completions.slice(-14);
  if (domain === 'habits' && Array.isArray(clean.logs)) clean.logs = clean.logs.slice(-14);
  return clean;
}

const DOMAIN_TERMS: Record<AgentContextDomain, string[]> = {
  tasks: ['مهمة', 'مهام', 'task', 'todo', 'أنجز', 'خلص'],
  habits: ['عادة', 'عادات', 'habit', 'روتين'],
  goals: ['هدف', 'أهداف', 'goal', 'milestone'],
  events: ['موعد', 'مواعيد', 'حدث', 'اجتماع', 'دكتور', 'event', 'calendar'],
};

function containsAny(message: string, terms: string[]): boolean {
  const normalized = message.toLocaleLowerCase();
  return terms.some(term => normalized.includes(term.toLocaleLowerCase()));
}

export function inferContextDomains(message: string): AgentContextDomain[] {
  if (containsAny(message, PLANNING_TERMS)) return ['tasks', 'habits', 'goals', 'events'];

  const matched = (Object.keys(DOMAIN_TERMS) as AgentContextDomain[])
    .filter(domain => containsAny(message, DOMAIN_TERMS[domain]));

  if (matched.length > 0) return matched;

  // Unknown/general messages still need the complete core snapshot because the semantic
  // intent classifier runs after context collection and may discover a habit, goal, or event.
  return [...ALL_CORE_DOMAINS];
}

export function buildAgentContext({
  message,
  timezone,
  now,
  snapshot,
  mode = 'chat',
}: {
  message: string;
  timezone: string;
  now: string;
  snapshot: AgentSnapshot;
  mode?: AgentMode;
}): AgentContext {
  const modeDomains = domainsForAgentMode(mode);
  const domains = modeDomains.length ? modeDomains : inferContextDomains(message);
  const data: AgentContext['data'] = {};

  for (const domain of domains) {
    const items = Array.isArray(snapshot[domain]) ? snapshot[domain] : [];
    data[domain] = items
      .map(item => sanitizeItem(domain, item))
      .filter((item): item is Record<string, unknown> => !!item);
  }

  return { message, timezone, now, domains, data };
}
