# Database Schema

## Core Tables

### organizations
```sql
create table organizations (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  name text not null,
  description text,
  logo_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  settings jsonb default '{}'::jsonb
);
```

### members
```sql
create table members (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references organizations(id),
  user_id uuid references auth.users(id),
  status text not null,
  role text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  metadata jsonb default '{}'::jsonb
);
```

### membership_plans
```sql
create table membership_plans (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references organizations(id),
  name text not null,
  description text,
  amount numeric not null,
  currency text not null,
  interval text not null,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  metadata jsonb default '{}'::jsonb
);
```

### payments
```sql
create table payments (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references organizations(id),
  member_id uuid references members(id),
  plan_id uuid references membership_plans(id),
  amount numeric not null,
  currency text not null,
  status text not null,
  provider text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  metadata jsonb default '{}'::jsonb
);
```

### stripe_connected_accounts
```sql
create table stripe_connected_accounts (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references organizations(id),
  account_id text unique not null,
  is_active boolean default false,
  charges_enabled boolean default false,
  payouts_enabled boolean default false,
  requirements_status jsonb default '{}'::jsonb,
  capabilities_status jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

## Row Level Security (RLS) Policies

### organizations
```sql
-- Allow public read access to basic org info
create policy "Public read access"
  on organizations for select
  using (true);

-- Allow org admins to update their org
create policy "Admins can update org"
  on organizations for update
  using (
    auth.uid() in (
      select user_id 
      from members 
      where org_id = organizations.id 
      and role = 'admin'
    )
  );
```

### members
```sql
-- Allow org admins to manage members
create policy "Admins can manage members"
  on members for all
  using (
    auth.uid() in (
      select user_id 
      from members 
      where org_id = members.org_id 
      and role = 'admin'
    )
  );

-- Allow members to view other members in their org
create policy "Members can view other members"
  on members for select
  using (
    auth.uid() in (
      select user_id 
      from members 
      where org_id = members.org_id
    )
  );
```

## Database Functions

### update_updated_at()
```sql
create function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply to all tables
create trigger update_organizations_updated_at
  before update on organizations
  for each row execute procedure update_updated_at();

-- Repeat for other tables
```

## Indexes

```sql
-- Organizations
create index idx_organizations_slug on organizations(slug);

-- Members
create index idx_members_org_user on members(org_id, user_id);
create index idx_members_status on members(status);

-- Membership Plans
create index idx_membership_plans_org on membership_plans(org_id);
create index idx_membership_plans_active on membership_plans(active);

-- Payments
create index idx_payments_org on payments(org_id);
create index idx_payments_member on payments(member_id);
create index idx_payments_status on payments(status);
``` 