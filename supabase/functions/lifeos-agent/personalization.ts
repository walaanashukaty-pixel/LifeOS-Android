export interface LifeOSAgentPersonalization {
  focusAreas: string[];
  biggestChallenge: string;
  planningStyle: string;
  energyPeak: string;
  primaryGoal: string;
  dailyTime: string;
}

function cleanText(value: unknown, max = 240): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

function cleanFocusAreas(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map(item => item.trim().slice(0, 80))
    .filter(Boolean)
    .slice(0, 7);
}

export async function loadLifeOSPersonalization(
  supabase: any,
  userId: string,
): Promise<LifeOSAgentPersonalization | null> {
  if (!userId) return null;

  const { data, error } = await supabase
    .from('ai_personalization_profiles')
    .select('focus_areas,biggest_challenge,planning_style,energy_peak,primary_goal,daily_time,onboarding_completed')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data?.onboarding_completed) return null;

  return {
    focusAreas: cleanFocusAreas(data.focus_areas),
    biggestChallenge: cleanText(data.biggest_challenge),
    planningStyle: cleanText(data.planning_style),
    energyPeak: cleanText(data.energy_peak),
    primaryGoal: cleanText(data.primary_goal, 400),
    dailyTime: cleanText(data.daily_time),
  };
}
