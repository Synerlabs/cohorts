'use client'

import { useUser } from '@/lib/context/UserContext'

export default function UserPermissionsExample({ groupId }: { groupId: string }) {
  const { user, groupPermissions, isLoading, refreshPermissions } = useUser()
  
  if (isLoading) {
    return <div>Loading permissions...</div>
  }
  
  if (!user) {
    return <div>Please log in to view this content</div>
  }
  
  // Check if user has permissions for this group
  const groupData = groupPermissions[groupId]
  if (!groupData) {
    return <div>You don&apos;t have access to this group</div>
  }
  
  // Check if user has specific permission
  const canViewContent = groupData.permissions.includes('view_content') || 
                         groupData.permissions.includes('*')
  
  // Check if user has admin role (using full role data)
  const isAdmin = groupData.roles.some(role => 
    role.is_active && role.is_super_admin
  )
  
  return (
    <div>
      <h2>Welcome, {user.email}</h2>
      <div>
        <button 
          onClick={() => refreshPermissions()}
          className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Refresh Permissions
        </button>
        
        <div className="mb-4">
          <h3>Your Roles:</h3>
          <ul>
            {groupData.roles.map(role => (
              <li key={role.id} className={role.is_active ? 'text-green-600' : 'text-red-600'}>
                {role.role_name} {role.is_super_admin && '(Admin)'} 
                {!role.is_active && ' (Inactive)'}
              </li>
            ))}
          </ul>
        </div>
        
        {canViewContent && (
          <div>
            <h3>Content</h3>
            <p>This content is only visible to users with the &apos;view_content&apos; permission</p>
          </div>
        )}
        
        {isAdmin && (
          <div>
            <h3>Admin Section</h3>
            <p>This content is only visible to administrators</p>
          </div>
        )}
      </div>
    </div>
  )
} 