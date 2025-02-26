-- Create table for membership tier roles
CREATE TABLE IF NOT EXISTS "public"."membership_tier_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tier_id" "uuid" NOT NULL,
    "group_role_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    PRIMARY KEY ("id"),
    FOREIGN KEY ("tier_id") REFERENCES "public"."membership_tiers"("product_id") ON DELETE CASCADE,
    FOREIGN KEY ("group_role_id") REFERENCES "public"."group_roles"("id") ON DELETE CASCADE,
    FOREIGN KEY ("deleted_by") REFERENCES "auth"."users"("id"),
    UNIQUE ("tier_id", "group_role_id")
);

-- Create a view to get user's membership roles
CREATE OR REPLACE VIEW "public"."membership_roles_view" AS
SELECT DISTINCT
    gu.user_id,
    gr.id as role_id,
    gr.role_name,
    gr.permissions,
    gr.group_id,
    m.id as membership_id,
    m.status as membership_status,
    p.name as tier_name
FROM "public"."group_users" gu
JOIN "public"."memberships" m ON m.group_user_id = gu.id
JOIN "public"."membership_tiers" mt ON mt.product_id = m.tier_id
JOIN "public"."products" p ON p.id = mt.product_id
JOIN "public"."membership_tier_roles" mtr ON mtr.tier_id = mt.product_id
JOIN "public"."group_roles" gr ON gr.id = mtr.group_role_id
WHERE m.status = 'active'
AND gu.is_active = true
AND mtr.deleted_at IS NULL; 