do $$
declare
  legacy_row public.vocabulary_items%rowtype;
begin
  if (
    select count(*)
    from public.vocabulary_items
    where user_id = '00000000-0000-0000-0000-000000000101'
  ) <> 4 then
    raise exception 'legacy vocabulary rows were lost during migration';
  end if;

  select *
  into strict legacy_row
  from public.vocabulary_items
  where id = '00000000-0000-0000-0000-000000000201';

  if char_length(legacy_row.term) <> 201
    or legacy_row.meanings -> 0 ? 'note'
    or legacy_row.meanings -> 0 ? 'createdAt' then
    raise exception 'long-term legacy row was not preserved safely';
  end if;

  select *
  into strict legacy_row
  from public.vocabulary_items
  where id = '00000000-0000-0000-0000-000000000202';

  if jsonb_array_length(legacy_row.meanings) <> 21
    or exists (
      select 1
      from jsonb_array_elements(legacy_row.meanings) as entry(value)
      where entry.value ? 'note' or entry.value ? 'createdAt'
    ) then
    raise exception 'legacy meanings array was not preserved safely';
  end if;

  select *
  into strict legacy_row
  from public.vocabulary_items
  where id = '00000000-0000-0000-0000-000000000203';

  if not (legacy_row.meanings -> 0 ? 'metadata')
    or legacy_row.meanings -> 0 ? 'createdAt' then
    raise exception 'legacy extra field was not preserved safely';
  end if;

  select *
  into strict legacy_row
  from public.vocabulary_items
  where id = '00000000-0000-0000-0000-000000000204';

  if char_length(legacy_row.meanings -> 0 ->> 'meaning') <> 501
    or legacy_row.meanings -> 0 ? 'createdAt' then
    raise exception 'legacy long meaning was not preserved safely';
  end if;

  if (
    select convalidated
    from pg_constraint
    where conname = 'vocabulary_items_term_max_length'
  ) or (
    select convalidated
    from pg_constraint
    where conname = 'vocabulary_items_meanings_valid'
  ) then
    raise exception 'legacy vocabulary constraints must remain unvalidated';
  end if;
end;
$$;
