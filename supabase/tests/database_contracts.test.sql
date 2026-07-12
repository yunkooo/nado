begin;

create extension if not exists pgtap with schema extensions;

select plan(48);

select ok(
  public.is_valid_vocabulary_meanings(
    '[{"meaning":"뜻","note":"메모","createdAt":"2026-07-11T00:00:00.000Z"}]'::jsonb
  ),
  'valid vocabulary meanings match the API contract'
);

select ok(
  not public.is_valid_vocabulary_meanings(
    '[{"meaning":"뜻","note":null}]'::jsonb
  ),
  'null vocabulary notes are rejected'
);

select ok(
  not public.is_valid_vocabulary_meanings(
    '[{"meaning":"뜻","createdAt":"not-a-date"}]'::jsonb
  ),
  'invalid vocabulary timestamps are rejected'
);

select ok(
  not public.is_valid_vocabulary_meanings(
    '[{"meaning":"뜻","createdAt":"2026-02-31T00:00:00.000Z"}]'::jsonb
  ),
  'impossible vocabulary timestamps are rejected'
);

select ok(
  not public.is_valid_vocabulary_meanings(
    jsonb_build_array(
      jsonb_build_object(
        'meaning',
        '뜻',
        'createdAt',
        '2026-07-11T00:00:00.' || repeat('1', 30) || 'Z'
      )
    )
  ),
  'oversized vocabulary timestamps are rejected'
);

select ok(
  not (
    select convalidated
    from pg_constraint
    where conname = 'vocabulary_items_term_max_length'
  ),
  'the term limit does not reject legacy rows during deployment'
);

select ok(
  not (
    select convalidated
    from pg_constraint
    where conname = 'vocabulary_items_meanings_valid'
  ),
  'the meanings contract does not reject legacy rows during deployment'
);

select ok(
  not has_table_privilege('anon', 'public.vocabulary_items', 'select'),
  'anonymous users cannot read vocabulary rows'
);

select ok(
  has_table_privilege('authenticated', 'public.vocabulary_items', 'select'),
  'authenticated users can read vocabulary rows'
);

select ok(
  has_table_privilege('authenticated', 'public.vocabulary_items', 'insert'),
  'authenticated users can insert vocabulary rows'
);

select ok(
  has_table_privilege('authenticated', 'public.vocabulary_items', 'update'),
  'authenticated users can update vocabulary rows'
);

select ok(
  has_table_privilege('authenticated', 'public.vocabulary_items', 'delete'),
  'authenticated users can delete vocabulary rows'
);

select is(
  (select count(*)::integer
   from pg_policies
   where schemaname = 'public'
     and tablename = 'vocabulary_items'
     and roles = array['authenticated']::name[]),
  4,
  'vocabulary access remains protected by four authenticated RLS policies'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.save_vocabulary_item(uuid,text,text,jsonb)',
    'execute'
  ),
  'anonymous users cannot run the vocabulary save RPC'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.save_vocabulary_item(uuid,text,text,jsonb)',
    'execute'
  ),
  'authenticated users can run the vocabulary save RPC'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.delete_vocabulary_meaning(uuid,uuid,jsonb)',
    'execute'
  ),
  'anonymous users cannot run the vocabulary meaning delete RPC'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.delete_vocabulary_meaning(uuid,uuid,jsonb)',
    'execute'
  ),
  'authenticated users can run the vocabulary meaning delete RPC'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.is_valid_vocabulary_meanings(jsonb)',
    'execute'
  ),
  'anonymous users cannot call the vocabulary validator'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.is_valid_vocabulary_meanings(jsonb)',
    'execute'
  ),
  'authenticated writes can evaluate the vocabulary constraint'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.consume_analysis_usage(uuid,text,date,integer)',
    'execute'
  ),
  'anonymous users cannot consume server-owned usage counters directly'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.consume_analysis_usage(uuid,text,date,integer)',
    'execute'
  ),
  'authenticated users cannot consume server-owned usage counters directly'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.consume_analysis_usage(uuid,text,date,integer)',
    'execute'
  ),
  'the service role can run the atomic usage RPC'
);

