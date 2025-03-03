import { createClient, createServiceRoleClient } from "@/lib/utils/supabase/server";
import camelcaseKeys from "camelcase-keys";
import { OrganizationRelationship } from "@/types/database.types";

/**
 * Get all relationships for an organization
 */
export async function getOrganizationRelationships(organizationId: number) {
  const supabase = await createClient();
  
  // Get relationships where this organization is either parent or child
  const { data, error } = await supabase
    .from("organization_relationships")
    .select(`
      *,
      parent_organization:parent_organization_id(id, name, slug, type, logo_url),
      child_organization:child_organization_id(id, name, slug, type, logo_url)
    `)
    .or(`parent_organization_id.eq.${organizationId},child_organization_id.eq.${organizationId}`);

  if (error) {
    return { error: error.message };
  } else {
    return { data: camelcaseKeys(data, { deep: true }) as any[] };
  }
}

/**
 * Get all parent organizations of a given organization
 */
export async function getParentOrganizations(organizationId: number) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("organization_relationships")
    .select(`
      *,
      parent_organization:parent_organization_id(id, name, slug, type, logo_url)
    `)
    .eq("child_organization_id", organizationId);

  if (error) {
    return { error: error.message };
  } else {
    return { 
      data: camelcaseKeys(data, { deep: true })
        .map((rel: any) => ({
          ...rel.parentOrganization,
          relationshipType: rel.relationshipType,
          isPrimary: rel.isPrimary
        }))
    };
  }
}

/**
 * Get all child organizations of a given organization
 */
export async function getChildOrganizations(organizationId: number) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("organization_relationships")
    .select(`
      *,
      child_organization:child_organization_id(id, name, slug, type, logo_url)
    `)
    .eq("parent_organization_id", organizationId);

  if (error) {
    return { error: error.message };
  } else {
    return { 
      data: camelcaseKeys(data, { deep: true })
        .map((rel: any) => ({
          ...rel.childOrganization,
          relationshipType: rel.relationshipType,
          isPrimary: rel.isPrimary
        }))
    };
  }
}

/**
 * Create a new organization relationship
 */
export async function createOrganizationRelationship(relationship: {
  parentOrganizationId: number;
  childOrganizationId: number;
  relationshipType: string;
  isPrimary?: boolean;
  metadata?: Record<string, any>;
}) {
  // Validate that parent and child are different
  if (relationship.parentOrganizationId === relationship.childOrganizationId) {
    return { error: "Parent and child organization cannot be the same" };
  }

  const supabase = await createClient();
  
  // Check if a primary relationship already exists for the child
  if (relationship.isPrimary) {
    const { data: existingPrimary } = await supabase
      .from("organization_relationships")
      .select()
      .eq("child_organization_id", relationship.childOrganizationId)
      .eq("is_primary", true)
      .maybeSingle();
      
    if (existingPrimary) {
      return { error: "Child organization already has a primary parent" };
    }
  }

  const { data, error } = await supabase
    .from("organization_relationships")
    .insert({
      parent_organization_id: relationship.parentOrganizationId,
      child_organization_id: relationship.childOrganizationId,
      relationship_type: relationship.relationshipType,
      is_primary: relationship.isPrimary || false,
      metadata: relationship.metadata || {}
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  } else {
    return { data: camelcaseKeys(data) as OrganizationRelationship };
  }
}

/**
 * Update an organization relationship
 */
export async function updateOrganizationRelationship(
  relationshipId: number,
  updates: {
    relationshipType?: string;
    isPrimary?: boolean;
    metadata?: Record<string, any>;
  }
) {
  const supabase = await createClient();
  
  // Get the current relationship data
  const { data: currentRel } = await supabase
    .from("organization_relationships")
    .select()
    .eq("id", relationshipId)
    .single();
    
  if (!currentRel) {
    return { error: "Relationship not found" };
  }
  
  // If updating to primary, check if another primary relationship exists
  if (updates.isPrimary && !currentRel.is_primary) {
    const { data: existingPrimary } = await supabase
      .from("organization_relationships")
      .select()
      .eq("child_organization_id", currentRel.child_organization_id)
      .eq("is_primary", true)
      .maybeSingle();
      
    if (existingPrimary) {
      return { error: "Child organization already has a primary parent" };
    }
  }

  const updateData: any = {};
  if (updates.relationshipType) updateData.relationship_type = updates.relationshipType;
  if (updates.isPrimary !== undefined) updateData.is_primary = updates.isPrimary;
  if (updates.metadata) updateData.metadata = updates.metadata;
  
  const { data, error } = await supabase
    .from("organization_relationships")
    .update(updateData)
    .eq("id", relationshipId)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  } else {
    return { data: camelcaseKeys(data) as OrganizationRelationship };
  }
}

/**
 * Delete an organization relationship
 */
export async function deleteOrganizationRelationship(relationshipId: number) {
  const supabase = await createClient();
  
  // Get the relationship before deleting it
  const { data: relationship } = await supabase
    .from("organization_relationships")
    .select()
    .eq("id", relationshipId)
    .single();
  
  if (!relationship) {
    return { error: "Relationship not found" };
  }
  
  // Check if it's a primary relationship
  if (relationship.is_primary) {
    return { error: "Cannot delete a primary relationship. Make another relationship primary first or remove the child organization." };
  }
  
  const { error } = await supabase
    .from("organization_relationships")
    .delete()
    .eq("id", relationshipId);

  if (error) {
    return { error: error.message };
  } else {
    return { success: true };
  }
} 