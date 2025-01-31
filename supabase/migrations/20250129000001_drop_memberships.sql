-- Alter memberships table to add status and metadata
ALTER TABLE IF EXISTS memberships 
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active' 
    CHECK (status = ANY (ARRAY['active'::text, 'expired'::text, 'cancelled'::text, 'suspended'::text])),
  ADD COLUMN IF NOT EXISTS metadata jsonb;

-- Add unique constraint on id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'memberships_id_key'
  ) THEN
    ALTER TABLE memberships ADD CONSTRAINT memberships_id_key UNIQUE (id);
  END IF;
END $$;

-- Add primary key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'memberships_pkey'
  ) THEN
    ALTER TABLE memberships ADD PRIMARY KEY (id);
  END IF;
END $$;

-- Create index on status
CREATE INDEX IF NOT EXISTS idx_memberships_status ON memberships(status);

-- If table doesn't exist, create it
CREATE TABLE IF NOT EXISTS memberships (
  id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  group_user_id uuid NOT NULL REFERENCES group_users(id),
  status text NOT NULL DEFAULT 'active' 
    CHECK (status = ANY (ARRAY['active'::text, 'expired'::text, 'cancelled'::text, 'suspended'::text])),
  start_date timestamptz,
  end_date timestamptz,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT memberships_order_id_key UNIQUE (order_id),
  CONSTRAINT memberships_id_key UNIQUE (id)
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

-- Part 1: Add tier_id column to memberships table
ALTER TABLE memberships
ADD COLUMN tier_id uuid REFERENCES public.membership_tiers(product_id);

-- Part 2: Create index for tier_id
CREATE INDEX IF NOT EXISTS idx_memberships_tier_id ON memberships(tier_id);

-- Part 3: Create member_ids table
CREATE TABLE IF NOT EXISTS "public"."member_ids" (
    "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    "group_user_id" uuid NOT NULL,
    "member_id" text NOT NULL,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (group_user_id) REFERENCES public.group_users(id) ON DELETE CASCADE
);

-- Part 4: Create join table for membership_member_ids
CREATE TABLE IF NOT EXISTS "public"."membership_member_ids" (
    "membership_id" uuid NOT NULL,
    "member_id_id" uuid NOT NULL,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    PRIMARY KEY (membership_id, member_id_id),
    FOREIGN KEY (membership_id) REFERENCES public.memberships(id) ON DELETE CASCADE,
    FOREIGN KEY (member_id_id) REFERENCES public.member_ids(id) ON DELETE CASCADE
); 