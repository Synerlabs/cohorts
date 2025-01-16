-- Add approved_at column to user_membership table
alter table "public"."user_membership" add column if not exists "approved_at" timestamptz;

-- Update RLS policies
alter table "public"."user_membership" disable row level security;
alter table "public"."user_membership" enable row level security; 