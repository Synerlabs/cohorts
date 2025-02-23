'use client'

import { createContext, useContext } from 'react'
import type { Database } from '@/lib/types/database.types'

type Group = Database['public']['Tables']['group']['Row']

type OrgContextType = {
  org: Group | null
  groupPermissions: {
    permissions: string[]
    roles: {
      id: string
      group_roles: {
        id: string
        role_name: string | null
        permissions: string[] | null
        is_super_admin: boolean
      } | null
    }[]
  } | null
}

export const OrgContext = createContext<OrgContextType>({
  org: null,
  groupPermissions: null
})

export const useOrg = () => {
  const context = useContext(OrgContext)
  if (context === undefined) {
    throw new Error('useOrg must be used within an OrgProvider')
  }
  return context
}

export function OrgProvider({
  children,
  org,
  groupPermissions,
}: {
  children: React.ReactNode
  org: Group | null
  groupPermissions: OrgContextType['groupPermissions']
}) {
  return (
    <OrgContext.Provider value={{ org, groupPermissions }}>
      {children}
    </OrgContext.Provider>
  )
} 