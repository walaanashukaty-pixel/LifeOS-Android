alter table public.ai_personalization_profiles drop constraint if exists ai_personalization_profiles_focus_values_nonempty;
alter table public.ai_personalization_profiles add constraint ai_personalization_profiles_focus_values_nonempty check (not (focus_areas @> array['']::text[]));
