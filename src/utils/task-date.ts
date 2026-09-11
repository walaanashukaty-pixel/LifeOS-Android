import { occursOnDate } from './recurrence.ts';

export function taskDateKey(task: any): string {
  const explicit = String(task?.endDate || task?.startDate || '').trim();
  if (explicit) return explicit.slice(0, 10);
  const created = String(task?.createdAt || '').trim();
  return created ? created.slice(0, 10) : '';
}

// A recurring task is persisted once. Its completions are stored per occurrence date.
export function isTaskOnDate(task: any, dateKey: string): boolean {
  return occursOnDate({
    anchorDate: taskDateKey(task),
    targetDate: dateKey,
    recurrence: task?.recurrence,
    repeatDays: task?.repeatDays,
    recurrenceEndDate: task?.recurrenceEndDate,
  });
}

export function isRecurringTask(task: any): boolean {
  return !!task?.recurrence && task.recurrence !== 'once';
}
