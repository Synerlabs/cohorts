import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * API route to fetch organizations available for affiliation
 * This uses the server-side Supabase client with service role permissions
 * to bypass client-side permission restrictions 
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const groupId = searchParams.get('groupId');
  
  if (!userId || !groupId) {
    return NextResponse.json(
      { 
        error: 'Missing required parameters: userId and groupId are required' 
      }, 
      { status: 400 }
    );
  }
  
  // Create a Supabase client with the service role (server-side)
  const supabase = createRouteHandlerClient({ cookies });
  
  try {
    // First, get all organizations where the user is a member
    const { data: groupUsers, error: groupUsersError } = await supabase
      .from('group_users')
      .select('group_id')
      .eq('user_id', userId)
      .eq('is_active', true);
      
    if (groupUsersError) {
      console.error('Error fetching user groups:', groupUsersError);
      return NextResponse.json(
        { error: `Failed to fetch user organizations: ${groupUsersError.message}` }, 
        { status: 500 }
      );
    }

    // Get organizations created by the user
    const { data: ownedGroups, error: ownedGroupsError } = await supabase
      .from('group')
      .select('id, name')
      .eq('created_by', userId);
      
    if (ownedGroupsError) {
      console.error('Error fetching owned groups:', ownedGroupsError);
      return NextResponse.json(
        { error: `Failed to fetch owned organizations: ${ownedGroupsError.message}` }, 
        { status: 500 }
      );
    }
    
    // Get groups where the user has admin roles
    const { data: userRoles, error: userRolesError } = await supabase
      .from('user_roles')
      .select('group_role_id')
      .eq('user_id', userId)
      .eq('is_active', true);
    
    let adminGroupIds: string[] = [];
    
    if (!userRolesError && userRoles && userRoles.length > 0) {
      const roleIds = userRoles.map(r => r.group_role_id);
      
      const { data: groupRoles } = await supabase
        .from('group_roles')
        .select('id, group_id, role_name, permissions')
        .in('id', roleIds);
        
      if (groupRoles) {
        adminGroupIds = groupRoles
          .filter(role => 
            role.role_name.toLowerCase().includes('admin') || 
            role.role_name.toLowerCase().includes('owner') ||
            (role.permissions && (
              role.permissions.includes('admin') || 
              role.permissions.includes('group.admin') ||
              role.permissions.includes('group.edit')
            ))
          )
          .map(role => role.group_id);
      }
    }
    
    // Combine all group IDs and remove duplicates
    const memberGroupIds = groupUsers ? groupUsers.map(gu => gu.group_id) : [];
    const ownerGroupIds = ownedGroups ? ownedGroups.map(g => g.id) : [];
    let allGroupIds = [...new Set([...memberGroupIds, ...ownerGroupIds, ...adminGroupIds])];
    
    // Filter out the parent organization itself (prevent self-affiliation)
    allGroupIds = allGroupIds.filter(id => id !== groupId);
    
    // Get organizations that are already affiliated with the current organization
    // Check both parent->child and child->parent relationships
    const { data: parentChildAffiliations } = await supabase
      .from('group_organization')
      .select('child_group_id, is_active')
      .eq('parent_group_id', groupId);
      
    const { data: childParentAffiliations } = await supabase
      .from('group_organization')
      .select('parent_group_id, is_active')
      .eq('child_group_id', groupId);
      
    let activeAffiliationIds: string[] = [];
    
    // Get active child affiliations
    if (parentChildAffiliations && parentChildAffiliations.length > 0) {
      const activeChildIds = parentChildAffiliations
        .filter(rel => rel.is_active)
        .map(rel => rel.child_group_id);
        
      activeAffiliationIds = [...activeAffiliationIds, ...activeChildIds];
    }
    
    // Get active parent affiliations
    if (childParentAffiliations && childParentAffiliations.length > 0) {
      const activeParentIds = childParentAffiliations
        .filter(rel => rel.is_active)
        .map(rel => rel.parent_group_id);
        
      activeAffiliationIds = [...activeAffiliationIds, ...activeParentIds];
    }
    
    // Filter out already affiliated organizations
    if (activeAffiliationIds.length > 0) {
      allGroupIds = allGroupIds.filter(id => !activeAffiliationIds.includes(id));
    }
    
    // If there are no eligible organizations, return an empty array
    if (allGroupIds.length === 0) {
      return NextResponse.json({ organizations: [] });
    }
    
    // Get the organizations matching the filtered IDs
    const { data: orgs, error: orgsError } = await supabase
      .from('group')
      .select('id, name')
      .in('id', allGroupIds);
      
    if (orgsError) {
      console.error('Error fetching organizations:', orgsError);
      return NextResponse.json(
        { error: `Failed to fetch organizations: ${orgsError.message}` }, 
        { status: 500 }
      );
    }
    
    // Return the available organizations
    return NextResponse.json({ 
      organizations: orgs || [],
      debug: {
        userGroups: memberGroupIds,
        ownedGroups: ownerGroupIds,
        adminGroups: adminGroupIds,
        combinedGroupsBeforeFiltering: [...new Set([...memberGroupIds, ...ownerGroupIds, ...adminGroupIds])],
        affiliatedIds: activeAffiliationIds,
        filteredIds: allGroupIds
      }
    });
  } catch (error: any) {
    console.error('Error in available-for-affiliation route:', error);
    return NextResponse.json(
      { error: `An unexpected error occurred: ${error.message}` }, 
      { status: 500 }
    );
  }
} 