create table if not exists public.ad_reward_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_id text not null unique,
  reward_key text not null,
  reward_amount integer not null check (reward_amount > 0),
  reward_kind text not null check (reward_kind in ('daily', 'capacity', 'temporary_feature')),
  reward_date date not null,
  granted_at timestamptz not null default now(),
  verified boolean not null default true,
  ad_unit text,
  created_at timestamptz not null default now()
);

create table if not exists public.ad_reward_allowances (
  user_id uuid not null references auth.users(id) on delete cascade,
  reward_key text not null,
  permanent_bonus integer not null default 0 check (permanent_bonus >= 0),
  temporary_bonus integer not null default 0 check (temporary_bonus >= 0),
  temporary_date date,
  feature_unlock_until timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, reward_key)
);

create index if not exists ad_reward_events_user_date_idx
  on public.ad_reward_events (user_id, reward_date);

create index if not exists ad_reward_allowances_user_key_idx
  on public.ad_reward_allowances (user_id, reward_key);

alter table public.ad_reward_events enable row level security;
alter table public.ad_reward_allowances enable row level security;

drop policy if exists "users_read_own_ad_reward_events" on public.ad_reward_events;
create policy "users_read_own_ad_reward_events"
on public.ad_reward_events
for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "users_read_own_ad_reward_allowances" on public.ad_reward_allowances;
create policy "users_read_own_ad_reward_allowances"
on public.ad_reward_allowances
for select to authenticated
using (auth.uid() = user_id);
