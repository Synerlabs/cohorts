-- First, backup existing data to temporary tables
CREATE TEMP TABLE temp_memberships AS 
SELECT 
    m.*,
    gu.user_id,
    mt.price,
    mt.currency
FROM public.memberships m
JOIN public.group_users gu ON m.group_user_id = gu.id
JOIN public.membership_tier mt ON m.tier_id = mt.id;

CREATE TEMP TABLE temp_membership_tiers AS
SELECT * FROM public.membership_tier;

-- Now we can safely drop the old tables
DROP TABLE IF EXISTS public.memberships CASCADE;
DROP TABLE IF EXISTS public.membership_tier CASCADE;

-- Create base products table
CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    "type" text NOT NULL,
    "name" text NOT NULL,
    "description" text,
    "price" bigint NOT NULL DEFAULT 0,
    "currency" text NOT NULL DEFAULT 'USD',
    "group_id" uuid REFERENCES public.group(id),
    "is_active" boolean NOT NULL DEFAULT true,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "updated_at" timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT "products_type_check" CHECK (type = ANY (ARRAY['membership_tier'::text, 'subscription'::text, 'one_time'::text])),
    CONSTRAINT "products_currency_check" CHECK (currency = ANY (ARRAY['USD'::text, 'EUR'::text, 'GBP'::text, 'CAD'::text, 'AUD'::text])),
    CONSTRAINT "products_price_check" CHECK (price >= 0),
    PRIMARY KEY (id)
);

-- Create membership tiers table (extends products)
CREATE TABLE IF NOT EXISTS "public"."membership_tiers" (
    "product_id" uuid NOT NULL REFERENCES public.products(id) PRIMARY KEY,
    "duration_months" integer NOT NULL DEFAULT 1,
    "activation_type" text NOT NULL,
    CONSTRAINT "membership_tiers_duration_months_check" CHECK (duration_months >= 1),
    CONSTRAINT "membership_tiers_activation_type_check" CHECK (activation_type = ANY (ARRAY['automatic'::text, 'review_required'::text, 'payment_required'::text, 'review_then_payment'::text]))
);

-- Create base orders table
CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    "type" text NOT NULL,
    "user_id" uuid NOT NULL REFERENCES auth.users(id),
    "product_id" uuid NOT NULL REFERENCES public.products(id),
    "status" text NOT NULL,
    "amount" bigint NOT NULL,
    "currency" text NOT NULL,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "completed_at" timestamptz,
    "updated_at" timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT "orders_type_check" CHECK (type = ANY (ARRAY['membership'::text, 'subscription'::text, 'one_time'::text])),
    CONSTRAINT "orders_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text, 'cancelled'::text])),
    CONSTRAINT "orders_currency_check" CHECK (currency = ANY (ARRAY['USD'::text, 'EUR'::text, 'GBP'::text, 'CAD'::text, 'AUD'::text])),
    CONSTRAINT "orders_amount_check" CHECK (amount >= 0),
    PRIMARY KEY (id)
);

-- Create memberships table (extends orders)
CREATE TABLE IF NOT EXISTS "public"."memberships" (
    "order_id" uuid NOT NULL REFERENCES public.orders(id) PRIMARY KEY,
    "group_user_id" uuid NOT NULL REFERENCES public.group_users(id),
    "start_date" date,
    "end_date" date
);

-- Convert existing membership tiers to products and membership_tiers
WITH inserted_products AS (
    INSERT INTO public.products (
        id,
        type,
        name,
        description,
        price,
        currency,
        group_id,
        created_at,
        updated_at
    )
    SELECT 
        id,
        'membership_tier',
        name,
        description,
        price,
        currency,
        group_id,
        created_at,
        updated_at
    FROM temp_membership_tiers
    RETURNING id
)
INSERT INTO public.membership_tiers (
    product_id,
    duration_months,
    activation_type
)
SELECT 
    mt.id,
    mt.duration_months,
    mt.activation_type
FROM temp_membership_tiers mt
JOIN inserted_products p ON p.id = mt.id;

