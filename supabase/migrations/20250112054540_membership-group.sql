alter table "public"."membership" disable row level security;

alter table "public"."user_membership" add column "group_id" uuid not null;

alter table "public"."user_membership" disable row level security;

alter table "public"."user_membership" add constraint "user_membership_group_id_fkey" FOREIGN KEY (group_id) REFERENCES "group"(id) not valid;

alter table "public"."user_membership" validate constraint "user_membership_group_id_fkey";


