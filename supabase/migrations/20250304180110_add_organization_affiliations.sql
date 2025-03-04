-- Create enum type for organization relationship types
CREATE TYPE "public"."organization_relationship_type" AS ENUM (
  'affiliate',
  'chapter',
  'regional',
  'student',
  'industry',
  'partner',
  'custom'
);

-- Create organization_tiers table
CREATE TABLE IF NOT EXISTS "public"."organization_tiers" (
  "product_id" uuid PRIMARY KEY REFERENCES "public"."products"(id) ON DELETE CASCADE,
  "duration_months" integer NOT NULL DEFAULT 12,
  "relationship_type" text NOT NULL, -- Text type for flexibility
  "activation_type" text NOT NULL DEFAULT 'automatic',
  "form_template_id" uuid REFERENCES "public"."form_templates"(id),
  "hierarchy_constraints" jsonb DEFAULT NULL,
  "host_group_id" uuid NOT NULL REFERENCES "public"."group"(id) ON DELETE CASCADE,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

-- Update the application type enum to include organization type
DO $$
BEGIN
  ALTER TYPE "public"."application_type" ADD VALUE IF NOT EXISTS 'organization' AFTER 'membership';
  EXCEPTION WHEN OTHERS THEN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'application_type') THEN
    CREATE TYPE "public"."application_type" AS ENUM ('membership', 'organization');
  END IF;
END$$;

-- Add host_group_id column to applications table for organization applications
ALTER TABLE "public"."applications" ADD COLUMN IF NOT EXISTS "host_group_id" uuid REFERENCES "public"."group"(id);
CREATE INDEX IF NOT EXISTS "idx_applications_host_group_id" ON "public"."applications"("host_group_id");

-- Create organization_affiliations table
CREATE TABLE IF NOT EXISTS "public"."organization_affiliations" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "group_id" uuid NOT NULL REFERENCES "public"."group"(id) ON DELETE CASCADE,
  "host_group_id" uuid NOT NULL REFERENCES "public"."group"(id) ON DELETE CASCADE,
  "tier_id" uuid NOT NULL REFERENCES "public"."products"(id) ON DELETE CASCADE,
  "start_date" date,
  "end_date" date,
  "status" text NOT NULL DEFAULT 'active',
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "organization_affiliations_status_check" CHECK (status IN ('active', 'expired', 'cancelled', 'suspended'))
);

-- Create organization_relationships table to track hierarchy
CREATE TABLE IF NOT EXISTS "public"."organization_relationships" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "parent_group_id" uuid NOT NULL REFERENCES "public"."group"(id) ON DELETE CASCADE,
  "child_group_id" uuid NOT NULL REFERENCES "public"."group"(id) ON DELETE CASCADE,
  "relationship_type" text NOT NULL, -- Text type for flexibility
  "created_at" timestamptz DEFAULT now() NOT NULL,
  UNIQUE(parent_group_id, child_group_id) -- Each child can only have one relationship per parent
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_organization_tiers_host_group_id" ON "public"."organization_tiers"(host_group_id);
CREATE INDEX IF NOT EXISTS "idx_organization_affiliations_group_id" ON "public"."organization_affiliations"(group_id);
CREATE INDEX IF NOT EXISTS "idx_organization_affiliations_host_group_id" ON "public"."organization_affiliations"(host_group_id);
CREATE INDEX IF NOT EXISTS "idx_organization_affiliations_tier_id" ON "public"."organization_affiliations"(tier_id);
CREATE INDEX IF NOT EXISTS "idx_organization_affiliations_status" ON "public"."organization_affiliations"(status);
CREATE INDEX IF NOT EXISTS "idx_organization_relationships_parent_group_id" ON "public"."organization_relationships"(parent_group_id);
CREATE INDEX IF NOT EXISTS "idx_organization_relationships_child_group_id" ON "public"."organization_relationships"(child_group_id);
CREATE INDEX IF NOT EXISTS "idx_organization_relationships_relationship_type" ON "public"."organization_relationships"(relationship_type);

-- Create product_type enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_type') THEN
        CREATE TYPE "public"."product_type" AS ENUM ('membership_tier', 'organization_tier');
    ELSE
        -- Add organization_tier type to products
        ALTER TYPE "public"."product_type" ADD VALUE IF NOT EXISTS 'organization_tier';
    END IF;
END$$;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_organization_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER update_organization_tiers_updated_at
BEFORE UPDATE ON "public"."organization_tiers"
FOR EACH ROW EXECUTE FUNCTION update_organization_updated_at();

CREATE TRIGGER update_organization_affiliations_updated_at
BEFORE UPDATE ON "public"."organization_affiliations"
FOR EACH ROW EXECUTE FUNCTION update_organization_updated_at();

-- Drop the existing membership_applications_view before recreating it
DROP VIEW IF EXISTS "public"."membership_applications_view";

-- Update the membership_applications_view to handle organization applications
CREATE VIEW "public"."membership_applications_view" AS
SELECT
  a.id as application_id,
  a.status,
  a.group_user_id,
  a.tier_id as product_id,
  a.order_id,
  a.approved_at,
  a.rejected_at,
  a.created_at as submitted_at,
  a.updated_at,
  a.type,
  a.form_data,
  a.host_group_id,
  gu.group_id,
  g.name as group_name,
  g.slug as group_slug,
  gu.user_id,
  row_to_json(p.*) as user_data,
  prod.name as product_name,
  prod.price as product_price,
  prod.currency as product_currency,
  CASE
    WHEN a.type = 'membership' THEN mt.duration_months
    WHEN a.type = 'organization' THEN ot.duration_months
    ELSE NULL
  END as duration_months,
  CASE
    WHEN a.type = 'membership' THEN mt.activation_type
    WHEN a.type = 'organization' THEN ot.activation_type
    ELSE NULL
  END as activation_type,
  CASE
    WHEN a.type = 'membership' THEN mt.form_template_id
    WHEN a.type = 'organization' THEN ot.form_template_id
    ELSE NULL
  END as form_template_id,
  o.status as order_status,
  o.amount,
  o.currency,
  p2.created_at as payment_completed_at
FROM
  applications a
LEFT JOIN group_users gu ON a.group_user_id = gu.id
LEFT JOIN "group" g ON gu.group_id = g.id
LEFT JOIN "group" hg ON a.host_group_id = hg.id
LEFT JOIN profiles p ON gu.user_id = p.id
LEFT JOIN products prod ON a.tier_id = prod.id
LEFT JOIN membership_tiers mt ON (a.tier_id = mt.product_id AND a.type = 'membership')
LEFT JOIN organization_tiers ot ON (a.tier_id = ot.product_id AND a.type = 'organization')
LEFT JOIN orders o ON a.order_id = o.id
LEFT JOIN payments p2 ON o.id = p2.order_id;
