alter table feeds
  add column if not exists enable_extraction integer not null default 0;
