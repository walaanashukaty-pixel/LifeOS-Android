import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { Page } from '../app/App';
import { buildReminderOccurrences, type ReminderEntityType, type ReminderRecurrence } from './notification-model';

export interface NotificationSettings {
  enabled: boolean;
  tasks: boolean;
  habits: boolean;
  events: boolean;
}

export interface LifeOSNotificationRecord {
  key: string;
  nativeId: number;
  entityType: ReminderEntityType;
  entityId: string;
  page: Page;
  title: string;
  body: string;
  scheduledFor: string;
  read: boolean;
  createdAt: string;
}

const SETTINGS_KEY = 'lifeos_notification_settings';
const RECORDS_KEY = 'lifeos_notification_records';
const DEFAULT_SETTINGS: NotificationSettings = { enabled: true, tasks: true, habits: true, events: true };
const MAX_RECORDS = 180;
const DEEP_LINK_KEY = 'lifeos_notification_target';

function settingsKey(userId: string) { return `${SETTINGS_KEY}:${userId}`; }
function recordsKey(userId: string) { return `${RECORDS_KEY}:${userId}`; }
function isNative() { return Capacitor.isNativePlatform(); }

function emitChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('lifeos:notifications-changed'));
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}


export function setNotificationDeepLinkTarget(entityType: ReminderEntityType, entityId: string): void {
  localStorage.setItem(DEEP_LINK_KEY, JSON.stringify({ entityType, entityId, createdAt: Date.now() }));
}

export function consumeNotificationDeepLinkTarget(entityType: ReminderEntityType): string | null {
  const target = safeParse<{ entityType?: ReminderEntityType; entityId?: string; createdAt?: number }>(localStorage.getItem(DEEP_LINK_KEY), {});
  if (!target.entityId || target.entityType !== entityType) return null;
  localStorage.removeItem(DEEP_LINK_KEY);
  return target.entityId;
}

export function getNotificationSettings(userId: string): NotificationSettings {
  if (typeof localStorage === 'undefined') return DEFAULT_SETTINGS;
  return { ...DEFAULT_SETTINGS, ...safeParse<Partial<NotificationSettings>>(localStorage.getItem(settingsKey(userId)), {}) };
}

export function saveNotificationSettings(userId: string, settings: NotificationSettings): void {
  localStorage.setItem(settingsKey(userId), JSON.stringify(settings));
  emitChanged();
}

export function getNotificationRecords(userId: string): LifeOSNotificationRecord[] {
  if (typeof localStorage === 'undefined') return [];
  return safeParse<LifeOSNotificationRecord[]>(localStorage.getItem(recordsKey(userId)), [])
    .filter(record => record && record.scheduledFor)
    .sort((a, b) => b.scheduledFor.localeCompare(a.scheduledFor));
}

function saveRecords(userId: string, records: LifeOSNotificationRecord[]): void {
  const pruned = [...records]
    .sort((a, b) => b.scheduledFor.localeCompare(a.scheduledFor))
    .slice(0, MAX_RECORDS);
  localStorage.setItem(recordsKey(userId), JSON.stringify(pruned));
  emitChanged();
}

export function getDueNotificationRecords(userId: string): LifeOSNotificationRecord[] {
  const now = new Date().toISOString();
  return getNotificationRecords(userId).filter(record => record.scheduledFor <= now);
}

export function getUpcomingNotificationRecords(userId: string, limit = 6): LifeOSNotificationRecord[] {
  const now = new Date().toISOString();
  return getNotificationRecords(userId)
    .filter(record => record.scheduledFor > now)
    .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor))
    .slice(0, limit);
}

export function markNotificationRead(userId: string, key: string): void {
  saveRecords(userId, getNotificationRecords(userId).map(record => record.key === key ? { ...record, read: true } : record));
}

export function markNotificationReadByNativeId(userId: string, nativeId: number): void {
  saveRecords(userId, getNotificationRecords(userId).map(record => record.nativeId === nativeId ? { ...record, read: true } : record));
}

export function markAllNotificationsRead(userId: string): void {
  const now = new Date().toISOString();
  saveRecords(userId, getNotificationRecords(userId).map(record => record.scheduledFor <= now ? { ...record, read: true } : record));
}

export async function getNotificationPermission(): Promise<'granted' | 'denied' | 'prompt' | 'prompt-with-rationale' | 'web'> {
  if (!isNative()) return 'web';
  try {
    const result = await LocalNotifications.checkPermissions();
    return result.display;
  } catch {
    return 'denied';
  }
}

export async function requestNotificationPermission(): Promise<'granted' | 'denied' | 'prompt' | 'prompt-with-rationale' | 'web'> {
  if (!isNative()) return 'web';
  try {
    const current = await LocalNotifications.checkPermissions();
    if (current.display === 'granted') return 'granted';
    const requested = await LocalNotifications.requestPermissions();
    return requested.display;
  } catch {
    return 'denied';
  }
}

async function cancelNativeIds(ids: number[]) {
  if (!isNative() || ids.length === 0) return;
  try {
    await LocalNotifications.cancel({ notifications: ids.map(id => ({ id })) });
  } catch {
    // Data CRUD must continue even if the operating system rejects a cancellation.
  }
}

export async function cancelEntityReminders(userId: string, entityType: ReminderEntityType, entityId: string): Promise<void> {
  const records = getNotificationRecords(userId);
  const removed = records.filter(record => record.entityType === entityType && record.entityId === entityId);
  await cancelNativeIds(removed.map(record => record.nativeId));
  saveRecords(userId, records.filter(record => !(record.entityType === entityType && record.entityId === entityId)));
}

