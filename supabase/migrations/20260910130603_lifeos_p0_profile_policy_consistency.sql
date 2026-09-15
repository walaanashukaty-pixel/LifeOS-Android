drop policy if exists ai_personalization_profiles_own_row on public.ai_personalization_profiles;
create policy ai_personalization_profiles_own_row
on public.ai_personalization_profiles
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
