

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


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



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


CREATE TYPE "public"."membership_activation_type" AS ENUM (
    'automatic',
    'review_required',
    'payment_required',
    'review_then_payment'
);


ALTER TYPE "public"."membership_activation_type" OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";

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
    CONSTRAINT "applications_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."applications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."group_users" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "group_id" "uuid" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."group_users" OWNER TO "postgres";


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


ALTER TABLE "public"."membership_tier" OWNER TO "postgres";


COMMENT ON COLUMN "public"."membership_tier"."duration_months" IS 'Duration of the membership in months, minimum 1 month';



CREATE TABLE IF NOT EXISTS "public"."memberships" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "group_user_id" "uuid" NOT NULL,
    "tier_id" "uuid" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."memberships" OWNER TO "postgres";


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


ALTER TABLE "public"."applications_view" OWNER TO "postgres";


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


CREATE TABLE IF NOT EXISTS "public"."member_ids" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "group_user_id" "uuid" NOT NULL,
    "member_id" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."member_ids" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."membership_role" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "membership_id" "uuid" NOT NULL,
    "group_role_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."membership_role" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."role_permissions" (
    "id" bigint NOT NULL,
    "role_id" "uuid" NOT NULL,
    "permission" "public"."app_permission" NOT NULL
);


ALTER TABLE "public"."role_permissions" OWNER TO "postgres";


ALTER TABLE "public"."role_permissions" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."role_permissions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "group_role_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "is_active" boolean
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."group"
    ADD CONSTRAINT "group_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."group_roles"
    ADD CONSTRAINT "group_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."group"
    ADD CONSTRAINT "group_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."group_users"
    ADD CONSTRAINT "group_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."group_users"
    ADD CONSTRAINT "group_users_unique_user_group" UNIQUE ("user_id", "group_id");



ALTER TABLE ONLY "public"."member_ids"
    ADD CONSTRAINT "member_ids_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."member_ids"
    ADD CONSTRAINT "member_ids_unique_per_group" UNIQUE ("group_user_id", "member_id");



ALTER TABLE ONLY "public"."membership_role"
    ADD CONSTRAINT "membership_role_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."membership_role"
    ADD CONSTRAINT "membership_role_unique" UNIQUE ("membership_id", "group_role_id");



ALTER TABLE ONLY "public"."membership_tier"
    ADD CONSTRAINT "membership_tier_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "memberships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_role_permission_key" UNIQUE ("role_id", "permission");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_id_key" UNIQUE ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("group_role_id", "user_id");



CREATE OR REPLACE TRIGGER "applications_updated_at" BEFORE UPDATE ON "public"."applications" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "group_users_updated_at" BEFORE UPDATE ON "public"."group_users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "member_ids_updated_at" BEFORE UPDATE ON "public"."member_ids" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "memberships_updated_at" BEFORE UPDATE ON "public"."memberships" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_group_user_id_fkey" FOREIGN KEY ("group_user_id") REFERENCES "public"."group_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "public"."membership_tier"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."group_users"
    ADD CONSTRAINT "group_users_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."group"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_users"
    ADD CONSTRAINT "group_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."member_ids"
    ADD CONSTRAINT "member_ids_group_user_id_fkey" FOREIGN KEY ("group_user_id") REFERENCES "public"."group_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."membership_role"
    ADD CONSTRAINT "membership_role_group_role_id_fkey" FOREIGN KEY ("group_role_id") REFERENCES "public"."group_roles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."membership_tier"
    ADD CONSTRAINT "membership_tier_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."group"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "memberships_group_user_id_fkey" FOREIGN KEY ("group_user_id") REFERENCES "public"."group_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "memberships_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "public"."membership_tier"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group"
    ADD CONSTRAINT "public_group_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."group_roles"
    ADD CONSTRAINT "public_group_roles_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."group"("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "public_role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."group_roles"("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "public_user_roles_group_role_id_fkey" FOREIGN KEY ("group_role_id") REFERENCES "public"."group_roles"("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "public_user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



CREATE POLICY "Enable insert for authenticated users only" ON "public"."group" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Group admins can manage all group users" ON "public"."group_users" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."user_roles" "ur"
     JOIN "public"."group_roles" "gr" ON (("ur"."group_role_id" = "gr"."id")))
  WHERE ((("ur"."user_id")::"text" = ("auth"."uid"())::"text") AND ("gr"."group_id" = "group_users"."group_id") AND ("gr"."role_name" = 'admin'::"text") AND ("ur"."is_active" = true)))));



CREATE POLICY "Group admins can manage applications" ON "public"."applications" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ((("public"."group_users" "gu"
     JOIN "public"."user_roles" "ur" ON (("ur"."user_id" = "auth"."uid"())))
     JOIN "public"."group_roles" "gr" ON (("gr"."id" = "ur"."group_role_id")))
     JOIN "public"."role_permissions" "rp" ON (("rp"."role_id" = "gr"."id")))
  WHERE (("gu"."id" = "applications"."group_user_id") AND ("gr"."group_id" = "gu"."group_id") AND ("rp"."permission" = 'group.members.approve'::"public"."app_permission") AND ("ur"."is_active" = true)))));



