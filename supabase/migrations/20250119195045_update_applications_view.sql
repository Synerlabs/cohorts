-- Drop existing view
DROP VIEW IF EXISTS "public"."applications_view";

-- Recreate view with group information
CREATE OR REPLACE VIEW "public"."applications_view" AS
 SELECT DISTINCT ON (a.id) 
    "a"."id",
    "gu"."user_id",
    "a"."tier_id",
    "gu"."group_id",
    "m"."is_active",
    "a"."created_at",
    "a"."approved_at",
    "a"."rejected_at",
    "a"."status",
    "jsonb_build_object"('id', "u"."id", 'email', "u"."email", 'full_name', "concat_ws"(' '::"text", "p"."first_name", "p"."last_name")) AS "user_data",
    "jsonb_build_object"('id', "mt"."id", 'name', "mt"."name", 'price', "mt"."price", 'activation_type', "mt"."activation_type", 'duration_months', "mt"."duration_months") AS "tier_data",
    "g"."slug" as "group_slug",
    "jsonb_build_object"('id', "g"."id", 'name', "g"."name", 'slug', "g"."slug") AS "group"
   FROM "public"."applications" "a"
     JOIN "public"."group_users" "gu" ON "a"."group_user_id" = "gu"."id"
     LEFT JOIN "public"."memberships" "m" ON "a"."group_user_id" = "m"."group_user_id" AND "a"."tier_id" = "m"."tier_id"
     JOIN "auth"."users" "u" ON "gu"."user_id" = "u"."id"
     JOIN "public"."profiles" "p" ON "u"."id" = "p"."id"
     JOIN "public"."membership_tier" "mt" ON "a"."tier_id" = "mt"."id"
     JOIN "public"."group" "g" ON "gu"."group_id" = "g"."id"
   ORDER BY "a"."id", "a"."created_at" DESC; 