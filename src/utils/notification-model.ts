import { occursOnDate } from './recurrence.ts';

export type ReminderEntityType = 'task' | 'habit' | 'event';
export type ReminderRecurrence = 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'weekdays';

export interface ReminderOccurrenceInput {
  entityType: ReminderEntityType;
  entityId: string;
  title: string;
  date: string;
  time: string;
  recurrence?: ReminderRecurrence;
  repeatDays?: number[];
  recurrenceEndDate?: string;
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
  return Number.isNaN(result.getTime()) ? null : result;
}

function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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
  const leadMs = Math.max(0, input.leadMinutes ?? 0) * 60_000;
  const occurrences: ReminderOccurrence[] = [];

  // Scan calendar days. This keeps custom weekdays and monthly/yearly rules consistent
  // with the rest of LifeOS without creating duplicate persisted tasks/events.
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
  for (let offset = 0; offset <= horizonDays; offset += 1) {
    const day = new Date(cursor);
    day.setDate(cursor.getDate() + offset);
    const targetDate = localDateKey(day);
    if (!occursOnDate({
      anchorDate: input.date,
      targetDate,
      recurrence,
      repeatDays: input.repeatDays,
      recurrenceEndDate: input.recurrenceEndDate,
    })) continue;

    const occurrenceAt = parseLocalDateTime(targetDate, input.time);
    if (!occurrenceAt) continue;
    const scheduled = new Date(occurrenceAt.getTime() - leadMs);
    if (scheduled <= now) continue;
    const occurrenceKey = scheduled.toISOString().slice(0, 16);
    occurrences.push({
      id: notificationNumericId(input.entityType, input.entityId, occurrenceKey),
      entityType: input.entityType,
      entityId: input.entityId,
      title: input.title,
      at: scheduled,
      occurrenceKey,
    });
    if (recurrence === 'once') break;
  }

  return occurrences;
}
