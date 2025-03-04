import { createClient } from "@/lib/utils/supabase/server";
import { createServiceRoleClient } from "@/lib/utils/supabase/server";
import { OrganizationType } from "@/types/database.types";

/**
 * Get all organization types
 * @returns A list of organization types
 */
export async function getOrganizationTypes() {
  const supabase = await createServiceRoleClient();
  
  const { data, error } = await supabase
    .from("organization_types")
    .select()
    .order("name");
  
  if (error) {
    console.error("Error fetching organization types:", error);
    return { error: error.message };
  }
  
  return { data };
}

/**
 * Get an organization type by code
 * @param code The organization type code
 * @returns The organization type
 */
export async function getOrganizationTypeByCode(code: string) {
  const supabase = await createServiceRoleClient();
  
  const { data, error } = await supabase
    .from("organization_types")
    .select()
    .eq("code", code)
    .single();
  
  if (error) {
    console.error(`Error fetching organization type ${code}:`, error);
    return { error: error.message };
  }
  
  return { data };
}

/**
 * Create a new organization type
 * @param organizationType The organization type to create
 * @returns The created organization type
 */
export async function createOrganizationType(organizationType: {
  code: string;
  name: string;
  description?: string | null;
  metadata_schema?: Record<string, any>;
}) {
  const supabase = await createServiceRoleClient();
  
  const { data, error } = await supabase
    .from("organization_types")
    .insert(organizationType)
    .select()
    .single();
  
  if (error) {
    console.error("Error creating organization type:", error);
    return { error: error.message };
  }
  
  return { data };
}

/**
 * Update an organization type
 * @param code The organization type code
 * @param updates The updates to apply
 * @returns The updated organization type
 */
export async function updateOrganizationType(
  code: string, 
  updates: Partial<Omit<OrganizationType, 'id' | 'code' | 'created_at' | 'updated_at'>>
) {
  const supabase = await createServiceRoleClient();
  
  const { data, error } = await supabase
    .from("organization_types")
    .update(updates)
    .eq("code", code)
    .select()
    .single();
  
  if (error) {
    console.error(`Error updating organization type ${code}:`, error);
    return { error: error.message };
  }
  
  return { data };
}

/**
 * Delete an organization type
 * @param code The organization type code
 * @returns Success status
 */
export async function deleteOrganizationType(code: string) {
  const supabase = await createServiceRoleClient();
  
  const { error } = await supabase
    .from("organization_types")
    .delete()
    .eq("code", code);
  
  if (error) {
    console.error(`Error deleting organization type ${code}:`, error);
    return { error: error.message };
  }
  
  return { success: true };
} 