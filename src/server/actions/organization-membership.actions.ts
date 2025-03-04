'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/utils/supabase/server';
import * as z from 'zod';
import { 
  createOrganizationMembership,
  getHostOrganizations,
  getMemberOrganizations,
  updateOrganizationMembership,
  approveOrganizationMembership,
  rejectOrganizationMembership,
  deleteOrganizationMembership
} from '@/services/organization-membership.service';
import { getOrgBySlug } from '@/services/org.service';
import { withPermissions } from '@/lib/utils/action-permissions';
import { permissions } from '@/lib/types/permissions';

// Schema for creating/updating a membership
const membershipSchema = z.object({
  host_organization_id: z.string().uuid('Invalid host organization ID'),
  member_organization_id: z.string().uuid('Invalid member organization ID'),
  membership_tier_id: z.string().uuid('Invalid membership tier ID'),
  metadata: z.record(z.any()).optional(),
});

// Type for state management
type MembershipState = {
  errors?: {
    host_organization_id?: string[];
    member_organization_id?: string[];
    membership_tier_id?: string[];
  };
  message?: string;
};

// Get all host organizations for a specific member organization
export async function getHostOrganizationsAction(organizationId: string) {
  try {
    const result = await getHostOrganizations(organizationId);
    return { data: result.data || [], error: result.error };
  } catch (error) {
    console.error('Error fetching host organizations:', error);
    return { error: 'Failed to fetch host organizations' };
  }
}

// Get all member organizations for a specific host organization
export async function getMemberOrganizationsAction(organizationId: string) {
  try {
    const result = await getMemberOrganizations(organizationId);
    return { data: result.data || [], error: result.error };
  } catch (error) {
    console.error('Error fetching member organizations:', error);
    return { error: 'Failed to fetch member organizations' };
  }
}

type ActionResponse = {
  success?: boolean;
  error?: string;
  message?: string;
};

// Create a new organization membership
export async function createOrganizationMembershipAction(
  orgSlug: string,
  membershipData: z.infer<typeof membershipSchema>,
  prevState: MembershipState
): Promise<ActionResponse> {
  const handler = await withPermissions(
    async (context: { userId: string; groupId: string }, params: { 
      orgSlug: string;
      membershipData: z.infer<typeof membershipSchema>;
      prevState: MembershipState;
    }) => {
      try {
        // Validate input data
        const validatedData = membershipSchema.safeParse(params.membershipData);
        if (!validatedData.success) {
          return {
            error: 'Invalid form data',
            message: 'Please check the form for errors'
          };
        }

        // Create the membership
        const result = await createOrganizationMembership({
          ...validatedData.data,
          created_by: context.userId,
        });

        if (result.error) {
          return {
            error: result.error,
          };
        }

        // Revalidate the affiliations page
        revalidatePath(`/@${params.orgSlug}/affiliations`);
        
        return { 
          success: true,
          message: 'Organization membership created successfully' 
        };
      } catch (error) {
        console.error('Error creating organization membership:', error);
        return { 
          error: 'An unexpected error occurred'
        };
      }
    },
    (params: { orgSlug: string; membershipData: z.infer<typeof membershipSchema>; prevState: MembershipState }) => ({
      groupId: params.membershipData.host_organization_id,
      requiredPermissions: permissions.group.edit,
      isCreation: true
    })
  );

  return handler(prevState, { orgSlug, membershipData, prevState });
}

// Update an organization membership
export async function updateOrganizationMembershipAction(
  orgSlug: string,
  membershipId: string,
  updates: {
    status?: string;
    is_active?: boolean;
    metadata?: Record<string, any>;
    expires_at?: string | null;
  }
): Promise<ActionResponse> {
  const handler = await withPermissions(
    async (context: { userId: string; groupId: string }, params: {
      orgSlug: string;
      membershipId: string;
      updates: typeof updates;
    }) => {
      try {
        const result = await updateOrganizationMembership(params.membershipId, params.updates);
        
        if (result.error) {
          return { error: result.error };
        }

        // Revalidate the affiliations page
        revalidatePath(`/@${params.orgSlug}/affiliations`);
        
        return { success: true };
      } catch (error) {
        console.error('Error updating organization membership:', error);
        return { error: 'An unexpected error occurred' };
      }
    },
    (params: { orgSlug: string; membershipId: string; updates: typeof updates }) => ({
      moduleId: params.membershipId,
      moduleType: 'membership',
      requiredPermissions: permissions.group.edit
    })
  );

  return handler(null, { orgSlug, membershipId, updates });
}

// Approve an organization membership
export async function approveOrganizationMembershipAction(
  orgSlug: string,
  membershipId: string
): Promise<ActionResponse> {
  const handler = await withPermissions(
    async (context: { userId: string; groupId: string }, params: {
      orgSlug: string;
      membershipId: string;
    }) => {
      try {
        const result = await approveOrganizationMembership(params.membershipId, context.userId);
        
        if (result.error) {
          return { error: result.error };
        }

        // Revalidate the affiliations page
        revalidatePath(`/@${params.orgSlug}/affiliations`);
        
        return { success: true };
      } catch (error) {
        console.error('Error approving organization membership:', error);
        return { error: 'An unexpected error occurred' };
      }
    },
    (params: { orgSlug: string; membershipId: string }) => ({
      moduleId: params.membershipId,
      moduleType: 'membership',
      requiredPermissions: permissions.group.edit
    })
  );

  return handler(null, { orgSlug, membershipId });
}

// Reject an organization membership
export async function rejectOrganizationMembershipAction(
  orgSlug: string,
  membershipId: string
): Promise<ActionResponse> {
  const handler = await withPermissions(
    async (context: { userId: string; groupId: string }, params: {
      orgSlug: string;
      membershipId: string;
    }) => {
      try {
        const result = await rejectOrganizationMembership(params.membershipId, context.userId);
        
        if (result.error) {
          return { error: result.error };
        }

        // Revalidate the affiliations page
        revalidatePath(`/@${params.orgSlug}/affiliations`);
        
        return { success: true };
      } catch (error) {
        console.error('Error rejecting organization membership:', error);
        return { error: 'An unexpected error occurred' };
      }
    },
    (params: { orgSlug: string; membershipId: string }) => ({
      moduleId: params.membershipId,
      moduleType: 'membership',
      requiredPermissions: permissions.group.edit
    })
  );

  return handler(null, { orgSlug, membershipId });
}

// Delete an organization membership
export async function deleteOrganizationMembershipAction(
  orgSlug: string,
  membershipId: string
): Promise<ActionResponse> {
  const handler = await withPermissions(
    async (context: { userId: string; groupId: string }, params: {
      orgSlug: string;
      membershipId: string;
    }) => {
      try {
        const result = await deleteOrganizationMembership(params.membershipId);
        
        if (result.error) {
          return { error: result.error };
        }

        // Revalidate the affiliations page
        revalidatePath(`/@${params.orgSlug}/affiliations`);
        
        return { success: true };
      } catch (error) {
        console.error('Error deleting organization membership:', error);
        return { error: 'An unexpected error occurred' };
      }
    },
    (params: { orgSlug: string; membershipId: string }) => ({
      moduleId: params.membershipId,
      moduleType: 'membership',
      requiredPermissions: permissions.group.edit
    })
  );

  return handler(null, { orgSlug, membershipId });
} 