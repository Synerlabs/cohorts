-- Drop existing view
drop view if exists "public"."applications_view";

-- Create updated view
create view "public"."applications_view" as
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
    'activation_type', mt.activation_type,
    'duration_months', mt.duration_months
  ) as tier_data,
  jsonb_build_object(
    'id', mt.id,
    'name', mt.name,
    'price', mt.price,
    'activation_type', mt.activation_type,
    'duration_months', mt.duration_months
  ) as membership_data
from applications a
join group_users gu on a.group_user_id = gu.id
left join memberships m on a.group_user_id = m.group_user_id and a.tier_id = m.tier_id
join auth.users u on gu.user_id = u.id
join profiles p on u.id = p.id
join membership_tier mt on a.tier_id = mt.id;

grant select on "public"."applications_view" to "anon";
grant select on "public"."applications_view" to "authenticated";
grant select on "public"."applications_view" to "service_role"; 