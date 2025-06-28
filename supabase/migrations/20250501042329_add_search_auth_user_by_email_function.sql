-- Function to safely search auth.users by email
-- Returns the user UUID or NULL if not found
CREATE OR REPLACE FUNCTION public.search_auth_user_by_email(email_param text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
-- Set a secure search path: Schema name first, then pg_temp
-- Ensures the function operates on the intended `auth.users` table
SET search_path = auth, pg_temp
AS $$
  SELECT id FROM users WHERE lower(email) = lower(email_param) LIMIT 1;
$$;

-- Optional: Grant execute permission to relevant roles if necessary
-- Adjust roles (e.g., authenticated, service_role) as per your security model
-- GRANT EXECUTE ON FUNCTION public.search_auth_user_by_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_auth_user_by_email(text) TO service_role;
-- Grant to postgres role as well if needed for local development/testing
GRANT EXECUTE ON FUNCTION public.search_auth_user_by_email(text) TO postgres;
