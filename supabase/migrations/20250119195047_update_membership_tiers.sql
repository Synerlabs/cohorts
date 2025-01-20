-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  type text NOT NULL CHECK (type IN ('membership_tier')),
  name text NOT NULL,
  description text,
  price bigint NOT NULL CHECK (price >= 0), -- in cents
  currency text NOT NULL CHECK (currency IN ('USD', 'EUR', 'GBP', 'CAD', 'AUD')),
  group_id uuid NOT NULL REFERENCES "group" (id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create membership_tiers table
CREATE TABLE IF NOT EXISTS membership_tiers (
  product_id uuid PRIMARY KEY REFERENCES products (id) ON DELETE CASCADE,
  duration_months integer NOT NULL CHECK (duration_months > 0),
  activation_type text NOT NULL CHECK (activation_type IN ('automatic', 'review_required', 'payment_required', 'review_then_payment')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Migrate data from old membership_tier table
INSERT INTO products (
  id,
  type,
  name,
  description,
  price,
  currency,
  group_id,
  is_active,
  created_at,
  updated_at
)
SELECT
  id,
  'membership_tier',
  name,
  description,
  price * 100, -- Convert to cents
  'USD', -- Default to USD for existing tiers
  group_id,
  true,
  created_at,
  updated_at
FROM membership_tier;

INSERT INTO membership_tiers (
  product_id,
  duration_months,
  activation_type,
  created_at,
  updated_at
)
SELECT
  id,
  duration_months,
  activation_type,
  created_at,
  updated_at
FROM membership_tier;

-- Update applications to reference products
ALTER TABLE applications
  DROP CONSTRAINT applications_tier_id_fkey,
  ADD CONSTRAINT applications_tier_id_fkey 
    FOREIGN KEY (tier_id) REFERENCES products (id) ON DELETE CASCADE;

-- Drop old membership_tier table
DROP TABLE membership_tier;

-- Create updated view
CREATE OR REPLACE VIEW membership_applications_view AS
SELECT 
  a.id as application_id,
  a.status,
  a.group_user_id,
  a.tier_id as product_id,
  a.order_id,
  a.approved_at,
  a.rejected_at,
  a.created_at as submitted_at,
  a.updated_at,
  gu.user_id,
  p.name as product_name,
  p.price as product_price,
  p.currency as product_currency,
  mt.duration_months as product_duration_months,
  mt.activation_type as product_activation_type,
  u.email as user_email,
  u.full_name as user_full_name,
  g.id as group_id,
  g.name as group_name,
  o.status as order_status,
  o.amount as order_amount,
  o.currency as order_currency,
  o.completed_at as order_completed_at
FROM applications a
JOIN group_users gu ON a.group_user_id = gu.id
JOIN products p ON a.tier_id = p.id
JOIN membership_tiers mt ON p.id = mt.product_id
JOIN profiles u ON gu.user_id = u.id
JOIN "group" g ON gu.group_id = g.id
LEFT JOIN orders o ON a.order_id = o.id
WHERE a.type = 'membership';

-- Add trigger to update updated_at
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_membership_tiers_updated_at
  BEFORE UPDATE ON membership_tiers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at(); 