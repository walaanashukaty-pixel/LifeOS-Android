export type ReminderEntityType = 'task' | 'habit' | 'event';
export type ReminderRecurrence = 'once' | 'daily' | 'weekly' | 'monthly';

export interface ReminderOccurrenceInput {
  entityType: ReminderEntityType;
  entityId: string;
  title: string;
  date: string;
  time: string;
  recurrence?: ReminderRecurrence;
  leadMinutes?: number;
  horizonDays?: number;
  now?: Date;
}

export interface ReminderOccurrence {
  id: number;
  entityType: ReminderEntityType;
  entityId: string;
  title: string;
  at: Date;
  occurrenceKey: string;
}

function parseLocalDateTime(date: string, time: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{2}):(\d{2})/.exec(time);
  if (!match || !timeMatch) return null;
  const [, ys, ms, ds] = match;
  const [, hs, mins] = timeMatch;
  const result = new Date(Number(ys), Number(ms) - 1, Number(ds), Number(hs), Number(mins), 0, 0);
  if (Number.isNaN(result.getTime())) return null;
  return result;
}

function endOfHorizon(now: Date, horizonDays: number): Date {
  const end = new Date(now);
  end.setDate(end.getDate() + horizonDays);
  end.setHours(23, 59, 59, 999);
  return end;
}

function addRecurrence(date: Date, recurrence: ReminderRecurrence): Date {
  const next = new Date(date);
  if (recurrence === 'daily') next.setDate(next.getDate() + 1);
  else if (recurrence === 'weekly') next.setDate(next.getDate() + 7);
  else if (recurrence === 'monthly') {
    const originalDay = next.getDate();
    next.setDate(1);
    next.setMonth(next.getMonth() + 1);
    const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    next.setDate(Math.min(originalDay, lastDay));
  }
  return next;
}

export function notificationNumericId(entityType: string, entityId: string, occurrenceKey: string): number {
  const value = `${entityType}:${entityId}:${occurrenceKey}`;
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 2147483647 || 1;
}

export function buildReminderOccurrences(input: ReminderOccurrenceInput): ReminderOccurrence[] {
  const recurrence = input.recurrence ?? 'once';
  const horizonDays = Math.max(0, input.horizonDays ?? 30);
  const now = new Date(input.now ?? new Date());
  const horizonEnd = endOfHorizon(now, horizonDays);
  const initial = parseLocalDateTime(input.date, input.time);
  if (!initial) return [];

  const leadMs = Math.max(0, input.leadMinutes ?? 0) * 60_000;
  const occurrences: ReminderOccurrence[] = [];
  let cursor = new Date(initial);
  let guard = 0;

  while (guard < 400) {
    guard += 1;
    const scheduled = new Date(cursor.getTime() - leadMs);
    if (scheduled > horizonEnd) break;
    if (scheduled > now) {
      const occurrenceKey = scheduled.toISOString().slice(0, 16);
      occurrences.push({
        id: notificationNumericId(input.entityType, input.entityId, occurrenceKey),
        entityType: input.entityType,
        entityId: input.entityId,
        title: input.title,
        at: scheduled,
        occurrenceKey,
      });
    }
    if (recurrence === 'once') break;
    cursor = addRecurrence(cursor, recurrence);
  }

  return occurrences;
}
