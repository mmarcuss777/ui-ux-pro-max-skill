-- Nexa update: goals & priorities per workspace.
-- The AI uses this text to score activities and generate coaching advice.
alter table workspaces add column if not exists goals text;
