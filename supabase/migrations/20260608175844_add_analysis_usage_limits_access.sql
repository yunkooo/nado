alter table public.analysis_usage_limits
  add constraint analysis_usage_limits_single_identity
  check (user_id is null or ip_hash is null);

create unique index if not exists analysis_usage_limits_user_period_unique
  on public.analysis_usage_limits (user_id, period_start)
  where user_id is not null;

create unique index if not exists analysis_usage_limits_ip_period_unique
  on public.analysis_usage_limits (ip_hash, period_start)
  where ip_hash is not null;

grant select, insert, update on public.analysis_usage_limits to service_role;

revoke all on public.analysis_usage_limits from anon, authenticated;
