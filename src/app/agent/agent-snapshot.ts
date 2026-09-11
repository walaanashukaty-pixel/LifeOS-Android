import type { AgentAction, AgentContextDomain, AgentMode, AgentSnapshot } from './agent-types.ts';
import { domainsForAgentMode, inferContextDomains } from './context-builder.ts';

export type SnapshotApiRequest = <T = unknown>(path: string, options?: RequestInit) => Promise<T>;

const DOMAIN_PATHS: Record<AgentContextDomain, string> = {
  tasks: '/tasks',
  habits: '/habits',
  goals: '/goals',
  events: '/events',
};

// CreateGoal is create-only in P0 and needs no previous-state restore.
const CREATE_GOAL_ACTION: AgentAction['type'] = 'CreateGoal';
void CREATE_GOAL_ACTION;

const RESTORE_FIELDS: Partial<Record<AgentAction['type'], readonly string[]>> = {
  UpdateTask: ['title', 'category', 'priority', 'startDate', 'endDate', 'recurrence', 'repeatDays', 'recurrenceEndDate', 'reminderTime', 'plannedTime', 'description'],
  CompleteTask: ['completions'],
  UpdateHabit: ['name', 'category', 'icon', 'color', 'description', 'startDate', 'recurrence', 'repeatDays', 'recurrenceEndDate', 'reminderTime', 'dailyGoal', 'favorite'],
  UpdateEvent: ['title', 'type', 'date', 'time', 'location', 'notes', 'reminder', 'recurrence', 'repeatDays', 'recurrenceEndDate'],
};

export async function loadScopedSnapshot(message: string, request: SnapshotApiRequest, mode: AgentMode = 'chat'): Promise<AgentSnapshot> {
  const modeDomains = domainsForAgentMode(mode);
  const domains = modeDomains.length ? modeDomains : inferContextDomains(message);
  const pairs = await Promise.all(domains.map(async domain => {
    const value = await request(DOMAIN_PATHS[domain]).catch(() => []);
    return [domain, Array.isArray(value) ? value : []] as const;
  }));
  return Object.fromEntries(pairs) as AgentSnapshot;
}

function domainForAction(type: AgentAction['type']): AgentContextDomain | null {
  if (type.endsWith('Task')) return 'tasks';
  if (type.endsWith('Habit')) return 'habits';
  if (type.endsWith('Event')) return 'events';
  if (type.endsWith('Goal')) return 'goals';
  return null;
}

function restoreSnapshot(type: AgentAction['type'], previous: Record<string, unknown>): Record<string, unknown> {
  const fields = RESTORE_FIELDS[type] || [];
  const clean: Record<string, unknown> = {};
  for (const field of fields) {
    if (previous[field] !== undefined) clean[field] = previous[field];
  }
  return clean;
}

export function attachPreviousState(action: AgentAction, snapshot: AgentSnapshot): AgentAction {
  if (!action.type.startsWith('Update') && action.type !== 'CompleteTask') return action;
  const domain = domainForAction(action.type);
  const id = typeof action.payload.id === 'string' ? action.payload.id : '';
  if (!domain || !id) return action;

  const previous = (snapshot[domain] || []).find((item: any) => item?.id === id);
  if (!previous || typeof previous !== 'object') throw new Error('Referenced record was not found in scoped LifeOS context');
  return { ...action, previous: restoreSnapshot(action.type, previous as Record<string, unknown>) };
}
