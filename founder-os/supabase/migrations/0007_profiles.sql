-- User profile: the operator's own parameters. The score engine, Body
-- section and AI all read the bars from here, so the system knows what
-- "hitting your own standard" means for this specific person.
create table profiles (
  user_id               uuid primary key references auth.users(id) on delete cascade,
  name                  text,
  training_per_week     int not null default 4,
  focus_minutes_per_day int not null default 25,
  waste_limit_month     numeric(12,2),
  main_goal             text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table profiles enable row level security;
create policy "own rows" on profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
