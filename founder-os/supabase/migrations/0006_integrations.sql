-- Nexa update: integration layer foundations. Run in the Supabase SQL
-- editor — adds four tables, no data is modified.

-- 1. integrations: one row per connected provider per user. Holds status
--    and metadata only — NEVER tokens (those live in integration_secrets,
--    which has no user-facing RLS policy at all).
create table if not exists integrations (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  provider            text not null,             -- 'strava' | 'stripe' | 'shopify' | 'ga4' | 'csv' | ...
  status              text not null default 'connected',  -- 'connected' | 'error' | 'disconnected'
  scopes              text,
  external_account    text,                      -- e.g. Strava athlete id, Stripe account
  last_sync_at        timestamptz,
  error               text,
  created_at          timestamptz not null default now(),
  unique (user_id, provider)
);

-- 2. integration_secrets: encrypted tokens, service-role access only.
--    RLS is enabled with NO policies — the anon/user key can never read
--    or write here; only server code with the service key can.
create table if not exists integration_secrets (
  integration_id     uuid primary key references integrations(id) on delete cascade,
  access_token_enc   text,
  refresh_token_enc  text,
  expires_at         timestamptz,
  updated_at         timestamptz not null default now()
);

-- 3. imported_metrics: one row per user/provider/metric/day. This IS the
--    daily aggregate — weekly numbers are computed in code.
create table if not exists imported_metrics (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  provider    text not null,
  metric      text not null,                    -- 'workouts' | 'steps' | 'sleep_minutes' | 'revenue' | 'orders' | 'sessions' | ...
  date        date not null,
  value       numeric(14,2) not null default 0,
  meta        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  unique (user_id, provider, metric, date)
);

-- 4. sync_runs: history for "last sync 08:12" and error surfacing.
create table if not exists sync_runs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  provider     text not null,
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  status       text not null default 'running', -- 'running' | 'ok' | 'error'
  error        text,
  items        int not null default 0
);

create index on integrations (user_id);
create index on imported_metrics (user_id, date);
create index on imported_metrics (user_id, provider, metric, date);
create index on sync_runs (user_id, provider, started_at desc);

alter table integrations        enable row level security;
alter table integration_secrets enable row level security;
alter table imported_metrics    enable row level security;
alter table sync_runs           enable row level security;

create policy "own rows" on integrations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- integration_secrets: deliberately NO policy — service role only.
create policy "own rows" on imported_metrics
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on sync_runs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
