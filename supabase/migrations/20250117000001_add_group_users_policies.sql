-- Enable RLS
alter table "public"."group_users" enable row level security;

-- Drop existing policies if any
drop policy if exists "Users can view their own group memberships" on "public"."group_users";
drop policy if exists "Users can join groups" on "public"."group_users";
drop policy if exists "Group admins can manage group users" on "public"."group_users";
drop policy if exists "Service role can manage all group users" on "public"."group_users";

-- Add policies
create policy "Users can view their own group memberships"
on "public"."group_users"
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can create their own inactive group membership"
on "public"."group_users"
for insert
to authenticated
with check (
  auth.uid() = user_id 
  and (is_active = false or is_active is null)
);

create policy "Users can update their own group membership"
on "public"."group_users"
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

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

create policy "Service role can manage all group users"
on "public"."group_users"
for all
to service_role
using (true)
with check (true); 