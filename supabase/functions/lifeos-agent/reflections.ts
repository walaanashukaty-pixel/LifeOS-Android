export interface LifeOSRecentReflection {
  reviewDate: string;
  reason: string;
  note: string;
  summary: Record<string, unknown>;
}

export async function loadRecentLifeOSReflections(supabase: any, userId: string, limit = 7): Promise<LifeOSRecentReflection[]> {
  if (!userId) return [];
  const { data, error } = await supabase
    .from('ai_daily_reflections')
    .select('review_date,reason,note,summary')
    .eq('user_id', userId)
    .order('review_date', { ascending: false })
    .limit(Math.max(1, Math.min(14, limit)));
  if (error) throw error;
  return Array.isArray(data) ? data.map((row: any) => ({
    reviewDate: String(row?.review_date || ''),
    reason: String(row?.reason || '').slice(0, 120),
    note: String(row?.note || '').slice(0, 500),
    summary: row?.summary && typeof row.summary === 'object' && !Array.isArray(row.summary) ? row.summary : {},
  })).filter(item => item.reviewDate) : [];
}
