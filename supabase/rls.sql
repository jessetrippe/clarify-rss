-- Row Level Security policies for Clarify RSS

alter table feeds enable row level security;
alter table articles enable row level security;

create policy "feeds_select_own"
  on feeds
  for select
  using (auth.uid() = user_id);

create policy "feeds_insert_own"
  on feeds
  for insert
  with check (auth.uid() = user_id);

create policy "feeds_update_own"
  on feeds
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "feeds_delete_own"
  on feeds
  for delete
  using (auth.uid() = user_id);

create policy "articles_select_own"
  on articles
  for select
  using (auth.uid() = user_id);

create policy "articles_insert_own"
  on articles
  for insert
  with check (auth.uid() = user_id);

create policy "articles_update_own"
  on articles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "articles_delete_own"
  on articles
  for delete
  using (auth.uid() = user_id);
