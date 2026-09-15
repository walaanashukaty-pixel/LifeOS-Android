create table if not exists public.ai_personalization_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  focus_areas text[] not null default '{}',
  biggest_challenge text not null default '',
  planning_style text not null default '',
  energy_peak text not null default '',
  primary_goal text not null default '',
  daily_time text not null default '',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ai_personalization_profiles enable row level security;

drop policy if exists ai_personalization_profiles_own_row on public.ai_personalization_profiles;
create policy ai_personalization_profiles_own_row
on public.ai_personalization_profiles
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
