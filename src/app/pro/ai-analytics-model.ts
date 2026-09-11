import { isTaskOnDate } from '../../utils/task-date.ts';
import { occursOnDate } from '../../utils/recurrence.ts';
import { localDateKey, parseLocalDateKey } from '../../utils/date.ts';
export interface AIAnalyticsReflectionLike {
  reviewDate: string;
  reason: string;
  note?: string;
  summary?: unknown;
}

export interface AIAnalyticsSummary {
  windowDays: number;
  taskCompletionRate: number;
  habitCompletionRate: number;
  strongestHour: string | null;
  bestWeekday: string | null;
  observations: string[];
  recommendation: string;
  sufficientData: boolean;
}

const WEEKDAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

function rollingDates(endDate: string, days = 7): string[] {
  const end = parseLocalDateKey(endDate);
  if (!end) return [];
  return Array.from({ length: days }, (_, index) => {
    const value = new Date(end);
    value.setDate(end.getDate() - (days - 1 - index));
    return localDateKey(value);
  });
}

function entityForDate(item: any, date: string): boolean {
  const anchor = String(item?.startDate || item?.createdAt?.split?.('T')?.[0] || date);
  return occursOnDate({
    anchorDate: anchor,
    targetDate: date,
    recurrence: item?.recurrence || 'daily',
    repeatDays: item?.repeatDays,
    recurrenceEndDate: item?.recurrenceEndDate,
  });
}

function rate(done: number, opportunities: number): number {
  return opportunities > 0 ? Math.round((done / opportunities) * 100) : 0;
}

function completionHour(value: unknown): number | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const direct = value.match(/(?:T|^)([01]\d|2[0-3]):[0-5]\d/);
  if (direct) return Number(direct[1]);
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed).getHours();
}

function mostCommonKey(counts: Map<number, number>): number | null {
  let best: number | null = null;
  let bestCount = 0;
  for (const [key, count] of counts.entries()) {
    if (count > bestCount || (count === bestCount && best !== null && key > best)) {
      best = key;
      bestCount = count;
    }
  }
  return best;
}

export function buildAIAnalyticsSummary({
  endDate,
  tasks = [],
  habits = [],
  reflections = [],
}: {
  endDate: string;
  tasks?: any[];
  habits?: any[];
  reflections?: AIAnalyticsReflectionLike[];
}): AIAnalyticsSummary {
  const dates = rollingDates(endDate, 7);
  const dateSet = new Set(dates);
  let taskOpportunities = 0;
  let taskDone = 0;
  let habitOpportunities = 0;
  let habitDone = 0;
  const hourCounts = new Map<number, number>();
  const weekdayCounts = new Map<number, number>();

  for (const date of dates) {
    for (const task of tasks) {
      if (!isTaskOnDate(task, date)) continue;
      taskOpportunities += 1;
      const completion = task?.completions?.find?.((item: any) => item?.date === date && item?.status === 'completed');
      if (!completion) continue;
      taskDone += 1;
      const hour = completionHour(completion.time);
      if (hour != null) hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
      const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
      weekdayCounts.set(weekday, (weekdayCounts.get(weekday) || 0) + 1);
    }
    for (const habit of habits) {
      if (!entityForDate(habit, date)) continue;
      habitOpportunities += 1;
      const completed = habit?.logs?.some?.((item: any) => item?.date === date && item?.completed === true);
      if (!completed) continue;
      habitDone += 1;
      const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
      weekdayCounts.set(weekday, (weekdayCounts.get(weekday) || 0) + 1);
    }
  }

  const strongestHourValue = mostCommonKey(hourCounts);
  const bestWeekdayValue = mostCommonKey(weekdayCounts);
  const taskCompletionRate = rate(taskDone, taskOpportunities);
  const habitCompletionRate = rate(habitDone, habitOpportunities);
  const evidenceCount = taskDone + habitDone;
  const sufficientData = taskOpportunities + habitOpportunities >= 3 && evidenceCount >= 2;
  const observations: string[] = [];

  if (sufficientData) {
    if (taskOpportunities) observations.push(`أنجزت ${taskCompletionRate}% من فرص المهام خلال آخر 7 أيام.`);
    if (habitOpportunities) observations.push(`التزام العادات وصل إلى ${habitCompletionRate}% خلال نفس الفترة.`);
    if (strongestHourValue != null && hourCounts.get(strongestHourValue)! >= 2) {
      observations.push(`أكثر وقت ظهر فيه إنجاز مهامك كان حوالي ${String(strongestHourValue).padStart(2, '0')}:00.`);
    }
    if (bestWeekdayValue != null && weekdayCounts.get(bestWeekdayValue)! >= 2) {
      observations.push(`أقوى يوم إنجاز ظاهر حاليًا هو ${WEEKDAY_NAMES[bestWeekdayValue]}.`);
    }
  }

  const recentReflections = reflections.filter(item => dateSet.has(String(item?.reviewDate || '')));
  const reasons = new Map<string, number>();
  recentReflections.forEach(item => reasons.set(item.reason, (reasons.get(item.reason) || 0) + 1));
  const repeatedReason = [...reasons.entries()].sort((a, b) => b[1] - a[1]).find(([, count]) => count >= 2)?.[0] || null;
  if (repeatedReason) observations.push(`في مراجعاتك تكرر سبب «${repeatedReason}» أكثر من مرة.`);

  let recommendation = 'استخدمي LifeOS لعدة أيام إضافية حتى أقدر أطلع نمط مفيد بدون تخمين.';
  if (repeatedReason === 'كانت الخطة كبيرة') recommendation = 'الأسبوع الجاي خففي عدد الأولويات الأساسية وخلي الخطة أقصر وأسهل للتنفيذ.';
  else if (repeatedReason === 'ما كان عندي وقت') recommendation = 'اتركي مساحة أكبر بين الالتزامات وخلي أهم 2–3 مهام هي الأساس.';
  else if (repeatedReason === 'كنت متعبة') recommendation = 'حطي المهام الثقيلة بوقت طاقتك الأعلى، وخلي آخر اليوم أخف.';
  else if (repeatedReason === 'نسيت') recommendation = 'فعّلي تذكيرًا واضحًا للأشياء المهمة بدل الاعتماد على الذاكرة وحدها.';
  else if (sufficientData && strongestHourValue != null) recommendation = `جرّبي تحطي أهم مهمة قريب ${String(strongestHourValue).padStart(2, '0')}:00 لأنه الوقت الأكثر ارتباطًا بإنجازك الحالي.`;
  else if (sufficientData) recommendation = taskCompletionRate >= habitCompletionRate
    ? 'المهام عم تمشي أفضل من العادات؛ اختاري عادة واحدة صغيرة وثبتيها قبل إضافة عادات جديدة.'
    : 'العادات ثابتة أكثر من المهام؛ قللي عدد المهام اليومية واربطيها بأوقات واضحة.';

  return {
    windowDays: 7,
    taskCompletionRate,
    habitCompletionRate,
    strongestHour: strongestHourValue != null && (hourCounts.get(strongestHourValue) || 0) >= 2 ? `${String(strongestHourValue).padStart(2, '0')}:00` : null,
    bestWeekday: bestWeekdayValue != null && (weekdayCounts.get(bestWeekdayValue) || 0) >= 2 ? WEEKDAY_NAMES[bestWeekdayValue] : null,
    observations: observations.slice(0, 4),
    recommendation,
    sufficientData,
  };
}
