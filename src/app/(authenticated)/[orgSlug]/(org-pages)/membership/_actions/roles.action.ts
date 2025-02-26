'use server';

import { createClient } from "@/lib/utils/supabase/server";
import { Database } from "@/lib/types/database.types";

export type GroupRole = Database['public']['Tables']['group_roles']['Row'];

export async function getRolesAction(groupId: string): Promise<GroupRole[]> {
  const supabase = await createClient();
  
  const { data: roleData, error } = await supabase
    .from('group_roles')
    .select('*')
    .eq('group_id', groupId)
    .eq('is_super_admin', false);

  if (error) {
    console.error('Error fetching roles:', error);
    throw new Error('Failed to load roles');
  }

  return roleData || [];
} 