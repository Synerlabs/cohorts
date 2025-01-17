-- Temporarily disable RLS to debug
alter table "public"."user_membership" disable row level security;

-- Re-enable RLS with simpler policies
alter table "public"."user_membership" enable row level security;

-- Drop existing policies
drop policy if exists "Users can create their own memberships" on "public"."user_membership";
drop policy if exists "Users can view their own memberships" on "public"."user_membership";
drop policy if exists "Group admins can manage all memberships" on "public"."user_membership";
drop policy if exists "Service role can manage all memberships" on "public"."user_membership";

-- Add simplified policies
create policy "Enable read access for all users"
on "public"."user_membership"
for select
to authenticated
using (true);

create policy "Enable write access for authenticated users"
on "public"."user_membership"
for all
to authenticated
using (true)
with check (true); 