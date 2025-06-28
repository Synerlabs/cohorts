-- Drop view if it exists (optional, good for idempotency)
DROP VIEW IF EXISTS public.group_members_view;

-- Create the view joining group_users, auth.users, and profiles
CREATE VIEW public.group_members_view WITH (security_invoker=true) AS
SELECT
    gu.id AS group_user_id,         -- ID from group_users
    gu.group_id,
    gu.user_id,
    gu.is_active,
    gu.created_at AS joined_at,     -- Rename for clarity?
    au.email,                       -- Email from auth.users
    p.first_name,                   -- First name from profiles
    p.last_name,                    -- Last name from profiles
    p.avatar_url                    -- Avatar URL from profiles
FROM
    public.group_users gu
LEFT JOIN
    auth.users au ON gu.user_id = au.id
LEFT JOIN
    public.profiles p ON gu.user_id = p.id;

-- Optional: Grant select permissions on the view
-- Adjust roles as needed
GRANT SELECT ON public.group_members_view TO authenticated;
GRANT SELECT ON public.group_members_view TO service_role;
GRANT SELECT ON public.group_members_view TO postgres;
