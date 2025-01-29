-- Create suborder status enum
CREATE TYPE suborder_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');

-- Create base suborders table
CREATE TABLE suborders (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status suborder_status NOT NULL DEFAULT 'pending',
  product_id uuid NOT NULL REFERENCES products(id),
  amount numeric NOT NULL,
  currency text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  failed_at timestamptz,
  cancelled_at timestamptz
);

-- Add indexes
CREATE INDEX idx_suborders_order_id ON suborders(order_id);
CREATE INDEX idx_suborders_product_id ON suborders(product_id);
CREATE INDEX idx_suborders_status ON suborders(status);

-- Add RLS policies
ALTER TABLE suborders ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Allow read access to authenticated users" ON suborders
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow service role full access
CREATE POLICY "Allow service role full access" ON suborders
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Down migration
/*
DROP TABLE IF EXISTS suborders;
DROP TYPE IF EXISTS suborder_status;
*/ 