insert into auth.users (id, email)
values
  ('00000000-0000-0000-0000-000000000001', 'rls-one@example.test'),
  ('00000000-0000-0000-0000-000000000002', 'rls-two@example.test');

insert into public.vocabulary_items (user_id, term, type, meanings)
values
  (
    '00000000-0000-0000-0000-000000000001',
    'rls-own',
    'word',
    '[{"meaning":"내 항목"}]'::jsonb
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'rls-other',
    'word',
    '[{"meaning":"다른 사용자 항목"}]'::jsonb
  );

insert into public.vocabulary_items (id, user_id, term, type, meanings)
values
  (
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'rls-meaning-delete',
    'word',
    '[{"meaning":"상태","createdAt":"2026-07-12T00:00:00.000Z"},{"meaning":"지역 주","createdAt":"2026-07-12T00:01:00.000Z"}]'::jsonb
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    'rls-other-meaning-delete',
    'word',
    '[{"meaning":"다른 사용자 뜻"}]'::jsonb
  );

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000001',
  true
);

select results_eq(
  $$ select term from public.vocabulary_items order by term $$,
  $$ values ('rls-meaning-delete'::text), ('rls-own'::text) $$,
  'authenticated vocabulary reads are restricted to the JWT user'
);

select results_eq(
  $$
    select item_deleted, item -> 'meanings'
    from public.delete_vocabulary_meaning(
      '00000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000001',
      '{"meaning":"상태","createdAt":"2026-07-12T00:00:00.000Z"}'::jsonb
    )
  $$,
  $$
    values (
      false,
      '[{"meaning":"지역 주","createdAt":"2026-07-12T00:01:00.000Z"}]'::jsonb
    )
  $$,
  'meaning deletion keeps the remaining meaning in the returned item'
);

select results_eq(
  $$
    select meanings
    from public.vocabulary_items
    where id = '10000000-0000-0000-0000-000000000001'
  $$,
  $$
    values (
      '[{"meaning":"지역 주","createdAt":"2026-07-12T00:01:00.000Z"}]'::jsonb
    )
  $$,
  'meaning deletion updates only the selected vocabulary row'
);

select results_eq(
  $$
    select item_deleted
    from public.delete_vocabulary_meaning(
      '00000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000001',
      '{"meaning":"없는 뜻"}'::jsonb
    )
  $$,
  $$ select null::boolean where false $$,
  'deleting a missing meaning returns no result'
);

select results_eq(
  $$
    select meanings
    from public.vocabulary_items
    where id = '10000000-0000-0000-0000-000000000001'
  $$,
  $$
    values (
      '[{"meaning":"지역 주","createdAt":"2026-07-12T00:01:00.000Z"}]'::jsonb
    )
  $$,
  'a missing meaning deletion leaves the vocabulary row unchanged'
);

select results_eq(
  $$
    select item_deleted
    from public.delete_vocabulary_meaning(
      '00000000-0000-0000-0000-000000000002',
      '10000000-0000-0000-0000-000000000002',
      '{"meaning":"다른 사용자 뜻"}'::jsonb
    )
  $$,
  $$ select null::boolean where false $$,
  'authenticated users cannot delete another user vocabulary meaning'
);

select results_eq(
  $$
    select item_deleted, item
    from public.delete_vocabulary_meaning(
      '00000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000001',
      '{"meaning":"지역 주","createdAt":"2026-07-12T00:01:00.000Z"}'::jsonb
    )
  $$,
  $$ values (true, null::jsonb) $$,
  'deleting the last meaning reports that the vocabulary item was deleted'
);

select results_eq(
  $$
    select id
    from public.vocabulary_items
    where id = '10000000-0000-0000-0000-000000000001'
  $$,
  $$ select null::uuid where false $$,
  'deleting the last meaning removes the vocabulary row'
);

select lives_ok(
  $$
    insert into public.vocabulary_items (user_id, term, type, meanings)
    values (
      '00000000-0000-0000-0000-000000000001',
      'rls-own-insert',
      'word',
      '[{"meaning":"내 새 항목"}]'::jsonb
    )
  $$,
  'authenticated users can insert their own vocabulary rows'
);

