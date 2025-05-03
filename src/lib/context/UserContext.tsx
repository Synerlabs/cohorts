'use client'

import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react'
import { createClient } from '../utils/supabase/client'
import { getUserPermissions } from '@/actions/user.actions'
import type { User } from '@supabase/supabase-js'

// Debug flag - set to false to disable logging
const DEBUG_MODE = false

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
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const supabase = createClient()

  const refreshPermissions = useCallback(async (targetUserId?: string) => {
    const userIdToFetch = targetUserId || user?.id
    if (!userIdToFetch) {
      DEBUG_MODE && console.log('[UserProvider] refreshPermissions called with no user ID, clearing permissions.')
      setGroupPermissions({})
      return
    }

    DEBUG_MODE && console.log(`[UserProvider] Refreshing permissions for user: ${userIdToFetch}`)
    setIsRefreshing(true)
    try {
      const { groupPermissions: newPermissions } = await getUserPermissions(userIdToFetch)
      DEBUG_MODE && console.log('[UserProvider] Fetched permissions')
      setGroupPermissions(newPermissions)
    } catch (error) {
      console.error('[UserProvider] Error refreshing user permissions:', error)
      setGroupPermissions({})
    } finally {
      setIsRefreshing(false)
    }
  }, [user?.id])

  useEffect(() => {
    let isMounted = true
    DEBUG_MODE && console.log('[UserProvider] Setting up onAuthStateChange listener.')

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return
        DEBUG_MODE && console.log(`[UserProvider] onAuthStateChange event: ${event}`)
        
        const authUser = session?.user

        if (authUser) {
          const needsUpdate = user?.id !== authUser.id
          DEBUG_MODE && console.log(`[UserProvider] Auth user found. Needs update: ${needsUpdate}`)
          
          const serializableUser: SerializableUser = {
            id: authUser.id,
            email: authUser.email,
            user_metadata: authUser.user_metadata,
            app_metadata: authUser.app_metadata,
          }
          
          setUser(serializableUser)

          if (needsUpdate || user === null) {
            await refreshPermissions(authUser.id)
          } else {
            DEBUG_MODE && console.log('[UserProvider] User ID same as current, skipping permission refresh.')
          }
          
        } else {
          DEBUG_MODE && console.log('[UserProvider] No auth user found, clearing state.')
          setUser(null)
          setGroupPermissions({})
        }
        
        setIsLoading(false)
      }
    )

    return () => {
      isMounted = false
      DEBUG_MODE && console.log('[UserProvider] Unsubscribing from onAuthStateChange.')
      subscription.unsubscribe()
    }
  }, [supabase, refreshPermissions, user])

  const value = useMemo(() => ({
    user,
    groupPermissions,
    isLoading: isLoading,
    refreshPermissions
  }), [user, groupPermissions, isLoading, refreshPermissions])

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  )
} 