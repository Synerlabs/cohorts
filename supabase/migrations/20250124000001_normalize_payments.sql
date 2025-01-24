-- Drop existing tables and types if they exist
DROP TABLE IF EXISTS payments CASCADE;
DROP TYPE IF EXISTS payment_status CASCADE;
DROP TYPE IF EXISTS payment_type CASCADE;

-- Create payment status enum
CREATE TYPE payment_status AS ENUM ('pending', 'approved', 'rejected');

-- Create payment type enum
CREATE TYPE payment_type AS ENUM ('manual', 'stripe');

-- Create base payments table
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  type payment_type NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create manual payments table
CREATE TABLE manual_payments (
  payment_id UUID PRIMARY KEY REFERENCES payments(id) ON DELETE CASCADE,
  proof_file_id TEXT,
  proof_url TEXT,
  notes TEXT
);

-- Create stripe payments table (for future use)
CREATE TABLE stripe_payments (
  payment_id UUID PRIMARY KEY REFERENCES payments(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT,
  stripe_payment_method TEXT,
  stripe_status TEXT
);

-- Add RLS policies
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_payments ENABLE ROW LEVEL SECURITY;

-- Payments policies
CREATE POLICY "Users can view their own payments"
  ON payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Group admins can view all payments"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      JOIN products p ON p.id = o.product_id
      JOIN group_users gu ON gu.group_id = p.group_id
      WHERE o.id = payments.order_id
      AND gu.user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM user_roles
        JOIN group_roles ON group_roles.id = user_roles.group_role_id
        WHERE user_roles.user_id = auth.uid()
        AND group_roles.type = 'MEMBER'
      )
    )
  );

-- Manual payments policies
CREATE POLICY "Users can view their own manual payments"
  ON manual_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM payments p
      WHERE p.id = manual_payments.payment_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Group admins can view all manual payments"
  ON manual_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM payments p
      JOIN orders o ON o.id = p.order_id
      JOIN products pr ON pr.id = o.product_id
      JOIN group_users gu ON gu.group_id = pr.group_id
      WHERE p.id = manual_payments.payment_id
      AND gu.user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM user_roles
        JOIN group_roles ON group_roles.id = user_roles.group_role_id
        WHERE user_roles.user_id = auth.uid()
        AND group_roles.type = 'MEMBER'
      )
    )
  );

-- Stripe payments policies (similar to manual payments)
CREATE POLICY "Users can view their own stripe payments"
  ON stripe_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM payments p
      WHERE p.id = stripe_payments.payment_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Group admins can view all stripe payments"
  ON stripe_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM payments p
      JOIN orders o ON o.id = p.order_id
      JOIN products pr ON pr.id = o.product_id
      JOIN group_users gu ON gu.group_id = pr.group_id
      WHERE p.id = stripe_payments.payment_id
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
CREATE INDEX payments_order_id_idx ON payments(order_id);
CREATE INDEX payments_user_id_idx ON payments(user_id);
CREATE INDEX payments_type_idx ON payments(type);
CREATE INDEX payments_status_idx ON payments(status);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger for updated_at
CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Migrate existing data if old_payments table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'old_payments') THEN
        INSERT INTO payments (id, order_id, user_id, type, amount, currency, status, created_at, updated_at)
        SELECT 
            id,
            order_id,
            user_id,
            type::payment_type,
            amount,
            currency,
            status::payment_status,
            created_at,
            updated_at
        FROM old_payments
        ON CONFLICT DO NOTHING;

        INSERT INTO manual_payments (payment_id, proof_file_id, proof_url, notes)
        SELECT 
            id,
            proof_file_id,
            proof_url,
            notes
        FROM old_payments
        WHERE type = 'manual'
        ON CONFLICT DO NOTHING;
    END IF;
END $$; 