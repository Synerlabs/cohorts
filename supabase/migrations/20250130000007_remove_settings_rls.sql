-- Drop any existing RLS policies
DROP POLICY IF EXISTS "Allow read access to authenticated users" ON public.membership_tier_settings;
DROP POLICY IF EXISTS "Allow service role full access" ON public.membership_tier_settings;

-- Disable RLS on the table
ALTER TABLE public.membership_tier_settings DISABLE ROW LEVEL SECURITY; 