import { localDateKey } from '../date.ts';
export { localDateKey } from '../date.ts';

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

// Free-plan rule (v2): list capacity, not a daily creation quota.
// Every TWO completed rewarded ads unlock one temporary +4 capacity pack.
// All earned capacity resets on the next local calendar day.
export const REWARD_ADS_PER_PACK = 2;
export const REWARD_CAPACITY_PER_PACK = 4;

// Kept for backwards compatibility with older imports/tests. There is no
// global daily ad cap anymore; users may unlock more capacity when needed.
export const GLOBAL_DAILY_REWARD_CAP = Number.POSITIVE_INFINITY;

export interface RewardPolicy {
  key: RewardKey;
  base: number;
  reward: number;
  mode: 'daily';
  adsPerReward: number;
  title: string;
  unitLabel: string;
}

function policy(key: RewardKey, base: number, title: string, unitLabel: string): RewardPolicy {
  return {
    key,
    base,
    reward: REWARD_CAPACITY_PER_PACK,
    mode: 'daily',
    adsPerReward: REWARD_ADS_PER_PACK,
    title,
    unitLabel,
  };
}

export const REWARD_POLICIES: Record<RewardKey, RewardPolicy> = {
  tasks: policy('tasks', 6, 'المهام', 'مهام'),
  habits: policy('habits', 4, 'العادات', 'عادات'),
  goals: policy('goals', 3, 'الأهداف', 'أهداف'),
  events: policy('events', 5, 'الأحداث', 'أحداث'),
  languages: policy('languages', 2, 'اللغات', 'لغات'),
  language_content: policy('language_content', 10, 'محتوى اللغات', 'إضافات'),
  skills: policy('skills', 3, 'المهارات', 'مهارات'),
  study_subjects: policy('study_subjects', 4, 'المواد الدراسية', 'مواد'),
  study_lessons: policy('study_lessons', 6, 'الدروس', 'دروس'),
  agreements: policy('agreements', 5, 'الاتفاقيات', 'اتفاقيات'),
  documents: policy('documents', 5, 'الوثائق', 'وثائق'),
  finance_accounts: policy('finance_accounts', 3, 'الحسابات المالية', 'حسابات'),
  finance_budgets: policy('finance_budgets', 3, 'الميزانيات', 'ميزانيات'),
  savings_goals: policy('savings_goals', 2, 'أهداف التوفير', 'أهداف توفير'),
};


// Legacy helper retained for old data migrations/tests. Creation gating no
// longer uses "created today"; it always counts the whole list.
export function createdAtLocalDate(value: unknown): string | null {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : localDateKey(date);
}

export function countCreatedOnDate(rows: Array<{ createdAt?: unknown }>, dateKey = localDateKey()): number {
  return rows.filter((row) => createdAtLocalDate(row.createdAt) === dateKey).length;
}
