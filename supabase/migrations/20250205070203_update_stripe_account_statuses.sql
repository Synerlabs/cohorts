-- First, create a backup of existing status values and cast the enum to text
CREATE TABLE temp_stripe_accounts AS
SELECT id, account_status::text as status_text FROM stripe_connected_accounts;

-- Drop the existing type and its dependencies
DROP TYPE IF EXISTS stripe_account_status CASCADE;

-- Add new columns for account state
ALTER TABLE stripe_connected_accounts
    -- Core status flags
    ADD COLUMN is_active BOOLEAN DEFAULT false,
    ADD COLUMN charges_enabled BOOLEAN DEFAULT false,
    ADD COLUMN payouts_enabled BOOLEAN DEFAULT false,
    ADD COLUMN has_external_account BOOLEAN DEFAULT false,
    
    -- Detailed status information
    ADD COLUMN capabilities_status JSONB DEFAULT '{}',
    ADD COLUMN requirements_status JSONB DEFAULT '{}' CHECK (requirements_status ? 'currently_due' AND requirements_status ? 'eventually_due' AND requirements_status ? 'past_due'),
    ADD COLUMN verification_status JSONB DEFAULT '{}' CHECK (verification_status ? 'fields_needed' AND verification_status ? 'verified_fields'),
    
    -- Additional metadata
    ADD COLUMN disabled_reason TEXT,
    ADD COLUMN requirements_due_date TIMESTAMPTZ,
    ADD COLUMN last_synced_at TIMESTAMPTZ DEFAULT NOW();

-- Copy data from backup with status mapping
UPDATE stripe_connected_accounts sa
SET 
    is_active = CASE 
        WHEN ts.status_text = 'active' THEN true
        ELSE false
    END,
    charges_enabled = CASE 
        WHEN ts.status_text = 'active' THEN true
        ELSE false
    END,
    payouts_enabled = CASE 
        WHEN ts.status_text = 'active' THEN true
        ELSE false
    END,
    disabled_reason = CASE 
        WHEN ts.status_text = 'disconnected' THEN 'Account disconnected'
        ELSE null
    END
FROM temp_stripe_accounts ts
WHERE sa.id = ts.id;

-- Drop temporary table
DROP TABLE temp_stripe_accounts;

-- Add comments for columns
COMMENT ON COLUMN stripe_connected_accounts.is_active IS 'Whether the account is fully verified and can process payments';
COMMENT ON COLUMN stripe_connected_accounts.charges_enabled IS 'Whether Stripe has enabled charges on the account';
COMMENT ON COLUMN stripe_connected_accounts.payouts_enabled IS 'Whether Stripe has enabled payouts on the account';
COMMENT ON COLUMN stripe_connected_accounts.has_external_account IS 'Whether the account has a connected external account (bank account)';

COMMENT ON COLUMN stripe_connected_accounts.capabilities_status IS 'JSON object containing the status of each capability (e.g., card_payments, transfers)';
COMMENT ON COLUMN stripe_connected_accounts.requirements_status IS 'JSON object containing arrays of requirements (currently_due, eventually_due, past_due)';
COMMENT ON COLUMN stripe_connected_accounts.verification_status IS 'JSON object containing verification fields status';

COMMENT ON COLUMN stripe_connected_accounts.disabled_reason IS 'Reason why the account is disabled by Stripe, if applicable';
COMMENT ON COLUMN stripe_connected_accounts.requirements_due_date IS 'Deadline for submitting pending requirements';
COMMENT ON COLUMN stripe_connected_accounts.last_synced_at IS 'When the account status was last synced with Stripe';
