create or replace function public.grant_verified_ad_reward(
  p_user_id uuid,
  p_transaction_id text,
  p_reward_key text,
  p_reward_amount integer,
  p_reward_kind text,
  p_ad_unit text,
  p_server_date date,
  p_feature_ad_cap integer,
  p_max_bonus integer
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.ad_reward_events%rowtype;
  v_global_count integer;
  v_feature_count integer;
  v_current_bonus integer;
  v_new_bonus integer;
begin
  if p_reward_amount <= 0 or p_feature_ad_cap <= 0 or p_max_bonus < 0 then
    return jsonb_build_object('granted', false, 'reason', 'invalid_policy');
  end if;

  select * into v_existing
  from public.ad_reward_events
  where transaction_id = p_transaction_id;

  if found then
    return jsonb_build_object('granted', true, 'duplicate', true);
  end if;

  select count(*) into v_global_count
  from public.ad_reward_events
  where user_id = p_user_id
    and reward_date = p_server_date
    and verified = true;

  if v_global_count >= 6 then
    return jsonb_build_object('granted', false, 'reason', 'daily_reward_cap');
  end if;

  if p_reward_kind = 'daily' then
    select count(*) into v_feature_count
    from public.ad_reward_events
    where user_id = p_user_id
      and reward_key = p_reward_key
      and reward_date = p_server_date
      and verified = true;
    if v_feature_count >= p_feature_ad_cap then
      return jsonb_build_object('granted', false, 'reason', 'feature_reward_cap');
    end if;
  elsif p_reward_kind = 'capacity' then
    select coalesce(permanent_bonus, 0) into v_current_bonus
    from public.ad_reward_allowances
    where user_id = p_user_id and reward_key = p_reward_key;
    v_current_bonus := coalesce(v_current_bonus, 0);
    if v_current_bonus >= p_max_bonus then
      return jsonb_build_object('granted', false, 'reason', 'feature_reward_cap');
    end if;
  else
    return jsonb_build_object('granted', false, 'reason', 'invalid_reward_kind');
  end if;

  insert into public.ad_reward_events (
    user_id, transaction_id, reward_key, reward_amount, reward_kind,
    reward_date, verified, ad_unit
  ) values (
    p_user_id, p_transaction_id, p_reward_key, p_reward_amount, p_reward_kind,
    p_server_date, true, p_ad_unit
  ) on conflict (transaction_id) do nothing;

  if not found then
    -- INSERT ... ON CONFLICT DO NOTHING sets FOUND false on duplicate race.
    return jsonb_build_object('granted', true, 'duplicate', true);
  end if;

  if p_reward_kind = 'daily' then
    insert into public.ad_reward_allowances (
      user_id, reward_key, temporary_bonus, temporary_date, updated_at
    ) values (
      p_user_id, p_reward_key, least(p_reward_amount, p_max_bonus), p_server_date, now()
    )
    on conflict (user_id, reward_key) do update
    set temporary_bonus = case
          when public.ad_reward_allowances.temporary_date = p_server_date
            then least(public.ad_reward_allowances.temporary_bonus + p_reward_amount, p_max_bonus)
          else least(p_reward_amount, p_max_bonus)
        end,
        temporary_date = p_server_date,
        updated_at = now();
  else
    insert into public.ad_reward_allowances (
      user_id, reward_key, permanent_bonus, updated_at
    ) values (
      p_user_id, p_reward_key, least(p_reward_amount, p_max_bonus), now()
    )
    on conflict (user_id, reward_key) do update
    set permanent_bonus = least(public.ad_reward_allowances.permanent_bonus + p_reward_amount, p_max_bonus),
        updated_at = now();
  end if;

  return jsonb_build_object('granted', true, 'duplicate', false);
end;
$$;

revoke all on function public.grant_verified_ad_reward(uuid,text,text,integer,text,text,date,integer,integer) from public;
revoke all on function public.grant_verified_ad_reward(uuid,text,text,integer,text,text,date,integer,integer) from anon;
revoke all on function public.grant_verified_ad_reward(uuid,text,text,integer,text,text,date,integer,integer) from authenticated;
grant execute on function public.grant_verified_ad_reward(uuid,text,text,integer,text,text,date,integer,integer) to service_role;
