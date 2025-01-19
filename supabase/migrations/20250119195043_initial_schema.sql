-- Create ENUMs
CREATE TYPE "public"."app_permission" AS ENUM (
    'group.edit',
    'group.delete',
    'group.members.invite',
    'group.members.approve'
);

CREATE TYPE "public"."group_role_type" AS ENUM (
    'GUEST',
    'MEMBER'
);

CREATE TYPE "public"."membership_activation_type" AS ENUM (
    'automatic',
    'review_required',
    'payment_required',
    'review_then_payment'
);

-- Create Functions
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

CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into public.profiles (id, first_name, last_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'last_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$;

-- Create trigger for new user profiles
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Create Tables
CREATE TABLE IF NOT EXISTS "public"."applications" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "group_user_id" "uuid" NOT NULL,
    "tier_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "approved_at" timestamp with time zone,
    "rejected_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "applications_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'pending_payment'::"text", 'approved'::"text", 'rejected'::"text"])))
);

CREATE TABLE IF NOT EXISTS "public"."group_users" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "group_id" "uuid" NOT NULL,
    "is_active" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."membership_tier" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "group_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "price" numeric(10,2) NOT NULL,
    "activation_type" "text" DEFAULT 'review_required'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "duration_months" integer DEFAULT 1 NOT NULL,
    CONSTRAINT "membership_tier_activation_type_check" CHECK (("activation_type" = ANY (ARRAY['automatic'::"text", 'review_required'::"text", 'payment_required'::"text", 'review_then_payment'::"text"]))),
    CONSTRAINT "membership_tier_duration_months_check" CHECK (("duration_months" >= 1))
);

CREATE TABLE IF NOT EXISTS "public"."memberships" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "group_user_id" "uuid" NOT NULL,
    "tier_id" "uuid" NOT NULL,
    "start_date" "date",
    "end_date" "date",
    "is_active" boolean DEFAULT false NOT NULL,
    "status" text DEFAULT 'pending'::text NOT NULL,
    "approved_at" timestamp with time zone,
    "rejected_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "memberships_status_check" CHECK (("status" = ANY (ARRAY['pending'::text, 'pending_payment'::text, 'approved'::text, 'rejected'::text])))
);

CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "updated_at" timestamp with time zone,
    "username" "text",
    "first_name" "text",
    "last_name" "text",
    "avatar_url" "text",
    CONSTRAINT "username_length" CHECK (("char_length"("username") >= 3))
);

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

CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "group_role_id" "uuid" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."member_ids" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "group_user_id" "uuid" NOT NULL,
    "member_id" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

-- Create Views
CREATE OR REPLACE VIEW "public"."applications_view" AS
 SELECT "a"."id",
    "gu"."user_id",
    "a"."tier_id",
    "gu"."group_id",
    "m"."is_active",
    "a"."created_at",
    "a"."approved_at",
    "a"."rejected_at",
    "jsonb_build_object"('id', "u"."id", 'email', "u"."email", 'full_name', "concat_ws"(' '::"text", "p"."first_name", "p"."last_name")) AS "user_data",
    "jsonb_build_object"('id', "mt"."id", 'name', "mt"."name", 'price', "mt"."price", 'activation_type', "mt"."activation_type", 'duration_months', "mt"."duration_months") AS "tier_data",
    "jsonb_build_object"('id', "mt"."id", 'name', "mt"."name", 'price', "mt"."price", 'activation_type', "mt"."activation_type", 'duration_months', "mt"."duration_months") AS "membership_data"
   FROM ((((("public"."applications" "a"
     JOIN "public"."group_users" "gu" ON (("a"."group_user_id" = "gu"."id")))
     LEFT JOIN "public"."memberships" "m" ON ((("a"."group_user_id" = "m"."group_user_id") AND ("a"."tier_id" = "m"."tier_id"))))
     JOIN "auth"."users" "u" ON (("gu"."user_id" = "u"."id")))
     JOIN "public"."profiles" "p" ON (("u"."id" = "p"."id")))
     JOIN "public"."membership_tier" "mt" ON (("a"."tier_id" = "mt"."id")));

