-- Add RLS policies for user_membership table
create policy "Users can create their own memberships"
on "public"."user_membership"
as permissive
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can view their own memberships"
on "public"."user_membership"
as permissive
for select
to authenticated
using (auth.uid() = user_id);

create policy "Group admins can manage all memberships"
on "public"."user_membership"
as permissive
for all
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    join public.group_roles gr on gr.id = ur.group_role_id
    join public.role_permissions rp on rp.role_id = gr.id
    where ur.user_id = auth.uid()
    and rp.permission = 'group.members.approve'
    and gr.group_id = user_membership.group_id
  )
); 