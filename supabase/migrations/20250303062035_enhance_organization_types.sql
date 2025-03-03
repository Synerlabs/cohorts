-- Migration for enhancing organization types and relationships

-- Create organization types table if it doesn't exist
CREATE TABLE IF NOT EXISTS "public"."organization_types" (
  "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
  "code" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "description" text,
  "metadata_schema" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY("id")
);

-- Add initial organization types
INSERT INTO "public"."organization_types" ("code", "name", "description", "metadata_schema")
VALUES 
  ('PARENT', 'Parent Organization', 'Top-level organization that can have child organizations', 
   '{
      "type": "object",
      "properties": {
        "foundation_year": {"type": "number", "title": "Foundation Year"},
        "headquarters": {"type": "string", "title": "Headquarters Location"},
        "taxonomy": {"type": "array", "title": "Category Taxonomy", "items": {"type": "string"}}
      },
      "required": ["foundation_year"]
    }'::jsonb),
  ('REGIONAL', 'Regional Chapter', 'Geographic-based organization that operates within a specific region', 
   '{
      "type": "object",
      "properties": {
        "region": {"type": "string", "title": "Region Name"},
        "coverage_area": {"type": "string", "title": "Geographic Coverage Area"},
        "founding_date": {"type": "string", "format": "date", "title": "Founding Date"}
      },
      "required": ["region", "coverage_area"]
    }'::jsonb),
  ('LOCAL', 'Local Chapter', 'Small local organization that operates in a specific city or locality', 
   '{
      "type": "object",
      "properties": {
        "city": {"type": "string", "title": "City"},
        "state_province": {"type": "string", "title": "State/Province"},
        "meeting_venue": {"type": "string", "title": "Regular Meeting Venue"}
      },
      "required": ["city", "state_province"]
    }'::jsonb),
  ('UNIVERSITY', 'University Chapter', 'Chapter based at an educational institution', 
   '{
      "type": "object",
      "properties": {
        "institution_name": {"type": "string", "title": "Institution Name"},
        "department": {"type": "string", "title": "Department"},
        "faculty_advisor": {"type": "string", "title": "Faculty Advisor Name"},
        "student_count": {"type": "number", "title": "Approximate Student Count"}
      },
      "required": ["institution_name"]
    }'::jsonb),
  ('INSTITUTION', 'Institutional Member', 'Organization that represents a corporate or institutional entity', 
   '{
      "type": "object",
      "properties": {
        "entity_type": {"type": "string", "enum": ["corporate", "nonprofit", "government", "educational"], "title": "Entity Type"},
        "industry": {"type": "string", "title": "Industry"},
        "employee_count": {"type": "number", "title": "Number of Employees"},
        "founded_year": {"type": "number", "title": "Year Founded"}
      },
      "required": ["entity_type", "industry"]
    }'::jsonb),
  ('INTEREST', 'Special Interest Group', 'Group focused on a specific interest area', 
   '{
      "type": "object",
      "properties": {
        "interest_area": {"type": "string", "title": "Interest Area"},
        "focus_description": {"type": "string", "title": "Focus Description"},
        "founding_purpose": {"type": "string", "title": "Founding Purpose"}
      },
      "required": ["interest_area"]
    }'::jsonb);

-- Add type_code to group table if it doesn't exist
ALTER TABLE "public"."group"
  ADD COLUMN IF NOT EXISTS "type_code" text REFERENCES "public"."organization_types"("code"),
  ADD COLUMN IF NOT EXISTS "metadata" jsonb DEFAULT '{}'::jsonb;

-- Create relationship types table
CREATE TABLE IF NOT EXISTS "public"."relationship_types" (
  "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
  "code" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "description" text,
  "metadata_schema" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY("id")
);

-- Add initial relationship types
INSERT INTO "public"."relationship_types" ("code", "name", "description", "metadata_schema")
VALUES 
  ('PARENT_CHILD', 'Parent-Child', 'Standard hierarchical relationship between a parent and child organization', 
   '{
      "type": "object",
      "properties": {
        "created_reason": {"type": "string", "title": "Reason for Creation"},
        "authorization_document": {"type": "string", "title": "Authorization Document URL"}
      }
    }'::jsonb),
  ('AFFILIATE', 'Affiliate', 'Non-hierarchical partnership between organizations', 
   '{
      "type": "object",
      "properties": {
        "partnership_type": {"type": "string", "enum": ["strategic", "operational", "resource-sharing"], "title": "Partnership Type"},
        "agreement_date": {"type": "string", "format": "date", "title": "Agreement Date"},
        "renewal_date": {"type": "string", "format": "date", "title": "Renewal Date"}
      }
    }'::jsonb),
  ('DIVISION', 'Division', 'Specialized division or department of an organization', 
   '{
      "type": "object",
      "properties": {
        "division_purpose": {"type": "string", "title": "Division Purpose"},
        "autonomy_level": {"type": "string", "enum": ["full", "partial", "minimal"], "title": "Autonomy Level"}
      }
    }'::jsonb),
  ('INSTITUTIONAL', 'Institutional Membership', 'Relationship where an institution is a member of an organization', 
   '{
      "type": "object",
      "properties": {
        "membership_level": {"type": "string", "title": "Membership Level"},
        "member_benefits": {"type": "array", "items": {"type": "string"}, "title": "Member Benefits"},
        "primary_contact": {"type": "string", "title": "Primary Contact Person"}
      }
    }'::jsonb);

