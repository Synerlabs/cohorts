import { createClient } from "@/lib/utils/supabase/server";
import { createServiceRoleClient } from "@/lib/utils/supabase/server";
import camelcaseKeys from "camelcase-keys";
import { OrganizationRequirement } from "@/types/database.types";

/**
 * Get all requirements for an organization
 * @param organizationId The organization ID
 * @returns A list of organization requirements
 */
export async function getOrganizationRequirements(organizationId: string) {
  const supabase = await createServiceRoleClient();
  
  const { data, error } = await supabase
    .from("organization_requirements")
    .select(`
      id,
      organization_id,
      type,
      title,
      description,
      required_form_id,
      required_membership_tier_id,
      required_children_count,
      required_parent_relationship_type,
      requirement_order,
      is_active,
      created_at,
      updated_at,
      form:required_form_id(id, title)
    `)
    .eq("organization_id", organizationId)
    .order("requirement_order");
  
  if (error) {
    console.error(`Error fetching requirements for organization ${organizationId}:`, error);
    return { error: error.message };
  }
  
  return { data };
}

/**
 * Get a specific requirement
 * @param requirementId The requirement ID
 * @returns The organization requirement
 */
export async function getRequirementById(requirementId: string) {
  const supabase = await createServiceRoleClient();
  
  const { data, error } = await supabase
    .from("organization_requirements")
    .select(`
      id,
      organization_id,
      type,
      title,
      description,
      required_form_id,
      required_membership_tier_id,
      required_children_count,
      required_parent_relationship_type,
      requirement_order,
      is_active,
      created_at,
      updated_at,
      form:required_form_id(id, title, form_schema, form_ui_schema)
    `)
    .eq("id", requirementId)
    .single();
  
  if (error) {
    console.error(`Error fetching requirement ${requirementId}:`, error);
    return { error: error.message };
  }
  
  return { data };
}

/**
 * Create a new organization requirement
 * @param requirement The requirement to create
 * @returns The created requirement
 */
export async function createOrganizationRequirement(requirement: {
  organization_id: string;
  type: string;
  title: string;
  description?: string;
  required_form_id?: string;
  required_membership_tier_id?: string;
  required_children_count?: number;
  required_parent_relationship_type?: string;
  is_active?: boolean;
}) {
  const supabase = await createServiceRoleClient();
  
  // Get current max order
  const { data: maxOrder } = await supabase
    .from("organization_requirements")
    .select("requirement_order")
    .eq("organization_id", requirement.organization_id)
    .order("requirement_order", { ascending: false })
    .limit(1)
    .single();
  
  const newOrder = maxOrder ? maxOrder.requirement_order + 1 : 1;
  
  const { data, error } = await supabase
    .from("organization_requirements")
    .insert({
      ...requirement,
      requirement_order: newOrder,
      is_active: requirement.is_active !== undefined ? requirement.is_active : true
    })
    .select()
    .single();
  
  if (error) {
    console.error("Error creating organization requirement:", error);
    return { error: error.message };
  }
  
  return { data };
}

/**
 * Update an organization requirement
 * @param requirementId The requirement ID
 * @param updates The updates to apply
 * @returns The updated requirement
 */
export async function updateOrganizationRequirement(
  requirementId: string, 
  updates: Partial<{
    type: string;
    title: string;
    description: string | null;
    required_form_id: string | null;
    required_membership_tier_id: string | null;
    required_children_count: number | null;
    required_parent_relationship_type: string | null;
    is_active: boolean;
  }>
) {
  const supabase = await createServiceRoleClient();
  
  const { data, error } = await supabase
    .from("organization_requirements")
    .update(updates)
    .eq("id", requirementId)
    .select()
    .single();
  
  if (error) {
    console.error(`Error updating requirement ${requirementId}:`, error);
    return { error: error.message };
  }
  
  return { data };
}

/**
 * Delete an organization requirement
 * @param requirementId The requirement ID
 * @returns Success status
 */
export async function deleteOrganizationRequirement(requirementId: string) {
  const supabase = await createServiceRoleClient();
  
  // Get the requirement to check organization_id
  const { data: requirement, error: getError } = await supabase
    .from("organization_requirements")
    .select("organization_id, requirement_order")
    .eq("id", requirementId)
    .single();
  
  if (getError) {
    console.error(`Error fetching requirement ${requirementId}:`, getError);
    return { error: getError.message };
  }
  
  // Delete the requirement
  const { error } = await supabase
    .from("organization_requirements")
    .delete()
    .eq("id", requirementId);
  
  if (error) {
    console.error(`Error deleting requirement ${requirementId}:`, error);
    return { error: error.message };
  }
  
  // Update order of remaining requirements
  await supabase.rpc("update_requirement_orders", {
    org_id: requirement.organization_id
  });
  
  return { success: true };
}

/**
 * Check if a child organization meets all requirements of a parent
 * @param parentId The parent organization ID
 * @param childId The child organization ID
 * @returns Whether the child meets all requirements
 */
export async function checkOrganizationMeetsRequirements(parentId: string, childId: string) {
  const supabase = await createServiceRoleClient();
  
  const { data, error } = await supabase
    .rpc("check_organization_meets_requirements", {
      parent_org_id: parentId,
      child_org_id: childId
    });
  
  if (error) {
    console.error(`Error checking if organization ${childId} meets requirements of ${parentId}:`, error);
    return { error: error.message };
  }
  
  return { data };
}

/**
 * Reorder organization requirements
 * @param organizationId The organization ID
 * @param requirementIds The requirement IDs in the new order
 * @returns Success status
 */
export async function reorderOrganizationRequirements(
  organizationId: string, 
  requirementIds: string[]
) {
  const supabase = await createServiceRoleClient();
  
  // Create an array of updates
  const updates = requirementIds.map((id, index) => ({
    id,
    organization_id: organizationId,
    requirement_order: index + 1
  }));
  
  const { error } = await supabase
    .from("organization_requirements")
    .upsert(updates, { onConflict: 'id' });
  
  if (error) {
    console.error(`Error reordering requirements for organization ${organizationId}:`, error);
    return { error: error.message };
  }
  
  return { success: true };
}

/**
 * Check if an organization meets all requirements
 */
export async function checkOrganizationRequirements(organizationId: number) {
  const supabase = await createClient();
  
  // Use a database function to check all requirements
  const { data, error } = await supabase
    .rpc('check_organization_requirements', {
      org_id: organizationId
    });

  if (error) {
    return { error: error.message };
  } else {
    return { 
      data: camelcaseKeys(data) as {
        requirementId: number;
        title: string;
        isMet: boolean;
        message: string;
      }[]
    };
  }
} 