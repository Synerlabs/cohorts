-- Part 1: Update memberships table
ALTER TABLE memberships
  ADD COLUMN IF NOT EXISTS tier_id uuid REFERENCES membership_tiers(product_id);

-- Create index for tier_id
CREATE INDEX IF NOT EXISTS idx_memberships_tier_id ON memberships(tier_id);

-- Part 2: Set up member_ids table
DROP TABLE IF EXISTS member_ids CASCADE;
CREATE TABLE IF NOT EXISTS member_ids (
  id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
  member_id text NOT NULL,
  group_user_id uuid,
  group_id uuid REFERENCES "group"(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT member_ids_unique_per_group UNIQUE (member_id, group_id)
);

-- Create index for member_ids
CREATE INDEX IF NOT EXISTS idx_member_ids_group_id ON member_ids(group_id);

-- Create a join table for member_ids and memberships
DROP TABLE IF EXISTS membership_member_ids CASCADE;
CREATE TABLE IF NOT EXISTS membership_member_ids (
  id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
  membership_id uuid REFERENCES memberships(id) ON DELETE CASCADE,
  member_id_id uuid REFERENCES member_ids(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT membership_member_ids_unique UNIQUE (membership_id, member_id_id)
);

-- Create indexes for membership_member_ids
CREATE INDEX IF NOT EXISTS idx_membership_member_ids_membership_id ON membership_member_ids(membership_id);
CREATE INDEX IF NOT EXISTS idx_membership_member_ids_member_id_id ON membership_member_ids(member_id_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to generate member ID based on format
CREATE OR REPLACE FUNCTION generate_member_id(p_group_id uuid, p_format text)
RETURNS text AS $$
DECLARE
  v_sequence int;
  v_result text;
  v_year text;
  v_month text;
  v_day text;
  v_has_year boolean;
BEGIN
  -- Check if format contains any year token
  v_has_year := p_format LIKE '%{YYYY}%' OR p_format LIKE '%{YY}%';

  -- Get the next sequence number for this group
  WITH seq AS (
    SELECT COUNT(*) + 1 as next_seq
    FROM member_ids
    WHERE group_id = p_group_id
    AND (
      -- Only apply year filter if format includes year
      CASE WHEN v_has_year THEN
        created_at >= date_trunc('year', CURRENT_DATE)
      ELSE
        true
      END
    )
  )
  SELECT next_seq INTO v_sequence FROM seq;

  -- Get date components
  v_year := to_char(CURRENT_DATE, 'YYYY');
  v_month := to_char(CURRENT_DATE, 'MM');
  v_day := to_char(CURRENT_DATE, 'DD');

  -- Start with the format
  v_result := p_format;

  -- Replace tokens
  v_result := replace(v_result, '{YYYY}', v_year);
  v_result := replace(v_result, '{YY}', right(v_year, 2));
  v_result := replace(v_result, '{MM}', v_month);
  v_result := replace(v_result, '{DD}', v_day);

  -- Handle sequence with padding
  v_result := regexp_replace(
    v_result,
    '{SEQ:([0-9]+)}',
    lpad(v_sequence::text, regexp_replace(p_format, '.*{SEQ:([0-9]+)}.*', '\1')::int, '0')
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function to handle new membership creation
CREATE OR REPLACE FUNCTION handle_new_membership()
RETURNS TRIGGER AS $$
DECLARE
  v_group_id uuid;
  v_member_id_format text;
  v_generated_member_id text;
  v_member_id_record uuid;
BEGIN
  -- Get the group_id from group_users
  SELECT group_id INTO v_group_id
  FROM group_users
  WHERE id = NEW.group_user_id;

  -- Get the member ID format from settings
  SELECT member_id_format INTO v_member_id_format
  FROM membership_tier_settings
  WHERE tier_id = NEW.tier_id;

  -- Generate the member ID
  v_generated_member_id := generate_member_id(v_group_id, v_member_id_format);

  -- Create member_id record
  INSERT INTO member_ids (member_id, group_user_id, group_id)
  VALUES (v_generated_member_id, NEW.group_user_id, v_group_id)
  RETURNING id INTO v_member_id_record;

  -- Create membership_member_ids record
  INSERT INTO membership_member_ids (membership_id, member_id_id)
  VALUES (NEW.id, v_member_id_record);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_member_ids_updated_at
  BEFORE UPDATE ON member_ids
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_membership_member_ids_updated_at
  BEFORE UPDATE ON membership_member_ids
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for new membership
CREATE TRIGGER create_member_id_for_new_membership
  AFTER INSERT ON memberships
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_membership();

-- Part 3: Create membership tier settings table
CREATE TABLE IF NOT EXISTS public.membership_tier_settings (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    tier_id uuid NOT NULL REFERENCES public.membership_tiers(product_id) ON DELETE CASCADE,
    member_id_format text NOT NULL DEFAULT 'MEM-{YYYY}-{SEQ:3}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tier_id)
);

-- Add comment to explain the format
COMMENT ON COLUMN public.membership_tier_settings.member_id_format IS 'Format string for generating member IDs. Supports tokens: {YYYY}, {YY}, {MM}, {M}, {DD}, {D}, {SEQ:n} where n is padding length';

-- Create trigger to update updated_at
CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON public.membership_tier_settings
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

-- Part 4: Migrate existing data
DO $$
BEGIN
  -- For each member_id record, get the group_id from group_users
  UPDATE member_ids mi
  SET group_id = gu.group_id
  FROM group_users gu
  WHERE mi.group_user_id = gu.id
  AND mi.group_id IS NULL;

  -- Create membership_member_ids records for existing memberships
  INSERT INTO membership_member_ids (membership_id, member_id_id)
  SELECT m.id, mi.id
  FROM memberships m
  JOIN group_users gu ON m.group_user_id = gu.id
  JOIN member_ids mi ON mi.group_user_id = gu.id
  ON CONFLICT DO NOTHING;

  -- Add temporary member_id_format column to membership_tiers
  ALTER TABLE public.membership_tiers
  ADD COLUMN IF NOT EXISTS member_id_format text NOT NULL DEFAULT 'MEM-{YYYY}-{SEQ:3}';

  -- Move member_id_format values to the settings table
  INSERT INTO public.membership_tier_settings (tier_id, member_id_format)
  SELECT product_id, member_id_format
  FROM public.membership_tiers
  ON CONFLICT (tier_id) DO UPDATE
  SET member_id_format = EXCLUDED.member_id_format;

  -- Drop member_id_format from membership_tiers table
  ALTER TABLE public.membership_tiers
  DROP COLUMN IF EXISTS member_id_format;

  -- Generate member IDs for existing memberships that don't have them
  INSERT INTO member_ids (member_id, group_user_id, group_id)
  SELECT 
    generate_member_id(gu.group_id, COALESCE(mts.member_id_format, 'MEM-{YYYY}-{SEQ:3}')),
    m.group_user_id,
    gu.group_id
  FROM memberships m
  JOIN group_users gu ON m.group_user_id = gu.id
  LEFT JOIN membership_tier_settings mts ON m.tier_id = mts.tier_id
  WHERE NOT EXISTS (
    SELECT 1 FROM membership_member_ids mmi
    JOIN member_ids mi ON mmi.member_id_id = mi.id
    WHERE mmi.membership_id = m.id
  );

  -- Link newly created member IDs to memberships
  WITH new_member_ids AS (
    SELECT m.id as membership_id, mi.id as member_id_id
    FROM memberships m
    JOIN group_users gu ON m.group_user_id = gu.id
    JOIN member_ids mi ON mi.group_user_id = gu.id
    WHERE NOT EXISTS (
      SELECT 1 FROM membership_member_ids mmi
      WHERE mmi.membership_id = m.id
    )
  )
  INSERT INTO membership_member_ids (membership_id, member_id_id)
  SELECT membership_id, member_id_id
  FROM new_member_ids;
END $$;

-- Enable RLS on new tables
ALTER TABLE member_ids ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_member_ids ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_tier_settings ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Allow read access to authenticated users" ON member_ids
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow service role full access" ON member_ids
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow read access to authenticated users" ON membership_member_ids
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow service role full access" ON membership_member_ids
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow read access to authenticated users" ON membership_tier_settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow service role full access" ON membership_tier_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true); 