-- Create organization relationships table
CREATE TABLE IF NOT EXISTS "public"."organization_relationships" (
  "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
  "parent_organization_id" uuid NOT NULL REFERENCES "public"."group"("id") ON DELETE CASCADE,
  "child_organization_id" uuid NOT NULL REFERENCES "public"."group"("id") ON DELETE CASCADE,
  "relationship_type" text NOT NULL REFERENCES "public"."relationship_types"("code"),
  "is_primary" boolean DEFAULT false NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY("id"),
  UNIQUE("parent_organization_id", "child_organization_id", "relationship_type")
);

-- Ensure we have a function to update timestamps
CREATE OR REPLACE FUNCTION "public"."update_timestamp"() 
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for timestamp updates
CREATE TRIGGER "update_organization_types_timestamp"
BEFORE UPDATE ON "public"."organization_types"
FOR EACH ROW
EXECUTE FUNCTION "public"."update_timestamp"();

CREATE TRIGGER "update_relationship_types_timestamp"
BEFORE UPDATE ON "public"."relationship_types"
FOR EACH ROW
EXECUTE FUNCTION "public"."update_timestamp"();

CREATE TRIGGER "update_organization_relationships_timestamp"
BEFORE UPDATE ON "public"."organization_relationships"
FOR EACH ROW
EXECUTE FUNCTION "public"."update_timestamp"();

-- Create a view for organization hierarchy
CREATE OR REPLACE VIEW "public"."organization_hierarchy" AS
WITH RECURSIVE hierarchy AS (
  -- Base case: all direct relationships
  SELECT 
    r.parent_organization_id,
    r.child_organization_id,
    r.relationship_type,
    r.is_primary,
    1 as depth,
    ARRAY[r.parent_organization_id, r.child_organization_id] as path
  FROM 
    "public"."organization_relationships" r
  
  UNION ALL
  
  -- Recursive case: join with relationships where parent matches the previous child
  SELECT 
    h.parent_organization_id,
    r.child_organization_id,
    r.relationship_type,
    r.is_primary,
    h.depth + 1,
    h.path || r.child_organization_id
  FROM 
    hierarchy h
  JOIN 
    "public"."organization_relationships" r ON h.child_organization_id = r.parent_organization_id
  WHERE 
    NOT r.child_organization_id = ANY(h.path) -- Prevent cycles
)
SELECT 
  h.parent_organization_id,
  h.child_organization_id,
  h.relationship_type,
  h.is_primary,
  h.depth,
  p.name as parent_name,
  p.type_code as parent_type,
  c.name as child_name,
  c.type_code as child_type
FROM 
  hierarchy h
JOIN 
  "public"."group" p ON h.parent_organization_id = p.id
JOIN 
  "public"."group" c ON h.child_organization_id = c.id;

-- Create a function to get all descendants of an organization
CREATE OR REPLACE FUNCTION "public"."get_organization_descendants"(org_id uuid)
RETURNS TABLE (
  organization_id uuid,
  name text,
  type_code text,
  depth int,
  path uuid[],
  is_primary boolean
) AS $$
WITH RECURSIVE descendants AS (
  -- Base case: direct children
  SELECT 
    r.child_organization_id as organization_id,
    g.name,
    g.type_code,
    1 as depth,
    ARRAY[org_id, r.child_organization_id] as path,
    r.is_primary
  FROM 
    "public"."organization_relationships" r
  JOIN
    "public"."group" g ON r.child_organization_id = g.id
  WHERE 
    r.parent_organization_id = org_id
  
  UNION ALL
  
  -- Recursive case: children of children
  SELECT 
    r.child_organization_id,
    g.name,
    g.type_code,
    d.depth + 1,
    d.path || r.child_organization_id,
    r.is_primary
  FROM 
    descendants d
  JOIN 
    "public"."organization_relationships" r ON d.organization_id = r.parent_organization_id
  JOIN
    "public"."group" g ON r.child_organization_id = g.id
  WHERE 
    NOT r.child_organization_id = ANY(d.path) -- Prevent cycles
)
SELECT * FROM descendants;
$$ LANGUAGE sql;
