import { createClient } from "@/lib/utils/supabase/server";
import { cookies } from "next/headers";
import { OrganizationMembership, OrganizationMembershipView } from '@/types/database.types';
import { mapPagination } from '@/lib/utils/pagination';

// Get all organization memberships for an organization (as host or member)
export async function getOrganizationMemberships(organizationId: string, role: 'host' | 'member' | 'both' = 'both') {
  try {
    const supabase = await createClient();
    
    let query = supabase
      .from("organization_membership_view")
      .select("*");
    
    if (role === 'host') {
      query = query.eq("host_organization_id", organizationId);
    } else if (role === 'member') {
      query = query.eq("member_organization_id", organizationId);
    } else {
      query = query.or(`host_organization_id.eq.${organizationId},member_organization_id.eq.${organizationId}`);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error("Error fetching organization memberships:", error);
      return { error: error.message };
    }
    
    return { data };
  } catch (error) {
    console.error("Error in getOrganizationMemberships:", error);
    return { error: "Failed to fetch organization memberships" };
  }
}

// Get organizations where the given organization is a member
export async function getHostOrganizations(memberOrganizationId: string) {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from("organization_membership_view")
      .select("*")
      .eq("member_organization_id", memberOrganizationId)
      .eq("is_active", true);
    
    if (error) {
      console.error("Error fetching host organizations:", error);
      return { error: error.message };
    }
    
    return { data };
  } catch (error) {
    console.error("Error in getHostOrganizations:", error);
    return { error: "Failed to fetch host organizations" };
  }
}

// Get organizations that are members of the given organization
export async function getMemberOrganizations(hostOrganizationId: string) {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from("organization_membership_view")
      .select("*")
      .eq("host_organization_id", hostOrganizationId)
      .eq("is_active", true);
    
    if (error) {
      console.error("Error fetching member organizations:", error);
      return { error: error.message };
    }
    
    return { data };
  } catch (error) {
    console.error("Error in getMemberOrganizations:", error);
    return { error: "Failed to fetch member organizations" };
  }
}

// Create an organization membership
export async function createOrganizationMembership(membership: {
  host_organization_id: string;
  member_organization_id: string;
  membership_tier_id: string;
  status?: string;
  is_active?: boolean;
  metadata?: Record<string, any>;
  created_by: string;
}) {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from("organization_membership")
      .insert({
        host_organization_id: membership.host_organization_id,
        member_organization_id: membership.member_organization_id,
        membership_tier_id: membership.membership_tier_id,
        status: membership.status || 'PENDING',
        is_active: membership.is_active || false,
        metadata: membership.metadata || {},
        created_by: membership.created_by,
        starts_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) {
      console.error("Error creating organization membership:", error);
      return { error: error.message };
    }
    
    return { data };
  } catch (error) {
    console.error("Error in createOrganizationMembership:", error);
    return { error: "Failed to create organization membership" };
  }
}

// Update an organization membership
export async function updateOrganizationMembership(
  membershipId: string,
  updates: {
    status?: string;
    is_active?: boolean;
    metadata?: Record<string, any>;
    expires_at?: string | null;
    approved_at?: string | null;
    approved_by?: string | null;
  }
) {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from("organization_membership")
      .update(updates)
      .eq("id", membershipId)
      .select()
      .single();
    
    if (error) {
      console.error("Error updating organization membership:", error);
      return { error: error.message };
    }
    
    return { data };
  } catch (error) {
    console.error("Error in updateOrganizationMembership:", error);
    return { error: "Failed to update organization membership" };
  }
}

// Approve an organization membership
export async function approveOrganizationMembership(
  membershipId: string,
  approverId: string
) {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from("organization_membership")
      .update({
        status: 'APPROVED',
        is_active: true,
        approved_at: new Date().toISOString(),
        approved_by: approverId
      })
      .eq("id", membershipId)
      .select()
      .single();
    
    if (error) {
      console.error("Error approving organization membership:", error);
      return { error: error.message };
    }
    
    return { data };
  } catch (error) {
    console.error("Error in approveOrganizationMembership:", error);
    return { error: "Failed to approve organization membership" };
  }
}

