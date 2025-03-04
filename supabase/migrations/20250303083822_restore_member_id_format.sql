-- Create membership_tier_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.membership_tier_settings (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    tier_id uuid NOT NULL REFERENCES public.membership_tiers(product_id) ON DELETE CASCADE,
    member_id_format text NOT NULL DEFAULT 'MEM-{YYYY}-{SEQ:3}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tier_id)
);

-- Add trigger for updating timestamp
CREATE TRIGGER update_membership_tier_settings_timestamp
BEFORE UPDATE ON public.membership_tier_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp();

-- Add comment to explain the format
COMMENT ON COLUMN public.membership_tier_settings.member_id_format IS 'Format string for generating member IDs. Supports tokens: {YYYY}, {YY}, {MM}, {M}, {DD}, {D}, {SEQ:n} where n is padding length';

-- Drop member_id_format from membership_tiers if it exists
ALTER TABLE public.membership_tiers 
DROP COLUMN IF EXISTS member_id_format; 