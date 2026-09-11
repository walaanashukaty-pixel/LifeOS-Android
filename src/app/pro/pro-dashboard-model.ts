import { isTaskOnDate, isRecurringTask, taskDateKey } from '../../utils/task-date.ts';
import { occursOnDate } from '../../utils/recurrence.ts';
export interface ProDashboardPriority {
  id: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  overdue: boolean;
}

export interface ProDashboardInsight {
  tasksToday: number;
  eventsToday: number;
  priorities: ProDashboardPriority[];
  summary: string;
}

function taskCompletedOn(task: any, date: string): boolean {
  return !!task?.completions?.some?.((item: any) => item?.date === date && item?.status === 'completed');
}


function priorityValue(priority: unknown): number {
  if (priority === 'high') return 3;
  if (priority === 'low') return 1;
  return 2;
}

export function buildProDashboardInsight({
  date,
  tasks = [],
  events = [],
}: {
  date: string;
  tasks?: any[];
  events?: any[];
}): ProDashboardInsight {
  const todayTasks = tasks.filter(task => isTaskOnDate(task, date));
  const todayEvents = events.filter(event => occursOnDate({ anchorDate: String(event?.date || ''), targetDate: date, recurrence: event?.recurrence, repeatDays: event?.repeatDays, recurrenceEndDate: event?.recurrenceEndDate }));

  const candidates = tasks
    .filter(task => !taskCompletedOn(task, date))
    .filter(task => isTaskOnDate(task, date) || (!isRecurringTask(task) && !!taskDateKey(task) && taskDateKey(task) < date))
    .map(task => {
      const overdue = !isRecurringTask(task) && !!taskDateKey(task) && taskDateKey(task) < date;
      const dueToday = isTaskOnDate(task, date);
      const score = priorityValue(task?.priority) * 100 + (overdue ? 80 : 0) + (dueToday ? 30 : 0);
      return {
        id: String(task?.id || task?.title || crypto.randomUUID()),
        title: String(task?.title || 'مهمة بدون عنوان'),
        priority: (task?.priority === 'high' || task?.priority === 'low' ? task.priority : 'medium') as 'high' | 'medium' | 'low',
        overdue,
        score,
      };
    })
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'ar'))
    .slice(0, 3)
    .map(({ score: _score, ...item }) => item);

  const summary = todayTasks.length || todayEvents.length
    ? `اليوم عندك ${todayTasks.length} ${todayTasks.length === 1 ? 'مهمة' : 'مهام'} و${todayEvents.length} ${todayEvents.length === 1 ? 'موعد' : 'مواعيد'}.`
    : 'يومك خفيف حاليًا. فينا نختار خطوة صغيرة تدفعك لقدّام.';

  return { tasksToday: todayTasks.length, eventsToday: todayEvents.length, priorities: candidates, summary };
}
