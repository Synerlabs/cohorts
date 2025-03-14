-- Create the set_updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the group_organization table to represent relationships between groups
CREATE TABLE IF NOT EXISTS public.group_organization (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_group_id UUID NOT NULL REFERENCES public.group(id) ON DELETE CASCADE,
    child_group_id UUID NOT NULL REFERENCES public.group(id) ON DELETE CASCADE,
    tier_id UUID NOT NULL REFERENCES public.membership_tiers(product_id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_parent_child_tier UNIQUE (parent_group_id, child_group_id, tier_id)
);

-- Add a comment to the table
COMMENT ON TABLE public.group_organization IS 'Represents the relationship between organizations (parent groups) and their member organizations (child groups)';

-- Create a trigger to update the updated_at column
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.group_organization
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();
