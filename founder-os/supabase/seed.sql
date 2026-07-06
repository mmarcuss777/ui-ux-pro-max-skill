-- Realistic sample data for one agency workspace.
-- How to run:
--   1. Sign up in the app first (the seed attaches to the earliest user).
--   2. Paste this file into Supabase Studio > SQL Editor and run it.
-- Safe to run once; running it again creates a second demo workspace.

do $$
declare
  the_user uuid := (select id from auth.users order by created_at limit 1);
  ws uuid;
begin
  if the_user is null then
    raise exception 'No user found. Sign up in the app first, then run the seed.';
  end if;

  insert into workspaces (user_id, name, business_type, active_modules, is_primary)
  values (the_user, 'Demo Agency', 'agency',
          '["leads","offers","experiments","finance"]'::jsonb, false)
  returning id into ws;

  -- Logs: a week of daily scores plus fitness and learning entries
  insert into logs (user_id, workspace_id, date, type, score, data) values
    (the_user, ws, current_date - 6, 'daily', 55,
     '{"energy": 2, "note": "Slow start, too much admin", "top_action": "Send 5 cold emails", "top_action_done": false}'),
    (the_user, ws, current_date - 5, 'daily', 70,
     '{"energy": 3, "note": "Two discovery calls booked", "top_action": "Follow up with Nordwind", "top_action_done": true}'),
    (the_user, ws, current_date - 4, 'daily', 80,
     '{"energy": 4, "note": "Proposal sent to Nordwind", "top_action": "Finish proposal", "top_action_done": true}'),
    (the_user, ws, current_date - 3, 'daily', 40,
     '{"energy": 2, "note": "Lost the day to a plugin bug", "top_action": "Prep audit template", "top_action_done": false}'),
    (the_user, ws, current_date - 2, 'daily', 75,
     '{"energy": 4, "note": "Audit template done, one referral in", "top_action": "Prep audit template", "top_action_done": true}'),
    (the_user, ws, current_date - 1, 'daily', 65,
     '{"energy": 3, "note": "Client work all day", "top_action": "Invoice Beta Retail", "top_action_done": true}'),
    (the_user, ws, current_date - 5, 'fitness', null, '{"note": "Gym, upper body 45 min"}'),
    (the_user, ws, current_date - 3, 'fitness', null, '{"note": "5 km run"}'),
    (the_user, ws, current_date - 1, 'fitness', null, '{"note": "Gym, legs 40 min"}'),
    (the_user, ws, current_date - 4, 'learning', null, '{"note": "Course: pricing for services, module 2"}'),
    (the_user, ws, current_date - 2, 'learning', null, '{"note": "Read 30 pages of Obviously Awesome"}');

  -- Experiments across all three statuses
  insert into experiments (workspace_id, status, hypothesis, metric, deadline, result, decision) values
    (ws, 'idea', 'Productized SEO audit at fixed price will convert cold leads better than custom quotes',
     '3 audits sold', current_date + 14, null, null),
    (ws, 'idea', 'Short Loom video in outreach doubles reply rate',
     'reply rate >= 10%', null, null, null),
    (ws, 'testing', 'LinkedIn posting 3x/week brings 5 inbound leads per month',
     '5 inbound leads', current_date + 7, null, null),
    (ws, 'testing', 'Referral bonus of 10% gets past clients to introduce new ones',
     '2 referrals in 30 days', current_date + 21, null, null),
    (ws, 'decided', 'Cold calling local businesses converts to discovery calls',
     '5 calls booked from 100 dials', current_date - 7, '1 call booked from 120 dials', 'kill'),
    (ws, 'decided', 'Monthly maintenance retainer upsell to past web clients',
     '3 retainers signed', current_date - 3, '4 retainers signed', 'scale');

  -- Offers (margin is generated from price - cost)
  insert into offers (workspace_id, type, name, cost, price, status) values
    (ws, 'service', 'Website redesign (fixed scope)', 1200.00, 4500.00, 'active'),
    (ws, 'service', 'SEO audit (productized)', 150.00, 690.00, 'active'),
    (ws, 'service', 'Monthly maintenance retainer', 100.00, 350.00, 'active'),
    (ws, 'service', 'Landing page sprint', 400.00, 1500.00, 'draft');

  -- Contacts: leads, clients, suppliers
  insert into contacts (workspace_id, contact_type, name, contact, stage, next_step) values
    (ws, 'lead', 'Nordwind Logistics', 'ops@nordwind.example', 'proposal sent', 'Follow up Thursday'),
    (ws, 'lead', 'Cafe Botanika', '@cafebotanika', 'contacted', 'Send audit offer'),
    (ws, 'lead', 'Hartman Dental', 'info@hartman.example', 'new', 'First outreach email'),
    (ws, 'client', 'Beta Retail s.r.o.', 'jan@betaretail.example', 'retainer', 'Invoice on the 1st'),
    (ws, 'client', 'Vertex Fitness', 'petra@vertexfit.example', 'project running', 'Design review call'),
    (ws, 'supplier', 'Copyhouse (freelance copy)', 'milan@copyhouse.example', null, 'Brief for Nordwind if won');

  -- Transactions: a month of in/out
  insert into transactions (user_id, workspace_id, type, amount, category, date, note) values
    (the_user, ws, 'in',  1500.00, 'client work', current_date - 28, 'Vertex Fitness milestone 1'),
    (the_user, ws, 'out',  49.00,  'software',    current_date - 25, 'Design tool subscription'),
    (the_user, ws, 'out',  120.00, 'contractor',  current_date - 21, 'Copywriting for landing page'),
    (the_user, ws, 'in',   350.00, 'retainer',    current_date - 20, 'Beta Retail maintenance'),
    (the_user, ws, 'out',  15.00,  'software',    current_date - 18, 'Email outreach tool'),
    (the_user, ws, 'in',   690.00, 'audit',       current_date - 14, 'SEO audit — Cafe Botanika'),
    (the_user, ws, 'out',  200.00, 'ads',         current_date - 12, 'LinkedIn ads test'),
    (the_user, ws, 'in',  1500.00, 'client work', current_date - 7,  'Vertex Fitness milestone 2'),
    (the_user, ws, 'out',  85.00,  'accounting',  current_date - 5,  'Bookkeeping'),
    (the_user, ws, 'in',   350.00, 'retainer',    current_date - 2,  'Beta Retail maintenance'),
    (the_user, ws, 'out',  32.00,  'software',    current_date - 1,  'Hosting');
end $$;
