# CLAUDE.md — Founder OS (build instructions for Claude Code)

> Ako to použiť: ulož tento súbor ako `CLAUDE.md` do rootu prázdneho repozitára.
> Otvor Claude Code v tom priečinku a vlož **Kickoff prompt** z Prílohy A.
> Claude Code stavia po fázach (0 → 7) a **po každej fáze zastaví na kontrolu**.
> Všetko strojové (schéma, config, štruktúra, prompty) je v angličtine zámerne — číta to agent aj build.

---

## 0. Mission (read this first, every session)

Build a **lean personal founder OS** — a mobile-first web app where a solo founder tracks business experiments, fitness, learning and money, and gets a hard weekly verdict. Optimize for **shipping a working MVP**, not for completeness.

**Prime directive:** when in doubt, build less. If a feature is not explicitly listed in "IN SCOPE", it is out. Ask before adding scope.

---

## 1. Tech stack (fixed — do not substitute)

| Layer | Choice |
|---|---|
| Framework | Next.js 14+ (App Router, TypeScript) |
| Styling | Tailwind CSS |
| Components | shadcn/ui (base color: `slate`, radius `0.5rem`) |
| Font | Inter |
| Charts | Recharts (only where a trend must be shown) |
| Backend | Supabase (Postgres + Auth + Row Level Security) |
| Data fetching | `@supabase/ssr` + server components; TanStack Query only if genuinely needed |
| AI | Anthropic Messages API, server-side only |
| Deploy target | Vercel |

No Redux, no Zustand, no ORM (use the Supabase client directly). No custom auth — Supabase Auth handles it.

---

## 2. Scope — hard boundaries

### IN SCOPE (build exactly this)
- Email/password auth (Supabase)
- Onboarding: pick business type + create first workspace
- 6 database tables (section 4), with RLS
- 7 pages (section 6), each with **one** primary CTA
- 2 hardcoded business types: `agency` (default) + `custom`
- One AI endpoint: Reality Check, fixed output format (section 7)
- Seed data + README

### OUT OF SCOPE — DO NOT BUILD (this is not negotiable)
- Multi-user / teams / sharing
- Billing / Stripe / subscriptions
- Audit log
- Inventory / warehouse module
- More than 2 business types
- UI editor for custom fields (fields are hardcoded per type)
- Data export
- Any "SaaS-ready" abstraction, plugin system, or premature DB optimization
- Any table beyond the 6 defined below

If you think one of these is needed — **stop and ask**, do not implement.

---

## 3. Design system

Serious founder dashboard. Not playful, not gamified. No badges, no confetti, no emojis in UI.

```ts
// tailwind tokens (extend theme)
colors: {
  ink:    "#1B2A4A", // primary navy — headings, primary buttons
  paper:  "#FAFAFA", // app background
  line:   "#E3E6EC", // borders
  muted:  "#5A6472", // secondary text
  danger: "#9B2C2C", // kill / risk
  ok:     "#24603B", // scale / positive
}
```

Rules:
- Mobile-first. Every screen usable one-handed on iPhone. A daily log entry must be completable in **under 60 seconds**.
- Dashboard shows only what creates movement **today**. No dense grids of stats.
- Every number has context: trend arrow + comparison to last week. A number without context is noise.
- Exactly one primary (filled navy) button per page. Everything else is secondary/ghost.
- Workspace switcher lives in the top header, reachable from every page.

---

## 4. Database schema (Supabase / Postgres)

Create as migration `supabase/migrations/0001_init.sql`. `auth.users` is provided by Supabase — reference it, do not recreate it. **Exactly these 6 tables. No more.**

```sql
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
```

### Row Level Security (mandatory — enable before any data goes in)

```sql
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
```

---

## 5. File structure

```
founder-os/
├─ app/
│  ├─ (auth)/
│  │  ├─ login/page.tsx
│  │  └─ signup/page.tsx
│  ├─ (app)/
│  │  ├─ layout.tsx              # header + workspace switcher + nav; guards auth
│  │  ├─ dashboard/page.tsx
│  │  ├─ log/page.tsx
│  │  ├─ lab/page.tsx
│  │  ├─ workspace/page.tsx
│  │  ├─ offers/page.tsx
│  │  ├─ money/page.tsx
│  │  └─ review/page.tsx
│  ├─ onboarding/page.tsx        # pick business type + create first workspace
│  ├─ api/ai/reality-check/route.ts
│  ├─ layout.tsx
│  └─ globals.css
├─ components/
│  ├─ ui/                        # shadcn components
│  ├─ workspace-switcher.tsx
│  ├─ daily-log-form.tsx
│  ├─ experiment-card.tsx
│  ├─ stat-card.tsx              # number + trend + vs last week
│  └─ primary-cta.tsx
├─ lib/
│  ├─ supabase/client.ts         # browser client
│  ├─ supabase/server.ts         # server client (@supabase/ssr)
│  ├─ business-types.ts          # hardcoded config (section 8)
│  └─ ai.ts                      # Anthropic call wrapper
├─ supabase/
│  ├─ migrations/0001_init.sql
│  └─ seed.sql
├─ types/db.ts
├─ .env.local.example
├─ CLAUDE.md
└─ README.md
```

