-- Add is_super_admin column to group_roles table
ALTER TABLE group_roles ADD COLUMN is_super_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- Update existing super_admin roles
UPDATE group_roles SET is_super_admin = TRUE WHERE role_name = 'super_admin'; 