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

export const REWARD_ADS_PER_PACK = 2;
export const REWARD_CAPACITY_PER_PACK = 4;
export const GLOBAL_DAILY_REWARD_CAP = Number.POSITIVE_INFINITY;

export interface RewardPolicy {
  key: RewardKey;
  base: number;
  reward: number;
  mode: 'daily';
  adsPerReward: number;
}

function policy(key: RewardKey, base: number): RewardPolicy {
  return { key, base, reward: REWARD_CAPACITY_PER_PACK, mode: 'daily', adsPerReward: REWARD_ADS_PER_PACK };
}

export const REWARD_POLICIES: Record<RewardKey, RewardPolicy> = {
  tasks: policy('tasks', 6),
  habits: policy('habits', 4),
  goals: policy('goals', 3),
  events: policy('events', 5),
  languages: policy('languages', 2),
  language_content: policy('language_content', 10),
  skills: policy('skills', 3),
  study_subjects: policy('study_subjects', 4),
  study_lessons: policy('study_lessons', 6),
  agreements: policy('agreements', 5),
  documents: policy('documents', 5),
  finance_accounts: policy('finance_accounts', 3),
  finance_budgets: policy('finance_budgets', 3),
  savings_goals: policy('savings_goals', 2),
};