### `.env.local.example`
```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server only, never exposed to client
ANTHROPIC_API_KEY=                # server only
```

---

## 6. Pages (7) — each has exactly ONE primary CTA

| Page | Route | Purpose | Primary CTA | Key elements |
|---|---|---|---|---|
| Dashboard | `/dashboard` | Run today | *(none — read-only)* | daily score, 1 business action of the day, training done?, learning done?, cashflow snapshot |
| Daily Log | `/log` | Fast daily entry (<60s) | **Add log** | type toggle (daily/fitness/learning), score slider, energy, one-line note, "top action done?" checkbox |
| Business Lab | `/lab` | Idea → experiment → decision | **Add experiment** | kanban by status (idea / testing / decided); each card: hypothesis, metric, deadline; "Run Reality Check" action |
| Workspace | `/workspace` | The active project | **Switch / Edit** | business_type, active modules, status, is_primary toggle; edit name/modules |
| Offers & Contacts | `/offers` | Offers + leads/clients/suppliers | **Add offer** / **Add contact** | two tabs; offers show margin auto-calc; contacts show stage + next_step |
| Money | `/money` | Income, expenses, cashflow | **Add transaction** | in/out list, running balance, simple cashflow trend (Recharts) |
| Weekly Review | `/review` | Hard weekly verdict | **Generate review** | pulls last 7 days of logs + experiments + transactions, sends to AI, renders verdict |

Fitness and Learning are **not** separate pages — they are log types entered via Daily Log. Do not create pages for them.

All 7 app pages require auth. Unauthed users → redirect to `/login`. After signup with no workspace → redirect to `/onboarding`.

---

## 7. AI Reality Check — single endpoint, fixed output

Route: `app/api/ai/reality-check/route.ts` (POST). Server-side only; the `ANTHROPIC_API_KEY` never reaches the client.

**Input:** `{ businessType, idea, goal, constraint }`
**Output:** plain text in a fixed structure. No preamble, no closing, **no motivational language**.

System prompt (use verbatim):
```
You are a hard, practical business risk analyst for a solo bootstrapped founder.
Analyze the idea below. Be blunt. State the realistic downside before any upside.
Never encourage, never motivate, never soften. Output ONLY these sections, in order,
each as a short list of concrete points:

Potential
Risks
What to validate
Minimal test (cheap, fast, with a deadline and one metric)
Exit plan
Verdict: one of kill / continue / pivot / scale

No introduction. No conclusion. No pep talk.
```

`lib/ai.ts` wraps the Anthropic Messages API call (model: a current Claude model, `max_tokens` ~1024). The same endpoint is reused by the Weekly Review page — for that, swap the system prompt to a "weekly review" variant that names stagnation and excuses and ends with what to do / cut / improve next week.

---

## 8. Business types — hardcoded config (no DB table)

`lib/business-types.ts`:
```ts
export const BUSINESS_TYPES = {
  agency: {
    label: "Agency / Services",
    modules: ["leads", "offers", "experiments", "finance"],
    contactTypes: ["lead", "client", "supplier"],
    offerTypes: ["service"],
  },
  custom: {
    label: "Custom",
    modules: [],                                   // user selects during onboarding
    contactTypes: ["lead", "client", "supplier"],
    offerTypes: ["product", "service", "investment"],
  },
} as const;

export type BusinessType = keyof typeof BUSINESS_TYPES;
export const ALL_MODULES = ["leads", "offers", "experiments", "finance"] as const;
```

Onboarding writes the chosen type's `modules` into `workspaces.active_modules`. Pages read `active_modules` to decide what to show. **Do not** add a `business_type_templates` table — future types are added by editing this object.

---

## 9. Build order — phases (stop after each)

