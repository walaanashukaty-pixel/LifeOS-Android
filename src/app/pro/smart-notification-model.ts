import type { Page } from '../App.tsx';
import { isRecurringTask, isTaskOnDate } from '../../utils/task-date.ts';

export type SmartNotificationKind = 'overloaded_day' | 'overdue_priority' | 'daily_review';

export interface SmartNotificationCandidate {
  key: string;
  kind: SmartNotificationKind;
  title: string;
  body: string;
  scheduledFor: string;
  page: Page;
  priority: number;
}

function minutes(value: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

export function isInQuietHours(current: string, start: string, end: string): boolean {
  const now = minutes(current);
  const from = minutes(start);
  const to = minutes(end);
  if (now == null || from == null || to == null || from === to) return false;
  if (from < to) return now >= from && now < to;
  return now >= from || now < to;
}

function atLocal(date: string, hour: number, minute: number): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d, hour, minute, 0, 0);
}

function taskDoneOn(task: any, date: string): boolean {
  return !!task?.completions?.some?.((item: any) => item?.date === date && item?.status === 'completed');
}


function futureTime(now: Date, preferred: Date, fallbackMinutes: number): string {
  const at = preferred.getTime() > now.getTime() + 30_000
    ? preferred
    : new Date(now.getTime() + fallbackMinutes * 60_000);
  return at.toISOString();
}

export function buildSmartNotificationCandidates({
  date,
  now = new Date(),
  tasks = [],
  habits = [],
  events = [],
}: {
  date: string;
  now?: Date;
  tasks?: any[];
  habits?: any[];
  events?: any[];
}): SmartNotificationCandidate[] {
  void habits;
  void events;
  const todayTasks = tasks.filter(task => isTaskOnDate(task, date) && !taskDoneOn(task, date));
  const overdue = tasks.filter(task => {
    if (isRecurringTask(task)) return false;
    const due = String(task?.endDate || task?.startDate || '');
    return due && due < date && !task?.completions?.some?.((item: any) => item?.status === 'completed');
  });
  const candidates: SmartNotificationCandidate[] = [];

  const overdueHigh = overdue.find(task => task?.priority === 'high') || overdue[0];
  if (overdueHigh) {
    candidates.push({
      key: `smart:overdue:${date}:${String(overdueHigh.id || 'item')}`,
      kind: 'overdue_priority',
      title: 'LifeOS يقترح لك ✨',
      body: `مهمة “${String(overdueHigh.title || 'مهمة متأخرة').slice(0, 80)}” متأخرة. عندك اليوم فرصة مناسبة ترجعيلها.`,
      scheduledFor: futureTime(now, atLocal(date, 12, 15), 20),
      page: 'ai',
      priority: 100,
    });
  }

  if (todayTasks.length >= 8) {
    candidates.push({
      key: `smart:overloaded:${date}`,
      kind: 'overloaded_day',
      title: 'يومك مزدحم شوي',
      body: `عندك ${todayTasks.length} مهام اليوم. افتحي LifeOS وخليه يختار أهم 3 بدل ما تحاولي تعملي كلشي.`,
      scheduledFor: futureTime(now, atLocal(date, 10, 30), 15),
      page: 'ai',
      priority: 90,
    });
  }

  candidates.push({
    key: `smart:daily-review:${date}`,
    kind: 'daily_review',
    title: '🌙 كيف كان يومك؟',
    body: 'دقيقة واحدة للمراجعة بتساعد LifeOS يرتب اقتراحاته الجاية بشكل أنسب إلك.',
    scheduledFor: futureTime(now, atLocal(date, 20, 30), 30),
    page: 'ai',
    priority: 50,
  });

  return candidates.sort((a, b) => b.priority - a.priority);
}

export function selectSmartNotifications(
  candidates: SmartNotificationCandidate[],
  { maxPerDay, alreadyScheduledKeys }: { maxPerDay: number; alreadyScheduledKeys: Set<string> },
): SmartNotificationCandidate[] {
  const cap = Math.max(1, Math.min(3, Math.round(maxPerDay || 2)));
  return candidates.filter(item => !alreadyScheduledKeys.has(item.key)).slice(0, cap);
}
