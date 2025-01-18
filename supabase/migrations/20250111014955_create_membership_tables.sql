-- Create membership table
create table "public"."membership" (
    "id" uuid not null default gen_random_uuid(),
    "group_id" uuid not null,
    "name" text not null,
    "description" text,
    "price" decimal(10,2) not null default 0,
    "duration_months" integer not null default 1,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "created_by" uuid not null default auth.uid()
);

-- Create membership_roles junction table
create table "public"."membership_role" (
    "id" uuid not null default gen_random_uuid(),
    "membership_id" uuid not null,
    "group_role_id" uuid not null,
    "created_at" timestamp with time zone not null default now()
);

-- Create user_membership table
create table "public"."user_membership" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "membership_id" uuid not null,
    "starts_at" timestamp with time zone not null default now(),
    "expires_at" timestamp with time zone,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "created_by" uuid not null default auth.uid()
);

-- Add primary keys
alter table "public"."membership" add constraint "membership_pkey" primary key ("id");
alter table "public"."membership_role" add constraint "membership_role_pkey" primary key ("id");
alter table "public"."user_membership" add constraint "user_membership_pkey" primary key ("id");

-- Add foreign key constraints
alter table "public"."membership" add constraint "membership_group_id_fkey"
    foreign key ("group_id") references "public"."group"(id) on delete cascade;
alter table "public"."membership" add constraint "membership_created_by_fkey"
    foreign key ("created_by") references "public".profiles(id);

alter table "public"."membership_role" add constraint "membership_role_membership_id_fkey"
    foreign key ("membership_id") references "public".membership(id) on delete cascade;
alter table "public"."membership_role" add constraint "membership_role_group_role_id_fkey"
    foreign key ("group_role_id") references "public".group_roles(id) on delete cascade;

alter table "public"."user_membership" add constraint "user_membership_user_id_fkey"
    foreign key ("user_id") references "public".profiles(id);
alter table "public"."user_membership" add constraint "user_membership_membership_id_fkey"
    foreign key ("membership_id") references "public".membership(id) on delete cascade;
alter table "public"."user_membership" add constraint "user_membership_created_by_fkey"
    foreign key ("created_by") references "public".profiles(id);

-- Add unique constraints
alter table "public"."membership_role" add constraint "membership_role_unique"
    unique ("membership_id", "group_role_id");

-- Enable RLS
alter table "public"."membership" enable row level security;
alter table "public"."membership_role" enable row level security;
alter table "public"."user_membership" enable row level security;

-- Grant permissions
grant delete, insert, references, select, trigger, truncate, update on table "public"."membership" to "anon";
grant delete, insert, references, select, trigger, truncate, update on table "public"."membership" to "authenticated";
grant delete, insert, references, select, trigger, truncate, update on table "public"."membership" to "service_role";

grant delete, insert, references, select, trigger, truncate, update on table "public"."membership_role" to "anon";
grant delete, insert, references, select, trigger, truncate, update on table "public"."membership_role" to "authenticated";
grant delete, insert, references, select, trigger, truncate, update on table "public"."membership_role" to "service_role";

grant delete, insert, references, select, trigger, truncate, update on table "public"."user_membership" to "anon";
grant delete, insert, references, select, trigger, truncate, update on table "public"."user_membership" to "authenticated";
grant delete, insert, references, select, trigger, truncate, update on table "public"."user_membership" to "service_role"; 