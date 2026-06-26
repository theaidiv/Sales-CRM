-- ============================================================
-- AI Sales OS — Database schema (Supabase / Postgres)
-- Run this in the Supabase SQL Editor BEFORE seeding.
-- Safe to re-run: drops and recreates demo tables.
-- ============================================================

-- Clean slate (demo only)
drop table if exists comments cascade;
drop table if exists quotations cascade;
drop table if exists orders cascade;
drop table if exists activities cascade;
drop table if exists opportunities cascade;
drop table if exists targets cascade;
drop table if exists customers cascade;
drop table if exists profiles cascade;

-- ------------------------------------------------------------
-- profiles: app users + role + team (linked to auth.users)
-- ------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null check (role in ('Admin', 'Sales Head', 'Sales Executive')),
  team text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- customers: central customer intelligence repository
-- ------------------------------------------------------------
create table customers (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_person text,
  phone text,
  email text,
  country text,
  industry text,
  assigned_to uuid references profiles(id) on delete set null,
  category text not null default 'New' check (category in ('Regular', 'Detached', 'New')),
  last_contact_date date,
  last_order_date date,
  total_revenue numeric not null default 0,
  status text not null default 'Active',
  health_score int not null default 50,
  health_band text not null default 'Stable' check (health_band in ('Healthy', 'Stable', 'At Risk', 'Detached Risk')),
  notes text,
  created_at timestamptz not null default now()
);
create index on customers (assigned_to);
create index on customers (category);

-- ------------------------------------------------------------
-- opportunities: leads + pipeline
-- ------------------------------------------------------------
create table opportunities (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete cascade,
  title text not null,
  assigned_to uuid references profiles(id) on delete set null,
  stage text not null default 'New' check (stage in (
    'New', 'Contacted', 'Meeting Scheduled', 'Quotation Shared',
    'Negotiation', 'Won', 'Lost', 'On Hold')),
  value numeric not null default 0,
  probability int not null default 10,
  expected_close_date date,
  notes text,
  created_at timestamptz not null default now()
);
create index on opportunities (assigned_to);
create index on opportunities (stage);

-- ------------------------------------------------------------
-- activities: calls, meetings, visits, follow-ups, etc.
-- ------------------------------------------------------------
create table activities (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('Call', 'Meeting', 'Visit', 'Follow-Up', 'Quotation', 'Order', 'Email')),
  user_id uuid references profiles(id) on delete set null,
  customer_id uuid references customers(id) on delete cascade,
  opportunity_id uuid references opportunities(id) on delete set null,
  activity_date date not null default current_date,
  notes text,
  outcome text,
  created_at timestamptz not null default now()
);
create index on activities (customer_id);
create index on activities (user_id);

-- ------------------------------------------------------------
-- orders: completed revenue events (drive detach + health)
-- ------------------------------------------------------------
create table orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete cascade,
  amount numeric not null default 0,
  order_date date not null default current_date,
  created_at timestamptz not null default now()
);
create index on orders (customer_id);

-- ------------------------------------------------------------
-- quotations: pending/sent quotes feeding the projection
-- ------------------------------------------------------------
create table quotations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete cascade,
  opportunity_id uuid references opportunities(id) on delete set null,
  amount numeric not null default 0,
  status text not null default 'Sent' check (status in ('Draft', 'Sent', 'Accepted', 'Rejected')),
  quote_date date not null default current_date,
  created_at timestamptz not null default now()
);
create index on quotations (customer_id);

-- ------------------------------------------------------------
-- targets: company / team / user, annual / quarterly / monthly
-- ------------------------------------------------------------
create table targets (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('company', 'team', 'user')),
  period_type text not null check (period_type in ('annual', 'quarterly', 'monthly')),
  period text not null,            -- e.g. '2026', '2026-Q2', '2026-06'
  owner_id uuid references profiles(id) on delete cascade,  -- null for company scope
  team text,
  target_amount numeric not null default 0,
  achieved_amount numeric not null default 0,
  created_at timestamptz not null default now()
);
create index on targets (owner_id);
create index on targets (period);

-- ------------------------------------------------------------
-- comments: collaboration timeline on customers / opportunities
-- ------------------------------------------------------------
create table comments (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('customer', 'opportunity')),
  entity_id uuid not null,
  user_id uuid references profiles(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);
create index on comments (entity_type, entity_id);

-- ============================================================
-- Row Level Security (demo: any authenticated user has access;
-- role-based filtering is handled in the application layer)
-- ============================================================
alter table profiles enable row level security;
alter table customers enable row level security;
alter table opportunities enable row level security;
alter table activities enable row level security;
alter table orders enable row level security;
alter table quotations enable row level security;
alter table targets enable row level security;
alter table comments enable row level security;

do $$
declare t text;
begin
  foreach t in array array['profiles','customers','opportunities','activities','orders','quotations','targets','comments']
  loop
    execute format('drop policy if exists "auth read %1$s" on %1$s;', t);
    execute format('drop policy if exists "auth write %1$s" on %1$s;', t);
    execute format('create policy "auth read %1$s" on %1$s for select to authenticated using (true);', t);
    execute format('create policy "auth write %1$s" on %1$s for all to authenticated using (true) with check (true);', t);
  end loop;
end $$;
