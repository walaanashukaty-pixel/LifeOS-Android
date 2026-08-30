export type RewardKey =
  | 'tasks'
  | 'habits'
  | 'goals'
  | 'events'
  | 'languages'
  | 'language_content'
  | 'skills'
  | 'study_subjects'
  | 'study_lessons'
  | 'agreements'
  | 'documents'
  | 'finance_accounts'
  | 'finance_budgets'
  | 'savings_goals';

export const GLOBAL_DAILY_REWARD_CAP = 6;

export interface RewardPolicy {
  key: RewardKey;
  base: number;
  reward: number;
  max: number;
  mode: 'daily' | 'capacity';
  featureAdCap: number;
  title: string;
  unitLabel: string;
}

export const REWARD_POLICIES: Record<RewardKey, RewardPolicy> = {
  tasks: { key: 'tasks', base: 6, reward: 4, max: 14, mode: 'daily', featureAdCap: 2, title: 'المهام', unitLabel: 'مهام' },
  habits: { key: 'habits', base: 4, reward: 2, max: 8, mode: 'capacity', featureAdCap: 2, title: 'العادات', unitLabel: 'عادات' },
  goals: { key: 'goals', base: 3, reward: 2, max: 7, mode: 'capacity', featureAdCap: 2, title: 'الأهداف', unitLabel: 'أهداف' },
  events: { key: 'events', base: 5, reward: 3, max: 11, mode: 'capacity', featureAdCap: 2, title: 'الأحداث', unitLabel: 'أحداث' },
  languages: { key: 'languages', base: 2, reward: 1, max: 4, mode: 'capacity', featureAdCap: 2, title: 'اللغات', unitLabel: 'لغة' },
  language_content: { key: 'language_content', base: 10, reward: 10, max: 30, mode: 'daily', featureAdCap: 2, title: 'محتوى اللغات', unitLabel: 'إضافات' },
  skills: { key: 'skills', base: 3, reward: 2, max: 7, mode: 'capacity', featureAdCap: 2, title: 'المهارات', unitLabel: 'مهارات' },
  study_subjects: { key: 'study_subjects', base: 4, reward: 2, max: 8, mode: 'capacity', featureAdCap: 2, title: 'المواد الدراسية', unitLabel: 'مواد' },
  study_lessons: { key: 'study_lessons', base: 6, reward: 5, max: 16, mode: 'daily', featureAdCap: 2, title: 'الدروس', unitLabel: 'دروس' },
  agreements: { key: 'agreements', base: 5, reward: 3, max: 11, mode: 'capacity', featureAdCap: 2, title: 'الاتفاقيات', unitLabel: 'اتفاقيات' },
  documents: { key: 'documents', base: 5, reward: 2, max: 9, mode: 'capacity', featureAdCap: 2, title: 'الوثائق', unitLabel: 'وثائق' },
  finance_accounts: { key: 'finance_accounts', base: 3, reward: 2, max: 7, mode: 'capacity', featureAdCap: 2, title: 'الحسابات المالية', unitLabel: 'حسابات' },
  finance_budgets: { key: 'finance_budgets', base: 3, reward: 2, max: 7, mode: 'capacity', featureAdCap: 2, title: 'الميزانيات', unitLabel: 'ميزانيات' },
  savings_goals: { key: 'savings_goals', base: 2, reward: 2, max: 6, mode: 'capacity', featureAdCap: 2, title: 'أهداف التوفير', unitLabel: 'أهداف توفير' },
};

export function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function createdAtLocalDate(value: unknown): string | null {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : localDateKey(date);
}

export function countCreatedOnDate(rows: Array<{ createdAt?: unknown }>, dateKey = localDateKey()): number {
  return rows.filter((row) => createdAtLocalDate(row.createdAt) === dateKey).length;
}
