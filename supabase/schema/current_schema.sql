

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgsodium" WITH SCHEMA "pgsodium";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."app_permission" AS ENUM (
    'group.edit',
    'group.delete',
    'group.members.invite',
    'group.members.approve'
);


ALTER TYPE "public"."app_permission" OWNER TO "postgres";


CREATE TYPE "public"."group_role_type" AS ENUM (
    'GUEST',
    'MEMBER'
);


ALTER TYPE "public"."group_role_type" OWNER TO "postgres";


CREATE TYPE "public"."manual_payment_status" AS ENUM (
    'pending',
    'approved',
    'rejected'
);


ALTER TYPE "public"."manual_payment_status" OWNER TO "postgres";


CREATE TYPE "public"."membership_activation_type" AS ENUM (
    'automatic',
    'review_required',
    'payment_required',
    'review_then_payment'
);


ALTER TYPE "public"."membership_activation_type" OWNER TO "postgres";


CREATE TYPE "public"."payment_status" AS ENUM (
    'pending',
    'paid',
    'rejected'
);


ALTER TYPE "public"."payment_status" OWNER TO "postgres";


CREATE TYPE "public"."payment_type" AS ENUM (
    'manual',
    'stripe'
);


ALTER TYPE "public"."payment_type" OWNER TO "postgres";


CREATE TYPE "public"."storage_provider_type" AS ENUM (
    'google-drive',
    'blob-storage'
);


ALTER TYPE "public"."storage_provider_type" OWNER TO "postgres";


CREATE TYPE "public"."suborder_status" AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed',
    'cancelled'
);


ALTER TYPE "public"."suborder_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."approve_application"("p_application_id" "uuid", "p_new_status" "text", "p_should_activate" boolean, "p_approved_at" timestamp with time zone) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Update application status and approved_at timestamp
  UPDATE applications
  SET 
    status = p_new_status,
    approved_at = p_approved_at
  WHERE id = p_application_id;

  -- If should activate, update group_user is_active status
  IF p_should_activate THEN
    UPDATE group_users
    SET is_active = true
    WHERE id = (
      SELECT group_user_id 
      FROM applications 
      WHERE id = p_application_id
    );
  END IF;
END;
$$;


