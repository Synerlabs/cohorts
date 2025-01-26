-- Drop the existing foreign key constraint if it exists
ALTER TABLE "public"."applications"
    DROP CONSTRAINT IF EXISTS "applications_tier_id_fkey";

-- Add the new foreign key constraint referencing products table
ALTER TABLE "public"."applications"
    ADD CONSTRAINT "applications_tier_id_fkey" 
    FOREIGN KEY ("tier_id") 
    REFERENCES "public"."products"(id)
    ON DELETE CASCADE;