select throws_ok(
  $$
    insert into public.vocabulary_items (user_id, term, type, meanings)
    values (
      '00000000-0000-0000-0000-000000000001',
      'rls-oversized-timestamp',
      'word',
      jsonb_build_array(
        jsonb_build_object(
          'meaning',
          '긴 시간값',
          'createdAt',
          '2026-07-11T00:00:00.' || repeat('1', 30) || 'Z'
        )
      )
    )
  $$,
  '23514',
  'new row for relation "vocabulary_items" violates check constraint "vocabulary_items_meanings_valid"',
  'the vocabulary table constraint rejects oversized timestamps'
);

select throws_ok(
  $$
    insert into public.vocabulary_items (user_id, term, type, meanings)
    values (
      '00000000-0000-0000-0000-000000000002',
      'rls-foreign-insert',
      'word',
      '[{"meaning":"다른 사용자 항목"}]'::jsonb
    )
  $$,
  '42501',
  'new row violates row-level security policy for table "vocabulary_items"',
  'authenticated users cannot insert vocabulary rows for another user'
);

select results_eq(
  $$
    update public.vocabulary_items
    set term = 'rls-own-updated'
    where term = 'rls-own'
    returning term
  $$,
  $$ values ('rls-own-updated'::text) $$,
  'authenticated users can update their own vocabulary rows'
);

select results_eq(
  $$
    update public.vocabulary_items
    set term = 'rls-other-updated'
    where term = 'rls-other'
    returning term
  $$,
  $$ select null::text where false $$,
  'authenticated users cannot update another user vocabulary row'
);

select throws_ok(
  $$
    update public.vocabulary_items
    set user_id = '00000000-0000-0000-0000-000000000002'
    where term = 'rls-own-updated'
  $$,
  '42501',
  'new row violates row-level security policy for table "vocabulary_items"',
  'authenticated users cannot transfer a vocabulary row to another user'
);

select results_eq(
  $$
    delete from public.vocabulary_items
    where term = 'rls-other'
    returning term
  $$,
  $$ select null::text where false $$,
  'authenticated users cannot delete another user vocabulary row'
);

select results_eq(
  $$
    delete from public.vocabulary_items
    where term = 'rls-own-updated'
    returning term
  $$,
  $$ values ('rls-own-updated'::text) $$,
  'authenticated users can delete their own vocabulary row'
);

reset role;

select results_eq(
  $$
    select meanings
    from public.vocabulary_items
    where id = '10000000-0000-0000-0000-000000000002'
  $$,
  $$ values ('[{"meaning":"다른 사용자 뜻"}]'::jsonb) $$,
  'another user vocabulary meaning remains unchanged'
);

select ok(
  not has_table_privilege('anon', 'public.analysis_usage_limits', 'select'),
  'anonymous users cannot read server-owned usage rows'
);

select ok(
  not has_table_privilege('authenticated', 'public.analysis_usage_limits', 'select'),
  'authenticated users cannot read server-owned usage rows'
);

select ok(
  has_table_privilege('service_role', 'public.analysis_usage_limits', 'delete'),
  'the service role can delete expired usage rows'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.delete_expired_analysis_usage(integer)',
    'execute'
  ),
  'anonymous users cannot run usage cleanup'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.delete_expired_analysis_usage(integer)',
    'execute'
  ),
  'authenticated users cannot run usage cleanup'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.delete_expired_analysis_usage(integer)',
    'execute'
  ),
  'the service role can run usage cleanup'
);

insert into public.analysis_usage_limits (ip_hash, period_start, request_count)
values
  ('expired-test-ip', current_date - 91, 1),
  ('retained-test-ip', current_date - 90, 1);

set local role service_role;

select results_eq(
  $$ select public.delete_expired_analysis_usage(90) $$,
  $$ values (1) $$,
  'usage cleanup deletes rows older than the retention boundary'
);

reset role;

select is(
  (select count(*)::integer
   from public.analysis_usage_limits
   where ip_hash = 'expired-test-ip'),
  0,
  'expired usage rows are removed'
);

select is(
  (select count(*)::integer
   from public.analysis_usage_limits
   where ip_hash = 'retained-test-ip'),
  1,
  'usage rows on the retention boundary remain'
);

select * from finish();

rollback;