ALTER FUNCTION "public"."approve_application"("p_application_id" "uuid", "p_new_status" "text", "p_should_activate" boolean, "p_approved_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_payment"("p_application_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Update application
    UPDATE public.applications
    SET status = 'approved',
        approved_at = CURRENT_TIMESTAMP
    WHERE id = p_application_id;

    -- Update membership and activate
    UPDATE public.memberships m
    SET status = 'approved',
        is_active = true,
        start_date = CURRENT_DATE,
        approved_at = CURRENT_TIMESTAMP
    FROM public.applications a
    WHERE a.id = p_application_id
    AND a.group_user_id = m.group_user_id
    AND a.tier_id = m.tier_id;

    -- Activate group_user
    UPDATE public.group_users gu
    SET is_active = true
    FROM public.applications a
    WHERE a.id = p_application_id
    AND a.group_user_id = gu.id;
END;
$$;


ALTER FUNCTION "public"."complete_payment"("p_application_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_member_id"("p_group_id" "uuid", "p_format" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_sequence int;
  v_result text;
  v_year text;
  v_month text;
  v_day text;
  v_has_year boolean;
BEGIN
  -- Check if format contains any year token
  v_has_year := p_format LIKE '%{YYYY}%' OR p_format LIKE '%{YY}%';

  -- Get the next sequence number for this group
  WITH seq AS (
    SELECT COUNT(*) + 1 as next_seq
    FROM member_ids
    WHERE group_id = p_group_id
    AND (
      -- Only apply year filter if format includes year
      CASE WHEN v_has_year THEN
        created_at >= date_trunc('year', CURRENT_DATE)
      ELSE
        true
      END
    )
  )
  SELECT next_seq INTO v_sequence FROM seq;

  -- Get date components
  v_year := to_char(CURRENT_DATE, 'YYYY');
  v_month := to_char(CURRENT_DATE, 'MM');
  v_day := to_char(CURRENT_DATE, 'DD');

  -- Start with the format
  v_result := p_format;

  -- Replace tokens
  v_result := replace(v_result, '{YYYY}', v_year);
  v_result := replace(v_result, '{YY}', right(v_year, 2));
  v_result := replace(v_result, '{MM}', v_month);
  v_result := replace(v_result, '{DD}', v_day);

  -- Handle sequence with padding
  v_result := regexp_replace(
    v_result,
    '{SEQ:([0-9]+)}',
    lpad(v_sequence::text, regexp_replace(p_format, '.*{SEQ:([0-9]+)}.*', '\1')::int, '0')
  );

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."generate_member_id"("p_group_id" "uuid", "p_format" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_group_members"("group_id" "uuid") RETURNS TABLE("id" "uuid", "created_at" timestamp with time zone, "user_id" "uuid", "email" "text", "first_name" "text", "last_name" "text", "avatar_url" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
begin
  return query
  select 
    gu.id,
    gu.created_at,
    gu.user_id,
    u.email,
    p.first_name,
    p.last_name,
    p.avatar_url
  from group_users gu
  join auth.users u on u.id = gu.user_id
  join profiles p on p.id = u.id
  where gu.group_id = $1;
end;
$_$;


ALTER FUNCTION "public"."get_group_members"("group_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_membership"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_group_id uuid;
  v_member_id_format text;
  v_generated_member_id text;
  v_member_id_record uuid;
BEGIN
  -- Get the group_id from group_users
  SELECT group_id INTO v_group_id
  FROM group_users
  WHERE id = NEW.group_user_id;

  -- Get the member ID format from settings
  SELECT member_id_format INTO v_member_id_format
  FROM membership_tier_settings
  WHERE tier_id = NEW.tier_id;

  -- Generate the member ID
  v_generated_member_id := generate_member_id(v_group_id, v_member_id_format);

  -- Create member_id record
  INSERT INTO member_ids (member_id, group_user_id, group_id)
  VALUES (v_generated_member_id, NEW.group_user_id, v_group_id)
  RETURNING id INTO v_member_id_record;

  -- Create membership_member_ids record
  INSERT INTO membership_member_ids (membership_id, member_id_id)
  VALUES (NEW.id, v_member_id_record);

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_membership"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into public.profiles (id, first_name, last_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'last_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reject_application"("p_application_id" "uuid", "p_rejected_at" timestamp with time zone) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Update application status and rejected_at timestamp
  UPDATE applications
  SET 
    status = 'rejected',
    rejected_at = p_rejected_at
  WHERE id = p_application_id;

  -- Ensure group_user is not active
  UPDATE group_users
  SET is_active = false
  WHERE id = (
    SELECT group_user_id 
    FROM applications 
    WHERE id = p_application_id
  );
END;
$$;


ALTER FUNCTION "public"."reject_application"("p_application_id" "uuid", "p_rejected_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_set_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_set_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."applications" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "group_user_id" "uuid" NOT NULL,
    "tier_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "approved_at" timestamp with time zone,
    "rejected_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "order_id" "uuid",
    "type" "text" DEFAULT 'membership'::"text" NOT NULL,
    CONSTRAINT "applications_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'pending_payment'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."applications" OWNER TO "postgres";


COMMENT ON TABLE "public"."applications" IS 'Generic applications table that can be used for memberships and other types of applications';



CREATE TABLE IF NOT EXISTS "public"."group" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid" NOT NULL,
    "parent_id" "uuid" DEFAULT "gen_random_uuid"(),
    "alternate_name" "text",
    "type" "text"
);


ALTER TABLE "public"."group" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."group_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_id" "uuid",
    "role_name" "text",
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "permissions" "text"[],
    "type" "public"."group_role_type"
);


ALTER TABLE "public"."group_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."group_users" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "group_id" "uuid" NOT NULL,
    "is_active" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."group_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."manual_payments" (
    "payment_id" "uuid" NOT NULL,
    "notes" "text"
);


ALTER TABLE "public"."manual_payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."member_ids" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "member_id" "text" NOT NULL,
    "group_user_id" "uuid",
    "group_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."member_ids" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."membership_tiers" (
    "product_id" "uuid" NOT NULL,
    "duration_months" integer DEFAULT 1 NOT NULL,
    "activation_type" "text" NOT NULL,
    CONSTRAINT "membership_tiers_activation_type_check" CHECK (("activation_type" = ANY (ARRAY['automatic'::"text", 'review_required'::"text", 'payment_required'::"text", 'review_then_payment'::"text"]))),
    CONSTRAINT "membership_tiers_duration_months_check" CHECK (("duration_months" >= 1))
);


ALTER TABLE "public"."membership_tiers" OWNER TO "postgres";


COMMENT ON TABLE "public"."membership_tiers" IS 'Extends products table with membership-specific fields';



CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "type" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "text" NOT NULL,
    "amount" bigint NOT NULL,
    "currency" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "group_id" "uuid",
    CONSTRAINT "orders_amount_check" CHECK (("amount" >= 0)),
    CONSTRAINT "orders_currency_check" CHECK (("currency" = ANY (ARRAY['USD'::"text", 'EUR'::"text", 'GBP'::"text", 'CAD'::"text", 'AUD'::"text"]))),
    CONSTRAINT "orders_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "orders_type_check" CHECK (("type" = ANY (ARRAY['membership'::"text", 'subscription'::"text", 'one_time'::"text"])))
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


COMMENT ON TABLE "public"."orders" IS 'Base table for all purchases';



CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "type" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "price" bigint DEFAULT 0 NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "group_id" "uuid",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "products_currency_check" CHECK (("currency" = ANY (ARRAY['USD'::"text", 'EUR'::"text", 'GBP'::"text", 'CAD'::"text", 'AUD'::"text"]))),
    CONSTRAINT "products_price_check" CHECK (("price" >= 0)),
    CONSTRAINT "products_type_check" CHECK (("type" = ANY (ARRAY['membership_tier'::"text", 'subscription'::"text", 'one_time'::"text"])))
);


ALTER TABLE "public"."products" OWNER TO "postgres";


COMMENT ON TABLE "public"."products" IS 'Base table for all purchasable items';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "updated_at" timestamp with time zone,
    "username" "text",
    "first_name" "text",
    "last_name" "text",
    "avatar_url" "text",
    CONSTRAINT "username_length" CHECK (("char_length"("username") >= 3))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."membership_applications_view" AS
 SELECT "a"."id",
    "a"."status",
    "a"."group_user_id",
    "a"."tier_id" AS "product_id",
    "a"."order_id",
    "a"."approved_at",
    "a"."rejected_at",
    "a"."created_at" AS "submitted_at",
    "a"."updated_at",
    "a"."type",
    "gu"."group_id",
    "gu"."user_id",
    "jsonb_build_object"('id', "u"."id", 'email', "u"."email", 'full_name', COALESCE((("pr"."first_name" || ' '::"text") || "pr"."last_name"), ("u"."raw_user_meta_data" ->> 'full_name'::"text"))) AS "user_data",
    "p"."name" AS "product_name",
    "p"."price" AS "product_price",
    "p"."currency" AS "product_currency",
    "mt"."duration_months",
    "mt"."activation_type",
    "jsonb_build_object"('name', "p"."name", 'price', "p"."price", 'currency', "p"."currency", 'duration_months', "mt"."duration_months", 'activation_type', "mt"."activation_type") AS "product_data",
        CASE
            WHEN ("o"."id" IS NOT NULL) THEN "jsonb_build_object"('status', "o"."status", 'amount', "o"."amount", 'currency', "o"."currency", 'completed_at', "o"."completed_at")
            ELSE NULL::"jsonb"
        END AS "order_data",
    "g"."name" AS "group_name",
    "g"."slug" AS "group_slug"
   FROM ((((((("public"."applications" "a"
     JOIN "public"."group_users" "gu" ON (("a"."group_user_id" = "gu"."id")))
     JOIN "auth"."users" "u" ON (("gu"."user_id" = "u"."id")))
     LEFT JOIN "public"."profiles" "pr" ON (("u"."id" = "pr"."id")))
     JOIN "public"."products" "p" ON (("a"."tier_id" = "p"."id")))
     JOIN "public"."membership_tiers" "mt" ON (("p"."id" = "mt"."product_id")))
     JOIN "public"."group" "g" ON (("gu"."group_id" = "g"."id")))
     LEFT JOIN "public"."orders" "o" ON (("a"."order_id" = "o"."id")))
  WHERE ("a"."type" = 'membership'::"text");


ALTER TABLE "public"."membership_applications_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."membership_member_ids" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "membership_id" "uuid",
    "member_id_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."membership_member_ids" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."membership_tier_settings" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tier_id" "uuid" NOT NULL,
    "member_id_format" "text" DEFAULT 'MEM-{YYYY}-{SEQ:3}'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."membership_tier_settings" OWNER TO "postgres";


COMMENT ON COLUMN "public"."membership_tier_settings"."member_id_format" IS 'Format string for generating member IDs. Supports tokens: {YYYY}, {YY}, {MM}, {M}, {DD}, {D}, {SEQ:n} where n is padding length';



CREATE TABLE IF NOT EXISTS "public"."memberships" (
    "order_id" "uuid" NOT NULL,
    "group_user_id" "uuid" NOT NULL,
    "start_date" "date",
    "end_date" "date",
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "metadata" "jsonb",
    "tier_id" "uuid",
    "created_at" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text"),
    CONSTRAINT "memberships_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'expired'::"text", 'cancelled'::"text", 'suspended'::"text"])))
);


ALTER TABLE "public"."memberships" OWNER TO "postgres";


COMMENT ON TABLE "public"."memberships" IS 'Extends orders table with membership-specific fields';



CREATE TABLE IF NOT EXISTS "public"."org_storage_settings" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "provider_type" "public"."storage_provider_type" DEFAULT 'google-drive'::"public"."storage_provider_type" NOT NULL,
    "credentials" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "settings" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."org_storage_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_uploads" (
    "payment_id" "uuid" NOT NULL,
    "upload_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."payment_uploads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "public"."payment_type" NOT NULL,
    "amount" integer NOT NULL,
    "currency" "text" NOT NULL,
    "status" "public"."payment_status" DEFAULT 'pending'::"public"."payment_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "group_id" "uuid"
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stripe_connected_accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "account_id" "text",
    "country" "text" NOT NULL,
    "is_test_mode" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT false,
    "charges_enabled" boolean DEFAULT false,
    "payouts_enabled" boolean DEFAULT false,
    "has_external_account" boolean DEFAULT false,
    "capabilities_status" "jsonb" DEFAULT '{}'::"jsonb",
    "requirements_status" "jsonb" DEFAULT '{}'::"jsonb",
    "verification_status" "jsonb" DEFAULT '{}'::"jsonb",
    "disabled_reason" "text",
    "requirements_due_date" timestamp with time zone,
    "last_synced_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "stripe_connected_accounts_requirements_status_check" CHECK ((("requirements_status" ? 'currently_due'::"text") AND ("requirements_status" ? 'eventually_due'::"text") AND ("requirements_status" ? 'past_due'::"text"))),
    CONSTRAINT "stripe_connected_accounts_verification_status_check" CHECK ((("verification_status" ? 'fields_needed'::"text") AND ("verification_status" ? 'verified_fields'::"text")))
);


ALTER TABLE "public"."stripe_connected_accounts" OWNER TO "postgres";


COMMENT ON TABLE "public"."stripe_connected_accounts" IS 'Stores Stripe Connect accounts linked to organizations';



COMMENT ON COLUMN "public"."stripe_connected_accounts"."id" IS 'Unique identifier for the connected account record';



COMMENT ON COLUMN "public"."stripe_connected_accounts"."org_id" IS 'Reference to the organization';



COMMENT ON COLUMN "public"."stripe_connected_accounts"."account_id" IS 'Stripe Connect account ID (starts with acct_)';



COMMENT ON COLUMN "public"."stripe_connected_accounts"."country" IS 'Country code for the Stripe Connect account';



COMMENT ON COLUMN "public"."stripe_connected_accounts"."is_test_mode" IS 'Whether the account is in test mode';



COMMENT ON COLUMN "public"."stripe_connected_accounts"."is_active" IS 'Whether the account is fully verified and can process payments';



COMMENT ON COLUMN "public"."stripe_connected_accounts"."charges_enabled" IS 'Whether Stripe has enabled charges on the account';



COMMENT ON COLUMN "public"."stripe_connected_accounts"."payouts_enabled" IS 'Whether Stripe has enabled payouts on the account';



COMMENT ON COLUMN "public"."stripe_connected_accounts"."has_external_account" IS 'Whether the account has a connected external account (bank account)';



COMMENT ON COLUMN "public"."stripe_connected_accounts"."capabilities_status" IS 'JSON object containing the status of each capability (e.g., card_payments, transfers)';



COMMENT ON COLUMN "public"."stripe_connected_accounts"."requirements_status" IS 'JSON object containing arrays of requirements (currently_due, eventually_due, past_due)';



COMMENT ON COLUMN "public"."stripe_connected_accounts"."verification_status" IS 'JSON object containing verification fields status';



COMMENT ON COLUMN "public"."stripe_connected_accounts"."disabled_reason" IS 'Reason why the account is disabled by Stripe, if applicable';



COMMENT ON COLUMN "public"."stripe_connected_accounts"."requirements_due_date" IS 'Deadline for submitting pending requirements';



COMMENT ON COLUMN "public"."stripe_connected_accounts"."last_synced_at" IS 'When the account status was last synced with Stripe';



CREATE TABLE IF NOT EXISTS "public"."stripe_payments" (
    "payment_id" "uuid" NOT NULL,
    "stripe_payment_intent_id" "text",
    "stripe_payment_method" "text",
    "stripe_status" "text"
);


ALTER TABLE "public"."stripe_payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stripe_settings" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_test_mode" boolean DEFAULT false,
    "account_id" "text",
    "return_url" "text",
    "refresh_url" "text"
);


ALTER TABLE "public"."stripe_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."stripe_settings" IS 'Stores Stripe API keys and webhook secrets for organizations';



COMMENT ON COLUMN "public"."stripe_settings"."org_id" IS 'References the organization (group) this setting belongs to';



COMMENT ON COLUMN "public"."stripe_settings"."is_test_mode" IS 'Flag indicating whether the organization is using test mode';



CREATE TABLE IF NOT EXISTS "public"."suborders" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "status" "public"."suborder_status" DEFAULT 'pending'::"public"."suborder_status" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "amount" numeric NOT NULL,
    "currency" "text" NOT NULL,
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "failed_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    "type" "text" DEFAULT 'membership'::"text" NOT NULL,
    CONSTRAINT "suborders_type_check" CHECK (("type" = ANY (ARRAY['membership'::"text", 'product'::"text", 'event'::"text", 'promotion'::"text"])))
);


