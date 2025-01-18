-- Drop existing tables and views that we'll be restructuring
drop view if exists applications_view;

-- Drop functions that depend on membership
drop function if exists approve_membership;

-- Drop tables in correct order
drop table if exists user_membership cascade;
drop table if exists membership cascade;
drop table if exists group_users cascade;
drop table if exists member_ids cascade;
drop table if exists memberships cascade;
drop table if exists applications cascade;

-- Create membership_tier table first (renamed from membership)
create table membership_tier (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid references "group"(id) on delete cascade not null,
  name text not null,
  description text,
  price numeric(10,2) not null,
  activation_type text check (activation_type in ('automatic', 'review_required', 'payment_required', 'review_then_payment')) default 'review_required' not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Create group_users table (base relationship between user and group)
create table group_users (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  group_id uuid references "group"(id) on delete cascade not null,
  is_active boolean default true not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  -- Ensure user can only be associated with a group once
  constraint group_users_unique_user_group unique (user_id, group_id)
);

-- Create member_ids table (unique identifier per group)
create table member_ids (
  id uuid primary key default uuid_generate_v4(),
  group_user_id uuid references group_users(id) on delete cascade not null,
  member_id text not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  -- Get group_id through group_users for the unique constraint
  constraint member_ids_unique_per_group unique (group_user_id, member_id)
);

-- Create memberships table (can have multiple per user)
create table memberships (
  id uuid primary key default uuid_generate_v4(),
  group_user_id uuid references group_users(id) on delete cascade not null,
  tier_id uuid references membership_tier(id) on delete restrict not null,
  start_date date not null,
  end_date date, -- null for lifetime memberships
  is_active boolean default true not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Create applications table
create table applications (
  id uuid primary key default uuid_generate_v4(),
  group_user_id uuid references group_users(id) on delete cascade not null,
  tier_id uuid references membership_tier(id) on delete restrict not null,
  status text check (status in ('pending', 'approved', 'rejected')) default 'pending' not null,
  approved_at timestamptz,
  rejected_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Create updated applications view
create or replace view applications_view as
select 
  a.id,
  gu.user_id,
  a.tier_id,
  gu.group_id,
  m.is_active,
  a.created_at,
  a.approved_at,
  a.rejected_at,
  jsonb_build_object(
    'id', u.id,
    'email', u.email,
    'full_name', concat_ws(' ', p.first_name, p.last_name)
  ) as user_data,
  jsonb_build_object(
    'id', mt.id,
    'name', mt.name,
    'price', mt.price,
    'activation_type', mt.activation_type
  ) as tier_data
from applications a
join group_users gu on a.group_user_id = gu.id
left join memberships m on a.group_user_id = m.group_user_id and a.tier_id = m.tier_id
join auth.users u on gu.user_id = u.id
join profiles p on u.id = p.id
join membership_tier mt on a.tier_id = mt.id;

-- Add RLS policies
alter table group_users enable row level security;
alter table member_ids enable row level security;
alter table memberships enable row level security;
alter table applications enable row level security;

-- Group users policies
create policy "Users can view their own group associations"
  on group_users for select
  using (auth.uid() = user_id);

create policy "Group admins can view all group users"
  on group_users for select
  using (
    exists (
      select 1 from user_roles ur
      join group_roles gr on ur.group_role_id = gr.id
      where ur.user_id = auth.uid()
      and gr.group_id = group_users.group_id
      and gr.role_name = 'admin'
      and ur.is_active = true
    )
  );

-- Member IDs policies (similar to group users)
create policy "Users can view their own member IDs"
  on member_ids for select
  using (
    exists (
      select 1 from group_users gu
      where gu.id = member_ids.group_user_id
      and gu.user_id = auth.uid()
    )
  );

create policy "Group admins can view all member IDs"
  on member_ids for select
  using (
    exists (
      select 1 from group_users gu
      join user_roles ur on ur.user_id = auth.uid()
      join group_roles gr on ur.group_role_id = gr.id
      where gu.id = member_ids.group_user_id
      and gr.group_id = gu.group_id
      and gr.role_name = 'admin'
      and ur.is_active = true
    )
  );

-- Memberships policies
create policy "Users can view their own memberships"
  on memberships for select
  using (
    exists (
      select 1 from group_users gu
      where gu.id = memberships.group_user_id
      and gu.user_id = auth.uid()
    )
  );

create policy "Group admins can view all memberships"
  on memberships for select
  using (
    exists (
      select 1 from group_users gu
      join user_roles ur on ur.user_id = auth.uid()
      join group_roles gr on ur.group_role_id = gr.id
      where gu.id = memberships.group_user_id
      and gr.group_id = gu.group_id
      and gr.role_name = 'admin'
      and ur.is_active = true
    )
  );

-- Applications policies
create policy "Users can view their own applications"
  on applications for select
  using (
    exists (
      select 1 from group_users gu
      where gu.id = applications.group_user_id
      and gu.user_id = auth.uid()
    )
  );

create policy "Group admins can view all applications"
  on applications for select
  using (
    exists (
      select 1 from group_users gu
      join user_roles ur on ur.user_id = auth.uid()
      join group_roles gr on ur.group_role_id = gr.id
      where gu.id = applications.group_user_id
      and gr.group_id = gu.group_id
      and gr.role_name = 'admin'
      and ur.is_active = true
    )
  );

-- Add triggers for updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger group_users_updated_at
  before update on group_users
  for each row
  execute function update_updated_at();

create trigger member_ids_updated_at
  before update on member_ids
  for each row
  execute function update_updated_at();

create trigger memberships_updated_at
  before update on memberships
  for each row
  execute function update_updated_at();

create trigger applications_updated_at
  before update on applications
  for each row
  execute function update_updated_at(); 