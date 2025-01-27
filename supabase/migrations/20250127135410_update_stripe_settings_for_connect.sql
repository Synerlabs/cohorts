-- Drop old columns
ALTER TABLE stripe_settings
DROP COLUMN IF EXISTS live_publishable_key,
DROP COLUMN IF EXISTS live_secret_key,
DROP COLUMN IF EXISTS live_webhook_secret,
DROP COLUMN IF EXISTS test_publishable_key,
DROP COLUMN IF EXISTS test_secret_key,
DROP COLUMN IF EXISTS test_webhook_secret;

-- Add new columns for Stripe Connect
ALTER TABLE stripe_settings
ADD COLUMN IF NOT EXISTS account_id TEXT,
ADD COLUMN IF NOT EXISTS return_url TEXT,
ADD COLUMN IF NOT EXISTS refresh_url TEXT;

