import { supabase } from '../../utils/api.ts';
import {
  normalizePersonalizationDraft,
  type LifeOSPersonalizationDraft,
  type LifeOSPersonalizationProfile,
} from './personalization-types.ts';

type PersonalizationRow = {
  user_id: string;
  focus_areas: string[] | null;
  biggest_challenge: string | null;
  planning_style: string | null;
  energy_peak: string | null;
  primary_goal: string | null;
  daily_time: string | null;
  onboarding_completed: boolean;
  created_at: string | null;
  updated_at: string | null;
};

function fromRow(row: PersonalizationRow): LifeOSPersonalizationProfile {
  const draft = normalizePersonalizationDraft({
    focusAreas: row.focus_areas ?? [],
    biggestChallenge: row.biggest_challenge ?? '',
    planningStyle: row.planning_style ?? '',
    energyPeak: row.energy_peak ?? '',
    primaryGoal: row.primary_goal ?? '',
    dailyTime: row.daily_time ?? '',
  });
  return {
    userId: row.user_id,
    ...draft,
    onboardingCompleted: row.onboarding_completed === true,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

export async function loadPersonalizationProfile(userId: string): Promise<LifeOSPersonalizationProfile | null> {
  if (!userId) return null;
  const { data, error } = await supabase
    .from('ai_personalization_profiles')
    .select('user_id, focus_areas, biggest_challenge, planning_style, energy_peak, primary_goal, daily_time, onboarding_completed, created_at, updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data ? fromRow(data as PersonalizationRow) : null;
}

export async function savePersonalizationProfile(
  userId: string,
  input: LifeOSPersonalizationDraft,
): Promise<LifeOSPersonalizationProfile> {
  if (!userId) throw new Error('لا يوجد مستخدم مسجل الدخول.');
  const normalized = normalizePersonalizationDraft(input);
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('ai_personalization_profiles')
    .upsert({
      user_id: userId,
      focus_areas: normalized.focusAreas,
      biggest_challenge: normalized.biggestChallenge,
      planning_style: normalized.planningStyle,
      energy_peak: normalized.energyPeak,
      primary_goal: normalized.primaryGoal,
      daily_time: normalized.dailyTime,
      onboarding_completed: true,
      updated_at: now,
    }, { onConflict: 'user_id' })
    .select('user_id, focus_areas, biggest_challenge, planning_style, energy_peak, primary_goal, daily_time, onboarding_completed, created_at, updated_at')
    .single();
  if (error) throw error;
  return fromRow(data as PersonalizationRow);
}

export async function deletePersonalizationProfile(userId: string): Promise<void> {
  if (!userId) throw new Error('لا يوجد مستخدم مسجل الدخول.');
  const { error } = await supabase.from('ai_personalization_profiles').delete().eq('user_id', userId);
  if (error) throw error;
}