CREATE POLICY "Group admins can view all applications" ON "public"."applications" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (("public"."group_users" "gu"
     JOIN "public"."user_roles" "ur" ON (("ur"."user_id" = "auth"."uid"())))
     JOIN "public"."group_roles" "gr" ON (("ur"."group_role_id" = "gr"."id")))
  WHERE (("gu"."id" = "applications"."group_user_id") AND ("gr"."group_id" = "gu"."group_id") AND ("gr"."role_name" = 'admin'::"text") AND ("ur"."is_active" = true)))));



CREATE POLICY "Group admins can view all member IDs" ON "public"."member_ids" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (("public"."group_users" "gu"
     JOIN "public"."user_roles" "ur" ON (("ur"."user_id" = "auth"."uid"())))
     JOIN "public"."group_roles" "gr" ON (("ur"."group_role_id" = "gr"."id")))
  WHERE (("gu"."id" = "member_ids"."group_user_id") AND ("gr"."group_id" = "gu"."group_id") AND ("gr"."role_name" = 'admin'::"text") AND ("ur"."is_active" = true)))));



CREATE POLICY "Group admins can view all memberships" ON "public"."memberships" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (("public"."group_users" "gu"
     JOIN "public"."user_roles" "ur" ON (("ur"."user_id" = "auth"."uid"())))
     JOIN "public"."group_roles" "gr" ON (("ur"."group_role_id" = "gr"."id")))
  WHERE (("gu"."id" = "memberships"."group_user_id") AND ("gr"."group_id" = "gu"."group_id") AND ("gr"."role_name" = 'admin'::"text") AND ("ur"."is_active" = true)))));



CREATE POLICY "Public profiles are viewable by everyone." ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Service role can manage all applications" ON "public"."applications" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage all group users" ON "public"."group_users" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Users can create their own applications" ON "public"."applications" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."group_users" "gu"
  WHERE (("gu"."id" = "applications"."group_user_id") AND ("gu"."user_id" = "auth"."uid"()) AND ("gu"."is_active" = false)))));



CREATE POLICY "Users can insert their own group associations" ON "public"."group_users" FOR INSERT TO "authenticated" WITH CHECK ((("user_id")::"text" = ("auth"."uid"())::"text"));



CREATE POLICY "Users can insert their own profile." ON "public"."profiles" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Users can update own profile." ON "public"."profiles" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Users can view their own applications" ON "public"."applications" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."group_users" "gu"
  WHERE (("gu"."id" = "applications"."group_user_id") AND ("gu"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own group associations" ON "public"."group_users" FOR SELECT TO "authenticated" USING ((("user_id")::"text" = ("auth"."uid"())::"text"));



CREATE POLICY "Users can view their own member IDs" ON "public"."member_ids" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."group_users" "gu"
  WHERE (("gu"."id" = "member_ids"."group_user_id") AND ("gu"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own memberships" ON "public"."memberships" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."group_users" "gu"
  WHERE (("gu"."id" = "memberships"."group_user_id") AND ("gu"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."applications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."group_users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."member_ids" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."membership_role" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."memberships" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."get_group_members"("group_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_group_members"("group_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_group_members"("group_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";



GRANT ALL ON TABLE "public"."applications" TO "anon";
GRANT ALL ON TABLE "public"."applications" TO "authenticated";
GRANT ALL ON TABLE "public"."applications" TO "service_role";



GRANT ALL ON TABLE "public"."group_users" TO "anon";
GRANT ALL ON TABLE "public"."group_users" TO "authenticated";
GRANT ALL ON TABLE "public"."group_users" TO "service_role";



GRANT ALL ON TABLE "public"."membership_tier" TO "anon";
GRANT ALL ON TABLE "public"."membership_tier" TO "authenticated";
GRANT ALL ON TABLE "public"."membership_tier" TO "service_role";



GRANT ALL ON TABLE "public"."memberships" TO "anon";
GRANT ALL ON TABLE "public"."memberships" TO "authenticated";
GRANT ALL ON TABLE "public"."memberships" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."applications_view" TO "anon";
GRANT ALL ON TABLE "public"."applications_view" TO "authenticated";
GRANT ALL ON TABLE "public"."applications_view" TO "service_role";



GRANT ALL ON TABLE "public"."group" TO "anon";
GRANT ALL ON TABLE "public"."group" TO "authenticated";
GRANT ALL ON TABLE "public"."group" TO "service_role";



GRANT ALL ON TABLE "public"."group_roles" TO "anon";
GRANT ALL ON TABLE "public"."group_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."group_roles" TO "service_role";



GRANT ALL ON TABLE "public"."member_ids" TO "anon";
GRANT ALL ON TABLE "public"."member_ids" TO "authenticated";
GRANT ALL ON TABLE "public"."member_ids" TO "service_role";



GRANT ALL ON TABLE "public"."membership_role" TO "anon";
GRANT ALL ON TABLE "public"."membership_role" TO "authenticated";
GRANT ALL ON TABLE "public"."membership_role" TO "service_role";



GRANT ALL ON TABLE "public"."role_permissions" TO "anon";
GRANT ALL ON TABLE "public"."role_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."role_permissions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."role_permissions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."role_permissions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."role_permissions_id_seq" TO "service_role";



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
