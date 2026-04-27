-- ============================================================
-- AI CRM MVP — Full Supabase Schema
-- Run this entire file in: Supabase → SQL Editor → New query
-- ============================================================

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────
-- PROFILES (linked to Supabase Auth users)
-- ─────────────────────────────────────────────
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'sales' check (role in ('admin', 'sales')),
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new user signs up
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'sales')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ─────────────────────────────────────────────
-- CUSTOMERS
-- ─────────────────────────────────────────────
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  email text unique not null,
  location text,
  budget numeric(12,2) not null default 0,
  interest_type text not null,
  lead_tag text not null default 'cold' check (lead_tag in ('hot','warm','cold')),
  sales_rep_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-update updated_at on every row change
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger customers_updated_at
  before update on customers
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────
-- INTERACTIONS
-- ─────────────────────────────────────────────
create table if not exists interactions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  kind text not null check (kind in ('call','whatsapp','meeting')),
  note text,
  responded_in_minutes integer,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- DEALS
-- ─────────────────────────────────────────────
create table if not exists deals (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  stage text not null check (stage in ('lead','contacted','negotiation','closed')),
  engagement_level integer not null default 0 check (engagement_level between 0 and 100),
  value numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger deals_updated_at
  before update on deals
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────
-- AI INSIGHTS (computed by browser, stored here)
-- ─────────────────────────────────────────────
create table if not exists ai_insights (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  likelihood_score integer not null check (likelihood_score between 0 and 100),
  intent_class text not null check (intent_class in ('High intent','Medium intent','Low intent')),
  best_contact_time text not null,
  recommended_offer text not null,
  model_version text not null default 'rules-v1',
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- FOLLOW-UPS
-- ─────────────────────────────────────────────
create table if not exists follow_ups (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  due_at timestamptz not null,
  reminder_text text not null,
  status text not null default 'pending' check (status in ('pending','done','snoozed','cancelled')),
  snoozed_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger follow_ups_updated_at
  before update on follow_ups
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────
-- NOTIFICATIONS
-- ─────────────────────────────────────────────
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete set null,
  follow_up_id uuid references follow_ups(id) on delete set null,
  channel text not null default 'in_app' check (channel in ('in_app','push')),
  title text not null,
  body text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────
create index if not exists idx_customers_sales_rep_id on customers(sales_rep_id);
create index if not exists idx_customers_lead_tag on customers(lead_tag);
create index if not exists idx_interactions_customer_id_created_at on interactions(customer_id, created_at desc);
create index if not exists idx_deals_customer_id on deals(customer_id);
create index if not exists idx_deals_stage on deals(stage);
create index if not exists idx_ai_insights_customer_id on ai_insights(customer_id);
create index if not exists idx_follow_ups_due_at_status on follow_ups(due_at, status);
create index if not exists idx_follow_ups_customer_id on follow_ups(customer_id);
create index if not exists idx_notifications_customer_id_created_at on notifications(customer_id, created_at desc);
create index if not exists idx_notifications_is_read on notifications(is_read);

-- ─────────────────────────────────────────────
-- DASHBOARD VIEW (fast KPI queries)
-- ─────────────────────────────────────────────
create or replace view dashboard_kpis as
select
  count(*)                                                      as total_customers,
  count(*) filter (where lead_tag = 'hot')                      as hot_leads,
  count(*) filter (where lead_tag = 'warm')                     as warm_leads,
  count(*) filter (where lead_tag = 'cold')                     as cold_leads,
  round(
    count(*) filter (where lead_tag = 'hot')::numeric
    / nullif(count(*), 0) * 100, 1
  )                                                             as hot_rate_pct
from customers;

create or replace view pipeline_summary as
select
  stage,
  count(*)                       as deal_count,
  sum(value)                     as total_value,
  round(avg(engagement_level),1) as avg_engagement
from deals
group by stage
order by array_position(array['lead','contacted','negotiation','closed'], stage);

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────────

-- profiles: users can read all profiles, but only update their own
alter table profiles enable row level security;
create policy "profiles_select" on profiles for select to authenticated using (true);
create policy "profiles_update_own" on profiles for update to authenticated using (auth.uid() = id);

-- customers: all authenticated users can read/write
alter table customers enable row level security;
create policy "customers_select" on customers for select to authenticated using (true);
create policy "customers_insert" on customers for insert to authenticated with check (true);
create policy "customers_update" on customers for update to authenticated using (true);
create policy "customers_delete" on customers for delete to authenticated using (true);

-- interactions
alter table interactions enable row level security;
create policy "interactions_select" on interactions for select to authenticated using (true);
create policy "interactions_insert" on interactions for insert to authenticated with check (true);
create policy "interactions_update" on interactions for update to authenticated using (true);
create policy "interactions_delete" on interactions for delete to authenticated using (true);

-- deals
alter table deals enable row level security;
create policy "deals_select" on deals for select to authenticated using (true);
create policy "deals_insert" on deals for insert to authenticated with check (true);
create policy "deals_update" on deals for update to authenticated using (true);
create policy "deals_delete" on deals for delete to authenticated using (true);

-- ai_insights
alter table ai_insights enable row level security;
create policy "ai_insights_select" on ai_insights for select to authenticated using (true);
create policy "ai_insights_insert" on ai_insights for insert to authenticated with check (true);
create policy "ai_insights_update" on ai_insights for update to authenticated using (true);
create policy "ai_insights_delete" on ai_insights for delete to authenticated using (true);

-- follow_ups
alter table follow_ups enable row level security;
create policy "follow_ups_select" on follow_ups for select to authenticated using (true);
create policy "follow_ups_insert" on follow_ups for insert to authenticated with check (true);
create policy "follow_ups_update" on follow_ups for update to authenticated using (true);
create policy "follow_ups_delete" on follow_ups for delete to authenticated using (true);

-- notifications
alter table notifications enable row level security;
create policy "notifications_select" on notifications for select to authenticated using (true);
create policy "notifications_insert" on notifications for insert to authenticated with check (true);
create policy "notifications_update" on notifications for update to authenticated using (true);