export async function cancelCategoryReminders(userId: string, entityType: ReminderEntityType): Promise<void> {
  const records = getNotificationRecords(userId);
  const removed = records.filter(record => record.entityType === entityType);
  await cancelNativeIds(removed.map(record => record.nativeId));
  saveRecords(userId, records.filter(record => record.entityType !== entityType));
}

export async function cancelAllUserReminders(userId: string): Promise<void> {
  const records = getNotificationRecords(userId);
  await cancelNativeIds(records.map(record => record.nativeId));
  saveRecords(userId, []);
}

function categoryEnabled(settings: NotificationSettings, entityType: ReminderEntityType) {
  if (!settings.enabled) return false;
  if (entityType === 'task') return settings.tasks;
  if (entityType === 'habit') return settings.habits;
  return settings.events;
}

async function scheduleEntity({
  userId,
  entityType,
  entityId,
  page,
  title,
  body,
  date,
  time,
  recurrence = 'once',
  leadMinutes = 0,
}: {
  userId: string;
  entityType: ReminderEntityType;
  entityId: string;
  page: Page;
  title: string;
  body: string;
  date: string;
  time: string;
  recurrence?: ReminderRecurrence;
  leadMinutes?: number;
}): Promise<number> {
  await cancelEntityReminders(userId, entityType, entityId);
  if (!date || !time || !categoryEnabled(getNotificationSettings(userId), entityType)) return 0;

  const occurrences = buildReminderOccurrences({
    entityType, entityId, title, date, time, recurrence, leadMinutes, horizonDays: 30,
  });
  if (occurrences.length === 0) return 0;

  const permission = await requestNotificationPermission();
  if (isNative() && permission !== 'granted') return 0;

  if (isNative()) {
    try {
      await LocalNotifications.schedule({
        notifications: occurrences.map(occurrence => ({
          id: occurrence.id,
          title,
          body,
          schedule: { at: occurrence.at, allowWhileIdle: true },
          foreground: true,
          autoCancel: true,
          group: 'lifeos-reminders',
          extra: { page, entityType, entityId, nativeId: occurrence.id },
        })),
      });
    } catch {
      return 0;
    }
  }

  const existing = getNotificationRecords(userId);
  const createdAt = new Date().toISOString();
  const records: LifeOSNotificationRecord[] = occurrences.map(occurrence => ({
    key: `${entityType}:${entityId}:${occurrence.id}`,
    nativeId: occurrence.id,
    entityType,
    entityId,
    page,
    title,
    body,
    scheduledFor: occurrence.at.toISOString(),
    read: false,
    createdAt,
  }));
  saveRecords(userId, [...records, ...existing]);
  return records.length;
}

function recurrenceOf(value: unknown): ReminderRecurrence {
  return value === 'daily' || value === 'weekly' || value === 'monthly' ? value : 'once';
}

export async function scheduleTaskReminders(userId: string, task: any): Promise<number> {
  const date = task?.endDate || task?.startDate || '';
  const time = task?.reminderTime || '';
  return scheduleEntity({
    userId,
    entityType: 'task',
    entityId: String(task?.id || ''),
    page: 'tasks',
    title: 'تذكير بالمهمة',
    body: task?.title ? `حان وقت: ${task.title}` : 'لديك مهمة مستحقة',
    date,
    time,
    recurrence: recurrenceOf(task?.recurrence),
  });
}

export async function scheduleHabitReminders(userId: string, habit: any): Promise<number> {
  return scheduleEntity({
    userId,
    entityType: 'habit',
    entityId: String(habit?.id || ''),
    page: 'habits',
    title: 'تذكير بالعادة',
    body: habit?.name ? `${habit?.icon || '🔥'} حان وقت عادة ${habit.name}` : 'حان وقت عادتك',
    date: habit?.startDate || new Date().toISOString().split('T')[0],
    time: habit?.reminderTime || '',
    recurrence: recurrenceOf(habit?.recurrence),
  });
}

export async function scheduleEventReminder(userId: string, event: any): Promise<number> {
  if (event?.reminder === '' || event?.reminder === null || event?.reminder === undefined) {
    await cancelEntityReminders(userId, 'event', String(event?.id || ''));
    return 0;
  }
  const leadMinutes = Number(event?.reminder || 0);
  const body = leadMinutes > 0
    ? `يبدأ “${event?.title || 'الحدث'}” خلال ${leadMinutes} دقيقة`
    : `حان موعد “${event?.title || 'الحدث'}”`;
  return scheduleEntity({
    userId,
    entityType: 'event',
    entityId: String(event?.id || ''),
    page: 'events',
    title: 'تذكير بموعد',
    body,
    date: event?.date || '',
    time: event?.time || '',
    recurrence: 'once',
    leadMinutes,
  });
}

export async function setupNotificationDeepLinkListener(
  userId: string,
  onNavigate: (page: Page) => void,
): Promise<() => void> {
  if (!isNative()) return () => {};
  try {
    const handle = await LocalNotifications.addListener('localNotificationActionPerformed', action => {
      const extra = action.notification.extra as { page?: Page; nativeId?: number } | undefined;
      if (typeof extra?.nativeId === 'number') markNotificationReadByNativeId(userId, extra.nativeId);
      const entityType = action.notification.extra?.entityType as ReminderEntityType | undefined;
      const entityId = action.notification.extra?.entityId as string | undefined;
      if (entityType && entityId) setNotificationDeepLinkTarget(entityType, entityId);
      if (extra?.page) onNavigate(extra.page);
    });
    return () => { handle.remove(); };
  } catch {
    return () => {};
  }
}