ALTER TABLE "public"."suborders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."uploads" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "module" character varying NOT NULL,
    "original_filename" character varying NOT NULL,
    "storage_path" character varying NOT NULL,
    "storage_provider" character varying NOT NULL,
    "file_url" character varying NOT NULL,
    "file_id" character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."uploads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "group_role_id" "uuid" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."group"
    ADD CONSTRAINT "group_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."group_roles"
    ADD CONSTRAINT "group_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."group_users"
    ADD CONSTRAINT "group_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."manual_payments"
    ADD CONSTRAINT "manual_payments_pkey" PRIMARY KEY ("payment_id");



ALTER TABLE ONLY "public"."member_ids"
    ADD CONSTRAINT "member_ids_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."member_ids"
    ADD CONSTRAINT "member_ids_unique_per_group" UNIQUE ("member_id", "group_id");



ALTER TABLE ONLY "public"."membership_member_ids"
    ADD CONSTRAINT "membership_member_ids_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."membership_member_ids"
    ADD CONSTRAINT "membership_member_ids_unique" UNIQUE ("membership_id", "member_id_id");



ALTER TABLE ONLY "public"."membership_tier_settings"
    ADD CONSTRAINT "membership_tier_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."membership_tier_settings"
    ADD CONSTRAINT "membership_tier_settings_tier_id_key" UNIQUE ("tier_id");



