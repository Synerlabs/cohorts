DROP VIEW IF EXISTS public.group_members_view;

CREATE OR REPLACE VIEW public.group_members_view
WITH (security_invoker=false)
AS
SELECT
    gu.id,
    gu.created_at,
    gu.is_active,
    gu.is_deleted,
    gu.group_id, 
    u.id AS user_id,
    p.id AS profile_id,
    u.email,
    p.first_name,
    p.last_name,
    p.avatar_url,
    mi.member_id,
    mi.id AS member_ids_record_id
FROM
    public.group_users gu
JOIN
    auth.users u ON gu.user_id = u.id
JOIN
    public.profiles p ON u.id = p.id
LEFT JOIN
    public.member_ids mi ON gu.id = mi.group_user_id;

GRANT SELECT ON TABLE public.group_members_view TO service_role; 