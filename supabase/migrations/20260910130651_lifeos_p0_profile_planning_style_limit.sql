alter table public.ai_personalization_profiles drop constraint if exists ai_personalization_profiles_planning_style_limit;
alter table public.ai_personalization_profiles add constraint ai_personalization_profiles_planning_style_limit check (char_length(planning_style) <= 120);
