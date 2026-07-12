begin;

insert into auth.users (id, email)
values (
  '00000000-0000-0000-0000-000000000101',
  'legacy-upgrade@example.com'
);

insert into public.vocabulary_items (
  id,
  user_id,
  term,
  type,
  meanings
)
values (
  '00000000-0000-0000-0000-000000000201',
  '00000000-0000-0000-0000-000000000101',
  repeat('t', 201),
  'word',
  jsonb_build_array(
    jsonb_build_object(
      'meaning', 'legacy long term',
      'note', null,
      'createdAt',
      '2024-01-01T00:00:00.123456789012345678901234567890Z'
    )
  )
);

insert into public.vocabulary_items (
  id,
  user_id,
  term,
  type,
  meanings
)
select
  '00000000-0000-0000-0000-000000000202',
  '00000000-0000-0000-0000-000000000101',
  'legacy many meanings',
  'phrase',
  jsonb_agg(
    jsonb_build_object(
      'meaning', 'legacy meaning ' || entry_number,
      'note', null,
      'createdAt', 'not-a-timestamp'
    )
    order by entry_number
  )
from generate_series(1, 21) as entries(entry_number);

insert into public.vocabulary_items (
  id,
  user_id,
  term,
  type,
  meanings
)
values (
  '00000000-0000-0000-0000-000000000203',
  '00000000-0000-0000-0000-000000000101',
  'legacy extra field',
  'phrase',
  jsonb_build_array(
    jsonb_build_object(
      'meaning', 'legacy extra field',
      'metadata', jsonb_build_object('source', 'legacy'),
      'createdAt', 'not-a-timestamp'
    )
  )
), (
  '00000000-0000-0000-0000-000000000204',
  '00000000-0000-0000-0000-000000000101',
  'legacy long meaning',
  'phrase',
  jsonb_build_array(
    jsonb_build_object(
      'meaning', repeat('m', 501),
      'createdAt', 'not-a-timestamp'
    )
  )
);

commit;