ALTER TABLE ONLY "public"."membership_tiers"
    ADD CONSTRAINT "membership_tiers_pkey" PRIMARY KEY ("product_id");



ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "memberships_id_key" UNIQUE ("id");



ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "memberships_pkey" PRIMARY KEY ("order_id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."org_storage_settings"
    ADD CONSTRAINT "org_storage_settings_org_id_key" UNIQUE ("org_id");



ALTER TABLE ONLY "public"."org_storage_settings"
    ADD CONSTRAINT "org_storage_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_uploads"
    ADD CONSTRAINT "payment_uploads_pkey" PRIMARY KEY ("payment_id", "upload_id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stripe_connected_accounts"
    ADD CONSTRAINT "stripe_connected_accounts_account_id_key" UNIQUE ("account_id");



ALTER TABLE ONLY "public"."stripe_connected_accounts"
    ADD CONSTRAINT "stripe_connected_accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stripe_payments"
    ADD CONSTRAINT "stripe_payments_pkey" PRIMARY KEY ("payment_id");



ALTER TABLE ONLY "public"."stripe_settings"
    ADD CONSTRAINT "stripe_settings_org_id_key" UNIQUE ("org_id");



ALTER TABLE ONLY "public"."stripe_settings"
    ADD CONSTRAINT "stripe_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."suborders"
    ADD CONSTRAINT "suborders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."uploads"
    ADD CONSTRAINT "uploads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



CREATE INDEX "group_users_group_id_user_id_idx" ON "public"."group_users" USING "btree" ("group_id", "user_id");



CREATE INDEX "idx_applications_order_id" ON "public"."applications" USING "btree" ("order_id");



CREATE INDEX "idx_applications_type" ON "public"."applications" USING "btree" ("type");



CREATE INDEX "idx_member_ids_group_id" ON "public"."member_ids" USING "btree" ("group_id");



CREATE INDEX "idx_membership_member_ids_member_id_id" ON "public"."membership_member_ids" USING "btree" ("member_id_id");



CREATE INDEX "idx_membership_member_ids_membership_id" ON "public"."membership_member_ids" USING "btree" ("membership_id");



CREATE INDEX "idx_memberships_group_user_id" ON "public"."memberships" USING "btree" ("group_user_id");



CREATE INDEX "idx_memberships_order_id" ON "public"."memberships" USING "btree" ("order_id");



CREATE INDEX "idx_memberships_status" ON "public"."memberships" USING "btree" ("status");



CREATE INDEX "idx_memberships_tier_id" ON "public"."memberships" USING "btree" ("tier_id");



CREATE INDEX "idx_orders_status" ON "public"."orders" USING "btree" ("status");



CREATE INDEX "idx_orders_type" ON "public"."orders" USING "btree" ("type");



CREATE INDEX "idx_orders_user_id" ON "public"."orders" USING "btree" ("user_id");



CREATE INDEX "idx_payments_group_id" ON "public"."payments" USING "btree" ("group_id");



CREATE INDEX "idx_products_group_id" ON "public"."products" USING "btree" ("group_id");



CREATE INDEX "idx_products_is_active" ON "public"."products" USING "btree" ("is_active");



CREATE INDEX "idx_products_type" ON "public"."products" USING "btree" ("type");



CREATE INDEX "idx_stripe_connected_accounts_account_id" ON "public"."stripe_connected_accounts" USING "btree" ("account_id");



CREATE INDEX "idx_stripe_connected_accounts_org_id" ON "public"."stripe_connected_accounts" USING "btree" ("org_id");



CREATE INDEX "idx_suborders_order_id" ON "public"."suborders" USING "btree" ("order_id");



CREATE INDEX "idx_suborders_product_id" ON "public"."suborders" USING "btree" ("product_id");



CREATE INDEX "idx_suborders_status" ON "public"."suborders" USING "btree" ("status");



CREATE INDEX "payment_uploads_payment_id_idx" ON "public"."payment_uploads" USING "btree" ("payment_id");



CREATE INDEX "payment_uploads_upload_id_idx" ON "public"."payment_uploads" USING "btree" ("upload_id");



CREATE INDEX "payments_order_id_idx" ON "public"."payments" USING "btree" ("order_id");



CREATE INDEX "payments_status_idx" ON "public"."payments" USING "btree" ("status");



CREATE INDEX "payments_type_idx" ON "public"."payments" USING "btree" ("type");



CREATE INDEX "payments_user_id_idx" ON "public"."payments" USING "btree" ("user_id");



CREATE INDEX "stripe_settings_org_id_idx" ON "public"."stripe_settings" USING "btree" ("org_id");



CREATE INDEX "uploads_module_idx" ON "public"."uploads" USING "btree" ("module");



CREATE OR REPLACE TRIGGER "create_member_id_for_new_membership" AFTER INSERT ON "public"."memberships" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_membership"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."stripe_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "orders_updated_at" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "products_updated_at" BEFORE UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "set_timestamp" BEFORE UPDATE ON "public"."membership_tier_settings" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_timestamp_uploads" BEFORE UPDATE ON "public"."uploads" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "update_member_ids_updated_at" BEFORE UPDATE ON "public"."member_ids" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_membership_member_ids_updated_at" BEFORE UPDATE ON "public"."membership_member_ids" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_payments_updated_at" BEFORE UPDATE ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_group_user_id_fkey" FOREIGN KEY ("group_user_id") REFERENCES "public"."group_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id");



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_roles"
    ADD CONSTRAINT "group_roles_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."group"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_users"
    ADD CONSTRAINT "group_users_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."group"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_users"
    ADD CONSTRAINT "group_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."manual_payments"
    ADD CONSTRAINT "manual_payments_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."member_ids"
    ADD CONSTRAINT "member_ids_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."group"("id");



ALTER TABLE ONLY "public"."membership_member_ids"
    ADD CONSTRAINT "membership_member_ids_member_id_id_fkey" FOREIGN KEY ("member_id_id") REFERENCES "public"."member_ids"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."membership_member_ids"
    ADD CONSTRAINT "membership_member_ids_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."membership_tier_settings"
    ADD CONSTRAINT "membership_tier_settings_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "public"."membership_tiers"("product_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."membership_tiers"
    ADD CONSTRAINT "membership_tiers_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "memberships_group_user_id_fkey" FOREIGN KEY ("group_user_id") REFERENCES "public"."group_users"("id");



ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "memberships_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id");



ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "memberships_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "public"."membership_tiers"("product_id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."group"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."org_storage_settings"
    ADD CONSTRAINT "org_storage_settings_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."group"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_uploads"
    ADD CONSTRAINT "payment_uploads_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_uploads"
    ADD CONSTRAINT "payment_uploads_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "public"."uploads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."group"("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."group"("id");



ALTER TABLE ONLY "public"."stripe_connected_accounts"
    ADD CONSTRAINT "stripe_connected_accounts_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."group"("id");



ALTER TABLE ONLY "public"."stripe_payments"
    ADD CONSTRAINT "stripe_payments_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stripe_settings"
    ADD CONSTRAINT "stripe_settings_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."group"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."suborders"
    ADD CONSTRAINT "suborders_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."suborders"
    ADD CONSTRAINT "suborders_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_group_role_id_fkey" FOREIGN KEY ("group_role_id") REFERENCES "public"."group_roles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Allow read access to authenticated users" ON "public"."member_ids" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow read access to authenticated users" ON "public"."membership_member_ids" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow read access to authenticated users" ON "public"."memberships" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow read access to authenticated users" ON "public"."suborders" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow service role full access" ON "public"."member_ids" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Allow service role full access" ON "public"."membership_member_ids" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Allow service role full access" ON "public"."memberships" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Allow service role full access" ON "public"."suborders" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Enable insert access for authenticated users" ON "public"."orders" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Enable read access for authenticated users" ON "public"."orders" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Enable update access for authenticated users" ON "public"."orders" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Organization admins can manage storage settings" ON "public"."org_storage_settings" USING ((EXISTS ( SELECT 1
   FROM "public"."group_users"
  WHERE (("group_users"."group_id" = "org_storage_settings"."org_id") AND ("group_users"."user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
           FROM ("public"."user_roles"
             JOIN "public"."group_roles" ON (("group_roles"."id" = "user_roles"."group_role_id")))
          WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("group_roles"."type" = 'MEMBER'::"public"."group_role_type"))))))));



