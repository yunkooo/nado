create extension if not exists pgcrypto with schema extensions;

create table public.vocabulary_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  term text not null check (char_length(trim(term)) > 0),
  normalized_term text generated always as (lower(regexp_replace(trim(term), '\s+', ' ', 'g'))) stored,
  type text not null check (type in ('word', 'phrase')),
  meanings jsonb not null default '[]'::jsonb check (jsonb_typeof(meanings) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, normalized_term, type)
);

alter table public.vocabulary_items enable row level security;

create policy "Users can read their vocabulary"
  on public.vocabulary_items
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their vocabulary"
  on public.vocabulary_items
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their vocabulary"
  on public.vocabulary_items
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their vocabulary"
  on public.vocabulary_items
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.vocabulary_items to authenticated;

create table public.analysis_usage_limits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  ip_hash text,
  period_start date not null,
  request_count integer not null default 0 check (request_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (user_id is not null or ip_hash is not null)
);

alter table public.analysis_usage_limits enable row level security;

comment on table public.analysis_usage_limits is
  'Server-owned rate limit state. Access is expected through the Railway API service role.';
