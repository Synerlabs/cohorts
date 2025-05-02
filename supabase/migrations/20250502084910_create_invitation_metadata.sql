-- Create invitation_metadata table if it doesn't already exist
CREATE TABLE IF NOT EXISTS invitation_metadata (
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

-- Add indexes for better query performance (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'invitation_metadata_token_idx') THEN
        CREATE INDEX invitation_metadata_token_idx ON invitation_metadata(auth_token);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'invitation_metadata_group_id_idx') THEN
        CREATE INDEX invitation_metadata_group_id_idx ON invitation_metadata(group_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'invitation_metadata_status_idx') THEN
        CREATE INDEX invitation_metadata_status_idx ON invitation_metadata(status);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'invitation_metadata_email_idx') THEN
        CREATE INDEX invitation_metadata_email_idx ON invitation_metadata(email);
    END IF;
END $$;

-- Add comment to make purpose clear
COMMENT ON TABLE invitation_metadata IS 'Stores additional metadata for invitations sent to users, extends Supabase auth invitation flow';

-- Create trigger to update the updated_at column if it doesn't exist
CREATE OR REPLACE FUNCTION update_invitation_metadata_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists to avoid errors
DROP TRIGGER IF EXISTS update_invitation_metadata_updated_at ON invitation_metadata;

-- Create the trigger
CREATE TRIGGER update_invitation_metadata_updated_at
BEFORE UPDATE ON invitation_metadata
FOR EACH ROW
EXECUTE FUNCTION update_invitation_metadata_updated_at();
