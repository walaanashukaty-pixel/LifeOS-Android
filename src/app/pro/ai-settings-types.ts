export interface LifeOSAIUserSettings {
  userId: string | null;
  aiDataAccessEnabled: boolean;
  memoryEnabled: boolean;
  smartNotificationsEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  maxSmartNotificationsPerDay: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export type LifeOSAIUserSettingsDraft = Omit<LifeOSAIUserSettings, 'userId' | 'createdAt' | 'updatedAt'>;

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function defaultAIUserSettings(): LifeOSAIUserSettingsDraft {
  return {
    aiDataAccessEnabled: true,
    memoryEnabled: true,
    smartNotificationsEnabled: true,
    quietHoursEnabled: true,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    maxSmartNotificationsPerDay: 2,
  };
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function time(value: unknown, fallback: string): string {
  return typeof value === 'string' && TIME_RE.test(value) ? value : fallback;
}

export function normalizeAIUserSettings(input: unknown): LifeOSAIUserSettingsDraft {
  const defaults = defaultAIUserSettings();
  const source = input && typeof input === 'object' && !Array.isArray(input)
    ? input as Record<string, unknown>
    : {};
  const capRaw = Number(source.maxSmartNotificationsPerDay);
  const cap = Number.isFinite(capRaw) ? Math.max(1, Math.min(3, Math.round(capRaw))) : defaults.maxSmartNotificationsPerDay;
  return {
    aiDataAccessEnabled: bool(source.aiDataAccessEnabled, defaults.aiDataAccessEnabled),
    memoryEnabled: bool(source.memoryEnabled, defaults.memoryEnabled),
    smartNotificationsEnabled: bool(source.smartNotificationsEnabled, defaults.smartNotificationsEnabled),
    quietHoursEnabled: bool(source.quietHoursEnabled, defaults.quietHoursEnabled),
    quietHoursStart: time(source.quietHoursStart, defaults.quietHoursStart),
    quietHoursEnd: time(source.quietHoursEnd, defaults.quietHoursEnd),
    maxSmartNotificationsPerDay: cap,
  };
}
