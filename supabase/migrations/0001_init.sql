-- ============================================================================
-- NEXUS AI — Initial schema
-- Execute in Supabase SQL Editor (or via supabase db push)
-- ============================================================================

create extension if not exists "uuid-ossp";

-- ----------------------------------------------------------------------------
-- business_profiles
-- ----------------------------------------------------------------------------
create table if not exists business_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users,
  name text,
  url text,
  industry text,
  external_report jsonb,
  future_proof_score int,
  created_at timestamp default now()
);

-- ----------------------------------------------------------------------------
-- internal_data — The Vault
-- ----------------------------------------------------------------------------
create table if not exists internal_data (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references business_profiles,
  type text check (type in ('sales','inventory','suppliers','contracts')),
  data jsonb,
  uploaded_at timestamp default now()
);

-- ----------------------------------------------------------------------------
-- risk_alerts — Realtime feed
-- ----------------------------------------------------------------------------
create table if not exists risk_alerts (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid,
  title text,
  severity text check (severity in ('Critical','High','Medium','Low')),
  impact_score int,
  recommendation jsonb,
  created_at timestamp default now()
);

-- ----------------------------------------------------------------------------
-- simulations — Scenario Simulator
-- ----------------------------------------------------------------------------
create table if not exists simulations (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid,
  scenario text,
  before_metrics jsonb,
  after_metrics jsonb,
  ai_plan jsonb,
  created_at timestamp default now()
);

-- ----------------------------------------------------------------------------
-- Realtime
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and tablename = 'risk_alerts'
  ) then
    execute 'alter publication supabase_realtime add table risk_alerts';
  end if;
end $$;
