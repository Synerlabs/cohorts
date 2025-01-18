create table "public"."group" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "slug" text not null,
    "description" text,
    "created_at" timestamp with time zone not null default now(),
    "created_by" uuid not null,
    "parent_id" uuid default gen_random_uuid()
);


alter table "public"."group" enable row level security;

CREATE UNIQUE INDEX group_pkey ON public."group" USING btree (id);

CREATE UNIQUE INDEX group_slug_key ON public."group" USING btree (slug);

alter table "public"."group" add constraint "group_pkey" PRIMARY KEY using index "group_pkey";

alter table "public"."group" add constraint "group_slug_key" UNIQUE using index "group_slug_key";

alter table "public"."group" add constraint "public_group_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."group" validate constraint "public_group_created_by_fkey";

grant delete on table "public"."group" to "anon";

grant insert on table "public"."group" to "anon";

grant references on table "public"."group" to "anon";

grant select on table "public"."group" to "anon";

grant trigger on table "public"."group" to "anon";

grant truncate on table "public"."group" to "anon";

grant update on table "public"."group" to "anon";

grant delete on table "public"."group" to "authenticated";

grant insert on table "public"."group" to "authenticated";

grant references on table "public"."group" to "authenticated";

grant select on table "public"."group" to "authenticated";

grant trigger on table "public"."group" to "authenticated";

grant truncate on table "public"."group" to "authenticated";

grant update on table "public"."group" to "authenticated";

grant delete on table "public"."group" to "service_role";

grant insert on table "public"."group" to "service_role";

grant references on table "public"."group" to "service_role";

grant select on table "public"."group" to "service_role";

grant trigger on table "public"."group" to "service_role";

grant truncate on table "public"."group" to "service_role";

grant update on table "public"."group" to "service_role";
