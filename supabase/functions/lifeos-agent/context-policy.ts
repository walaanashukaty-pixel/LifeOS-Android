export const AGENT_CONTEXT_DOMAINS = ['tasks', 'habits', 'goals', 'events'] as const;
export type AgentServerDomain = (typeof AGENT_CONTEXT_DOMAINS)[number];
const MAX_ITEMS_PER_DOMAIN = 80;
const MAX_HISTORY_ITEMS = 14;

const CONTEXT_FIELDS: Record<AgentServerDomain, readonly string[]> = {
  tasks: ['id', 'title', 'category', 'priority', 'startDate', 'endDate', 'recurrence', 'repeatDays', 'recurrenceEndDate', 'reminderTime', 'plannedTime', 'description', 'completions'],
  habits: ['id', 'name', 'category', 'icon', 'color', 'description', 'startDate', 'recurrence', 'repeatDays', 'recurrenceEndDate', 'reminderTime', 'dailyGoal', 'favorite', 'logs'],
  goals: ['id', 'title', 'description', 'type', 'startDate', 'deadline', 'progress', 'milestones'],
  events: ['id', 'title', 'type', 'date', 'time', 'location', 'notes', 'reminder', 'recurrence', 'repeatDays', 'recurrenceEndDate'],
};

function sanitizeHistory(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  return value.slice(-MAX_HISTORY_ITEMS).map(item => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return item;
    const source = item as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const key of ['date', 'time', 'status', 'completed', 'reason', 'note']) {
      if (source[key] !== undefined) result[key] = source[key];
    }
    return result;
  });
}

function sanitizeRecord(domain: AgentServerDomain, value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const key of CONTEXT_FIELDS[domain]) {
    if (source[key] === undefined) continue;
    result[key] = key === 'completions' || key === 'logs' ? sanitizeHistory(source[key]) : source[key];
  }
  return result;
}

export function sanitizeAgentServerContext(input: unknown): Partial<Record<AgentServerDomain, Record<string, unknown>[]>> {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input as Record<string, unknown> : {};
  const result: Partial<Record<AgentServerDomain, Record<string, unknown>[]>> = {};
  for (const domain of AGENT_CONTEXT_DOMAINS) {
    const values = source[domain];
    if (!Array.isArray(values)) continue;
    result[domain] = values.slice(0, MAX_ITEMS_PER_DOMAIN)
      .map(value => sanitizeRecord(domain, value))
      .filter((value): value is Record<string, unknown> => value !== null);
  }
  return result;
}
