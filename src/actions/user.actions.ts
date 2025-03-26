'use server'

import { createClient } from '@/lib/utils/supabase/server'
import { getUserRoles } from '@/services/user.service'
import { Database } from '@/lib/types/database.types'

type GroupRole = Database['public']['Tables']['group_roles']['Row']
type UserRole = Database['public']['Tables']['user_roles']['Row'] & {
  group_roles: GroupRole | null
}

type SerializableUser = {
  id: string
  email?: string | undefined
  user_metadata: Record<string, any>
  app_metadata: Record<string, any>
}

// Serializable version of a role (without circular references)
type SerializableRole = {
  id: string
  is_active: boolean
  role_name: string
  is_super_admin: boolean
}

type SerializableGroupPermissions = {
  [groupId: string]: {
    permissions: string[]
    roleIds: string[]
    roles: SerializableRole[] // Add serializable role info
  }
}

export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return { user: null, groupPermissions: {} }
  
  // Create a serializable version of the user
  const serializableUser: SerializableUser = {
    id: user.id,
    email: user.email,
    user_metadata: user.user_metadata,
    app_metadata: user.app_metadata,
  }
  
  return { user: serializableUser }
}

export async function getUserPermissions(userId: string) {
  if (!userId) return { groupPermissions: {} }
  
  try {
    // Fetch user roles
    const userRoles = await getUserRoles({ id: userId, groupId: '*' })
    
    // Convert to serializable format
    const groupPermissions: SerializableGroupPermissions = userRoles.reduce((acc, role) => {
      if (!role.group_roles?.group_id) return acc;
      
      const groupId = role.group_roles.group_id;
      if (!acc[groupId]) {
        acc[groupId] = {
          permissions: [],
          roleIds: [],
          roles: []
        };
      }

      // Add role ID to group
      acc[groupId].roleIds.push(role.id);
      
      // Add serializable role object with just the important data
      acc[groupId].roles.push({
        id: role.id,
        is_active: role.is_active,
        role_name: role.group_roles.role_name || '',
        is_super_admin: role.group_roles.is_super_admin || false
      });

      // Add permissions if role is active
      if (role.is_active) {
        if (role.group_roles.is_super_admin) {
          acc[groupId].permissions.push('*');
        } else if (role.group_roles.permissions) {
          acc[groupId].permissions.push(...role.group_roles.permissions);
        }
      }

      return acc;
    }, {} as SerializableGroupPermissions);
    
    return { groupPermissions }
  } catch (error) {
    console.error('Error fetching user permissions:', error)
    return { groupPermissions: {} }
  }
} 