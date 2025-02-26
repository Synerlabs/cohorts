'use server';

import { createClient } from "@/lib/utils/supabase/server";
import { Database } from "@/lib/types/database.types";

export type GroupRole = Database['public']['Tables']['group_roles']['Row'];

export async function getRolesAction(groupId: string): Promise<GroupRole[]> {
  const supabase = await createClient();
  
  const { data: roleData, error } = await supabase
    .from('group_roles')
    .select(`
      id,
      role_name,
      permissions,
      description,
      type,
      is_super_admin,
      created_at,
      group_id
    `)
    .eq('group_id', groupId)
    .eq('is_super_admin', false);

  if (error) {
    console.error('Error fetching roles:', error);
    throw new Error('Failed to load roles');
  }

  // Ensure we only return serializable data
  return (roleData || []).map(role => ({
    id: role.id,
    role_name: role.role_name,
    permissions: role.permissions || [],
    description: role.description,
    type: role.type,
    is_super_admin: role.is_super_admin,
    created_at: role.created_at,
    group_id: role.group_id,
    created_by: null // Explicitly set to null since we don't need it
  }));
} 