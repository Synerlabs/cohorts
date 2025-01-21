-- Drop any existing views to start fresh
DROP VIEW IF EXISTS membership_applications_view;

-- Create the final version of the view
CREATE VIEW membership_applications_view AS
SELECT 
  a.id,
  a.status,
  a.group_user_id,
  a.tier_id as product_id,
  a.order_id,
  a.approved_at,
  a.rejected_at,
  a.created_at as submitted_at,
  a.updated_at,
  a.type,
  gu.group_id,
  gu.user_id,
  jsonb_build_object(
    'id', u.id,
    'email', u.email,
    'full_name', COALESCE(pr.first_name || ' ' || pr.last_name, u.raw_user_meta_data->>'full_name')
  ) as user_data,
  p.name as product_name,
  p.price as product_price,
  p.currency as product_currency,
  mt.duration_months,
  mt.activation_type,
  jsonb_build_object(
    'name', p.name,
    'price', p.price,
    'currency', p.currency,
    'duration_months', mt.duration_months,
    'activation_type', mt.activation_type
  ) as product_data,
  CASE WHEN o.id IS NOT NULL THEN
    jsonb_build_object(
      'status', o.status,
      'amount', o.amount,
      'currency', o.currency,
      'completed_at', o.completed_at
    )
  ELSE NULL END as order_data,
  g.name as group_name,
  g.slug as group_slug
FROM applications a
JOIN group_users gu ON a.group_user_id = gu.id
JOIN auth.users u ON gu.user_id = u.id
LEFT JOIN public.profiles pr ON u.id = pr.id
JOIN products p ON a.tier_id = p.id
JOIN membership_tiers mt ON p.id = mt.product_id
JOIN public.group g ON gu.group_id = g.id
LEFT JOIN orders o ON a.order_id = o.id
WHERE a.type = 'membership';
