create type "public"."group_role_type" as enum ('GUEST', 'MEMBER');

alter table "public"."group_users" drop constraint "group_users_group_id_key";

drop index if exists "public"."group_users_group_id_key";

alter table "public"."group_roles" add column "type" group_role_type;

alter table "public"."user_roles" add column "is_active" boolean;
