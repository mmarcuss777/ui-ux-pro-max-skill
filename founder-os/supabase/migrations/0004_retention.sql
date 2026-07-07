-- Nexa update: retention depth. Run this in the Supabase SQL editor
-- (Dashboard → SQL Editor → paste → Run) — no data is modified.

-- experiments: how the hypothesis gets tested. The existing `metric`
-- column doubles as the success condition.
alter table experiments add column if not exists test_method text;

-- transactions: money discipline — did this spend move me forward?
alter table transactions add column if not exists moved_forward boolean;

-- offers: sell in plain language — who it's for, what problem it solves,
-- why they'd buy.
alter table offers add column if not exists audience text;
alter table offers add column if not exists problem text;
alter table offers add column if not exists why_buy text;
