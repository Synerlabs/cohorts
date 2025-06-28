-- Add email column to profiles table
ALTER TABLE "public"."profiles" ADD COLUMN "email" text;

-- Update existing profiles with email from auth.users
UPDATE "public"."profiles" 
SET "email" = "auth"."users"."email"
FROM "auth"."users" 
WHERE "public"."profiles"."id" = "auth"."users"."id";

-- Create index for better performance on email lookups
CREATE INDEX IF NOT EXISTS "profiles_email_idx" ON "public"."profiles" ("email");

-- Update the handle_new_user function to include email
CREATE OR REPLACE FUNCTION "public"."handle_new_user"() 
RETURNS "trigger"
LANGUAGE "plpgsql" 
SECURITY DEFINER
AS $$
begin
  insert into public.profiles (id, first_name, last_name, avatar_url, email)
  values (
    new.id, 
    new.raw_user_meta_data->>'first_name', 
    new.raw_user_meta_data->>'last_name', 
    new.raw_user_meta_data->>'avatar_url',
    new.email
  );
  return new;
end;
$$;

-- Create function to handle email updates
CREATE OR REPLACE FUNCTION "public"."handle_user_email_update"() 
RETURNS "trigger"
LANGUAGE "plpgsql" 
SECURITY DEFINER
AS $$
begin
  -- Only update if email actually changed
  if old.email is distinct from new.email then
    update public.profiles 
    set email = new.email, updated_at = now()
    where id = new.id;
  end if;
  return new;
end;
$$;

-- Create trigger for email updates
CREATE TRIGGER on_auth_user_email_updated
    AFTER UPDATE OF email ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_user_email_update();

-- Create RPC function to sync all emails (for one-time sync or maintenance)
CREATE OR REPLACE FUNCTION "public"."sync_profile_emails"()
RETURNS integer
LANGUAGE "plpgsql"
SECURITY DEFINER
AS $$
DECLARE
  updated_count integer := 0;
BEGIN
  UPDATE public.profiles 
  SET email = auth_users.email, updated_at = now()
  FROM auth.users auth_users
  WHERE profiles.id = auth_users.id 
  AND (profiles.email IS NULL OR profiles.email != auth_users.email);
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- Grant execute permission on the RPC to authenticated users
GRANT EXECUTE ON FUNCTION "public"."sync_profile_emails"() TO authenticated;
GRANT EXECUTE ON FUNCTION "public"."sync_profile_emails"() TO service_role;