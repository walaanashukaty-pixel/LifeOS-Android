-- LifeOS QA/Test Pro allowlist. Server-only access; never expose as a client toggle.
create table if not exists public.ai_preview_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ai_preview_access enable row level security;
revoke all on table public.ai_preview_access from anon, authenticated;
grant select, insert, update, delete on table public.ai_preview_access to service_role;

-- Add QA users explicitly in Supabase. Do not commit real user IDs here.

-- Explicit deny policies silence accidental client access; service_role still bypasses RLS.
drop policy if exists "deny_authenticated_preview_access" on public.ai_preview_access;
drop policy if exists "deny_anon_preview_access" on public.ai_preview_access;
create policy "deny_authenticated_preview_access"
  on public.ai_preview_access for select to authenticated using (false);
create policy "deny_anon_preview_access"
  on public.ai_preview_access for select to anon using (false);
