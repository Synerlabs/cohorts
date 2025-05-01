DROP VIEW IF EXISTS public.group_members_view;

-- Apply the corrected view definition including group_id

CREATE OR REPLACE VIEW public.group_members_view
WITH (security_invoker=false)
AS
SELECT
    gu.id,
    gu.created_at,
    gu.is_active,
    gu.group_id, -- Ensure group_id is included
    u.id AS user_id,
    p.id AS profile_id,
    u.email,
    p.first_name,
    p.last_name,
    p.avatar_url,
    mi.member_id
FROM
    public.group_users gu
JOIN
    auth.users u ON gu.user_id = u.id
JOIN
    public.profiles p ON u.id = p.id
LEFT JOIN
    public.member_ids mi ON gu.id = mi.group_user_id;

-- Re-grant select permission just in case (usually not necessary for CREATE OR REPLACE)
GRANT SELECT ON TABLE public.group_members_view TO service_role;
