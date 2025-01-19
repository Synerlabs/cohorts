-- First disable RLS to reset policies
alter table "public"."group_users" disable row level security;

-- Drop existing policies
drop policy if exists "Users can view their own group memberships" on "public"."group_users";
drop policy if exists "Users can create their own inactive group membership" on "public"."group_users";
drop policy if exists "Users can update their own group membership" on "public"."group_users";
drop policy if exists "Group admins can manage group users" on "public"."group_users";
drop policy if exists "Service role can manage all group users" on "public"."group_users";

-- Re-enable RLS
alter table "public"."group_users" enable row level security;

-- Allow users to view their own group memberships
create policy "Users can view their own group memberships"
on "public"."group_users"
for select
to authenticated
using (auth.uid() = user_id);

-- Allow users to create their own inactive memberships
create policy "Users can create their own inactive group membership"
on "public"."group_users"
for insert
to authenticated
with check (
  auth.uid() = user_id 
  and coalesce(is_active, false) = false
);

-- Allow users to update their own memberships (but not activate them)
create policy "Users can update their own group membership"
on "public"."group_users"
for update
to authenticated
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id 
  and (
    case 
      when is_active = true then false  -- Prevent self-activation
      else true
    end
  )
);

-- Allow admins with proper permission to manage all group users
create policy "Group admins can manage group users"
on "public"."group_users"
for all
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    join public.group_roles gr on gr.id = ur.group_role_id
    join public.role_permissions rp on rp.role_id = gr.id
    where ur.user_id = auth.uid()
    and rp.permission = 'group.members.approve'
    and gr.group_id = group_users.group_id
    and ur.is_active = true
  )
);

-- Allow service role full access
create policy "Service role can manage all group users"
on "public"."group_users"
for all
to service_role
using (true)
with check (true);
