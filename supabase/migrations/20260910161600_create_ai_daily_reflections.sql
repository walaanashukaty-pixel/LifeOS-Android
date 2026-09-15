create table if not exists public.ai_daily_reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  review_date date not null,
  reason text not null check (reason in ('ما كان عندي وقت','كنت متعبة','نسيت','كانت الخطة كبيرة','حدث شيء طارئ','سبب آخر')),
  note text not null default '' check (char_length(note) <= 500),
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, review_date)
);

alter table public.ai_daily_reflections enable row level security;

drop policy if exists ai_daily_reflections_own_rows on public.ai_daily_reflections;
create policy ai_daily_reflections_own_rows
on public.ai_daily_reflections
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