// Reject an organization membership
export async function rejectOrganizationMembership(
  membershipId: string,
  rejecterId: string
) {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from("organization_membership")
      .update({
        status: 'REJECTED',
        is_active: false,
        approved_at: new Date().toISOString(),
        approved_by: rejecterId
      })
      .eq("id", membershipId)
      .select()
      .single();
    
    if (error) {
      console.error("Error rejecting organization membership:", error);
      return { error: error.message };
    }
    
    return { data };
  } catch (error) {
    console.error("Error in rejectOrganizationMembership:", error);
    return { error: "Failed to reject organization membership" };
  }
}

// Delete an organization membership
export async function deleteOrganizationMembership(membershipId: string) {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from("organization_membership")
      .delete()
      .eq("id", membershipId);
    
    if (error) {
      console.error("Error deleting organization membership:", error);
      return { error: error.message };
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error in deleteOrganizationMembership:", error);
    return { error: "Failed to delete organization membership" };
  }
}

// Check if an organization meets the requirements to join another organization
export async function checkOrganizationMeetsRequirements(
  memberOrganizationId: string,
  hostOrganizationId: string
) {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .rpc('check_organization_requirements', { org_id: hostOrganizationId })
      .single();
    
    if (error) {
      console.error("Error checking organization requirements:", error);
      return { 
        error: error.message,
        meetsRequirements: false,
        details: []
      };
    }
    
    // Add type assertion for the data structure
    const result = data as { met: boolean; details: any[] };
    
    return { 
      meetsRequirements: result.met,
      details: result.details,
      error: null
    };
  } catch (error) {
    console.error("Error in checkOrganizationMeetsRequirements:", error);
    return { 
      error: "Failed to check organization requirements",
      meetsRequirements: false,
      details: []
    };
  }
}

export async function getHostOrganizationMemberships(hostOrganizationId: string, options: {
  page?: number;
  pageSize?: number;
} = {}) {
  const supabase = createClient();
  
  const { page = 1, pageSize = 10 } = options;
  const offset = (page - 1) * pageSize;
  
  const countQuery = supabase
    .from('organization_membership_view')
    .select('*', { count: 'exact', head: true })
    .eq('host_organization_id', hostOrganizationId);
    
  const dataQuery = supabase
    .from('organization_membership_view')
    .select('*')
    .eq('host_organization_id', hostOrganizationId)
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);
  
  const [countResult, dataResult] = await Promise.all([countQuery, dataQuery]);
  
  const error = countResult.error || dataResult.error;
  if (error) {
    console.error('Error fetching host organization memberships:', error);
    throw new Error('Failed to fetch host organization memberships');
  }
  
  return mapPagination<OrganizationMembershipView>({
    data: dataResult.data || [],
    count: countResult.count || 0,
    page,
    pageSize
  });
}

export async function getMemberOrganizationMemberships(memberOrganizationId: string, options: {
  page?: number;
  pageSize?: number;
} = {}) {
  const supabase = createClient();
  
  const { page = 1, pageSize = 10 } = options;
  const offset = (page - 1) * pageSize;
  
  const countQuery = supabase
    .from('organization_membership_view')
    .select('*', { count: 'exact', head: true })
    .eq('member_organization_id', memberOrganizationId);
    
  const dataQuery = supabase
    .from('organization_membership_view')
    .select('*')
    .eq('member_organization_id', memberOrganizationId)
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);
  
  const [countResult, dataResult] = await Promise.all([countQuery, dataQuery]);
  
  const error = countResult.error || dataResult.error;
  if (error) {
    console.error('Error fetching member organization memberships:', error);
    throw new Error('Failed to fetch member organization memberships');
  }
  
  return mapPagination<OrganizationMembershipView>({
    data: dataResult.data || [],
    count: countResult.count || 0,
    page,
    pageSize
  });
}

export async function getOrganizationMembership(membershipId: string) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('organization_membership_view')
    .select('*')
    .eq('id', membershipId)
    .single();
  
  if (error) {
    console.error('Error fetching organization membership:', error);
    throw new Error('Failed to fetch organization membership');
  }
  
  return data as OrganizationMembershipView;
} 