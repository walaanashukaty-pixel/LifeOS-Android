create table if not exists public.ai_user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  ai_data_access_enabled boolean not null default true,
  memory_enabled boolean not null default true,
  smart_notifications_enabled boolean not null default true,
  quiet_hours_enabled boolean not null default true,
  quiet_hours_start text not null default '22:00' check (quiet_hours_start ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  quiet_hours_end text not null default '08:00' check (quiet_hours_end ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  max_smart_notifications_per_day smallint not null default 2 check (max_smart_notifications_per_day between 1 and 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ai_user_settings enable row level security;

drop policy if exists ai_user_settings_own_row on public.ai_user_settings;
create policy ai_user_settings_own_row
on public.ai_user_settings
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
