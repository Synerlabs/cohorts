-- Add rejected_at column to user_membership table
alter table "public"."user_membership" 
add column "rejected_at" timestamptz; 