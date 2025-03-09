-- Create billing_details table for storing user billing information
CREATE TABLE billing_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,  -- Optional, can be null for saved defaults
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  company VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  zip_code VARCHAR(20),
  country VARCHAR(2) DEFAULT 'US',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_billing_details_user_id ON billing_details(user_id);
CREATE INDEX idx_billing_details_order_id ON billing_details(order_id);

-- Ensure only one default billing detail per user
-- Using CREATE UNIQUE INDEX instead of ALTER TABLE for partial unique constraint
CREATE UNIQUE INDEX idx_user_default_billing 
ON billing_details (user_id)
WHERE is_default = TRUE AND order_id IS NULL;

-- Create update_timestamp function if it doesn't exist
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to update timestamp on change
CREATE TRIGGER update_billing_details_timestamp
BEFORE UPDATE ON billing_details
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- Comment on table and columns for better documentation
COMMENT ON TABLE billing_details IS 'Stores user billing information for orders and saved defaults';
COMMENT ON COLUMN billing_details.id IS 'Primary key for the billing details';
COMMENT ON COLUMN billing_details.user_id IS 'References the user who owns these billing details';
COMMENT ON COLUMN billing_details.order_id IS 'References an order if these billing details are specific to an order, null if default';
COMMENT ON COLUMN billing_details.is_default IS 'Indicates if these are the user''s default billing details';
