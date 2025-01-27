-- Add test environment fields to stripe_settings table
ALTER TABLE stripe_settings
ADD COLUMN test_publishable_key TEXT,
ADD COLUMN test_secret_key TEXT,
ADD COLUMN test_webhook_secret TEXT,
ADD COLUMN is_test_mode BOOLEAN DEFAULT false;

-- Add comments for the new columns
COMMENT ON COLUMN stripe_settings.test_publishable_key IS 'Stripe publishable key for test environment (starts with pk_test_)';
COMMENT ON COLUMN stripe_settings.test_secret_key IS 'Stripe secret key for test environment (starts with sk_test_)';
COMMENT ON COLUMN stripe_settings.test_webhook_secret IS 'Stripe webhook signing secret for test environment';
COMMENT ON COLUMN stripe_settings.is_test_mode IS 'Flag indicating whether the organization is using test mode';

-- Rename existing columns to clarify they are for live mode
ALTER TABLE stripe_settings
RENAME COLUMN publishable_key TO live_publishable_key;

ALTER TABLE stripe_settings
RENAME COLUMN secret_key TO live_secret_key;

ALTER TABLE stripe_settings
RENAME COLUMN webhook_secret TO live_webhook_secret;

-- Add comments for renamed columns
COMMENT ON COLUMN stripe_settings.live_publishable_key IS 'Stripe publishable key for live environment (starts with pk_live_)';
COMMENT ON COLUMN stripe_settings.live_secret_key IS 'Stripe secret key for live environment (starts with sk_live_)';
COMMENT ON COLUMN stripe_settings.live_webhook_secret IS 'Stripe webhook signing secret for live environment';
