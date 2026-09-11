-- ============================================================
-- LifeOS cloud KV + private document storage
-- Must match supabase/functions/server/kv_store.tsx and index.tsx.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.kv_store_3df25961 (
  key   text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.kv_store_3df25961 ENABLE ROW LEVEL SECURITY;

-- Explicit Data API grants. RLS still controls authenticated direct access, while
-- the Edge Function uses service_role for trusted server-side operations.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kv_store_3df25961 TO authenticated;
GRANT ALL ON public.kv_store_3df25961 TO service_role;

DROP POLICY IF EXISTS "user_owns_rows" ON public.kv_store_3df25961;
DROP POLICY IF EXISTS "Users own their rows" ON public.kv_store_3df25961;

-- Entity keys are namespaced as <entity>:<auth.uid>:...
CREATE POLICY "user_owns_rows" ON public.kv_store_3df25961
  FOR ALL
  TO authenticated
  USING      (split_part(key, ':', 2) = auth.uid()::text)
  WITH CHECK (split_part(key, ':', 2) = auth.uid()::text);

-- Edge Functions use the service role, while this RLS policy prevents direct
-- cross-user access if the table is ever queried from a signed-in client.

INSERT INTO storage.buckets (id, name, public)
VALUES ('make-3df25961-docs', 'make-3df25961-docs', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "lifeos_user_uploads_own_files" ON storage.objects;
DROP POLICY IF EXISTS "lifeos_user_reads_own_files" ON storage.objects;
DROP POLICY IF EXISTS "lifeos_user_updates_own_files" ON storage.objects;
DROP POLICY IF EXISTS "lifeos_user_deletes_own_files" ON storage.objects;

CREATE POLICY "lifeos_user_uploads_own_files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'make-3df25961-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "lifeos_user_reads_own_files" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'make-3df25961-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "lifeos_user_updates_own_files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'make-3df25961-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'make-3df25961-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "lifeos_user_deletes_own_files" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'make-3df25961-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

SELECT 'kv_store_3df25961 + make-3df25961-docs ready' AS status;
