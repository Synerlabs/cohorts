-- Drop existing check constraint
ALTER TABLE "public"."applications" DROP CONSTRAINT IF EXISTS "applications_status_check";

-- Add new check constraint with pending_payment status
ALTER TABLE "public"."applications" ADD CONSTRAINT "applications_status_check" 
  CHECK (("status" = ANY (ARRAY['pending'::"text", 'pending_payment'::"text", 'approved'::"text", 'rejected'::"text"]))); 