export const PERSONALIZATION_FOCUS_AREAS = [
  'صحتي', 'عملي', 'دراستي', 'تنظيم وقتي', 'تطوير نفسي', 'علاقاتي', 'أكثر من شيء',
] as const;

export const PERSONALIZATION_CHALLENGES = [
  'أضع خططًا كثيرة', 'أبدأ ولا أكمل', 'أنسى المهام', 'لا أعرف من أين أبدأ',
  'لا أملك وقتًا كافيًا', 'يتغير مزاجي والتزامي', 'أتشتت بسهولة',
] as const;

export const PERSONALIZATION_PLANNING_STYLES = [
  'بسيطة وخفيفة', 'متوازنة', 'دقيقة ومنظمة', 'مرنة حسب اليوم',
] as const;

export const PERSONALIZATION_ENERGY_PEAKS = [
  'صباحًا', 'ظهرًا', 'مساءً', 'تختلف من يوم لآخر',
] as const;

export const PERSONALIZATION_DAILY_TIME = [
  '15 دقيقة', '30 دقيقة', 'ساعة', 'أكثر من ساعة', 'يختلف حسب اليوم',
] as const;

export interface LifeOSPersonalizationDraft {
  focusAreas: string[];
  biggestChallenge: string;
  planningStyle: string;
  energyPeak: string;
  primaryGoal: string;
  dailyTime: string;
}

export interface LifeOSPersonalizationProfile extends LifeOSPersonalizationDraft {
  userId: string;
  onboardingCompleted: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export function emptyPersonalizationDraft(): LifeOSPersonalizationDraft {
  return {
    focusAreas: [],
    biggestChallenge: '',
    planningStyle: '',
    energyPeak: '',
    primaryGoal: '',
    dailyTime: '',
  };
}

function allowedValue(value: unknown, allowed: readonly string[]): string {
  return typeof value === 'string' && allowed.includes(value) ? value : '';
}

export function normalizePersonalizationDraft(input: unknown): LifeOSPersonalizationDraft {
  const source = input && typeof input === 'object' && !Array.isArray(input)
    ? input as Record<string, unknown>
    : {};
  const rawFocusAreas = Array.isArray(source.focusAreas) ? source.focusAreas : [];
  const focusAreas = Array.from(new Set(
    rawFocusAreas.filter((value): value is string =>
      typeof value === 'string' && (PERSONALIZATION_FOCUS_AREAS as readonly string[]).includes(value),
    ),
  )).slice(0, PERSONALIZATION_FOCUS_AREAS.length);

  return {
    focusAreas,
    biggestChallenge: allowedValue(source.biggestChallenge, PERSONALIZATION_CHALLENGES),
    planningStyle: allowedValue(source.planningStyle, PERSONALIZATION_PLANNING_STYLES),
    energyPeak: allowedValue(source.energyPeak, PERSONALIZATION_ENERGY_PEAKS),
    primaryGoal: typeof source.primaryGoal === 'string' ? source.primaryGoal.trim().slice(0, 500) : '',
    dailyTime: allowedValue(source.dailyTime, PERSONALIZATION_DAILY_TIME),
  };
}
