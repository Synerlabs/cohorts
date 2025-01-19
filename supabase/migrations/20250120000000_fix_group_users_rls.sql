-- First disable RLS to reset policies
alter table "public"."group_users" disable row level security;

-- Drop existing policies
drop policy if exists "Users can view their own group associations" on "public"."group_users";
drop policy if exists "Group admins can view all group users" on "public"."group_users";
drop policy if exists "Users can insert their own group associations" on "public"."group_users";
drop policy if exists "Service role can manage all group users" on "public"."group_users";
drop policy if exists "Group admins can manage all group users" on "public"."group_users";

-- Re-enable RLS
alter table "public"."group_users" enable row level security;

-- Allow users to insert their own group associations
create policy "Users can insert their own group associations"
  on "public"."group_users"
  for insert
  to authenticated
  with check (user_id::text = auth.uid()::text);

-- Allow users to view their own group associations
create policy "Users can view their own group associations"
  on "public"."group_users"
  for select
  to authenticated
  using (user_id::text = auth.uid()::text);

-- Allow group admins to manage all group users
create policy "Group admins can manage all group users"
  on "public"."group_users"
  as permissive
  for all
  to authenticated
  using (
    exists (
      select 1 from user_roles ur
      join group_roles gr on ur.group_role_id = gr.id
      where ur.user_id::text = auth.uid()::text
      and gr.group_id = group_users.group_id
      and gr.role_name = 'admin'
      and ur.is_active = true
    )
  );

-- Allow service role to manage all group users
create policy "Service role can manage all group users"
  on "public"."group_users"
  as permissive
  for all
  to service_role
  using (true)
  with check (true); 