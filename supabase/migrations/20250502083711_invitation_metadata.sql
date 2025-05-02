-- Up migration (create invitation_metadata table)
CREATE TABLE invitation_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_token TEXT UNIQUE NOT NULL,
  group_id UUID REFERENCES "group"(id) NOT NULL,
  invited_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending',
  custom_message TEXT,
  role TEXT DEFAULT 'member',
  viewed_at TIMESTAMP WITH TIME ZONE,
  email TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX invitation_metadata_token_idx ON invitation_metadata(auth_token);
CREATE INDEX invitation_metadata_group_id_idx ON invitation_metadata(group_id);
CREATE INDEX invitation_metadata_status_idx ON invitation_metadata(status);
CREATE INDEX invitation_metadata_email_idx ON invitation_metadata(email);

-- Add comment to make purpose clear
COMMENT ON TABLE invitation_metadata IS 'Stores additional metadata for invitations sent to users, extends Supabase auth invitation flow';

-- Create trigger to update the updated_at column
CREATE OR REPLACE FUNCTION update_invitation_metadata_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_invitation_metadata_updated_at
BEFORE UPDATE ON invitation_metadata
FOR EACH ROW
EXECUTE FUNCTION update_invitation_metadata_updated_at();

---- DOWN ----
-- Down migration (drop invitation_metadata table)
-- DROP TRIGGER IF EXISTS update_invitation_metadata_updated_at ON invitation_metadata;
-- DROP FUNCTION IF EXISTS update_invitation_metadata_updated_at();
-- DROP TABLE IF EXISTS invitation_metadata;
