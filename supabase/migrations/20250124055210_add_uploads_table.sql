-- Create trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create uploads table
CREATE TABLE uploads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module VARCHAR NOT NULL,
  original_filename VARCHAR NOT NULL,
  storage_path VARCHAR NOT NULL,
  storage_provider VARCHAR NOT NULL,
  file_url VARCHAR NOT NULL,
  file_id VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add trigger for updated_at
CREATE TRIGGER set_timestamp_uploads
  BEFORE UPDATE ON uploads
  FOR EACH ROW
  EXECUTE PROCEDURE trigger_set_timestamp();

-- Create many-to-many relationship for payments and uploads
CREATE TABLE payment_uploads (
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
  upload_id UUID REFERENCES uploads(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (payment_id, upload_id)
);

-- Remove old file columns from manual_payments
ALTER TABLE manual_payments
  DROP COLUMN IF EXISTS proof_file_id,
  DROP COLUMN IF EXISTS proof_url;

-- Add RLS policies for uploads
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_uploads ENABLE ROW LEVEL SECURITY;

-- Uploads policies
CREATE POLICY "Users can view uploads linked to their payments"
  ON uploads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM payment_uploads pu
      JOIN payments p ON p.id = pu.payment_id
      WHERE pu.upload_id = uploads.id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Group admins can view all uploads"
  ON uploads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM payment_uploads pu
      JOIN payments p ON p.id = pu.payment_id
      JOIN orders o ON o.id = p.order_id
      JOIN products pr ON pr.id = o.product_id
      JOIN group_users gu ON gu.group_id = pr.group_id
      WHERE pu.upload_id = uploads.id
      AND gu.user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM user_roles
        JOIN group_roles ON group_roles.id = user_roles.group_role_id
        WHERE user_roles.user_id = auth.uid()
        AND group_roles.type = 'MEMBER'
      )
    )
  );

-- Payment uploads policies
CREATE POLICY "Users can view their payment uploads"
  ON payment_uploads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM payments p
      WHERE p.id = payment_uploads.payment_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Group admins can view all payment uploads"
  ON payment_uploads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM payments p
      JOIN orders o ON o.id = p.order_id
      JOIN products pr ON pr.id = o.product_id
      JOIN group_users gu ON gu.group_id = pr.group_id
      WHERE p.id = payment_uploads.payment_id
      AND gu.user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM user_roles
        JOIN group_roles ON group_roles.id = user_roles.group_role_id
        WHERE user_roles.user_id = auth.uid()
        AND group_roles.type = 'MEMBER'
      )
    )
  );

-- Add indexes for performance
CREATE INDEX uploads_module_idx ON uploads(module);
CREATE INDEX payment_uploads_payment_id_idx ON payment_uploads(payment_id);
CREATE INDEX payment_uploads_upload_id_idx ON payment_uploads(upload_id);
