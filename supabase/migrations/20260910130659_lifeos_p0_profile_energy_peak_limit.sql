alter table public.ai_personalization_profiles drop constraint if exists ai_personalization_profiles_energy_peak_limit;
alter table public.ai_personalization_profiles add constraint ai_personalization_profiles_energy_peak_limit check (char_length(energy_peak) <= 120);
