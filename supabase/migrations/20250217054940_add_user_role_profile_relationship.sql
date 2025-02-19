alter table "public"."user_roles" add constraint "user_roles_user_id_fkey1" FOREIGN KEY (user_id) REFERENCES profiles(id) not valid;

alter table "public"."user_roles" validate constraint "user_roles_user_id_fkey1";

alter table "public"."products" add column "is_deleted" boolean;

alter table "public"."products" add column "deleted_at" timestamp without time zone;

alter table "public"."products" add column "deleted_by" uuid;

alter table "public"."products" add constraint "products_deleted_by_fkey" FOREIGN KEY (deleted_by) REFERENCES profiles(id) not valid;

alter table "public"."products" validate constraint "products_deleted_by_fkey";