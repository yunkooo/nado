create or replace function public.is_valid_vocabulary_meanings(
  p_meanings jsonb
)
returns boolean
language sql
immutable
strict
set search_path = ''
as $$
  select case
    when jsonb_typeof(p_meanings) is distinct from 'array' then false
    when jsonb_array_length(p_meanings) > 20 then false
    else not exists (
        select 1
        from jsonb_array_elements(p_meanings) as entry(value)
        where jsonb_typeof(entry.value) is distinct from 'object'
          or entry.value - array['meaning', 'note', 'createdAt'] <> '{}'::jsonb
          or not (entry.value ? 'meaning')
          or jsonb_typeof(entry.value -> 'meaning') is distinct from 'string'
          or char_length(trim(entry.value ->> 'meaning')) not between 1 and 500
          or (
            entry.value ? 'note'
            and entry.value -> 'note' <> 'null'::jsonb
            and (
              jsonb_typeof(entry.value -> 'note') is distinct from 'string'
              or char_length(trim(entry.value ->> 'note')) > 500
            )
          )
          or (
            entry.value ? 'createdAt'
            and (
              jsonb_typeof(entry.value -> 'createdAt') is distinct from 'string'
              or char_length(entry.value ->> 'createdAt') > 40
            )
          )
      )
  end;
$$;

revoke all on function public.is_valid_vocabulary_meanings(jsonb)
  from public, anon;

grant execute on function public.is_valid_vocabulary_meanings(jsonb)
  to authenticated, service_role;

alter table public.vocabulary_items
  add constraint vocabulary_items_term_max_length
  check (char_length(term) <= 200)
  not valid;

alter table public.vocabulary_items
  add constraint vocabulary_items_meanings_valid
  check (public.is_valid_vocabulary_meanings(meanings))
  not valid;

-- Existing rows predate these limits. NOT VALID still enforces both checks for
-- new or updated rows without blocking deployment on legacy user data. Validate
-- them in a later migration after the legacy rows have been audited.

create index vocabulary_items_user_updated_id_idx
  on public.vocabulary_items (user_id, updated_at desc, id desc);

create or replace function public.save_vocabulary_item(
  p_user_id uuid,
  p_term text,
  p_type text,
  p_meaning jsonb
)
returns table(
  id uuid,
  user_id uuid,
  term text,
  normalized_term text,
  type text,
  meanings jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
set search_path = ''
as $$
declare
  saved_row public.vocabulary_items%rowtype;
  normalized_input_term text := regexp_replace(trim(p_term), '\s+', ' ', 'g');
  normalized_type text := trim(p_type);
begin
  if p_user_id is null then
    raise exception 'vocabulary user id is required';
  end if;

  if char_length(normalized_input_term) = 0 then
    raise exception 'vocabulary term is required';
  end if;

  if char_length(normalized_input_term) > 200 then
    raise exception 'vocabulary term is too long';
  end if;

  if normalized_type not in ('word', 'phrase') then
    raise exception 'vocabulary type is invalid';
  end if;

  if not public.is_valid_vocabulary_meanings(jsonb_build_array(p_meaning)) then
    raise exception 'vocabulary meaning is invalid';
  end if;

  insert into public.vocabulary_items (
    user_id,
    term,
    type,
    meanings,
    updated_at
  )
  values (
    p_user_id,
    normalized_input_term,
    normalized_type,
    jsonb_build_array(p_meaning),
    now()
  )
  on conflict on constraint vocabulary_items_user_id_normalized_term_type_key
  do update
    set meanings = case
          when exists (
            select 1
            from jsonb_array_elements(public.vocabulary_items.meanings) as meaning(value)
            where trim(coalesce(meaning.value ->> 'meaning', '')) =
              trim(coalesce(p_meaning ->> 'meaning', ''))
              and trim(coalesce(meaning.value ->> 'note', '')) =
                trim(coalesce(p_meaning ->> 'note', ''))
          )
            then public.vocabulary_items.meanings
          when jsonb_array_length(public.vocabulary_items.meanings) >= 20
            then public.vocabulary_items.meanings
          else public.vocabulary_items.meanings || jsonb_build_array(p_meaning)
        end,
        updated_at = case
          when exists (
            select 1
            from jsonb_array_elements(public.vocabulary_items.meanings) as meaning(value)
            where trim(coalesce(meaning.value ->> 'meaning', '')) =
              trim(coalesce(p_meaning ->> 'meaning', ''))
              and trim(coalesce(meaning.value ->> 'note', '')) =
                trim(coalesce(p_meaning ->> 'note', ''))
          )
            then public.vocabulary_items.updated_at
          when jsonb_array_length(public.vocabulary_items.meanings) >= 20
            then public.vocabulary_items.updated_at
          else now()
        end
  returning * into saved_row;

  return query select
    saved_row.id,
    saved_row.user_id,
    saved_row.term,
    saved_row.normalized_term,
    saved_row.type,
    saved_row.meanings,
    saved_row.created_at,
    saved_row.updated_at;
end;
$$;

revoke all on function public.save_vocabulary_item(uuid, text, text, jsonb)
  from public, anon;

grant execute on function public.save_vocabulary_item(uuid, text, text, jsonb)
  to authenticated;
