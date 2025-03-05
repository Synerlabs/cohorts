-- Add 'type' column to membership_tiers table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'membership_tiers' 
        AND column_name = 'type'
    ) THEN
        ALTER TABLE public.membership_tiers
        ADD COLUMN "type" text NOT NULL DEFAULT 'membership';
        
        -- Add check constraint to ensure 'type' can only be 'membership' or 'organization'
        ALTER TABLE public.membership_tiers
        ADD CONSTRAINT membership_tiers_type_check 
        CHECK ("type" = ANY (ARRAY['membership'::text, 'organization'::text]));
        
        -- Add comment explaining the purpose of the column
        COMMENT ON COLUMN public.membership_tiers.type IS 'Specifies the type of membership tier - either a regular membership or an organization';
    END IF;
END
$$;
