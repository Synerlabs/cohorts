-- Create payment gateway status enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE payment_gateway_status AS ENUM ('unconfigured', 'configured', 'disabled', 'error');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create group_payment_gateways table
CREATE TABLE IF NOT EXISTS group_payment_gateways (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES "group"(id) ON DELETE CASCADE,
    gateway_id TEXT NOT NULL,
    enabled BOOLEAN DEFAULT false,
    status payment_gateway_status DEFAULT 'unconfigured',
    config JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, gateway_id)
);

-- Add indexes
CREATE INDEX idx_group_payment_gateways_group_id ON group_payment_gateways(group_id);
CREATE INDEX idx_group_payment_gateways_gateway_id ON group_payment_gateways(gateway_id);

-- Add trigger for updated_at
CREATE TRIGGER set_group_payment_gateways_updated_at
    BEFORE UPDATE ON group_payment_gateways
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
