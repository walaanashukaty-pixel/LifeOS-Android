-- LifeOS Free rewards v2
-- Capacity is based on the whole list, not how many records were created today.
-- Every 2 verified rewarded ads for the same feature unlock +4 temporary slots.
-- Temporary bonuses are keyed by reward_date and therefore reset the next day.
-- There is intentionally no global daily ad cap and no permanent reward bonus.

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
  v_feature_count integer;
  v_new_bonus integer;
  v_pack_size integer;
begin
  if p_reward_amount <= 0 then
    return jsonb_build_object('granted', false, 'reason', 'invalid_policy');
  end if;

  -- p_feature_ad_cap is repurposed as ads-per-pack for backwards-compatible RPC signature.
  v_pack_size := greatest(1, coalesce(p_feature_ad_cap, 2));

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  select * into v_existing
  from public.ad_reward_events
  where transaction_id = p_transaction_id;

  if found then
    return jsonb_build_object('granted', true, 'duplicate', true);
  end if;

  select count(*) into v_feature_count
  from public.ad_reward_events
  where user_id = p_user_id
    and reward_key = p_reward_key
    and reward_date = p_server_date
    and verified = true;

  insert into public.ad_reward_events (
    user_id, transaction_id, reward_key, reward_amount, reward_kind,
    reward_date, verified, ad_unit
  ) values (
    p_user_id, p_transaction_id, p_reward_key, p_reward_amount, 'daily',
    p_server_date, true, p_ad_unit
  ) on conflict (transaction_id) do nothing;

  if not found then
    return jsonb_build_object('granted', true, 'duplicate', true);
  end if;

  v_feature_count := v_feature_count + 1;

  -- Only the second ad in each pair grants capacity.
  if mod(v_feature_count, v_pack_size) = 0 then
    insert into public.ad_reward_allowances (
      user_id, reward_key, permanent_bonus, temporary_bonus, temporary_date, updated_at
    ) values (
      p_user_id, p_reward_key, 0, p_reward_amount, p_server_date, now()
    )
    on conflict (user_id, reward_key) do update
    set permanent_bonus = 0,
        temporary_bonus = case
          when public.ad_reward_allowances.temporary_date = p_server_date
            then public.ad_reward_allowances.temporary_bonus + p_reward_amount
          else p_reward_amount
        end,
        temporary_date = p_server_date,
        updated_at = now()
    returning temporary_bonus into v_new_bonus;
  else
    -- Keep permanent rewards disabled and initialize/reset the daily row without granting slots yet.
    insert into public.ad_reward_allowances (
      user_id, reward_key, permanent_bonus, temporary_bonus, temporary_date, updated_at
    ) values (
      p_user_id, p_reward_key, 0, 0, p_server_date, now()
    )
    on conflict (user_id, reward_key) do update
    set permanent_bonus = 0,
        temporary_bonus = case
          when public.ad_reward_allowances.temporary_date = p_server_date
            then public.ad_reward_allowances.temporary_bonus
          else 0
        end,
        temporary_date = p_server_date,
        updated_at = now()
    returning temporary_bonus into v_new_bonus;
  end if;

  return jsonb_build_object(
    'granted', true,
    'duplicate', false,
    'ads_in_current_pack', mod(v_feature_count, v_pack_size),
    'temporary_bonus', coalesce(v_new_bonus, 0)
  );
end;
$$;

revoke all on function public.grant_verified_ad_reward(uuid,text,text,integer,text,text,date,integer,integer) from public;
revoke all on function public.grant_verified_ad_reward(uuid,text,text,integer,text,text,date,integer,integer) from anon;
revoke all on function public.grant_verified_ad_reward(uuid,text,text,integer,text,text,date,integer,integer) from authenticated;
grant execute on function public.grant_verified_ad_reward(uuid,text,text,integer,text,text,date,integer,integer) to service_role;

-- Old capacity rewards must not remain permanent after upgrading to v2.
update public.ad_reward_allowances
set permanent_bonus = 0,
    updated_at = now()
where permanent_bonus <> 0;
