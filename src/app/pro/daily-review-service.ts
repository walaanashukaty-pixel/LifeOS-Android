import { supabase } from '../../utils/api.ts';
import type { DailyReviewReason, DailyReviewSummary } from './daily-review-model.ts';

export interface LifeOSDailyReflection {
  id: string;
  userId: string;
  reviewDate: string;
  reason: DailyReviewReason;
  note: string;
  summary: DailyReviewSummary | null;
  createdAt: string | null;
  updatedAt: string | null;
}

type ReflectionRow = {
  id: string;
  user_id: string;
  review_date: string;
  reason: DailyReviewReason;
  note: string | null;
  summary: DailyReviewSummary | null;
  created_at: string | null;
  updated_at: string | null;
};

function fromRow(row: ReflectionRow): LifeOSDailyReflection {
  return {
    id: row.id,
    userId: row.user_id,
    reviewDate: row.review_date,
    reason: row.reason,
    note: String(row.note || ''),
    summary: row.summary || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

export async function loadDailyReflection(userId: string, reviewDate: string): Promise<LifeOSDailyReflection | null> {
  if (!userId || !reviewDate) return null;
  const { data, error } = await supabase
    .from('ai_daily_reflections')
    .select('id,user_id,review_date,reason,note,summary,created_at,updated_at')
    .eq('user_id', userId)
    .eq('review_date', reviewDate)
    .maybeSingle();
  if (error) throw error;
  return data ? fromRow(data as ReflectionRow) : null;
}


export async function loadRecentDailyReflections(userId: string, limit = 7): Promise<LifeOSDailyReflection[]> {
  if (!userId) return [];
  const safeLimit = Math.max(1, Math.min(14, Math.round(limit) || 7));
  const { data, error } = await supabase
    .from('ai_daily_reflections')
    .select('id,user_id,review_date,reason,note,summary,created_at,updated_at')
    .eq('user_id', userId)
    .order('review_date', { ascending: false })
    .limit(safeLimit);
  if (error) throw error;
  return Array.isArray(data) ? data.map(row => fromRow(row as ReflectionRow)) : [];
}

export async function saveDailyReflection({
  userId,
  reviewDate,
  reason,
  note = '',
  summary,
}: {
  userId: string;
  reviewDate: string;
  reason: DailyReviewReason;
  note?: string;
  summary: DailyReviewSummary;
}): Promise<LifeOSDailyReflection> {
  if (!userId) throw new Error('لا يوجد مستخدم مسجل الدخول.');
  const cleanNote = note.trim().slice(0, 500);
  const { data, error } = await supabase
    .from('ai_daily_reflections')
    .upsert({
      user_id: userId,
      review_date: reviewDate,
      reason,
      note: cleanNote,
      summary,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,review_date' })
    .select('id,user_id,review_date,reason,note,summary,created_at,updated_at')
    .single();
  if (error) throw error;
  return fromRow(data as ReflectionRow);
}
