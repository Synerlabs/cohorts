import { createClient } from "@/lib/utils/supabase/server";
import camelcaseKeys from "camelcase-keys";
import { OrganizationRequirement } from "@/types/database.types";

/**
 * Get all requirements for an organization
 */
export async function getOrganizationRequirements(organizationId: number) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("organization_requirements")
    .select(`
      *,
      required_form:required_form_id(id, title, description)
    `)
    .eq("organization_id", organizationId)
    .order("requirement_order");

  if (error) {
    return { error: error.message };
  } else {
    return { data: camelcaseKeys(data, { deep: true }) as any[] };
  }
}

/**
 * Get a specific requirement
 */
export async function getOrganizationRequirement(requirementId: number) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("organization_requirements")
    .select(`
      *,
      required_form:required_form_id(id, title, description)
    `)
    .eq("id", requirementId)
    .single();

  if (error) {
    return { error: error.message };
  } else {
    return { data: camelcaseKeys(data, { deep: true }) as any };
  }
}

/**
 * Create a new organization requirement
 */
export async function createOrganizationRequirement(requirement: {
  organizationId: number;
  type: string;
  title: string;
  description?: string;
  requiredFormId?: number;
  requiredMembershipTierId?: number;
  requiredChildrenCount?: number;
  requiredParentRelationshipType?: string;
  requirementOrder?: number;
  isActive: boolean;
}) {
  const supabase = await createClient();
  
  // Get the highest current order for the organization
  let { data: maxOrderResult } = await supabase
    .from("organization_requirements")
    .select("requirement_order")
    .eq("organization_id", requirement.organizationId)
    .order("requirement_order", { ascending: false })
    .limit(1)
    .single();
    
  const nextOrder = maxOrderResult ? (maxOrderResult.requirement_order + 10) : 10;
  
  const { data, error } = await supabase
    .from("organization_requirements")
    .insert({
      organization_id: requirement.organizationId,
      type: requirement.type,
      title: requirement.title,
      description: requirement.description,
      required_form_id: requirement.requiredFormId,
      required_membership_tier_id: requirement.requiredMembershipTierId,
      required_children_count: requirement.requiredChildrenCount,
      required_parent_relationship_type: requirement.requiredParentRelationshipType,
      requirement_order: requirement.requirementOrder || nextOrder,
      is_active: requirement.isActive
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  } else {
    return { data: camelcaseKeys(data) as OrganizationRequirement };
  }
}

/**
 * Update an organization requirement
 */
export async function updateOrganizationRequirement(
  requirementId: number,
  updates: {
    title?: string;
    description?: string;
    requiredFormId?: number | null;
    requiredMembershipTierId?: number | null;
    requiredChildrenCount?: number | null;
    requiredParentRelationshipType?: string | null;
    requirementOrder?: number;
    isActive?: boolean;
  }
) {
  const supabase = await createClient();
  
  const updateData: any = {};
  if (updates.title) updateData.title = updates.title;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.requiredFormId !== undefined) updateData.required_form_id = updates.requiredFormId;
  if (updates.requiredMembershipTierId !== undefined) updateData.required_membership_tier_id = updates.requiredMembershipTierId;
  if (updates.requiredChildrenCount !== undefined) updateData.required_children_count = updates.requiredChildrenCount;
  if (updates.requiredParentRelationshipType !== undefined) updateData.required_parent_relationship_type = updates.requiredParentRelationshipType;
  if (updates.requirementOrder !== undefined) updateData.requirement_order = updates.requirementOrder;
  if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
  
  const { data, error } = await supabase
    .from("organization_requirements")
    .update(updateData)
    .eq("id", requirementId)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  } else {
    return { data: camelcaseKeys(data) as OrganizationRequirement };
  }
}

/**
 * Reorder organization requirements
 */
export async function reorderOrganizationRequirements(
  organizationId: number,
  requirementIds: number[]
) {
  const supabase = await createClient();
  
  // Start a transaction
  const updates = requirementIds.map((id, index) => ({
    id,
    requirement_order: (index + 1) * 10
  }));
  
  const { error } = await supabase.rpc('update_requirement_orders', {
    updates_json: updates
  });

  if (error) {
    return { error: error.message };
  } else {
    // Return the updated list
    return await getOrganizationRequirements(organizationId);
  }
}

/**
 * Delete an organization requirement
 */
export async function deleteOrganizationRequirement(requirementId: number) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from("organization_requirements")
    .delete()
    .eq("id", requirementId);

  if (error) {
    return { error: error.message };
  } else {
    return { success: true };
  }
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