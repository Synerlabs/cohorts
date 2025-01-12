export interface GroupRole {
  id: string;
  group_id: string;
  role_name: string;
  description: string | null;
  created_at: string;
  created_by: string;
  permissions: string[];
  type: 'group_role_type';
  // Membership specific fields
  price?: number;
  duration_months?: number;
  is_membership?: boolean;
}

export interface GroupUser {
  id: string;
  group_id: string;
  user_id: string;
  created_at: string;
  created_by: string;
  is_active: boolean;
} 