CREATE POLICY "Organization members can view storage settings" ON "public"."org_storage_settings" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."group_users"
  WHERE (("group_users"."group_id" = "org_storage_settings"."org_id") AND ("group_users"."user_id" = "auth"."uid"())))));



CREATE POLICY "Service role can read stripe settings" ON "public"."stripe_settings" FOR SELECT USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can update stripe settings" ON "public"."stripe_settings" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Users can view their own manual payments" ON "public"."manual_payments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."payments" "p"
  WHERE (("p"."id" = "manual_payments"."payment_id") AND ("p"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own payments" ON "public"."payments" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own stripe payments" ON "public"."stripe_payments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."payments" "p"
  WHERE (("p"."id" = "stripe_payments"."payment_id") AND ("p"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their payment uploads" ON "public"."payment_uploads" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."payments" "p"
  WHERE (("p"."id" = "payment_uploads"."payment_id") AND ("p"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view uploads linked to their payments" ON "public"."uploads" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."payment_uploads" "pu"
     JOIN "public"."payments" "p" ON (("p"."id" = "pu"."payment_id")))
  WHERE (("pu"."upload_id" = "uploads"."id") AND ("p"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."manual_payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."member_ids" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."membership_member_ids" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."memberships" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."org_storage_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_uploads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stripe_payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stripe_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."suborders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."uploads" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";


























































































































































































GRANT ALL ON FUNCTION "public"."approve_application"("p_application_id" "uuid", "p_new_status" "text", "p_should_activate" boolean, "p_approved_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."approve_application"("p_application_id" "uuid", "p_new_status" "text", "p_should_activate" boolean, "p_approved_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."approve_application"("p_application_id" "uuid", "p_new_status" "text", "p_should_activate" boolean, "p_approved_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."complete_payment"("p_application_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."complete_payment"("p_application_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."complete_payment"("p_application_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_member_id"("p_group_id" "uuid", "p_format" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_member_id"("p_group_id" "uuid", "p_format" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_member_id"("p_group_id" "uuid", "p_format" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_group_members"("group_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_group_members"("group_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_group_members"("group_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_membership"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_membership"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_membership"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."reject_application"("p_application_id" "uuid", "p_rejected_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."reject_application"("p_application_id" "uuid", "p_rejected_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."reject_application"("p_application_id" "uuid", "p_rejected_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_set_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_set_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_set_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."applications" TO "anon";
GRANT ALL ON TABLE "public"."applications" TO "authenticated";
GRANT ALL ON TABLE "public"."applications" TO "service_role";



GRANT ALL ON TABLE "public"."group" TO "anon";
GRANT ALL ON TABLE "public"."group" TO "authenticated";
GRANT ALL ON TABLE "public"."group" TO "service_role";



GRANT ALL ON TABLE "public"."group_roles" TO "anon";
GRANT ALL ON TABLE "public"."group_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."group_roles" TO "service_role";



GRANT ALL ON TABLE "public"."group_users" TO "anon";
GRANT ALL ON TABLE "public"."group_users" TO "authenticated";
GRANT ALL ON TABLE "public"."group_users" TO "service_role";



GRANT ALL ON TABLE "public"."manual_payments" TO "anon";
GRANT ALL ON TABLE "public"."manual_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."manual_payments" TO "service_role";



GRANT ALL ON TABLE "public"."member_ids" TO "anon";
GRANT ALL ON TABLE "public"."member_ids" TO "authenticated";
GRANT ALL ON TABLE "public"."member_ids" TO "service_role";



GRANT ALL ON TABLE "public"."membership_tiers" TO "anon";
GRANT ALL ON TABLE "public"."membership_tiers" TO "authenticated";
GRANT ALL ON TABLE "public"."membership_tiers" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."membership_applications_view" TO "anon";
GRANT ALL ON TABLE "public"."membership_applications_view" TO "authenticated";
GRANT ALL ON TABLE "public"."membership_applications_view" TO "service_role";



GRANT ALL ON TABLE "public"."membership_member_ids" TO "anon";
GRANT ALL ON TABLE "public"."membership_member_ids" TO "authenticated";
GRANT ALL ON TABLE "public"."membership_member_ids" TO "service_role";



GRANT ALL ON TABLE "public"."membership_tier_settings" TO "anon";
GRANT ALL ON TABLE "public"."membership_tier_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."membership_tier_settings" TO "service_role";



GRANT ALL ON TABLE "public"."memberships" TO "anon";
GRANT ALL ON TABLE "public"."memberships" TO "authenticated";
GRANT ALL ON TABLE "public"."memberships" TO "service_role";



GRANT ALL ON TABLE "public"."org_storage_settings" TO "anon";
GRANT ALL ON TABLE "public"."org_storage_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."org_storage_settings" TO "service_role";



GRANT ALL ON TABLE "public"."payment_uploads" TO "anon";
GRANT ALL ON TABLE "public"."payment_uploads" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_uploads" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."stripe_connected_accounts" TO "anon";
GRANT ALL ON TABLE "public"."stripe_connected_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."stripe_connected_accounts" TO "service_role";



GRANT ALL ON TABLE "public"."stripe_payments" TO "anon";
GRANT ALL ON TABLE "public"."stripe_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."stripe_payments" TO "service_role";



GRANT ALL ON TABLE "public"."stripe_settings" TO "anon";
GRANT ALL ON TABLE "public"."stripe_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."stripe_settings" TO "service_role";



GRANT ALL ON TABLE "public"."suborders" TO "anon";
GRANT ALL ON TABLE "public"."suborders" TO "authenticated";
GRANT ALL ON TABLE "public"."suborders" TO "service_role";



GRANT ALL ON TABLE "public"."uploads" TO "anon";
GRANT ALL ON TABLE "public"."uploads" TO "authenticated";
GRANT ALL ON TABLE "public"."uploads" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
