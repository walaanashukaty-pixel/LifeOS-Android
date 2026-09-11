import { api } from '../../utils/api.ts';
import {
  cancelSmartNotifications,
  getNotificationRecords,
  scheduleSmartNotification,
} from '../../utils/notifications.ts';
import { loadAIUserSettings } from './ai-settings-service.ts';
import {
  buildSmartNotificationCandidates,
  isInQuietHours,
  selectSmartNotifications,
} from './smart-notification-model.ts';

function localDateKey(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function localTimeKey(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export async function refreshSmartNotifications(userId: string, now = new Date()): Promise<number> {
  if (!userId) return 0;
  const settings = await loadAIUserSettings(userId);
  if (!settings.smartNotificationsEnabled) {
    await cancelSmartNotifications(userId);
    return 0;
  }

  const [tasks, habits, events] = await Promise.all([
    api('/tasks').catch(() => []),
    api('/habits').catch(() => []),
    api('/events').catch(() => []),
  ]);
  const date = localDateKey(now);
  const candidates = buildSmartNotificationCandidates({
    date,
    now,
    tasks: Array.isArray(tasks) ? tasks : [],
    habits: Array.isArray(habits) ? habits : [],
    events: Array.isArray(events) ? events : [],
  }).filter(candidate => {
    if (!settings.quietHoursEnabled) return true;
    const at = new Date(candidate.scheduledFor);
    return !isInQuietHours(localTimeKey(at), settings.quietHoursStart, settings.quietHoursEnd);
  });

  const existing = getNotificationRecords(userId).filter(record => record.entityType === 'smart' && record.scheduledFor.slice(0, 10) === date);
  const alreadyScheduledKeys = new Set(existing.map(record => record.entityId));
  const remaining = Math.max(0, settings.maxSmartNotificationsPerDay - existing.length);
  if (!remaining) return 0;

  const selected = selectSmartNotifications(candidates, {
    maxPerDay: Math.min(remaining, settings.maxSmartNotificationsPerDay),
    alreadyScheduledKeys,
  });
  let scheduled = 0;
  for (const candidate of selected) {
    scheduled += await scheduleSmartNotification(userId, candidate);
  }
  return scheduled;
}
