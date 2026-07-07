-- Nexa update: web-push subscriptions for the evening "close the day"
-- reminder. Run in the Supabase SQL editor — adds one table, no data
-- is modified.
create table if not exists push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  locale     text not null default 'en',
  created_at timestamptz not null default now()
);

create index on push_subscriptions (user_id);

alter table push_subscriptions enable row level security;

create policy "own rows" on push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
