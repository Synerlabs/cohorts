import UserPermissionsExample from '@/components/UserPermissionsExample'
import { createClient } from '@/lib/utils/supabase/server'

// This is a Server Component
export default async function GroupPage({
  params,
}: {
  params: { groupId: string }
}) {
  const supabase = await createClient()
  
  // Fetch group data server-side
  const { data: group, error } = await supabase
    .from('groups')
    .select('*')
    .eq('id', params.groupId)
    .single()
  
  if (error || !group) {
    return <div>Group not found</div>
  }
  
  return (
    <div>
      <h1>{group.name}</h1>
      <p>{group.description}</p>
      
      {/* UserPermissionsExample is a Client Component that uses the UserContext */}
      <UserPermissionsExample groupId={params.groupId} />
    </div>
  )
} 