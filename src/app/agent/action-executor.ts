import type {
  AgentAction,
  ExecutedAgentAction,
  UndoInstruction,
} from './agent-types.ts';
import { validateAgentAction } from './validate-action.ts';
import { localDateKey } from '../../utils/ads/reward-policy.ts';

export type AgentApiRequest = <T = unknown>(path: string, options?: RequestInit) => Promise<T>;

function jsonOptions(method: 'POST' | 'PUT', body: Record<string, unknown>): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

function entityUpdatePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const { id: _id, ...rest } = payload;
  return rest;
}

function withCreationDefaults(type: AgentAction['type'], payload: Record<string, unknown>): Record<string, unknown> {
  if (type === 'CreateTask') {
    return {
      title: '', category: 'أخرى', priority: 'medium', startDate: localDateKey(), endDate: '',
      recurrence: 'once', repeatDays: [], recurrenceEndDate: '', reminderTime: '', plannedTime: '', description: '', ...payload,
    };
  }
  if (type === 'CreateHabit') {
    return {
      name: '', category: 'personal', icon: '⭐', color: '#10b981', description: '',
      startDate: localDateKey(), recurrence: 'daily', repeatDays: [], recurrenceEndDate: '', reminderTime: '', dailyGoal: '', ...payload,
    };
  }
  if (type === 'CreateEvent') {
    return { title: '', type: 'موعد', time: '', location: '', notes: '', reminder: '', recurrence: 'once', repeatDays: [], recurrenceEndDate: '', ...payload };
  }
  if (type === 'CreateGoal') {
    return { title: '', description: '', type: 'medium', startDate: localDateKey(), deadline: '', progress: 0, milestones: [], ...payload };
  }
  return payload;
}

function createUndo(path: string, result: any): UndoInstruction | null {
  const id = result && typeof result === 'object' && typeof result.id === 'string' ? result.id : null;
  return id ? { method: 'DELETE', path: `${path}/${encodeURIComponent(id)}` } : null;
}

function restoreUndo(path: string, id: string, previous?: Record<string, unknown> | null): UndoInstruction | null {
  if (!previous) return null;
  return { method: 'PUT', path: `${path}/${encodeURIComponent(id)}`, body: previous };
}

export async function executeApprovedAction(
  action: AgentAction,
  request: AgentApiRequest,
): Promise<ExecutedAgentAction> {
  if (action.status !== 'approved') throw new Error('Agent action must be approved before execution');

  const validation = validateAgentAction(action);
  if (!validation.valid) throw new Error(`Invalid agent action: ${validation.issues.join(', ')}`);

  const payload = action.payload;
  let result: unknown;
  let undo: UndoInstruction | null = null;

  switch (action.type) {
    case 'CreateTask':
      result = await request('/tasks', jsonOptions('POST', withCreationDefaults(action.type, payload)));
      undo = createUndo('/tasks', result);
      break;
    case 'UpdateTask': {
      const id = String(payload.id);
      result = await request(`/tasks/${encodeURIComponent(id)}`, jsonOptions('PUT', entityUpdatePayload(payload)));
      undo = restoreUndo('/tasks', id, action.previous);
      break;
    }
    case 'CompleteTask': {
      const id = String(payload.id);
      result = await request(`/tasks/${encodeURIComponent(id)}/complete`, jsonOptions('POST', {}));
      undo = restoreUndo('/tasks', id, action.previous);
      break;
    }
    case 'CreateHabit':
      result = await request('/habits', jsonOptions('POST', withCreationDefaults(action.type, payload)));
      undo = createUndo('/habits', result);
      break;
    case 'UpdateHabit': {
      const id = String(payload.id);
      result = await request(`/habits/${encodeURIComponent(id)}`, jsonOptions('PUT', entityUpdatePayload(payload)));
      undo = restoreUndo('/habits', id, action.previous);
      break;
    }
    case 'CreateEvent':
      result = await request('/events', jsonOptions('POST', withCreationDefaults(action.type, payload)));
      undo = createUndo('/events', result);
      break;
    case 'CreateGoal':
      result = await request('/goals', jsonOptions('POST', withCreationDefaults(action.type, payload)));
      undo = createUndo('/goals', result);
      break;
    case 'UpdateEvent': {
      const id = String(payload.id);
      result = await request(`/events/${encodeURIComponent(id)}`, jsonOptions('PUT', entityUpdatePayload(payload)));
      undo = restoreUndo('/events', id, action.previous);
      break;
    }
    case 'DeleteTask':
    case 'DeleteHabit':
    case 'DeleteEvent':
      throw new Error('Destructive agent actions are not enabled in Phase 1');
    default:
      throw new Error('Unsupported agent action');
  }

  return { ...action, status: 'executed', result, undo };
}

export async function undoExecutedAction(
  action: ExecutedAgentAction,
  request: AgentApiRequest,
): Promise<ExecutedAgentAction> {
  if (action.status !== 'executed') throw new Error('Only executed actions can be undone');
  if (!action.undo) throw new Error('This action cannot be undone safely');

  const options: RequestInit = { method: action.undo.method };
  if (action.undo.body) {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(action.undo.body);
  }
  await request(action.undo.path, options);
  return { ...action, status: 'undone' };
}
