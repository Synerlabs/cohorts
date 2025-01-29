-- Alter memberships table to add status and metadata
ALTER TABLE IF EXISTS memberships 
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active' 
    CHECK (status = ANY (ARRAY['active'::text, 'expired'::text, 'cancelled'::text, 'suspended'::text])),
  ADD COLUMN IF NOT EXISTS metadata jsonb;

-- Create index on status
CREATE INDEX IF NOT EXISTS idx_memberships_status ON memberships(status);

-- If table doesn't exist, create it
CREATE TABLE IF NOT EXISTS memberships (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  group_user_id uuid NOT NULL REFERENCES group_users(id),
  status text NOT NULL DEFAULT 'active' 
    CHECK (status = ANY (ARRAY['active'::text, 'expired'::text, 'cancelled'::text, 'suspended'::text])),
  start_date timestamptz,
  end_date timestamptz,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT memberships_order_id_key UNIQUE (order_id)
);

-- Add indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_memberships_order_id ON memberships(order_id);
CREATE INDEX IF NOT EXISTS idx_memberships_group_user_id ON memberships(group_user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_status ON memberships(status);

-- Enable RLS if not already enabled
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow read access to authenticated users" ON memberships;
DROP POLICY IF EXISTS "Allow service role full access" ON memberships;

-- Add RLS policies
CREATE POLICY "Allow read access to authenticated users" ON memberships
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow service role full access" ON memberships
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Down migration
/*
ALTER TABLE IF EXISTS memberships 
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS metadata;

DROP INDEX IF EXISTS idx_memberships_status;
*/ 