-- Convert existing memberships to orders and memberships
WITH inserted_orders AS (
    INSERT INTO public.orders (
        id,
        type,
        user_id,
        product_id,
        status,
        amount,
        currency,
        created_at,
        completed_at,
        updated_at
    )
    SELECT 
        m.id,
        'membership',
        m.user_id,
        m.tier_id,
        CASE 
            WHEN m.is_active THEN 'completed'
            WHEN m.status = 'pending_payment' THEN 'pending'
            ELSE m.status
        END,
        m.price,
        m.currency,
        m.created_at,
        CASE WHEN m.is_active THEN m.approved_at ELSE null END,
        m.updated_at
    FROM temp_memberships m
    RETURNING id
)
INSERT INTO public.memberships (
    order_id,
    group_user_id,
    start_date,
    end_date
)
SELECT 
    m.id,
    m.group_user_id,
    m.start_date,
    m.end_date
FROM temp_memberships m
JOIN inserted_orders o ON o.id = m.id;

-- Add order_id to applications table
ALTER TABLE "public"."applications"
    ADD COLUMN "order_id" uuid REFERENCES "public"."orders"(id),
    ADD COLUMN "type" text NOT NULL DEFAULT 'membership';

-- Update applications to reference orders
UPDATE public.applications a
SET order_id = o.id
FROM public.orders o
JOIN public.memberships m ON o.id = m.order_id
WHERE a.group_user_id = m.group_user_id
AND a.tier_id = o.product_id;

-- Drop temporary tables
DROP TABLE temp_memberships;
DROP TABLE temp_membership_tiers;

-- Add triggers for updated_at
CREATE TRIGGER products_updated_at
    BEFORE UPDATE ON "public"."products"
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER orders_updated_at
    BEFORE UPDATE ON "public"."orders"
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- Create view for membership applications with orders
CREATE OR REPLACE VIEW "public"."membership_applications_view" AS
SELECT 
    a.id as application_id,
    a.status as application_status,
    a.group_user_id,
    a.tier_id as product_id,
    a.approved_at,
    a.rejected_at,
    a.created_at as submitted_at,
    a.updated_at,
    a.type,
    o.id as order_id,
    o.status as order_status,
    o.amount,
    o.currency,
    o.completed_at as payment_completed_at,
    m.start_date,
    m.end_date,
    p.name as product_name,
    p.description as product_description,
    p.price as product_price,
    p.currency as product_currency,
    mt.duration_months,
    mt.activation_type,
    gu.user_id,
    gu.group_id,
    jsonb_build_object(
        'id', u.id,
        'email', u.email,
        'full_name', concat_ws(' ', pr.first_name, pr.last_name)
    ) as user_data
FROM "public"."applications" a
JOIN "public"."group_users" gu ON a.group_user_id = gu.id
JOIN "public"."products" p ON a.tier_id = p.id
JOIN "public"."membership_tiers" mt ON p.id = mt.product_id
JOIN "auth"."users" u ON gu.user_id = u.id
JOIN "public"."profiles" pr ON u.id = pr.id
LEFT JOIN "public"."orders" o ON a.order_id = o.id
LEFT JOIN "public"."memberships" m ON o.id = m.order_id
WHERE a.type = 'membership'
AND p.type = 'membership_tier';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_type ON public.products(type);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_group_id ON public.products(group_id);
CREATE INDEX IF NOT EXISTS idx_applications_order_id ON public.applications(order_id);
CREATE INDEX IF NOT EXISTS idx_applications_type ON public.applications(type);
CREATE INDEX IF NOT EXISTS idx_orders_type ON public.orders(type);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_product_id ON public.orders(product_id);
CREATE INDEX IF NOT EXISTS idx_memberships_group_user_id ON public.memberships(group_user_id);

COMMENT ON TABLE "public"."products" IS 'Base table for all purchasable items';
COMMENT ON TABLE "public"."membership_tiers" IS 'Extends products table with membership-specific fields';
COMMENT ON TABLE "public"."orders" IS 'Base table for all purchases';
COMMENT ON TABLE "public"."memberships" IS 'Extends orders table with membership-specific fields';
COMMENT ON TABLE "public"."applications" IS 'Generic applications table that can be used for memberships and other types of applications';
COMMENT ON VIEW "public"."membership_applications_view" IS 'Combines membership applications with their associated products, orders and user data'; 