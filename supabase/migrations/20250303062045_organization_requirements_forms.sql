-- Migration for organization requirements and forms

-- Create organization requirements table
CREATE TABLE IF NOT EXISTS "public"."organization_requirements" (
  "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "public"."group"("id") ON DELETE CASCADE,
  "type" text NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "required_form_id" uuid,
  "required_membership_tier_id" uuid,
  "required_children_count" integer,
  "required_parent_relationship_type" text,
  "requirement_order" integer NOT NULL DEFAULT 10,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY("id")
);

-- Create forms table
CREATE TABLE IF NOT EXISTS "public"."organization_forms" (
  "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "public"."group"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "description" text,
  "form_schema" jsonb NOT NULL,
  "form_ui_schema" jsonb DEFAULT '{}'::jsonb,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY("id")
);

-- Create form submissions table
CREATE TABLE IF NOT EXISTS "public"."form_submissions" (
  "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
  "form_id" uuid NOT NULL REFERENCES "public"."organization_forms"("id") ON DELETE CASCADE,
  "submitter_id" uuid NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
  "reviewer_id" uuid REFERENCES "auth"."users"("id"),
  "form_data" jsonb NOT NULL,
  "status" text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  "review_notes" text,
  "submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
  "reviewed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY("id")
);

-- Add foreign key constraint for required_form_id in organization_requirements
ALTER TABLE "public"."organization_requirements"
  ADD CONSTRAINT "organization_requirements_required_form_id_fkey"
  FOREIGN KEY ("required_form_id")
  REFERENCES "public"."organization_forms"("id")
  ON DELETE SET NULL;

-- Add foreign key constraint for required_membership_tier_id in organization_requirements
ALTER TABLE "public"."organization_requirements"
  ADD CONSTRAINT "organization_requirements_required_membership_tier_id_fkey"
  FOREIGN KEY ("required_membership_tier_id")
  REFERENCES "public"."membership_tiers"("product_id")
  ON DELETE SET NULL;

-- Add foreign key constraint for required_parent_relationship_type in organization_requirements
ALTER TABLE "public"."organization_requirements"
  ADD CONSTRAINT "organization_requirements_required_parent_relationship_type_fkey"
  FOREIGN KEY ("required_parent_relationship_type")
  REFERENCES "public"."relationship_types"("code")
  ON DELETE SET NULL;

-- Create function to update requirement orders in a single transaction
CREATE OR REPLACE FUNCTION "public"."update_requirement_orders"(updates_json jsonb)
RETURNS void AS $$
DECLARE
  item jsonb;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(updates_json)
  LOOP
    UPDATE "public"."organization_requirements"
    SET "requirement_order" = (item->>'requirement_order')::integer
    WHERE "id" = (item->>'id')::uuid;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create function to check if an organization meets all requirements
CREATE OR REPLACE FUNCTION "public"."check_organization_requirements"(org_id uuid)
RETURNS TABLE (
  requirement_id uuid,
  title text,
  is_met boolean,
  message text
) AS $$
DECLARE
  req record;
  is_met boolean;
  message text;
BEGIN
  FOR req IN
    SELECT * FROM "public"."organization_requirements"
    WHERE "organization_id" = org_id AND "is_active" = true
    ORDER BY "requirement_order"
  LOOP
    -- Initialize as not met
    is_met := false;
    message := 'Requirement not met';
    
    -- Check based on requirement type
    CASE req.type
      WHEN 'FORM' THEN
        -- Check if the form has been submitted and approved
        SELECT EXISTS (
          SELECT 1 FROM "public"."form_submissions" fs
          WHERE fs.form_id = req.required_form_id
          AND fs.status = 'APPROVED'
        ) INTO is_met;
        
        IF is_met THEN
          message := 'Form requirement met';
        ELSE
          message := 'Required form must be submitted and approved';
        END IF;
        
      WHEN 'MEMBERSHIP_TIER' THEN
        -- Check if the required membership tier exists
        SELECT EXISTS (
          SELECT 1 FROM "public"."membership" m
          WHERE m.id = req.required_membership_tier_id
          AND m.group_id = org_id
          AND m.is_active = true
        ) INTO is_met;
        
        IF is_met THEN
          message := 'Membership tier requirement met';
        ELSE
          message := 'Required membership tier must be active';
        END IF;
        
      WHEN 'CHILDREN_COUNT' THEN
        -- Check if the organization has the required number of child organizations
        SELECT (
          SELECT count(*) FROM "public"."organization_relationships"
          WHERE parent_organization_id = org_id
        ) >= req.required_children_count INTO is_met;
        
        IF is_met THEN
          message := 'Child organization count requirement met';
        ELSE
          message := 'Organization must have at least ' || req.required_children_count || ' child organizations';
        END IF;
        
      WHEN 'PARENT_RELATIONSHIP' THEN
        -- Check if the organization has the required relationship with a parent
        SELECT EXISTS (
          SELECT 1 FROM "public"."organization_relationships"
          WHERE child_organization_id = org_id
          AND relationship_type = req.required_parent_relationship_type
        ) INTO is_met;
        
        IF is_met THEN
          message := 'Parent relationship requirement met';
        ELSE
          message := 'Organization must have a parent with relationship type: ' || req.required_parent_relationship_type;
        END IF;
        
      ELSE
        -- Unknown requirement type
        is_met := false;
        message := 'Unknown requirement type: ' || req.type;
    END CASE;
    
    -- Return the result for this requirement
    requirement_id := req.id;
    title := req.title;
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER "update_organization_requirements_timestamp"
BEFORE UPDATE ON "public"."organization_requirements"
FOR EACH ROW
EXECUTE FUNCTION "public"."update_timestamp"();

CREATE TRIGGER "update_organization_forms_timestamp"
BEFORE UPDATE ON "public"."organization_forms"
FOR EACH ROW
EXECUTE FUNCTION "public"."update_timestamp"();

CREATE TRIGGER "update_form_submissions_timestamp"
BEFORE UPDATE ON "public"."form_submissions"
FOR EACH ROW
EXECUTE FUNCTION "public"."update_timestamp"();
