'use client'

import { User } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '../utils/supabase/client'
import { getUserRoles } from '@/services/user.service'
import { Database } from '@/lib/types/database.types'

type GroupRole = Database['public']['Tables']['group_roles']['Row']
type UserRole = Database['public']['Tables']['user_roles']['Row'] & {
  group_roles: GroupRole | null
}

type GroupPermissions = {
  [groupId: string]: {
    permissions: string[]
    roles: UserRole[]
  }
}

type UserContextType = {
  user: User | null
  groupPermissions: GroupPermissions
}

export const UserContext = createContext<UserContextType>({ 
  user: null,
  groupPermissions: {}
})

export const useUser = () => {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}

export function UserProvider({
  children,
  initialUser,
  initialRoles,
  initialPermissions,
}: {
  children: React.ReactNode
  initialUser: User | null
  initialRoles: UserRole[]
  initialPermissions: string[]
}) {
  const [user, setUser] = useState<User | null>(initialUser)
  const [groupPermissions, setGroupPermissions] = useState<GroupPermissions>(() => {
    // Group initial roles and permissions by group ID
    return initialRoles.reduce((acc, role) => {
      if (!role.group_roles?.group_id) return acc;
      
      const groupId = role.group_roles.group_id;
      if (!acc[groupId]) {
        acc[groupId] = {
          permissions: [],
          roles: []
        };
      }

      // Add role to group
      acc[groupId].roles.push(role);

      // Add permissions if role is active
      if (role.is_active) {
        if (role.group_roles.is_super_admin) {
          acc[groupId].permissions.push('*');
        } else if (role.group_roles.permissions) {
          acc[groupId].permissions.push(...role.group_roles.permissions);
        }
      }

      return acc;
    }, {} as GroupPermissions);
  })

  const supabase = createClient()

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  // Fetch roles and permissions when user changes
  useEffect(() => {
    async function fetchUserRolesAndPermissions() {
      if (!user) {
        setGroupPermissions({})
        return
      }

      try {
        // Get all roles for all groups the user belongs to
        const userRoles = await getUserRoles({ id: user.id, groupId: '*' })
        
        // Group roles and permissions by group ID
        const newGroupPermissions = userRoles.reduce((acc, role) => {
          if (!role.group_roles?.group_id) return acc;
          
          const groupId = role.group_roles.group_id;
          if (!acc[groupId]) {
            acc[groupId] = {
              permissions: [],
              roles: []
            };
          }

          // Add role to group
          acc[groupId].roles.push(role);

          // Add permissions if role is active
          if (role.is_active) {
            if (role.group_roles.is_super_admin) {
              acc[groupId].permissions.push('*');
            } else if (role.group_roles.permissions) {
              acc[groupId].permissions.push(...role.group_roles.permissions);
            }
          }

          return acc;
        }, {} as GroupPermissions);

        setGroupPermissions(newGroupPermissions)
      } catch (error) {
        console.error('Error fetching user roles:', error)
        setGroupPermissions({})
      }
    }

    fetchUserRolesAndPermissions()
  }, [user])

  return (
    <UserContext.Provider value={{ user, groupPermissions }}>
      {children}
    </UserContext.Provider>
  )
} 