-- Create account status enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE stripe_account_status AS ENUM ('pending', 'active', 'disconnected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create the stripe_connected_accounts table
CREATE TABLE stripe_connected_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES "group"(id),
    account_id TEXT UNIQUE,
    country TEXT NOT NULL,
    account_status stripe_account_status DEFAULT 'pending',
    is_test_mode BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_stripe_connected_accounts_org_id ON stripe_connected_accounts(org_id);
CREATE INDEX idx_stripe_connected_accounts_account_id ON stripe_connected_accounts(account_id);

-- Add comments
COMMENT ON TABLE stripe_connected_accounts IS 'Stores Stripe Connect accounts linked to organizations';
COMMENT ON COLUMN stripe_connected_accounts.id IS 'Unique identifier for the connected account record';
COMMENT ON COLUMN stripe_connected_accounts.org_id IS 'Reference to the organization';
COMMENT ON COLUMN stripe_connected_accounts.account_id IS 'Stripe Connect account ID (starts with acct_)';
COMMENT ON COLUMN stripe_connected_accounts.country IS 'Country code for the Stripe Connect account';
COMMENT ON COLUMN stripe_connected_accounts.account_status IS 'Status of the Stripe Connect account';
COMMENT ON COLUMN stripe_connected_accounts.is_test_mode IS 'Whether the account is in test mode'; 
