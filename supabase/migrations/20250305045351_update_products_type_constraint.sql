-- Update the products_type_check constraint to include 'organization' type
ALTER TABLE "public"."products" DROP CONSTRAINT IF EXISTS "products_type_check";

-- Add the constraint back with organization included
ALTER TABLE "public"."products" ADD CONSTRAINT "products_type_check" 
  CHECK (("type" = ANY (ARRAY['membership_tier'::"text", 'subscription'::"text", 'one_time'::"text", 'organization'::"text"])));

-- Add organization type to the product 
ALTER TABLE "public"."products" ALTER COLUMN "type" SET DEFAULT 'membership_tier';

-- Comment out the problematic update since organization_tiers doesn't exist
-- For all existing organization tiers, update the product type to 'organization'
-- UPDATE "public"."products" AS p
-- SET "type" = 'organization'
-- FROM "public"."organization_tiers" AS ot
-- WHERE p.id = ot.product_id;