| Phase | Deliverable | Acceptance criteria |
|---|---|---|
| **0. Init** | Next.js + TS + Tailwind + shadcn scaffolded; Supabase project connected; `.env.local.example`; email/password auth working | Can sign up, log in, log out. Protected route redirects when logged out. |
| **1. Schema** | `0001_init.sql` applied; RLS on; `types/db.ts` generated | All 6 tables exist. RLS verified: user A cannot read user B's rows. |
| **2. Shell** | App layout, header, nav, design tokens, workspace switcher, `/onboarding` | New user is forced through onboarding, creates first workspace, lands on dashboard. Switcher changes active workspace. |
| **3. Core loop** | Dashboard + Daily Log | Can add a daily log in <60s; dashboard reflects today's score + action. **Use it for real for 2 days before continuing.** |
| **4. Lab** | Business Lab (experiments, ideas via status) | Can create an idea, move it idea→testing→decided, set decision. Reality Check button returns structured output. |
| **5. Offers/Money** | Offers & Contacts + Money | Can add offer (margin auto-calcs), add contact, add transaction; running balance + cashflow trend correct. |
| **6. Review + AI + seed** | Weekly Review page wired to AI; `seed.sql` | Generate review produces a hard verdict from real 7-day data. Seed data loads cleanly. |
| **7. Ship** | README (setup + run + deploy), final polish pass | Fresh clone + README steps = running app in <15 min. |

After each phase: summarize what was built, list what's left, **wait for go-ahead**. Do not run ahead.

---

## 10. Guardrails for you, Claude Code

- Ask before installing any dependency not named in section 1.
- Never widen scope past section 2. If tempted, stop and ask.
- Keep components small and readable — this owner has no programming background and must be able to follow the code.
- No `console.log` noise left in shipped code; no dead files; no commented-out blocks.
- Secrets (`SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`) only in server code / route handlers. Never in a client component.
- Prefer boring, well-documented patterns over clever ones.

---

# Príloha A — Kickoff prompt (vlož do Claude Code ako prvú správu)

```
Read CLAUDE.md in this repo fully before writing any code. It is the complete spec.

Build Founder OS exactly as specified. Work in the phases defined in section 9 and
STOP after each phase for my approval — do not continue to the next phase on your own.

Start now with Phase 0 (Init):
1. First give me a short implementation plan for Phase 0 only.
2. Then scaffold Next.js 14 (App Router, TypeScript) + Tailwind + shadcn/ui (base color slate)
   + the Supabase clients, and wire email/password auth with a protected route.
3. Give me the exact steps I must do manually (create Supabase project, paste keys into
   .env.local, run any CLI commands), written for someone with no coding background.

Rules: build only what is IN SCOPE (section 2). Ask before adding anything else or
installing any dependency not listed in section 1. Do not build any OUT OF SCOPE item.
```

# Príloha B — Fázové prompty (spúšťaj po jednom, po schválení predošlej fázy)

```
Phase 1 — Schema: Apply the migration in section 4 (all 6 tables + indexes + RLS).
Then generate types/db.ts from the schema. Prove RLS works: show me a quick test that
one user cannot read another user's rows. Stop when done.
```
```
Phase 2 — Shell: Build the app layout, header, navigation, and design tokens from
section 3. Build the workspace switcher and the /onboarding flow (pick business type
from section 8, create first workspace, redirect to dashboard). Stop when done.
```
```
Phase 3 — Core loop: Build Dashboard and Daily Log per section 6. Daily log entry must
take under 60 seconds on mobile. Do not build other pages yet. Stop when done.
```
```
Phase 4 — Lab: Build Business Lab (experiments with status idea/testing/decided, ideas
folded in). Build the /api/ai/reality-check route using the exact system prompt in
section 7. Wire a "Run Reality Check" button on each experiment card. Stop when done.
```
```
Phase 5 — Offers/Money: Build Offers & Contacts (offers with auto margin, contacts with
stage + next_step) and Money (in/out, running balance, cashflow trend via Recharts).
Stop when done.
```
```
Phase 6 — Review + seed: Build Weekly Review — pull last 7 days of logs, experiments and
transactions, send to the AI with the weekly-review system prompt variant, render the
verdict. Write supabase/seed.sql with realistic sample data for one agency workspace.
Stop when done.
```
```
Phase 7 — Ship: Write README.md (setup, env, run locally, deploy to Vercel) for a
non-technical owner. Do a final polish pass: remove dead code and console.logs, confirm
no secrets in client code. Stop when done.
```
