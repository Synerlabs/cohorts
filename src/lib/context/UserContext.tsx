'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '../utils/supabase/client'
import { getUserPermissions } from '@/actions/user.actions'

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
    roles: SerializableRole[] // Include serializable role info
  }
}

type UserContextType = {
  user: SerializableUser | null
  groupPermissions: SerializableGroupPermissions
  isLoading: boolean
  refreshPermissions: () => Promise<void>
}

export const UserContext = createContext<UserContextType>({ 
  user: null,
  groupPermissions: {},
  isLoading: true,
  refreshPermissions: async () => {}
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
  initialGroupPermissions,
}: {
  children: React.ReactNode
  initialUser: SerializableUser | null
  initialGroupPermissions: SerializableGroupPermissions
}) {
  const [user, setUser] = useState<SerializableUser | null>(initialUser)
  const [groupPermissions, setGroupPermissions] = useState<SerializableGroupPermissions>(initialGroupPermissions)
  const [isLoading, setIsLoading] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Convert to serializable format
        const serializableUser: SerializableUser = {
          id: user.id,
          email: user.email,
          user_metadata: user.user_metadata,
          app_metadata: user.app_metadata,
        }
        setUser(serializableUser)
        
        // Refresh permissions when auth state changes
        refreshPermissions()
      } else {
        setUser(null)
        setGroupPermissions({})
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  // Function to refresh permissions
  const refreshPermissions = async () => {
    if (!user) {
      setGroupPermissions({})
      return
    }

    setIsLoading(true)
    try {
      const { groupPermissions: newPermissions } = await getUserPermissions(user.id)
      setGroupPermissions(newPermissions)
    } catch (error) {
      console.error('Error refreshing user permissions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <UserContext.Provider value={{ user, groupPermissions, isLoading, refreshPermissions }}>
      {children}
    </UserContext.Provider>
  )
} 