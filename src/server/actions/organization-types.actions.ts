'use server';

import { revalidatePath } from 'next/cache';
import * as z from 'zod';
import { 
  getOrganizationTypes, 
  getOrganizationTypeByCode, 
  createOrganizationType, 
  updateOrganizationType, 
  deleteOrganizationType 
} from '@/services/organization-types.service';

// Schema for creating/updating an organization type
const organizationTypeSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  metadata_schema: z.record(z.any()).optional(),
});

type OrganizationTypeState = {
  errors?: {
    code?: string[];
    name?: string[];
    description?: string[];
    metadata_schema?: string[];
  };
  message?: string;
};

// Get authenticated user function (placeholder - replace with actual implementation)
async function getCurrentUser() {
  // This should be replaced with the actual implementation used in the project
  // For now, we'll assume it returns the user object or null if not authenticated
  
  // Example implementation:
  // const supabase = createClient();
  // const { data } = await supabase.auth.getUser();
  // return data?.user || null;
  
  // Placeholder to avoid linter errors
  return { id: 'user-id' }; // Simulate authenticated user
}

// Check if user has admin role (placeholder - replace with actual implementation)
async function isAdmin(userId: string) {
  // This should be replaced with the actual implementation used in the project
  
  // Placeholder to avoid linter errors
  return true; // Simulate admin permissions
}

export async function getOrganizationTypesAction() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: 'Not authenticated' };
    }

    const types = await getOrganizationTypes();
    return { types };
  } catch (error) {
    console.error('Error fetching organization types:', error);
    return { error: 'Failed to fetch organization types' };
  }
}

export async function getOrganizationTypeAction(code: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: 'Not authenticated' };
    }

    const type = await getOrganizationTypeByCode(code);
    if (!type) {
      return { error: 'Organization type not found' };
    }

    return { type };
  } catch (error) {
    console.error('Error fetching organization type:', error);
    return { error: 'Failed to fetch organization type' };
  }
}

export async function createOrganizationTypeAction(
  typeData: z.infer<typeof organizationTypeSchema>,
  prevState: OrganizationTypeState
): Promise<OrganizationTypeState> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { message: 'Not authenticated', errors: {} };
    }

    // Check if user is admin
    const hasPermission = await isAdmin(user.id);
    if (!hasPermission) {
      return { 
        message: 'You do not have permission to create organization types', 
        errors: {} 
      };
    }

    // Validate input
    const validatedFields = organizationTypeSchema.safeParse(typeData);
    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Invalid organization type data',
      };
    }

    // Create the organization type
    const result = await createOrganizationType({
      code: typeData.code,
      name: typeData.name,
      description: typeData.description || null,
      metadata_schema: typeData.metadata_schema || {},
    });

    if (!result) {
      return { message: 'Failed to create organization type', errors: {} };
    }

    revalidatePath('/dashboard/admin/organization-types');
    return { message: 'Organization type created successfully' };
  } catch (error) {
    console.error('Error creating organization type:', error);
    return { message: 'An unexpected error occurred', errors: {} };
  }
}

export async function updateOrganizationTypeAction(
  code: string,
  typeData: z.infer<typeof organizationTypeSchema>,
  prevState: OrganizationTypeState
): Promise<OrganizationTypeState> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { message: 'Not authenticated', errors: {} };
    }

    // Check if user is admin
    const hasPermission = await isAdmin(user.id);
    if (!hasPermission) {
      return { 
        message: 'You do not have permission to update organization types', 
        errors: {} 
      };
    }

    // Validate input
    const validatedFields = organizationTypeSchema.safeParse(typeData);
    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Invalid organization type data',
      };
    }

    // Update the organization type
    const result = await updateOrganizationType(code, {
      name: typeData.name,
      description: typeData.description || null,
      metadataSchema: typeData.metadata_schema || {},
    });

    if (!result) {
      return { message: 'Failed to update organization type', errors: {} };
    }

    revalidatePath('/dashboard/admin/organization-types');
    revalidatePath(`/dashboard/admin/organization-types/${code}`);
    return { message: 'Organization type updated successfully' };
  } catch (error) {
    console.error('Error updating organization type:', error);
    return { message: 'An unexpected error occurred', errors: {} };
  }
}

export async function deleteOrganizationTypeAction(code: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: 'Not authenticated' };
    }

    // Check if user is admin
    const hasPermission = await isAdmin(user.id);
    if (!hasPermission) {
      return { error: 'You do not have permission to delete organization types' };
    }

    // Delete the organization type
    const result = await deleteOrganizationType(code);
    if (!result) {
      return { error: 'Failed to delete organization type' };
    }

    revalidatePath('/dashboard/admin/organization-types');
    return { success: true };
  } catch (error) {
    console.error('Error deleting organization type:', error);
    return { error: 'An unexpected error occurred' };
  }
} 