-- Add Xendit to payment_type enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type 
                    JOIN pg_enum ON pg_enum.enumtypid = pg_type.oid
                    WHERE pg_type.typname = 'payment_type'
                    AND pg_enum.enumlabel = 'xendit') THEN
        ALTER TYPE payment_type ADD VALUE IF NOT EXISTS 'xendit';
    END IF;
END$$;

-- Remove the non-existent table insertion
-- Instead, we'll just ensure Xendit is available in payment gateways

-- Create table for Xendit connected accounts
CREATE TABLE IF NOT EXISTS "public"."xendit_connected_accounts" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "org_id" uuid REFERENCES "group"(id) ON DELETE CASCADE,
    "account_id" text UNIQUE NOT NULL,
    "is_active" boolean DEFAULT false,
    "charges_enabled" boolean DEFAULT false,
    "payouts_enabled" boolean DEFAULT false,
    "has_external_account" boolean DEFAULT false,
    "requirements_status" jsonb DEFAULT '{}'::jsonb,
    "capabilities_status" jsonb DEFAULT '{}'::jsonb,
    "verification_status" jsonb DEFAULT '{}'::jsonb,
    "disabled_reason" text,
    "requirements_due_date" timestamptz,
    "last_synced_at" timestamptz,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now()
);

-- Create table for Xendit payments
CREATE TABLE IF NOT EXISTS "public"."xendit_payments" (
    "payment_id" uuid PRIMARY KEY REFERENCES payments(id) ON DELETE CASCADE,
    "xendit_invoice_id" text UNIQUE NOT NULL,
    "xendit_status" text NOT NULL,
    "payment_method" text,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now()
);

-- Add triggers for updated_at
CREATE TRIGGER update_xendit_connected_accounts_updated_at
    BEFORE UPDATE ON xendit_connected_accounts
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_xendit_payments_updated_at
    BEFORE UPDATE ON xendit_payments
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Add Xendit to payment gateways for all organizations (disabled by default)
INSERT INTO group_payment_gateways (group_id, gateway_id, enabled)
SELECT id, 'xendit', false
FROM "group"
ON CONFLICT (group_id, gateway_id) DO NOTHING;
