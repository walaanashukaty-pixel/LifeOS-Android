export const AGENT_ACTION_TYPES = [
  'CreateTask',
  'UpdateTask',
  'CompleteTask',
  'DeleteTask',
  'CreateHabit',
  'UpdateHabit',
  'DeleteHabit',
  'CreateEvent',
  'UpdateEvent',
  'DeleteEvent',
  'CreateGoal',
] as const;

export type AgentActionType = (typeof AGENT_ACTION_TYPES)[number];

export type AgentMode =
  | 'chat'
  | 'smart_add'
  | 'day_plan'
  | 'what_now'
  | 'goal_plan'
  | 'reschedule'
  | 'morning_brief'
  | 'weekly_review';
export type AgentActionRisk = 'low' | 'medium' | 'high';
export type AgentActionStatus =
  | 'proposed'
  | 'clarification_required'
  | 'approved'
  | 'rejected'
  | 'executing'
  | 'executed'
  | 'partially_failed'
  | 'failed'
  | 'undone';

export interface AgentAction {
  id: string;
  type: AgentActionType;
  risk: AgentActionRisk;
  status: AgentActionStatus;
  payload: Record<string, unknown>;
  previous?: Record<string, unknown> | null;
}

export interface AgentValidationResult {
  valid: boolean;
  issues: string[];
}

export type AgentContextDomain = 'tasks' | 'habits' | 'goals' | 'events';

export interface AgentSnapshot {
  tasks?: unknown[];
  habits?: unknown[];
  goals?: unknown[];
  events?: unknown[];
}

export interface AgentContext {
  message: string;
  timezone: string;
  now: string;
  domains: AgentContextDomain[];
  data: Partial<Record<AgentContextDomain, unknown[]>>;
}

export type UndoInstruction = {
  method: 'DELETE' | 'PUT' | 'POST';
  path: string;
  body?: Record<string, unknown>;
};

export interface ExecutedAgentAction extends AgentAction {
  status: 'executed' | 'undone';
  result: unknown;
  undo: UndoInstruction | null;
}

export function isAgentActionType(value: unknown): value is AgentActionType {
  return typeof value === 'string' && (AGENT_ACTION_TYPES as readonly string[]).includes(value);
}

export function defaultRiskForAction(type: AgentActionType): AgentActionRisk {
  if (type.startsWith('Delete')) return 'high';
  if (type.startsWith('Create') || type.startsWith('Update')) return 'medium';
  return 'low';
}
