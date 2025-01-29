-- Drop the unique constraint on group_users table
ALTER TABLE group_users DROP CONSTRAINT IF EXISTS group_users_group_id_user_id_key;

-- Add an index for performance (without uniqueness)
DROP INDEX IF EXISTS group_users_group_id_user_id_idx;
CREATE INDEX group_users_group_id_user_id_idx ON group_users(group_id, user_id);
