import { supabase } from '../../utils/api.ts';
import {
  defaultAIUserSettings,
  normalizeAIUserSettings,
  type LifeOSAIUserSettings,
  type LifeOSAIUserSettingsDraft,
} from './ai-settings-types.ts';

type AISettingsRow = {
  user_id: string;
  ai_data_access_enabled: boolean | null;
  memory_enabled: boolean | null;
  smart_notifications_enabled: boolean | null;
  quiet_hours_enabled: boolean | null;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  max_smart_notifications_per_day: number | null;
  created_at: string | null;
  updated_at: string | null;
};

function fromRow(row: AISettingsRow): LifeOSAIUserSettings {
  const normalized = normalizeAIUserSettings({
    aiDataAccessEnabled: row.ai_data_access_enabled,
    memoryEnabled: row.memory_enabled,
    smartNotificationsEnabled: row.smart_notifications_enabled,
    quietHoursEnabled: row.quiet_hours_enabled,
    quietHoursStart: row.quiet_hours_start,
    quietHoursEnd: row.quiet_hours_end,
    maxSmartNotificationsPerDay: row.max_smart_notifications_per_day,
  });
  return {
    userId: row.user_id,
    ...normalized,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

export function defaultAIUserSettingsForUser(userId: string): LifeOSAIUserSettings {
  return { userId: userId || null, ...defaultAIUserSettings(), createdAt: null, updatedAt: null };
}

export async function loadAIUserSettings(userId: string): Promise<LifeOSAIUserSettings> {
  if (!userId) return defaultAIUserSettingsForUser('');
  const { data, error } = await supabase
    .from('ai_user_settings')
    .select('user_id, ai_data_access_enabled, memory_enabled, smart_notifications_enabled, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, max_smart_notifications_per_day, created_at, updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data ? fromRow(data as AISettingsRow) : defaultAIUserSettingsForUser(userId);
}

export async function saveAIUserSettings(
  userId: string,
  input: LifeOSAIUserSettingsDraft,
): Promise<LifeOSAIUserSettings> {
  if (!userId) throw new Error('لا يوجد مستخدم مسجل الدخول.');
  const value = normalizeAIUserSettings(input);
  const { data, error } = await supabase
    .from('ai_user_settings')
    .upsert({
      user_id: userId,
      ai_data_access_enabled: value.aiDataAccessEnabled,
      memory_enabled: value.memoryEnabled,
      smart_notifications_enabled: value.smartNotificationsEnabled,
      quiet_hours_enabled: value.quietHoursEnabled,
      quiet_hours_start: value.quietHoursStart,
      quiet_hours_end: value.quietHoursEnd,
      max_smart_notifications_per_day: value.maxSmartNotificationsPerDay,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select('user_id, ai_data_access_enabled, memory_enabled, smart_notifications_enabled, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, max_smart_notifications_per_day, created_at, updated_at')
    .single();
  if (error) throw error;
  return fromRow(data as AISettingsRow);
}
