create or replace function public.delete_vocabulary_meaning(
  p_user_id uuid,
  p_item_id uuid,
  p_meaning jsonb
)
returns table (
  item_deleted boolean,
  item jsonb
)
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  vocabulary_row public.vocabulary_items%rowtype;
  target_ordinality bigint;
  remaining_meanings jsonb;
begin
  if auth.uid() is distinct from p_user_id then
    return;
  end if;

  if jsonb_typeof(p_meaning) is distinct from 'object'
    or jsonb_typeof(p_meaning -> 'meaning') is distinct from 'string'
    or char_length(trim(p_meaning ->> 'meaning')) = 0
    or (
      p_meaning ? 'note'
      and jsonb_typeof(p_meaning -> 'note') is distinct from 'string'
    )
    or (
      p_meaning ? 'createdAt'
      and jsonb_typeof(p_meaning -> 'createdAt') is distinct from 'string'
    ) then
    return;
  end if;

  select vocabulary_item.*
  into vocabulary_row
  from public.vocabulary_items as vocabulary_item
  where vocabulary_item.id = p_item_id
    and vocabulary_item.user_id = p_user_id
  for update;

  if not found then
    return;
  end if;

  select meaning_entry.ordinality
  into target_ordinality
  from jsonb_array_elements(vocabulary_row.meanings)
    with ordinality as meaning_entry(value, ordinality)
  where trim(coalesce(meaning_entry.value ->> 'meaning', '')) =
      trim(p_meaning ->> 'meaning')
    and trim(coalesce(meaning_entry.value ->> 'note', '')) =
      trim(coalesce(p_meaning ->> 'note', ''))
    and (
      not (p_meaning ? 'createdAt')
      or meaning_entry.value ->> 'createdAt' = p_meaning ->> 'createdAt'
    )
  order by meaning_entry.ordinality
  limit 1;

  if target_ordinality is null then
    return;
  end if;

  select coalesce(
    jsonb_agg(meaning_entry.value order by meaning_entry.ordinality),
    '[]'::jsonb
  )
  into remaining_meanings
  from jsonb_array_elements(vocabulary_row.meanings)
    with ordinality as meaning_entry(value, ordinality)
  where meaning_entry.ordinality <> target_ordinality;

  if jsonb_array_length(remaining_meanings) = 0 then
    delete from public.vocabulary_items as vocabulary_item
    where vocabulary_item.id = p_item_id
      and vocabulary_item.user_id = p_user_id;

    item_deleted := true;
    item := null;
    return next;
    return;
  end if;

  update public.vocabulary_items as vocabulary_item
  set meanings = remaining_meanings,
      updated_at = now()
  where vocabulary_item.id = p_item_id
    and vocabulary_item.user_id = p_user_id
  returning vocabulary_item.* into vocabulary_row;

  item_deleted := false;
  item := to_jsonb(vocabulary_row);
  return next;
end;
$$;

revoke all on function public.delete_vocabulary_meaning(uuid, uuid, jsonb)
  from public, anon;

grant execute on function public.delete_vocabulary_meaning(uuid, uuid, jsonb)
  to authenticated;
