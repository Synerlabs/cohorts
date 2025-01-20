-- First drop any existing views or functions that might depend on the price column
DROP VIEW IF EXISTS membership_tier_view CASCADE;

-- Step 1: Add new columns
ALTER TABLE "public"."membership_tier"
  ADD COLUMN "currency" text NOT NULL DEFAULT 'USD',
  ADD COLUMN "price_new" bigint NOT NULL DEFAULT 0;

-- Step 2: Copy and convert data
UPDATE "public"."membership_tier"
SET "price_new" = ("price" * 100)::bigint;

-- Step 3: Add constraints
ALTER TABLE "public"."membership_tier"
  ADD CONSTRAINT "membership_tier_currency_check" 
  CHECK (currency = ANY (ARRAY['USD'::text, 'EUR'::text, 'GBP'::text, 'CAD'::text, 'AUD'::text])),
  ADD CONSTRAINT "membership_tier_price_new_check"
  CHECK (price_new >= 0);

-- Step 4: Update any existing views to use price_new
CREATE OR REPLACE VIEW membership_tier_view AS
SELECT 
  id,
  name,
  description,
  price_new as price,
  currency,
  duration_months,
  activation_type,
  created_at,
  group_id
FROM "public"."membership_tier";

-- Step 5: Drop the old column
ALTER TABLE "public"."membership_tier" DROP COLUMN IF EXISTS "price" CASCADE;

-- Step 6: Rename the new column
ALTER TABLE "public"."membership_tier" RENAME COLUMN "price_new" TO "price";

-- Step 7: Add comments
COMMENT ON COLUMN "public"."membership_tier"."price" IS 'Price in cents';
COMMENT ON COLUMN "public"."membership_tier"."currency" IS 'ISO 4217 currency code'; 