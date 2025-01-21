-- Drop existing functions
DROP FUNCTION IF EXISTS approve_application;
DROP FUNCTION IF EXISTS reject_application;

-- Create updated approve_application function
CREATE OR REPLACE FUNCTION approve_application(
  p_application_id UUID,
  p_new_status TEXT,
  p_should_activate BOOLEAN,
  p_approved_at TIMESTAMPTZ
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update application status and approved_at timestamp
  UPDATE applications
  SET 
    status = p_new_status,
    approved_at = p_approved_at
  WHERE id = p_application_id;

  -- If should activate, update group_user is_active status
  IF p_should_activate THEN
    UPDATE group_users
    SET is_active = true
    WHERE id = (
      SELECT group_user_id 
      FROM applications 
      WHERE id = p_application_id
    );
  END IF;
END;
$$;

-- Create updated reject_application function
CREATE OR REPLACE FUNCTION reject_application(
  p_application_id UUID,
  p_rejected_at TIMESTAMPTZ
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update application status and rejected_at timestamp
  UPDATE applications
  SET 
    status = 'rejected',
    rejected_at = p_rejected_at
  WHERE id = p_application_id;

  -- Ensure group_user is not active
  UPDATE group_users
  SET is_active = false
  WHERE id = (
    SELECT group_user_id 
    FROM applications 
    WHERE id = p_application_id
  );
END;
$$;
