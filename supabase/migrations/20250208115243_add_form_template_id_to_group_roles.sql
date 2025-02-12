-- Add unique constraint to group_users
ALTER TABLE "public"."group_users"
ADD CONSTRAINT "group_users_user_id_group_id_key" UNIQUE ("user_id", "group_id"); 