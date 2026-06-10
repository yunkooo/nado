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
  normalized_type text := trim(p_type);
begin
  if p_user_id is null then
    raise exception 'vocabulary user id is required';
  end if;

  if char_length(trim(p_term)) = 0 then
    raise exception 'vocabulary term is required';
  end if;

  if normalized_type not in ('word', 'phrase') then
    raise exception 'vocabulary type is invalid';
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
    regexp_replace(trim(p_term), '\s+', ' ', 'g'),
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
