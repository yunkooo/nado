create or replace function public.consume_analysis_usage(
  p_user_id uuid,
  p_ip_hash text,
  p_period_start date,
  p_limit integer
)
returns table(consumed boolean, request_count integer)
language plpgsql
as $$
declare
  usage_row public.analysis_usage_limits%rowtype;
  normalized_ip_hash text := nullif(trim(coalesce(p_ip_hash, '')), '');
  effective_limit integer := coalesce(p_limit, 0);
begin
  if p_user_id is null and normalized_ip_hash is null then
    raise exception 'analysis usage identity requires user id or ip hash';
  end if;

  if p_user_id is not null and normalized_ip_hash is not null then
    raise exception 'analysis usage identity must not include both user id and ip hash';
  end if;

  if p_user_id is not null then
    insert into public.analysis_usage_limits (
      user_id,
      ip_hash,
      period_start,
      request_count,
      updated_at
    )
    values (p_user_id, null, p_period_start, 1, now())
    on conflict (user_id, period_start)
      where user_id is not null
    do update
      set request_count = public.analysis_usage_limits.request_count + 1,
          updated_at = now()
      where effective_limit <= 0
        or public.analysis_usage_limits.request_count < effective_limit
    returning * into usage_row;

    if not found then
      select *
      into usage_row
      from public.analysis_usage_limits
      where user_id = p_user_id
        and period_start = p_period_start;

      return query select false, usage_row.request_count;
      return;
    end if;

    return query select true, usage_row.request_count;
    return;
  end if;

  insert into public.analysis_usage_limits (
    user_id,
    ip_hash,
    period_start,
    request_count,
    updated_at
  )
  values (null, normalized_ip_hash, p_period_start, 1, now())
  on conflict (ip_hash, period_start)
    where ip_hash is not null
  do update
    set request_count = public.analysis_usage_limits.request_count + 1,
        updated_at = now()
    where effective_limit <= 0
      or public.analysis_usage_limits.request_count < effective_limit
  returning * into usage_row;

  if not found then
    select *
    into usage_row
    from public.analysis_usage_limits
    where ip_hash = normalized_ip_hash
      and period_start = p_period_start;

    return query select false, usage_row.request_count;
    return;
  end if;

  return query select true, usage_row.request_count;
end;
$$;

revoke all on function public.consume_analysis_usage(uuid, text, date, integer)
  from public, anon, authenticated;

grant execute on function public.consume_analysis_usage(uuid, text, date, integer)
  to service_role;
