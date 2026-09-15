alter table public.ai_personalization_profiles drop constraint if exists ai_personalization_profiles_daily_time_limit;
alter table public.ai_personalization_profiles add constraint ai_personalization_profiles_daily_time_limit check (char_length(daily_time) <= 120);
