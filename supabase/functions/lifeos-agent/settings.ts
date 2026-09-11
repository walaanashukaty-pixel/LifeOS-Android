export interface LifeOSAISettings {
  aiDataAccessEnabled: boolean;
  memoryEnabled: boolean;
  smartNotificationsEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  maxSmartNotificationsPerDay: number;
}

const DEFAULTS: LifeOSAISettings = {
  aiDataAccessEnabled: true,
  memoryEnabled: true,
  smartNotificationsEnabled: true,
  quietHoursEnabled: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  maxSmartNotificationsPerDay: 2,
};

export async function loadLifeOSAISettings(supabase: any, userId: string): Promise<LifeOSAISettings> {
  if (!userId) return { ...DEFAULTS };
  const { data, error } = await supabase
    .from('ai_user_settings')
    .select('ai_data_access_enabled,memory_enabled,smart_notifications_enabled,quiet_hours_enabled,quiet_hours_start,quiet_hours_end,max_smart_notifications_per_day')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { ...DEFAULTS };
  return {
    aiDataAccessEnabled: data.ai_data_access_enabled !== false,
    memoryEnabled: data.memory_enabled !== false,
    smartNotificationsEnabled: data.smart_notifications_enabled !== false,
    quietHoursEnabled: data.quiet_hours_enabled !== false,
    quietHoursStart: typeof data.quiet_hours_start === 'string' ? data.quiet_hours_start : DEFAULTS.quietHoursStart,
    quietHoursEnd: typeof data.quiet_hours_end === 'string' ? data.quiet_hours_end : DEFAULTS.quietHoursEnd,
    maxSmartNotificationsPerDay: Math.max(1, Math.min(3, Number(data.max_smart_notifications_per_day) || DEFAULTS.maxSmartNotificationsPerDay)),
  };
}
