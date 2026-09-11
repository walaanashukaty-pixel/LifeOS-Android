import { isTaskOnDate } from '../../utils/task-date.ts';
import { occursOnDate } from '../../utils/recurrence.ts';
export const DAILY_REVIEW_REASONS = [
  'ما كان عندي وقت',
  'كنت متعبة',
  'نسيت',
  'كانت الخطة كبيرة',
  'حدث شيء طارئ',
  'سبب آخر',
] as const;

export type DailyReviewReason = (typeof DAILY_REVIEW_REASONS)[number];

export interface DailyReviewSummary {
  date: string;
  tasksTotal: number;
  tasksCompleted: number;
  tasksIncomplete: number;
  habitsTotal: number;
  habitsCompleted: number;
  eventsToday: number;
  goalsActive: number;
  averageGoalProgress: number;
}


function goalProgress(goal: any): number {
  const raw = Number(goal?.progress ?? goal?.percentage ?? 0);
  return Number.isFinite(raw) ? Math.max(0, Math.min(100, raw)) : 0;
}

export function buildDailyReviewSummary({
  date,
  tasks = [],
  habits = [],
  goals = [],
  events = [],
}: {
  date: string;
  tasks?: any[];
  habits?: any[];
  goals?: any[];
  events?: any[];
}): DailyReviewSummary {
  const todayTasks = tasks.filter(task => isTaskOnDate(task, date));
  const tasksCompleted = todayTasks.filter(task => task?.completions?.some?.((item: any) => item?.date === date && item?.status === 'completed')).length;
  const todayHabits = habits.filter(habit => occursOnDate({ anchorDate: habit?.startDate || habit?.createdAt?.slice?.(0, 10) || date, targetDate: date, recurrence: habit?.recurrence || 'daily', repeatDays: habit?.repeatDays, recurrenceEndDate: habit?.recurrenceEndDate }));
  const habitsCompleted = todayHabits.filter(habit => habit?.logs?.some?.((item: any) => item?.date === date && item?.completed === true)).length;
  const activeGoals = goals.filter(goal => goalProgress(goal) < 100);
  const averageGoalProgress = activeGoals.length
    ? Math.round(activeGoals.reduce((sum, goal) => sum + goalProgress(goal), 0) / activeGoals.length)
    : 0;
  return {
    date,
    tasksTotal: todayTasks.length,
    tasksCompleted,
    tasksIncomplete: Math.max(0, todayTasks.length - tasksCompleted),
    habitsTotal: todayHabits.length,
    habitsCompleted,
    eventsToday: events.filter(event => occursOnDate({ anchorDate: String(event?.date || ''), targetDate: date, recurrence: event?.recurrence, repeatDays: event?.repeatDays, recurrenceEndDate: event?.recurrenceEndDate })).length,
    goalsActive: activeGoals.length,
    averageGoalProgress,
  };
}
