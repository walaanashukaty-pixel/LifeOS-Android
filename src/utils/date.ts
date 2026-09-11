/**
 * Calendar-date helpers for LifeOS.
 *
 * IMPORTANT: date-only values in the UI are local calendar dates, not UTC dates.
 * Never derive "today" with toISOString().slice(0, 10), because that changes the
 * calendar day for users east/west of UTC around midnight.
 */
export function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseLocalDateKey(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  // Noon is intentionally used to avoid DST-midnight edge cases.
  const parsed = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) return null;
  return parsed;
}

export function addLocalDays(dateKey: string, days: number): string {
  const parsed = parseLocalDateKey(dateKey);
  if (!parsed) return '';
  parsed.setDate(parsed.getDate() + days);
  return localDateKey(parsed);
}

export function localTodayAtMidday(): Date {
  return parseLocalDateKey(localDateKey())!;
}

export function isLocalDateKey(value: unknown): value is string {
  return typeof value === 'string' && parseLocalDateKey(value) !== null;
}
