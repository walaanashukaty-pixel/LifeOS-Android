alter table public.ai_personalization_profiles drop constraint if exists ai_personalization_profiles_focus_areas_limit;
alter table public.ai_personalization_profiles add constraint ai_personalization_profiles_focus_areas_limit check (cardinality(focus_areas) <= 7);
