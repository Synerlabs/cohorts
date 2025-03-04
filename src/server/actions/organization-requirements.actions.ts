'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import * as z from 'zod';
import {
  getOrganizationRequirements,
  getRequirementById,
  createOrganizationRequirement,
  updateOrganizationRequirement,
  deleteOrganizationRequirement,
  checkOrganizationMeetsRequirements,
  reorderOrganizationRequirements,
} from '@/services/organization-requirements.service';
import { getCurrentUser } from '@/services/user.service';

// Schema for creating/updating a requirement
const requirementSchema = z.object({
  type: z.string().min(1, 'Type is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  required_form_id: z.string().uuid().optional().nullable(),
  required_membership_tier_id: z.string().uuid().optional().nullable(),
  required_children_count: z.number().optional().nullable(),
  required_parent_relationship_type: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
});

type RequirementState = {
  errors?: {
    type?: string[];
    title?: string[];
    description?: string[];
    required_form_id?: string[];
    required_membership_tier_id?: string[];
    required_children_count?: string[];
    required_parent_relationship_type?: string[];
  };
  message?: string;
};

export async function getRequirementsAction(organizationId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: 'Not authenticated' };
    }

    const requirements = await getOrganizationRequirements(organizationId);
    return { requirements };
  } catch (error) {
    console.error('Error fetching organization requirements:', error);
    return { error: 'Failed to fetch organization requirements' };
  }
}

export async function getRequirementAction(requirementId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: 'Not authenticated' };
    }

    const requirement = await getRequirementById(requirementId);
    if (!requirement) {
      return { error: 'Requirement not found' };
    }

    return { requirement };
  } catch (error) {
    console.error('Error fetching requirement:', error);
    return { error: 'Failed to fetch requirement' };
  }
}

export async function createRequirementAction(
  orgSlug: string,
  organizationId: string,
  requirementData: z.infer<typeof requirementSchema>,
  prevState: RequirementState
): Promise<RequirementState> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { message: 'Not authenticated', errors: {} };
    }

    // Validate input
    const validatedFields = requirementSchema.safeParse(requirementData);
    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Invalid requirement data',
      };
    }

    // Create the requirement
    const result = await createOrganizationRequirement({
      organization_id: organizationId,
      type: requirementData.type,
      title: requirementData.title,
      description: requirementData.description,
      required_form_id: requirementData.required_form_id,
      required_membership_tier_id: requirementData.required_membership_tier_id,
      required_children_count: requirementData.required_children_count,
      required_parent_relationship_type: requirementData.required_parent_relationship_type,
      is_active: requirementData.is_active ?? true,
    });

    if (!result) {
      return { message: 'Failed to create requirement', errors: {} };
    }

    revalidatePath(`/dashboard/organizations/${orgSlug}/requirements`);
    return { message: 'Requirement created successfully' };
  } catch (error) {
    console.error('Error creating requirement:', error);
    return { message: 'An unexpected error occurred', errors: {} };
  }
}

export async function updateRequirementAction(
  orgSlug: string,
  requirementId: string,
  requirementData: z.infer<typeof requirementSchema>,
  prevState: RequirementState
): Promise<RequirementState> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { message: 'Not authenticated', errors: {} };
    }

    // Validate input
    const validatedFields = requirementSchema.safeParse(requirementData);
    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Invalid requirement data',
      };
    }

    // Update the requirement
    const result = await updateOrganizationRequirement(requirementId, {
      type: requirementData.type,
      title: requirementData.title,
      description: requirementData.description || null,
      required_form_id: requirementData.required_form_id,
      required_membership_tier_id: requirementData.required_membership_tier_id,
      required_children_count: requirementData.required_children_count,
      required_parent_relationship_type: requirementData.required_parent_relationship_type,
      is_active: requirementData.is_active !== undefined ? requirementData.is_active : true,
    });

    if (!result) {
      return { message: 'Failed to update requirement', errors: {} };
    }

    revalidatePath(`/dashboard/organizations/${orgSlug}/requirements`);
    return { message: 'Requirement updated successfully' };
  } catch (error) {
    console.error('Error updating requirement:', error);
    return { message: 'An unexpected error occurred', errors: {} };
  }
}

export async function deleteRequirementAction(orgSlug: string, requirementId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: 'Not authenticated' };
    }

    // Delete the requirement
    const result = await deleteOrganizationRequirement(requirementId);
    if (!result) {
      return { error: 'Failed to delete requirement' };
    }

    revalidatePath(`/dashboard/organizations/${orgSlug}/requirements`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting requirement:', error);
    return { error: 'An unexpected error occurred' };
  }
}

export async function reorderRequirementsAction(
  orgSlug: string,
  organizationId: string,
  requirementIds: string[]
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: 'Not authenticated' };
    }

    // Reorder the requirements
    const result = await reorderOrganizationRequirements(organizationId, requirementIds);
    if (!result) {
      return { error: 'Failed to reorder requirements' };
    }

    revalidatePath(`/dashboard/organizations/${orgSlug}/requirements`);
    return { success: true };
  } catch (error) {
    console.error('Error reordering requirements:', error);
    return { error: 'An unexpected error occurred' };
  }
}

export async function checkRequirementsAction(parentId: string, childId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: 'Not authenticated' };
    }

    // Check if the organization meets the requirements
    const result = await checkOrganizationMeetsRequirements(parentId, childId);
    return { result };
  } catch (error) {
    console.error('Error checking requirements:', error);
    return { error: 'Failed to check requirements' };
  }
} 