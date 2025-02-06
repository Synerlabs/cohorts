-- Core Tables
CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "slug" text UNIQUE NOT NULL,
    "name" text NOT NULL,
    "description" text,
    "logo_url" text,
    "settings" jsonb DEFAULT '{}'::jsonb,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "public"."members" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "org_id" uuid REFERENCES organizations(id) ON DELETE CASCADE,
    "user_id" uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    "status" text NOT NULL,
    "role" member_role NOT NULL,
    "metadata" jsonb DEFAULT '{}'::jsonb,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    UNIQUE(org_id, user_id)
);

CREATE TABLE IF NOT EXISTS "public"."membership_plans" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "org_id" uuid REFERENCES organizations(id) ON DELETE CASCADE,
    "name" text NOT NULL,
    "description" text,
    "amount" numeric NOT NULL,
    "currency" text NOT NULL,
    "interval" text NOT NULL,
    "active" boolean DEFAULT true,
    "metadata" jsonb DEFAULT '{}'::jsonb,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "org_id" uuid REFERENCES organizations(id) ON DELETE CASCADE,
    "member_id" uuid REFERENCES members(id) ON DELETE CASCADE,
    "status" order_status NOT NULL DEFAULT 'pending',
    "total_amount" numeric NOT NULL,
    "currency" text NOT NULL,
    "metadata" jsonb DEFAULT '{}'::jsonb,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "org_id" uuid REFERENCES organizations(id) ON DELETE CASCADE,
    "member_id" uuid REFERENCES members(id) ON DELETE CASCADE,
    "order_id" uuid REFERENCES orders(id) ON DELETE CASCADE,
    "amount" numeric NOT NULL,
    "currency" text NOT NULL,
    "status" payment_status NOT NULL DEFAULT 'pending',
    "provider" payment_provider NOT NULL,
    "metadata" jsonb DEFAULT '{}'::jsonb,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "public"."stripe_connected_accounts" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "org_id" uuid REFERENCES organizations(id) ON DELETE CASCADE,
    "account_id" text UNIQUE NOT NULL,
    "is_active" boolean DEFAULT false,
    "charges_enabled" boolean DEFAULT false,
    "payouts_enabled" boolean DEFAULT false,
    "has_external_account" boolean DEFAULT false,
    "requirements_status" jsonb DEFAULT '{}'::jsonb,
    "capabilities_status" jsonb DEFAULT '{}'::jsonb,
    "verification_status" jsonb DEFAULT '{}'::jsonb,
    "disabled_reason" text,
    "requirements_due_date" timestamptz,
    "last_synced_at" timestamptz,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now()
);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at();

CREATE TRIGGER update_members_updated_at
    BEFORE UPDATE ON members
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at();

CREATE TRIGGER update_membership_plans_updated_at
    BEFORE UPDATE ON membership_plans
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at();

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at();

CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at();

CREATE TRIGGER update_stripe_connected_accounts_updated_at
    BEFORE UPDATE ON stripe_connected_accounts
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at(); 