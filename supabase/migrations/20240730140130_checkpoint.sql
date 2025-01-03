alter table "public"."user_roles" drop constraint "public_user_roles_user_id_fkey";

create table "public"."group_users" (
    "id" uuid not null default gen_random_uuid(),
    "group_id" uuid default gen_random_uuid(),
    "user_id" uuid default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "created_by" uuid default auth.uid()
);


alter table "public"."group_users" enable row level security;


CREATE UNIQUE INDEX group_users_group_id_key ON public.group_users USING btree (group_id);

CREATE UNIQUE INDEX group_users_pkey ON public.group_users USING btree (id);

alter table "public"."group_users" add constraint "group_users_pkey" PRIMARY KEY using index "group_users_pkey";

alter table "public"."group_users" add constraint "group_users_group_id_key" UNIQUE using index "group_users_group_id_key";

alter table "public"."group_users" add constraint "public_group_users_group_id_fkey" FOREIGN KEY (group_id) REFERENCES "group"(id) not valid;

alter table "public"."group_users" validate constraint "public_group_users_group_id_fkey";

alter table "public"."group_users" add constraint "public_group_users_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) not valid;

alter table "public"."group_users" validate constraint "public_group_users_user_id_fkey";

alter table "public"."user_roles" add constraint "public_user_roles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) not valid;

alter table "public"."user_roles" validate constraint "public_user_roles_user_id_fkey";

grant delete on table "public"."group_users" to "anon";

grant insert on table "public"."group_users" to "anon";

grant references on table "public"."group_users" to "anon";

grant select on table "public"."group_users" to "anon";

grant trigger on table "public"."group_users" to "anon";

grant truncate on table "public"."group_users" to "anon";

grant update on table "public"."group_users" to "anon";

grant delete on table "public"."group_users" to "authenticated";

grant insert on table "public"."group_users" to "authenticated";

grant references on table "public"."group_users" to "authenticated";

grant select on table "public"."group_users" to "authenticated";

grant trigger on table "public"."group_users" to "authenticated";

grant truncate on table "public"."group_users" to "authenticated";

grant update on table "public"."group_users" to "authenticated";

grant delete on table "public"."group_users" to "service_role";

grant insert on table "public"."group_users" to "service_role";

grant references on table "public"."group_users" to "service_role";

grant select on table "public"."group_users" to "service_role";

grant trigger on table "public"."group_users" to "service_role";

grant truncate on table "public"."group_users" to "service_role";

grant update on table "public"."group_users" to "service_role";
