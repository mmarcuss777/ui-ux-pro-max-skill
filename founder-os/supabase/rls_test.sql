-- RLS proof: one user cannot read another user's rows.
-- How to run:
--   1. Sign up two accounts in the app (user A and user B), each creating a workspace.
--   2. In Supabase Studio > Authentication > Users, copy both user IDs.
--   3. Paste this file into Supabase Studio > SQL Editor, replace the two
--      placeholders below, and run it.
--
-- Expected output: each "as user X" query returns only that user's own
-- workspaces, and the final cross-check returns 0 rows.

begin;

-- pretend to be user A (the SQL editor normally bypasses RLS as postgres)
select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'PASTE_USER_A_ID_HERE', 'role', 'authenticated')::text,
  true
);
set local role authenticated;

select 'as user A' as who, id, name, user_id from workspaces;

-- user A must see zero of user B's rows
select count(*) as user_b_rows_visible_to_a
from workspaces
where user_id = 'PASTE_USER_B_ID_HERE';

rollback;
