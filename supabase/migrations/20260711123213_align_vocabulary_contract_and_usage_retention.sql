create or replace function public.is_valid_vocabulary_meanings(
  p_meanings jsonb
)
returns boolean
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  entry jsonb;
  created_at_text text;
begin
  if jsonb_typeof(p_meanings) is distinct from 'array'
    or jsonb_array_length(p_meanings) > 20 then
    return false;
  end if;

  for entry in
    select value
    from jsonb_array_elements(p_meanings)
  loop
    if jsonb_typeof(entry) is distinct from 'object'
      or entry - array['meaning', 'note', 'createdAt'] <> '{}'::jsonb
      or not (entry ? 'meaning')
      or jsonb_typeof(entry -> 'meaning') is distinct from 'string'
      or char_length(trim(entry ->> 'meaning')) not between 1 and 500 then
      return false;
    end if;

    if entry ? 'note' and (
      jsonb_typeof(entry -> 'note') is distinct from 'string'
      or char_length(trim(entry ->> 'note')) > 500
    ) then
      return false;
    end if;

    if entry ? 'createdAt' then
      if jsonb_typeof(entry -> 'createdAt') is distinct from 'string' then
        return false;
      end if;

      created_at_text := entry ->> 'createdAt';

      if created_at_text !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]+)?Z$' then
        return false;
      end if;

      begin
        perform make_timestamp(
          substring(created_at_text from 1 for 4)::integer,
          substring(created_at_text from 6 for 2)::integer,
          substring(created_at_text from 9 for 2)::integer,
          substring(created_at_text from 12 for 2)::integer,
          substring(created_at_text from 15 for 2)::integer,
          substring(
            created_at_text
            from 18
            for char_length(created_at_text) - 18
          )::double precision
        );
      exception
        when others then
          return false;
      end;
    end if;
  end loop;

  return true;
end;
$$;

revoke all on function public.is_valid_vocabulary_meanings(jsonb)
  from public, anon;

grant execute on function public.is_valid_vocabulary_meanings(jsonb)
  to authenticated, service_role;

-- Existing rows were created before the bounded vocabulary contract. Remove
-- the unvalidated checks while normalizing only known legacy representations;
-- otherwise PostgreSQL would enforce every check on the row being updated.
alter table public.vocabulary_items
  drop constraint vocabulary_items_term_max_length,
  drop constraint vocabulary_items_meanings_valid;

do $$
declare
  vocabulary_row record;
  entry jsonb;
  cleaned_entry jsonb;
  cleaned_meanings jsonb;
  created_at_text text;
begin
  for vocabulary_row in
    select id, meanings
    from public.vocabulary_items
  loop
    cleaned_meanings := '[]'::jsonb;

    for entry in
      select value
      from jsonb_array_elements(vocabulary_row.meanings)
    loop
      cleaned_entry := entry;

      if jsonb_typeof(cleaned_entry) = 'object' then
        if cleaned_entry -> 'note' = 'null'::jsonb then
          cleaned_entry := cleaned_entry - 'note';
        end if;

        if cleaned_entry ? 'createdAt' then
          created_at_text := cleaned_entry ->> 'createdAt';

          if jsonb_typeof(cleaned_entry -> 'createdAt') is distinct from 'string'
            or created_at_text !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]+)?Z$' then
            cleaned_entry := cleaned_entry - 'createdAt';
          else
            begin
              perform make_timestamp(
                substring(created_at_text from 1 for 4)::integer,
                substring(created_at_text from 6 for 2)::integer,
                substring(created_at_text from 9 for 2)::integer,
                substring(created_at_text from 12 for 2)::integer,
                substring(created_at_text from 15 for 2)::integer,
                substring(
                  created_at_text
                  from 18
                  for char_length(created_at_text) - 18
                )::double precision
              );
            exception
              when others then
                cleaned_entry := cleaned_entry - 'createdAt';
            end;
          end if;
        end if;
      end if;

      cleaned_meanings := cleaned_meanings || jsonb_build_array(cleaned_entry);
    end loop;

    if cleaned_meanings is distinct from vocabulary_row.meanings then
      update public.vocabulary_items
      set meanings = cleaned_meanings
      where id = vocabulary_row.id;
    end if;
  end loop;
end;
$$;

alter table public.vocabulary_items
  add constraint vocabulary_items_term_max_length
  check (char_length(term) <= 200)
  not valid;

alter table public.vocabulary_items
  add constraint vocabulary_items_meanings_valid
  check (public.is_valid_vocabulary_meanings(meanings))
  not valid;

-- Keep the constraint unvalidated until every pre-contract row has been
-- audited. PostgreSQL still applies it to all new or updated rows.

revoke all on table public.vocabulary_items from anon, authenticated;
grant select, insert, update, delete on table public.vocabulary_items
  to authenticated;

revoke all on table public.analysis_usage_limits from anon, authenticated;
grant select, insert, update, delete on table public.analysis_usage_limits
  to service_role;

create index if not exists analysis_usage_limits_period_start_idx
  on public.analysis_usage_limits (period_start);

create or replace function public.delete_expired_analysis_usage(
  p_retention_days integer default 90
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  deleted_count integer;
begin
  if p_retention_days is null
    or p_retention_days < 1
    or p_retention_days > 3650 then
    raise exception 'analysis usage retention days must be between 1 and 3650';
  end if;

  delete from public.analysis_usage_limits
  where period_start < current_date - p_retention_days;

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

comment on function public.delete_expired_analysis_usage(integer) is
  'Deletes analysis usage counters older than the configured retention period. The default retention period is 90 days.';

revoke all on function public.delete_expired_analysis_usage(integer)
  from public, anon, authenticated;

grant execute on function public.delete_expired_analysis_usage(integer)
  to service_role;
