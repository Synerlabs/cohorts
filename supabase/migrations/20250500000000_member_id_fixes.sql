-- Drop existing constraints if they exist
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.constraint_column_usage
    WHERE constraint_name = 'member_ids_unique_per_group'
  ) THEN
    ALTER TABLE member_ids DROP CONSTRAINT member_ids_unique_per_group;
  END IF;
END $$;

-- Add proper unique constraint
ALTER TABLE member_ids 
ADD CONSTRAINT member_ids_unique_per_group 
UNIQUE (group_id, member_id);

-- Create index to optimize queries by format pattern
CREATE INDEX IF NOT EXISTS member_ids_member_id_pattern_idx
ON member_ids USING btree (group_id, member_id);

-- Update the generate_member_id function to properly handle format-specific sequences
CREATE OR REPLACE FUNCTION generate_member_id(p_group_id uuid, p_format text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_sequence int;
  v_result text;
  v_year text;
  v_month text;
  v_day text;
  v_format_base text;
  v_processed_format text;
  v_seq_pattern text := '{SEQ:([0-9]+)}';
  v_simple_seq_pattern text := '{SEQ}';
  v_existing_id uuid;
BEGIN
  -- Replace date placeholders first
  v_year := to_char(CURRENT_DATE, 'YYYY');
  v_month := to_char(CURRENT_DATE, 'MM');
  v_day := to_char(CURRENT_DATE, 'DD');

  -- Process the format with date substitutions
  v_processed_format := p_format;
  v_processed_format := replace(v_processed_format, '{YYYY}', v_year);
  v_processed_format := replace(v_processed_format, '{YY}', right(v_year, 2));
  v_processed_format := replace(v_processed_format, '{MM}', v_month);
  v_processed_format := replace(v_processed_format, '{DD}', v_day);

  -- Extract the format base (everything before SEQ)
  IF v_processed_format ~ v_seq_pattern THEN
    v_format_base := regexp_replace(v_processed_format, v_seq_pattern, '');
  ELSE
    v_format_base := replace(v_processed_format, v_simple_seq_pattern, '');
  END IF;

  -- Find the highest sequence number for this specific format
  SELECT COALESCE(MAX(
    CASE 
      WHEN member_id ~ ('^' || v_format_base || '[0-9]+$') THEN 
        (regexp_replace(member_id, '^' || v_format_base, ''))::integer
      ELSE 0
    END
  ), 0) + 1
  INTO v_sequence
  FROM member_ids
  WHERE group_id = p_group_id
  AND member_id LIKE v_format_base || '%';

  -- Apply the sequence number to the format
  v_result := v_processed_format;
  
  -- Handle sequence with padding
  IF v_result ~ v_seq_pattern THEN
    v_result := regexp_replace(
      v_result,
      v_seq_pattern,
      lpad(v_sequence::text, regexp_replace(p_format, '.*{SEQ:([0-9]+)}.*', '\1')::int, '0')
    );
  ELSE
    v_result := replace(v_result, v_simple_seq_pattern, v_sequence::text);
  END IF;

  -- Double-check the member ID doesn't already exist
  LOOP
    SELECT id INTO v_existing_id
    FROM member_ids
    WHERE group_id = p_group_id
    AND member_id = v_result
    LIMIT 1;
    
    EXIT WHEN v_existing_id IS NULL;
    
    -- Increment and try again
    v_sequence := v_sequence + 1;
    
    v_result := v_processed_format;
    IF v_result ~ v_seq_pattern THEN
      v_result := regexp_replace(
        v_result,
        v_seq_pattern,
        lpad(v_sequence::text, regexp_replace(p_format, '.*{SEQ:([0-9]+)}.*', '\1')::int, '0')
      );
    ELSE
      v_result := replace(v_result, v_simple_seq_pattern, v_sequence::text);
    END IF;
  END LOOP;

  RETURN v_result;
END;
$$;

-- Update the handle_new_membership trigger function to handle membership_tier_settings
CREATE OR REPLACE FUNCTION handle_new_membership()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_group_id uuid;
  v_member_id_format text;
  v_generated_member_id text;
  v_member_id_record uuid;
  v_existing_member_id_record uuid;
  v_group_user_id uuid;
BEGIN
  -- Get the group_id and group_user_id
  SELECT gu.group_id, gu.id INTO v_group_id, v_group_user_id
  FROM group_users gu
  WHERE gu.id = NEW.group_user_id;

  -- Get the member ID format from settings
  SELECT member_id_format INTO v_member_id_format
  FROM membership_tier_settings
  WHERE tier_id = NEW.tier_id;

  -- Skip if no format is defined
  IF v_member_id_format IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if this member already has a member ID with the same format
  -- Note: We're checking for the same format, not just any membership
  SELECT mi.id INTO v_existing_member_id_record
  FROM member_ids mi
  INNER JOIN membership_member_ids mmi ON mi.id = mmi.member_id_id
  INNER JOIN memberships m ON mmi.membership_id = m.id
  INNER JOIN membership_tier_settings mts ON m.tier_id = mts.tier_id
  WHERE mi.group_user_id = NEW.group_user_id
  AND mts.member_id_format = v_member_id_format
  AND mi.group_id = v_group_id
  LIMIT 1;

  -- If member already has a member ID with this format, use it
  IF v_existing_member_id_record IS NOT NULL THEN
    -- Create membership_member_ids record with existing member_id
    INSERT INTO membership_member_ids (membership_id, member_id_id)
    VALUES (NEW.id, v_existing_member_id_record);
  ELSE
    -- Generate a new member ID
    v_generated_member_id := generate_member_id(v_group_id, v_member_id_format);

    -- Create member_id record
    INSERT INTO member_ids (member_id, group_user_id, group_id)
    VALUES (v_generated_member_id, NEW.group_user_id, v_group_id)
    RETURNING id INTO v_member_id_record;

    -- Create membership_member_ids record
    INSERT INTO membership_member_ids (membership_id, member_id_id)
    VALUES (NEW.id, v_member_id_record);
  END IF;

  RETURN NEW;
END;
$$; 