import { createClient, createServiceRoleClient } from "@/lib/utils/supabase/server";
import camelcaseKeys from "camelcase-keys";
import { OrganizationType } from "@/types/database.types";

/**
 * Get all organization types
 */
export async function getOrganizationTypes() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_types")
    .select()
    .order("name");

  if (error) {
    return { error: error.message };
  } else {
    return { data: camelcaseKeys(data) as OrganizationType[] };
  }
}

/**
 * Get organization type by code
 */
export async function getOrganizationTypeByCode(code: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_types")
    .select()
    .eq("code", code)
    .single();

  if (error) {
    return { error: error.message };
  } else {
    return { data: camelcaseKeys(data) as OrganizationType };
  }
}

/**
 * Create a new organization type (admin only)
 */
export async function createOrganizationType(orgType: {
  code: string;
  name: string;
  description?: string;
  metadataSchema?: Record<string, any>;
}) {
  const supabase = await createServiceRoleClient();
  const { data, error } = await supabase
    .from("organization_types")
    .insert({
      code: orgType.code,
      name: orgType.name,
      description: orgType.description,
      metadata_schema: orgType.metadataSchema || {}
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  } else {
    return { data: camelcaseKeys(data) as OrganizationType };
  }
}

/**
 * Update an organization type (admin only)
 */
export async function updateOrganizationType(
  code: string,
  updates: {
    name?: string;
    description?: string;
    metadataSchema?: Record<string, any>;
  }
) {
  const supabase = await createServiceRoleClient();
  
  const updateData: any = {};
  if (updates.name) updateData.name = updates.name;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.metadataSchema) updateData.metadata_schema = updates.metadataSchema;
  
  const { data, error } = await supabase
    .from("organization_types")
    .update(updateData)
    .eq("code", code)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  } else {
    return { data: camelcaseKeys(data) as OrganizationType };
  }
}

/**
 * Delete an organization type (admin only)
 * Note: This will fail if there are any organizations using this type
 */
export async function deleteOrganizationType(code: string) {
  const supabase = await createServiceRoleClient();
  const { error } = await supabase
    .from("organization_types")
    .delete()
    .eq("code", code);

  if (error) {
    return { error: error.message };
  } else {
    return { success: true };
  }
} 