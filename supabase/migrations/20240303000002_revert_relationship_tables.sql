-- Drop views and functions that depend on relationship tables
DROP VIEW IF EXISTS public.organization_hierarchy;
DROP FUNCTION IF EXISTS public.get_organization_descendants;
DROP FUNCTION IF EXISTS public.check_organization_requirements;

-- Drop triggers
DROP TRIGGER IF EXISTS update_organization_relationships_timestamp ON public.organization_relationships;
DROP TRIGGER IF EXISTS update_relationship_types_timestamp ON public.relationship_types;

-- Drop foreign key constraints in requirements table if any exist
ALTER TABLE IF EXISTS public.organization_requirements
DROP CONSTRAINT IF EXISTS organization_requirements_required_parent_relationship_type_fkey;

-- Drop indexes
DROP INDEX IF EXISTS idx_org_relationships_source;
DROP INDEX IF EXISTS idx_org_relationships_target;
DROP INDEX IF EXISTS idx_org_relationships_type;
DROP INDEX IF EXISTS idx_relationship_types_code;

-- Drop tables
DROP TABLE IF EXISTS public.organization_relationships;
DROP TABLE IF EXISTS public.relationship_types;

-- Create updated check_organization_requirements function
CREATE FUNCTION public.check_organization_requirements(org_id uuid)
RETURNS jsonb AS $$
DECLARE
  requirements jsonb;
  result jsonb = '{"met": true, "details": []}'::jsonb;
BEGIN
  -- Get requirements for organization
  SELECT json_agg(r) INTO requirements
  FROM public.organization_requirements r
  WHERE r.organization_id = org_id AND r.is_active = true;
  
  -- If no requirements, return success
  IF requirements IS NULL THEN
    RETURN result;
  END IF;
  
  -- This function would need to be reimplemented to work with organization_membership
  -- For now, just return a placeholder acknowledging the change
  result = jsonb_set(result, '{met}', 'false'::jsonb);
  result = jsonb_set(result, '{details}', 
    json_build_array(
      json_build_object(
        'message', 'Requirements checking needs to be reimplemented for organization memberships',
        'type', 'system_change',
        'met', false
      )
    )::jsonb
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql; 