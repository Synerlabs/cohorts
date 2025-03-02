-- Update membership_activation_type enum to include new values
ALTER TYPE public.membership_activation_type ADD VALUE IF NOT EXISTS 'form_required';
ALTER TYPE public.membership_activation_type ADD VALUE IF NOT EXISTS 'form_then_payment';
ALTER TYPE public.membership_activation_type ADD VALUE IF NOT EXISTS 'form_then_review';
ALTER TYPE public.membership_activation_type ADD VALUE IF NOT EXISTS 'form_then_payment_then_review';
ALTER TYPE public.membership_activation_type ADD VALUE IF NOT EXISTS 'form_then_review_then_payment';

-- Update the check constraint on the membership_tiers table
ALTER TABLE public.membership_tiers DROP CONSTRAINT IF EXISTS membership_tiers_activation_type_check;
ALTER TABLE public.membership_tiers ADD CONSTRAINT membership_tiers_activation_type_check 
CHECK (activation_type IN (
    'automatic', 
    'review_required', 
    'payment_required', 
    'review_then_payment',
    'form_required',
    'form_then_payment',
    'form_then_review',
    'form_then_payment_then_review',
    'form_then_review_then_payment'
));

-- Update any existing views that depend on this enum
DROP VIEW IF EXISTS membership_applications_view;
CREATE OR REPLACE VIEW "public"."membership_applications_view" AS
SELECT 
    a.id as application_id,
    a.status,
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

COMMENT ON VIEW "public"."membership_applications_view" IS 'Combines membership applications with their associated products, orders and user data'; 