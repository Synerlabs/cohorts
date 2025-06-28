-- Add stripe_account_id and stripe_payment_intent_client_secret columns to stripe_payments table
ALTER TABLE stripe_payments 
ADD COLUMN IF NOT EXISTS stripe_payment_intent_client_secret TEXT,
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;

-- Down migration
/*
ALTER TABLE stripe_payments 
DROP COLUMN IF EXISTS stripe_payment_intent_client_secret,
DROP COLUMN IF EXISTS stripe_account_id;
*/ 