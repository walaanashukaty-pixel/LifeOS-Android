import type { ExecutedAgentAction } from './agent-types.ts';

export interface AgentReminderAdapter {
  scheduleTask: (userId: string, item: any) => Promise<unknown>;
  scheduleHabit: (userId: string, item: any) => Promise<unknown>;
  scheduleEvent: (userId: string, item: any) => Promise<unknown>;
  cancelEntity: (userId: string, type: 'task' | 'habit' | 'event', id: string) => Promise<unknown>;
}

function objectResult(action: ExecutedAgentAction): Record<string, unknown> | null {
  return action.result && typeof action.result === 'object' && !Array.isArray(action.result)
    ? action.result as Record<string, unknown>
    : null;
}

export async function syncAgentRemindersAfterExecution(
  userId: string,
  action: ExecutedAgentAction,
  adapter: AgentReminderAdapter,
): Promise<void> {
  const item = objectResult(action);
  if (!item) return;
  if (action.type === 'CreateTask' || action.type === 'UpdateTask') await adapter.scheduleTask(userId, item);
  if (action.type === 'CreateHabit' || action.type === 'UpdateHabit') await adapter.scheduleHabit(userId, item);
  if (action.type === 'CreateEvent' || action.type === 'UpdateEvent') await adapter.scheduleEvent(userId, item);
}

export async function syncAgentRemindersAfterUndo(
  userId: string,
  action: ExecutedAgentAction,
  adapter: AgentReminderAdapter,
): Promise<void> {
  if (action.type.startsWith('Create')) {
    const item = objectResult(action);
    const id = typeof item?.id === 'string' ? item.id : '';
    if (!id) return;
    if (action.type === 'CreateTask') await adapter.cancelEntity(userId, 'task', id);
    if (action.type === 'CreateHabit') await adapter.cancelEntity(userId, 'habit', id);
    if (action.type === 'CreateEvent') await adapter.cancelEntity(userId, 'event', id);
    return;
  }

  const id = typeof action.payload.id === 'string' ? action.payload.id : '';
  if (!id || !action.previous) return;
  const restored = { id, ...action.previous };
  if (action.type === 'UpdateTask') await adapter.scheduleTask(userId, restored);
  if (action.type === 'UpdateHabit') await adapter.scheduleHabit(userId, restored);
  if (action.type === 'UpdateEvent') await adapter.scheduleEvent(userId, restored);
}
