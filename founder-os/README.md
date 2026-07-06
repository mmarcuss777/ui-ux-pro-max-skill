# Founder OS

A lean personal founder OS — a mobile-first web app where a solo founder tracks
business experiments, fitness, learning and money, and gets a hard weekly verdict
from AI. Built with Next.js 14, Tailwind CSS, shadcn/ui, Supabase and the
Anthropic API.

Written for an owner with no programming background. Follow the steps in order;
a fresh setup takes about 15 minutes.

## What you need

- [Node.js](https://nodejs.org) 18 or newer installed on your computer
- A free [Supabase](https://supabase.com) account (database + login)
- An [Anthropic](https://console.anthropic.com) API key (for the AI verdicts)
- A free [Vercel](https://vercel.com) account (for deploying online — optional)

## 1. Install

Open a terminal in this folder and run:

```bash
npm install
```

## 2. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**. Pick any name
   and a strong database password (you won't need the password again).
2. Wait for the project to finish provisioning (~2 minutes).
3. Open **SQL Editor** (left sidebar) → **New query**. Copy the entire contents
   of `supabase/migrations/0001_init.sql` from this folder, paste it in, and
   press **Run**. You should see "Success. No rows returned."
4. Optional but recommended for a quick start: open **Authentication →
   Sign In / Up → Email** and turn **Confirm email** off. With it on, every
   signup must click a link in their inbox before logging in.

## 3. Connect the app to Supabase

1. In Supabase, open **Project Settings → API Keys**.
2. Copy the example env file:

   ```bash
   cp .env.local.example .env.local
   ```

3. Open `.env.local` in any text editor and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` — the **Project URL**
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the **anon / public** key
   - `SUPABASE_SERVICE_ROLE_KEY` — leave empty; the app doesn't use it yet
   - `ANTHROPIC_API_KEY` — your key from
     [console.anthropic.com](https://console.anthropic.com/settings/keys)

Never commit `.env.local` or share the Anthropic / service-role keys — they are
server-side secrets.

## 4. Run it

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign up, create your first
workspace, and log your day. The Reality Check and Weekly Review buttons need
the `ANTHROPIC_API_KEY` to be set.

## 5. Verify security (once)

Row Level Security keeps each user's data private. To prove it works:

1. Sign up two accounts (use two browsers or a private window), each creating a
   workspace.
2. In Supabase **Authentication → Users**, copy both user IDs.
3. Open `supabase/rls_test.sql`, paste it into the SQL Editor, replace the two
   placeholders, and run it. User A must see only their own workspaces, and the
   final count of user B's rows visible to A must be **0**.

## 6. Sample data (optional)

To see the app full of realistic agency data: sign up first, then paste
`supabase/seed.sql` into the SQL Editor and run it. It creates a "Demo Agency"
workspace attached to the earliest-created user, with a week of logs,
experiments, offers, contacts and a month of transactions.

## 7. Deploy to Vercel (optional)

1. Push this folder to a GitHub repository.
2. On [vercel.com](https://vercel.com) → **Add New → Project** → import the
   repository. If the app lives in a subfolder of the repo, set **Root
   Directory** to that folder (e.g. `founder-os`).
3. Under **Environment Variables**, add the same four variables from your
   `.env.local`.
4. Press **Deploy**.
5. Back in Supabase, open **Authentication → URL Configuration** and set
   **Site URL** to your new Vercel URL (e.g. `https://your-app.vercel.app`) so
   email links point to the right place.

## How the app is organized

| Page | What it does |
|---|---|
| Dashboard | Read-only "run today" view: daily score, action of the day, training/learning done, 7-day cashflow |
| Log | Sub-60-second daily entry: score, energy, top action, note; also fitness and learning entries |
| Lab | Experiments board: idea → testing → decided, with AI Reality Check per experiment |
| Offers | Offers with automatic margin, plus leads/clients/suppliers |
| Money | Transactions, running balance, 30-day trend |
| Review | Sends the last 7 days to the AI and returns a hard verdict |
| Workspace | Rename, toggle modules, pause/archive, set primary |

Technical map: pages live in `app/(app)/`, reusable pieces in `components/`,
Supabase clients and config in `lib/`, database schema in
`supabase/migrations/`. The AI endpoint is `app/api/ai/reality-check/route.ts`
and runs only on the server.
