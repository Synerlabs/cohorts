alter table "public"."user_roles" add constraint "user_roles_user_id_fkey1" FOREIGN KEY (user_id) REFERENCES profiles(id) not valid;

alter table "public"."user_roles" validate constraint "user_roles_user_id_fkey1";