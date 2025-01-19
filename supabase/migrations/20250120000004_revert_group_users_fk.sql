-- Drop the auth.users foreign key constraint
alter table "public"."group_users" drop constraint if exists "group_users_user_id_fkey";

-- Add back the profiles foreign key constraint
alter table "public"."group_users" add constraint "group_users_user_id_fkey" 
  foreign key (user_id) references profiles(id) on delete cascade; 