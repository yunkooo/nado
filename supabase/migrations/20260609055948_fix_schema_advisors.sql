alter policy "Users can read their vocabulary"
  on public.vocabulary_items
  using ((select auth.uid()) = user_id);

alter policy "Users can insert their vocabulary"
  on public.vocabulary_items
  with check ((select auth.uid()) = user_id);

alter policy "Users can update their vocabulary"
  on public.vocabulary_items
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter policy "Users can delete their vocabulary"
  on public.vocabulary_items
  using ((select auth.uid()) = user_id);

create policy "Service role can manage analysis usage"
  on public.analysis_usage_limits
  for all
  to service_role
  using (true)
  with check (true);

alter function public.consume_analysis_usage(uuid, text, date, integer)
  set search_path = '';
