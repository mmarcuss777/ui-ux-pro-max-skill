-- Founder OS — initial schema (6 tables, indexes, RLS).
-- auth.users is provided by Supabase; it is referenced, not recreated.

-- 1. workspaces --------------------------------------------------------------
create table workspaces (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  name           text not null,
  business_type  text not null default 'agency',          -- 'agency' | 'custom'
  active_modules jsonb not null default '["leads","offers","experiments","finance"]'::jsonb,
  status         text not null default 'active',           -- 'active' | 'paused' | 'archived'
  is_primary     boolean not null default false,
  created_at     timestamptz not null default now()
);

-- 2. logs (daily / fitness / learning in one table) --------------------------
create table logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references workspaces(id) on delete set null,
  date         date not null default current_date,
  type         text not null,                              -- 'daily' | 'fitness' | 'learning'
  score        int,                                        -- 0-100, daily only
  data         jsonb not null default '{}'::jsonb,         -- {energy, note, top_action_done, ...}
  created_at   timestamptz not null default now()
);

-- 3. experiments (ideas folded in via status) --------------------------------
create table experiments (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  status       text not null default 'idea',               -- 'idea' | 'testing' | 'decided'
  hypothesis   text not null,
  metric       text,
  deadline     date,
  result       text,
  decision     text,                                       -- 'kill' | 'continue' | 'pivot' | 'scale'
  created_at   timestamptz not null default now()
);

-- 4. offers ------------------------------------------------------------------
create table offers (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  type         text not null,                              -- 'product' | 'service' | 'investment'
  name         text not null,
  cost         numeric(12,2) default 0,
  price        numeric(12,2) default 0,
  margin       numeric(12,2) generated always as (price - cost) stored,
  status       text not null default 'draft',
  created_at   timestamptz not null default now()
);

-- 5. contacts ----------------------------------------------------------------
create table contacts (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  contact_type text not null,                              -- 'lead' | 'client' | 'supplier'
  name         text not null,
  contact      text,                                       -- email / phone / handle
  stage        text,
  next_step    text,
  created_at   timestamptz not null default now()
);

-- 6. transactions ------------------------------------------------------------
create table transactions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references workspaces(id) on delete set null,
  type         text not null,                              -- 'in' | 'out'
  amount       numeric(12,2) not null,
  category     text,
  date         date not null default current_date,
  note         text,
  created_at   timestamptz not null default now()
);

-- indexes --------------------------------------------------------------------
create index on workspaces (user_id);
create index on logs (user_id, date);
create index on experiments (workspace_id, status);
create index on offers (workspace_id);
create index on contacts (workspace_id, contact_type);
create index on transactions (user_id, date);

-- Row Level Security ----------------------------------------------------------
alter table workspaces   enable row level security;
alter table logs         enable row level security;
alter table experiments  enable row level security;
alter table offers       enable row level security;
alter table contacts     enable row level security;
alter table transactions enable row level security;

-- user-owned tables: match on user_id
create policy "own rows" on workspaces
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- workspace-child tables: ownership via parent workspace
create policy "own via workspace" on experiments
  for all
  using      (exists (select 1 from workspaces w where w.id = workspace_id and w.user_id = auth.uid()))
  with check (exists (select 1 from workspaces w where w.id = workspace_id and w.user_id = auth.uid()));
create policy "own via workspace" on offers
  for all
  using      (exists (select 1 from workspaces w where w.id = workspace_id and w.user_id = auth.uid()))
  with check (exists (select 1 from workspaces w where w.id = workspace_id and w.user_id = auth.uid()));
create policy "own via workspace" on contacts
  for all
  using      (exists (select 1 from workspaces w where w.id = workspace_id and w.user_id = auth.uid()))
  with check (exists (select 1 from workspaces w where w.id = workspace_id and w.user_id = auth.uid()));
