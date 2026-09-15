alter table public.ai_personalization_profiles drop constraint if exists ai_personalization_profiles_primary_goal_limit;
alter table public.ai_personalization_profiles add constraint ai_personalization_profiles_primary_goal_limit check (char_length(primary_goal) <= 500);
