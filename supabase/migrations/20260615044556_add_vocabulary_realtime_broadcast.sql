alter table realtime.messages enable row level security;

drop policy if exists "Users can receive their vocabulary broadcasts"
  on realtime.messages;

create policy "Users can receive their vocabulary broadcasts"
  on realtime.messages
  for select
  to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and (select realtime.topic()) =
      'vocabulary:' || ((select auth.uid())::text)
  );

create or replace function public.broadcast_vocabulary_item_changes()
returns trigger
security definer
language plpgsql
set search_path = ''
as $$
declare
  vocabulary_user_id uuid := coalesce(new.user_id, old.user_id);
begin
  perform realtime.broadcast_changes(
    'vocabulary:' || vocabulary_user_id::text,
    TG_OP,
    TG_OP,
    TG_TABLE_NAME,
    TG_TABLE_SCHEMA,
    NEW,
    OLD
  );

  return null;
end;
$$;

revoke all on function public.broadcast_vocabulary_item_changes()
  from public, anon, authenticated;

drop trigger if exists handle_vocabulary_item_realtime_changes
  on public.vocabulary_items;

create trigger handle_vocabulary_item_realtime_changes
  after insert or update or delete
  on public.vocabulary_items
  for each row
  execute function public.broadcast_vocabulary_item_changes();
