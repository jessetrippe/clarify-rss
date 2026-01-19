-- Clarify RSS schema for Supabase Postgres

create table if not exists feeds (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  url text not null,
  title text not null,
  last_fetched_at bigint,
  last_error text,
  created_at bigint not null,
  updated_at bigint not null,
  is_deleted integer not null default 0
);

create unique index if not exists idx_feeds_user_url on feeds(user_id, url);
create index if not exists idx_feeds_user_updated on feeds(user_id, updated_at);

create table if not exists articles (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  feed_id text not null references feeds(id) on delete cascade,
  guid text,
  url text,
  title text not null,
  content text,
  summary text,
  published_at bigint,
  is_read integer not null default 0,
  is_starred integer not null default 0,
  created_at bigint not null,
  updated_at bigint not null,
  is_deleted integer not null default 0,
  extraction_status text,
  extraction_error text,
  extracted_at bigint
);

create index if not exists idx_articles_user_updated on articles(user_id, updated_at);
create index if not exists idx_articles_user_feed on articles(user_id, feed_id);
create index if not exists idx_articles_user_starred on articles(user_id, is_starred);
