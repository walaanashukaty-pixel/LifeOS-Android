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
}

// Keep this server copy intentionally small. tests/ssv-contract.test.mjs compares
// every business value with src/utils/ads/reward-policy.ts to prevent drift.
export const REWARD_POLICIES: Record<RewardKey, RewardPolicy> = {
  tasks:            { key: 'tasks',            base: 6,  reward: 4,  max: 14, mode: 'daily',    featureAdCap: 2 },
  habits:           { key: 'habits',           base: 4,  reward: 2,  max: 8,  mode: 'capacity', featureAdCap: 2 },
  goals:            { key: 'goals',            base: 3,  reward: 2,  max: 7,  mode: 'capacity', featureAdCap: 2 },
  events:           { key: 'events',           base: 5,  reward: 3,  max: 11, mode: 'capacity', featureAdCap: 2 },
  languages:        { key: 'languages',        base: 2,  reward: 1,  max: 4,  mode: 'capacity', featureAdCap: 2 },
  language_content: { key: 'language_content', base: 10, reward: 10, max: 30, mode: 'daily',    featureAdCap: 2 },
  skills:           { key: 'skills',           base: 3,  reward: 2,  max: 7,  mode: 'capacity', featureAdCap: 2 },
  study_subjects:   { key: 'study_subjects',   base: 4,  reward: 2,  max: 8,  mode: 'capacity', featureAdCap: 2 },
  study_lessons:    { key: 'study_lessons',    base: 6,  reward: 5,  max: 16, mode: 'daily',    featureAdCap: 2 },
  agreements:       { key: 'agreements',       base: 5,  reward: 3,  max: 11, mode: 'capacity', featureAdCap: 2 },
  documents:        { key: 'documents',        base: 5,  reward: 2,  max: 9,  mode: 'capacity', featureAdCap: 2 },
  finance_accounts: { key: 'finance_accounts', base: 3,  reward: 2,  max: 7,  mode: 'capacity', featureAdCap: 2 },
  finance_budgets:  { key: 'finance_budgets',  base: 3,  reward: 2,  max: 7,  mode: 'capacity', featureAdCap: 2 },
  savings_goals:    { key: 'savings_goals',    base: 2,  reward: 2,  max: 6,  mode: 'capacity', featureAdCap: 2 },
};
