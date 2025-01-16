create or replace view "public"."applications_view" as
  select 
    um.id,
    um.user_id,
    um.membership_id,
    um.group_id,
    um.is_active,
    um.created_at,
    um.approved_at,
    jsonb_build_object(
      'id', p.id,
      'first_name', p.first_name,
      'last_name', p.last_name,
      'email', u.email
    ) as user_data,
    jsonb_build_object(
      'id', m.id,
      'name', m.name,
      'price', m.price,
      'activation_type', m.activation_type
    ) as membership_data
  from "public"."user_membership" um
  inner join "public"."profiles" p on p.id = um.user_id
  inner join "auth"."users" u on u.id = p.id
  inner join "public"."membership" m on m.id = um.membership_id;

grant select on "public"."applications_view" to "anon";
grant select on "public"."applications_view" to "authenticated";
grant select on "public"."applications_view" to "service_role"; 