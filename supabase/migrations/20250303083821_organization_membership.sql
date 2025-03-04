-- Extend membership tiers to support organization memberships
ALTER TABLE public.membership_tiers
ADD COLUMN IF NOT EXISTS target_type text NOT NULL DEFAULT 'USER' 
CHECK (target_type IN ('USER', 'ORGANIZATION'));

-- Create organization memberships table
CREATE TABLE IF NOT EXISTS public.organization_membership (
  id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
  host_organization_id uuid NOT NULL REFERENCES public.group(id) ON DELETE CASCADE,
  member_organization_id uuid NOT NULL REFERENCES public.group(id) ON DELETE CASCADE,
  membership_tier_id uuid NOT NULL REFERENCES public.membership_tiers(product_id),
  status text NOT NULL DEFAULT 'PENDING',
  is_active boolean NOT NULL DEFAULT false,
  starts_at timestamp with time zone DEFAULT now() NOT NULL,
  expires_at timestamp with time zone,
  approved_at timestamp with time zone,
  approved_by uuid REFERENCES auth.users(id),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(host_organization_id, member_organization_id, membership_tier_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_org_membership_host ON public.organization_membership (host_organization_id);
CREATE INDEX IF NOT EXISTS idx_org_membership_member ON public.organization_membership (member_organization_id);
CREATE INDEX IF NOT EXISTS idx_org_membership_tier ON public.organization_membership (membership_tier_id);

-- Add trigger for updating timestamp
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_organization_membership_timestamp
BEFORE UPDATE ON public.organization_membership
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp();

-- Create view for organization memberships
CREATE OR REPLACE VIEW public.organization_membership_view AS
SELECT 
  om.id,
  om.host_organization_id,
  host.name AS host_organization_name,
  host.slug AS host_organization_slug,
  om.member_organization_id,
  member.name AS member_organization_name,
  member.slug AS member_organization_slug,
  mt.product_id AS membership_tier_id,
  p.name AS membership_tier_name,
  om.status,
  om.is_active,
  om.starts_at,
  om.expires_at,
  om.approved_at,
  om.created_at
FROM 
  public.organization_membership om
JOIN
  public.group host ON om.host_organization_id = host.id
JOIN
  public.group member ON om.member_organization_id = member.id
JOIN
  public.membership_tiers mt ON om.membership_tier_id = mt.product_id
JOIN
  public.products p ON mt.product_id = p.id;