-- Add Primary Keys and Foreign Keys
ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."group_users"
    ADD CONSTRAINT "group_users_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."group_users"
    ADD CONSTRAINT "group_users_group_id_user_id_key" UNIQUE ("group_id", "user_id");

ALTER TABLE ONLY "public"."membership_tier"
    ADD CONSTRAINT "membership_tier_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "memberships_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."group"
    ADD CONSTRAINT "group_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."group_roles"
    ADD CONSTRAINT "group_roles_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."member_ids"
    ADD CONSTRAINT "member_ids_pkey" PRIMARY KEY ("id");

-- Add Foreign Key Constraints
ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_group_user_id_fkey" FOREIGN KEY ("group_user_id") REFERENCES "public"."group_users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "public"."membership_tier"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."group_users"
    ADD CONSTRAINT "group_users_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."group"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."group_users"
    ADD CONSTRAINT "group_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."membership_tier"
    ADD CONSTRAINT "membership_tier_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."group"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "memberships_group_user_id_fkey" FOREIGN KEY ("group_user_id") REFERENCES "public"."group_users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "memberships_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "public"."membership_tier"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."member_ids"
    ADD CONSTRAINT "member_ids_group_user_id_fkey" FOREIGN KEY ("group_user_id") REFERENCES "public"."group_users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_group_role_id_fkey" FOREIGN KEY ("group_role_id") REFERENCES "public"."group_roles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."group_roles"
    ADD CONSTRAINT "group_roles_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."group"("id") ON DELETE CASCADE;

-- Disable RLS on tables
ALTER TABLE "public"."group_users" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."group_roles" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_roles" DISABLE ROW LEVEL SECURITY;

-- Function to approve application
CREATE OR REPLACE FUNCTION public.approve_application(
    p_application_id uuid,
    p_new_status text,
    p_should_activate boolean
) RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
AS $$
BEGIN
    -- Update application
    UPDATE public.applications
    SET status = p_new_status,
        approved_at = CASE WHEN p_new_status = 'approved' THEN CURRENT_TIMESTAMP ELSE NULL END
    WHERE id = p_application_id;

    -- Update membership
    UPDATE public.memberships m
    SET status = p_new_status,
        is_active = CASE WHEN p_should_activate THEN true ELSE is_active END,
        start_date = CASE WHEN p_should_activate THEN CURRENT_DATE ELSE start_date END,
        approved_at = CASE WHEN p_new_status = 'approved' THEN CURRENT_TIMESTAMP ELSE NULL END
    FROM public.applications a
    WHERE a.id = p_application_id
    AND a.group_user_id = m.group_user_id
    AND a.tier_id = m.tier_id;

    -- Update group_user if activating
    IF p_should_activate THEN
        UPDATE public.group_users gu
        SET is_active = true
        FROM public.applications a
        WHERE a.id = p_application_id
        AND a.group_user_id = gu.id;
    END IF;
END;
$$;

-- Function to complete payment
CREATE OR REPLACE FUNCTION public.complete_payment(
    p_application_id uuid
) RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
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

-- Function to reject application
CREATE OR REPLACE FUNCTION public.reject_application(
    p_application_id uuid
) RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
AS $$
BEGIN
    -- Update application
    UPDATE public.applications
    SET status = 'rejected',
        rejected_at = CURRENT_TIMESTAMP
    WHERE id = p_application_id;

    -- Update membership
    UPDATE public.memberships m
    SET status = 'rejected',
        rejected_at = CURRENT_TIMESTAMP
    FROM public.applications a
    WHERE a.id = p_application_id
    AND a.group_user_id = m.group_user_id
    AND a.tier_id = m.tier_id;
END;
$$;
