-- Drop existing check constraint
ALTER TABLE "public"."orders" DROP CONSTRAINT IF EXISTS "orders_status_check";

-- Add new check constraint with 'paid' status
ALTER TABLE "public"."orders" ADD CONSTRAINT "orders_status_check" 
  CHECK (status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text, 'cancelled'::text, 'paid'::text]));

-- Down migration
/*
ALTER TABLE "public"."orders" DROP CONSTRAINT IF EXISTS "orders_status_check";

ALTER TABLE "public"."orders" ADD CONSTRAINT "orders_status_check" 
  CHECK (status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text, 'cancelled'::text]));
*/

