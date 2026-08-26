-- ============================================================
-- KV Store for LifeOS
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- 1. Create the table (already exists as kv_store_d979a88c)
CREATE TABLE IF NOT EXISTS public.kv_store_d979a88c (
  key   text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- 2. Enable RLS
ALTER TABLE public.kv_store_d979a88c ENABLE ROW LEVEL SECURITY;

-- 3. Drop old policies (safe re-run)
DROP POLICY IF EXISTS "user_owns_rows"     ON public.kv_store_d979a88c;
DROP POLICY IF EXISTS "Users own their rows" ON public.kv_store_d979a88c;

-- 4. RLS policy: user id is the 2nd colon-delimited segment of the key
--    e.g. "tasks:<userId>:<taskId>"  or  "quran:<userId>"
CREATE POLICY "user_owns_rows" ON public.kv_store_d979a88c
  FOR ALL
  TO authenticated
  USING      (split_part(key, ':', 2) = auth.uid()::text)
  WITH CHECK (split_part(key, ':', 2) = auth.uid()::text);

-- 5. Storage bucket for document uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('make-d979a88c-docs', 'make-d979a88c-docs', false)
ON CONFLICT (id) DO NOTHING;

-- 6. Storage RLS policies
DROP POLICY IF EXISTS "user_owns_files"        ON storage.objects;
DROP POLICY IF EXISTS "user_reads_own_files"   ON storage.objects;
DROP POLICY IF EXISTS "user_deletes_own_files" ON storage.objects;

CREATE POLICY "user_owns_files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'make-d979a88c-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "user_reads_own_files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'make-d979a88c-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "user_deletes_own_files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'make-d979a88c-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Done.
SELECT 'kv_store_d979a88c ready' AS status;
