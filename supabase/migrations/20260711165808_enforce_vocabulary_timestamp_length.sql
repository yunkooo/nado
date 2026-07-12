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

      if char_length(created_at_text) > 40 then
        return false;
      end if;

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

-- The timestamp cleanup can touch rows that still contain other pre-contract
-- values. Temporarily remove both unvalidated checks so those rows remain
-- readable instead of blocking the migration.
alter table public.vocabulary_items
  drop constraint vocabulary_items_term_max_length,
  drop constraint vocabulary_items_meanings_valid;

update public.vocabulary_items
set meanings = (
  select jsonb_agg(
    case
      when entry.value ? 'createdAt'
        and jsonb_typeof(entry.value -> 'createdAt') = 'string'
        and char_length(entry.value ->> 'createdAt') > 40
        then entry.value - 'createdAt'
      else entry.value
    end
    order by entry.ordinality
  )
  from jsonb_array_elements(public.vocabulary_items.meanings)
    with ordinality as entry(value, ordinality)
)
where exists (
  select 1
  from jsonb_array_elements(public.vocabulary_items.meanings) as entry(value)
  where entry.value ? 'createdAt'
    and jsonb_typeof(entry.value -> 'createdAt') = 'string'
    and char_length(entry.value ->> 'createdAt') > 40
);

alter table public.vocabulary_items
  add constraint vocabulary_items_term_max_length
  check (char_length(term) <= 200)
  not valid;

alter table public.vocabulary_items
  add constraint vocabulary_items_meanings_valid
  check (public.is_valid_vocabulary_meanings(meanings))
  not valid;

-- Long legacy content can remain readable while every new or updated row uses
-- the bounded contract. A later audited migration can validate this constraint.
