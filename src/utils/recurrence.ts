export type Recurrence = 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'weekdays';

export const WEEKDAY_OPTIONS = [
  { value: 6, label: 'السبت', short: 'سبت' },
  { value: 0, label: 'الأحد', short: 'أحد' },
  { value: 1, label: 'الاثنين', short: 'إث' },
  { value: 2, label: 'الثلاثاء', short: 'ثل' },
  { value: 3, label: 'الأربعاء', short: 'أر' },
  { value: 4, label: 'الخميس', short: 'خم' },
  { value: 5, label: 'الجمعة', short: 'جم' },
] as const;

export function normalizeRecurrence(value: unknown): Recurrence {
  if (value === 'daily' || value === 'weekly' || value === 'monthly' || value === 'yearly' || value === 'weekdays') return value;
  return 'once';
}

export function dateKey(value: unknown): string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : '';
}

function utcDate(key: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const parsed = new Date(`${key}T12:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function dayDiff(anchor: string, target: string): number | null {
  const a = utcDate(anchor);
  const t = utcDate(target);
  if (!a || !t) return null;
  return Math.floor((t.getTime() - a.getTime()) / 86_400_000);
}

export function occursOnDate({
  anchorDate,
  targetDate,
  recurrence,
  repeatDays,
  recurrenceEndDate,
}: {
  anchorDate: string;
  targetDate: string;
  recurrence?: unknown;
  repeatDays?: unknown;
  recurrenceEndDate?: unknown;
}): boolean {
  const anchor = dateKey(anchorDate);
  const target = dateKey(targetDate);
  if (!anchor || !target || target < anchor) return false;
  const end = dateKey(recurrenceEndDate);
  if (end && target > end) return false;

  const normalized = normalizeRecurrence(recurrence);
  if (normalized === 'once') return target === anchor;
  if (normalized === 'daily') return true;

  const anchorDateObj = utcDate(anchor);
  const targetDateObj = utcDate(target);
  if (!anchorDateObj || !targetDateObj) return false;

  if (normalized === 'weekdays') {
    const selected = Array.isArray(repeatDays)
      ? repeatDays.map(Number).filter(day => Number.isInteger(day) && day >= 0 && day <= 6)
      : [];
    // Safe fallback for old/incomplete data: repeat on the anchor weekday.
    return (selected.length ? selected : [anchorDateObj.getUTCDay()]).includes(targetDateObj.getUTCDay());
  }

  if (normalized === 'weekly') return targetDateObj.getUTCDay() === anchorDateObj.getUTCDay();
  if (normalized === 'monthly') {
    const lastDayOfTargetMonth = new Date(Date.UTC(
      targetDateObj.getUTCFullYear(),
      targetDateObj.getUTCMonth() + 1,
      0,
    )).getUTCDate();
    const expectedDay = Math.min(anchorDateObj.getUTCDate(), lastDayOfTargetMonth);
    return targetDateObj.getUTCDate() === expectedDay;
  }
  if (normalized === 'yearly') {
    return targetDateObj.getUTCDate() === anchorDateObj.getUTCDate()
      && targetDateObj.getUTCMonth() === anchorDateObj.getUTCMonth();
  }
  return false;
}

export function recurrenceLabel(recurrence: unknown, repeatDays?: unknown): string {
  const value = normalizeRecurrence(recurrence);
  if (value === 'once') return 'مرة واحدة';
  if (value === 'daily') return 'يوميًا';
  if (value === 'weekly') return 'أسبوعيًا';
  if (value === 'monthly') return 'شهريًا';
  if (value === 'yearly') return 'سنويًا';
  const selected = Array.isArray(repeatDays) ? repeatDays.map(Number) : [];
  const names = WEEKDAY_OPTIONS.filter(option => selected.includes(option.value)).map(option => option.short);
  return names.length ? `أيام: ${names.join('، ')}` : 'أيام محددة';
}

export function nextOccurrenceDates(input: {
  anchorDate: string;
  recurrence?: unknown;
  repeatDays?: unknown;
  recurrenceEndDate?: unknown;
  fromDate: string;
  horizonDays?: number;
  limit?: number;
}): string[] {
  const from = utcDate(dateKey(input.fromDate));
  if (!from) return [];
  const horizon = Math.max(0, Math.min(3660, input.horizonDays ?? 120));
  const limit = Math.max(1, Math.min(500, input.limit ?? 100));
  const result: string[] = [];
  for (let offset = 0; offset <= horizon && result.length < limit; offset += 1) {
    const current = new Date(from);
    current.setUTCDate(from.getUTCDate() + offset);
    const key = current.toISOString().slice(0, 10);
    if (occursOnDate({ ...input, targetDate: key })) result.push(key);
  }
  return result;
}

export function previousOccurrenceDates(input: {
  anchorDate: string;
  recurrence?: unknown;
  repeatDays?: unknown;
  recurrenceEndDate?: unknown;
  throughDate: string;
  lookbackDays?: number;
  limit?: number;
}): string[] {
  const through = utcDate(dateKey(input.throughDate));
  if (!through) return [];
  const lookback = Math.max(0, Math.min(3660, input.lookbackDays ?? 365));
  const limit = Math.max(1, Math.min(500, input.limit ?? 365));
  const result: string[] = [];
  for (let offset = 0; offset <= lookback && result.length < limit; offset += 1) {
    const current = new Date(through);
    current.setUTCDate(through.getUTCDate() - offset);
    const key = current.toISOString().slice(0, 10);
    if (occursOnDate({ ...input, targetDate: key })) result.push(key);
  }
  return result;
}

export function countScheduledDates(input: {
  anchorDate: string;
  recurrence?: unknown;
  repeatDays?: unknown;
  recurrenceEndDate?: unknown;
  fromDate: string;
  throughDate: string;
}): number {
  const from = utcDate(dateKey(input.fromDate));
  const through = utcDate(dateKey(input.throughDate));
  if (!from || !through || through < from) return 0;
  const diff = dayDiff(dateKey(input.fromDate), dateKey(input.throughDate));
  if (diff == null) return 0;
  let count = 0;
  for (let offset = 0; offset <= diff; offset += 1) {
    const current = new Date(from);
    current.setUTCDate(from.getUTCDate() + offset);
    if (occursOnDate({ ...input, targetDate: current.toISOString().slice(0, 10) })) count += 1;
  }
  return count;
}
