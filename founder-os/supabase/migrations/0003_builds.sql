-- Nexa update: builds — the user's active project ("Current Build").
-- Common columns + a jsonb bag for the business-type-specific fields.
create table if not exists builds (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  name          text not null,
  business_type text not null default 'ecommerce',
  stage         text not null default 'idea',      -- idea | validation | building | selling | scaling
  week_goal     text,
  next_action   text,
  priority      text not null default 'high',      -- high | medium | low
  status        text not null default 'active',    -- active | paused | archived
  fields        jsonb not null default '{}'::jsonb,
  notes         text,
  created_at    timestamptz not null default now()
);

create index on builds (workspace_id, status);

alter table builds enable row level security;

create policy "own via workspace" on builds
  for all
  using      (exists (select 1 from workspaces w where w.id = workspace_id and w.user_id = auth.uid()))
  with check (exists (select 1 from workspaces w where w.id = workspace_id and w.user_id = auth.uid()));
