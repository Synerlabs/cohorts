import { createClient, createServiceRoleClient } from "@/lib/utils/supabase/server";
import camelcaseKeys from "camelcase-keys";
import { Camelized } from "humps";
import { Tables } from "@/lib/types/database.types";
import { permissions } from "@/lib/types/permissions";
import { CreateCohort } from "@/lib/types/create-cohort.type";

export async function getOrgs() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("group").select().limit(10);

  if (error) {
    return { error: error.message };
  } else {
    return data;
  }
}

export async function getOrgBySlug(slug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("group")
    .select()
    .eq("slug", slug)
    .single();

  if (error) {
    return { error: error.message };
  } else {
    return { data: camelcaseKeys(data) };
  }
}

export async function getOrgById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("group")
    .select()
    .eq("id", id)
    .single();

  if (error) {
    return { error: error.message };
  } else {
    return { data: camelcaseKeys(data) };
  }
}

export async function getOrgRoles({ id }: { id: string }) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("group_roles")
    .select()
    .eq("group_id", id);

  if (error) {
    throw error;
  } else {
    return camelcaseKeys(data);
  }
}

export async function createOrgRole(data: Camelized<Tables<"group_roles">>) {
  const supabase = await createClient();
  const { data: role, error } = await supabase
    .from("group_roles")
    .insert(data)
    .select("id")
    .single();

  if (error) {
    throw error;
  } else {
    return role;
  }
}

export async function getOrgRoleById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("group_roles")
    .select()
    .eq("id", id)
    .single();

  if (error) {
    throw error;
  } else {
    return camelcaseKeys(data);
  }
}

export async function getOrgRolePermissions(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("role_permissions")
    .select()
    .eq("role_id", id);

  if (error) {
    throw error;
  } else {
    return camelcaseKeys(data);
  }
}

export async function getOrgRoleUsers({ id }: { id: string }) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_roles")
    .select(
      `id, created_at, group_role_id, user_id, profile:user_id ( first_name, last_name, avatar_url )`,
    )
    .eq("group_role_id", id);

  if (error) {
    throw error;
  } else {
    return camelcaseKeys(data);
  }
}

export async function getOrgMembers({ id, isActive = true }: { id: string; isActive?: boolean }) {
  const supabase = await createServiceRoleClient();
  const { data, error } = await supabase
    .from("group_users")
    .select(
      `
        id, 
        created_at, 
        user_id,
        is_active,
        profile:user_id (
          first_name,
          last_name,
          avatar_url
        )
      `,
      { count: "exact" }
    )
    .eq("group_id", id)
    .eq("is_active", isActive);

  if (error) {
    throw error;
  } else {
    return camelcaseKeys(data);
  }
}

export async function createOrgMember({
  userId,
  groupId,
}: {
  userId: string;
  groupId: string;
}) {
  const supabase = await createClient();

  // First check if user is already a member (active or inactive)
  const { data: existingMembers, error: existingError } = await supabase
    .from("group_users")
    .select("*")
    .eq("user_id", userId)
    .eq("group_id", groupId);

  if (existingError) throw existingError;
  if (existingMembers && existingMembers.length > 0) {
    return existingMembers[0];
  }

  // Check if the user is the group creator
  const { data: group } = await supabase
    .from("group")
    .select("created_by")
    .eq("id", groupId)
    .single();

  const isCreator = group?.created_by === userId;

  // If creator, activate immediately
  if (isCreator) {
    const { data: member, error } = await supabase
      .from("group_users")
      .insert({
        user_id: userId,
        group_id: groupId,
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;
    return member;
  }

  // For joiners, check membership tiers
  const { data: tiers } = await supabase
    .from("membership_tier")
    .select("*")
    .eq("group_id", groupId);

  // Determine if should activate:
  // - No tiers = activate
  // - Single automatic tier = activate
  // - Multiple tiers or non-automatic tier = don't activate
  const shouldActivate = !tiers?.length || 
    (tiers.length === 1 && tiers[0].is_automatic);

  const { data: member, error } = await supabase
    .from("group_users")
    .insert({
      user_id: userId,
      group_id: groupId,
      is_active: shouldActivate
    })
    .select()
    .single();

  if (error) throw error;
  return member;
}

type PaginationOptions = {
  limit?: number;
  offset?: number;
  search?: string;
  orderBy?: string;
  orderDirection?: "asc" | "desc";
};

export async function getOrgMemberById(id: string, options: PaginationOptions) {
  const limit = options.limit || 10;
  const offset = options.offset || 0;
  const orderBy = options.orderBy || "created_at";

  const supabase = await createClient();
  const { data, count, error } = await supabase
    .from("group_users")
    .select(
      `id, created_at, group_id, user_id, profile:user_id ( first_name, last_name, avatar_url )`,
      { count: "exact" },
    )
    .eq("group_id", id)
    .range(offset * limit, (limit + 1) * offset)
    .order(orderBy, { ascending: options.orderDirection === "asc" });

  if (error) {
    throw error;
  } else {
    return {
      data: camelcaseKeys(data),
      totalCount: count,
      pagination: {
        limit,
        offset,
        orderBy,
        orderDirection: options.orderDirection,
        totalCount: data.length,
      },
    };
  }
}

type CreateOrgResult = {
  error?: string;
  data?: any;
};

const SUPER_ADMIN_ROLE_NAME = "super_admin";

/**
 * Gets all available permissions from the permissions object
 * This ensures super admins always have access to all permissions,
 * even when new ones are added in the future
 */
function getAllPermissions(): string[] {
  const allPermissions: string[] = [];
  
  // Iterate through all permission modules
  Object.values(permissions).forEach(modulePermissions => {
    Object.values(modulePermissions).forEach(permission => {
      if (typeof permission === 'string') {
        allPermissions.push(permission);
      }
    });
  });
  
  return allPermissions;
}

async function createOrgRoles(groupId: string): Promise<Tables<"group_roles">[]> {
  const serviceClient = await createServiceRoleClient();
  
  const { data: orgRoles, error: orgRolesError } = await serviceClient
    .from("group_roles")
    .insert([
      {
        group_id: groupId,
        role_name: SUPER_ADMIN_ROLE_NAME,
        description: "Super admin role with all permissions",
        is_super_admin: true, // This flag grants all permissions automatically
        permissions: [], // No need to store permissions explicitly
      },
      {
        group_id: groupId,
        role_name: "admin",
        description: "Admin role for the organization",
        is_super_admin: false,
        permissions: [
          // Group permissions
          "group.edit",
          // Members permissions
          "group.members.view",
          // Roles permissions
          "group.roles.view",
          "group.roles.create",
          "group.roles.edit",
          "group.roles.delete",
          "group.roles.assign",
          // Memberships permissions
          "group.memberships.view",
          "group.memberships.create",
          "group.memberships.edit",
          "group.memberships.delete",
          // Applications permissions
          "group.applications.view",
          "group.applications.process",
          // Forms permissions
          "group.forms.view",
          "group.forms.create",
          "group.forms.edit",
          "group.forms.delete",
          "group.forms.publish",
          // Payments permissions
          "group.payments.view",
          "group.payments.process",
          // Payment gateways permissions
          "group.paymentGateways.view",
          "group.paymentGateways.edit",
          "group.paymentGateways.configure",
          // Orders permissions
          "group.orders.view",
        ],
      },
      {
        group_id: groupId,
        role_name: "member",
        description: "Member role for the organization",
        is_super_admin: false,
        permissions: [],
      },
    ])
    .select();

  if (orgRolesError || !orgRoles) {
    console.error("Error creating organization roles:", {
      error: orgRolesError,
      groupId,
    });
    throw orgRolesError;
  }

  return orgRoles;
}

/**
 * Assigns a user to the super admin role for an organization
 */
export async function assignSuperAdmin(userId: string, groupId: string): Promise<{ error?: string }> {
  const serviceClient = await createServiceRoleClient();

  // First, find the super admin role for this group
  const { data: roles, error: rolesError } = await serviceClient
    .from("group_roles")
    .select()
    .eq("group_id", groupId)
    .eq("role_name", SUPER_ADMIN_ROLE_NAME)
    .single();

  if (rolesError || !roles) {
    console.error("Error finding super admin role:", {
      error: rolesError,
      groupId,
    });
    return { error: "Failed to find super admin role" };
  }

  // Assign the user to the super admin role
  const { error: assignError } = await serviceClient
    .from("user_roles")
    .insert({
      group_role_id: roles.id,
      user_id: userId,
      is_active: true,
    });

  if (assignError) {
    console.error("Error assigning super admin role:", {
      error: assignError,
      userId,
      groupId,
    });
    
    if (assignError.code === "23505") {
      return { error: "User is already a super admin" };
    }
    return { error: "Failed to assign super admin role" };
  }

  return {};
}

export async function createOrg(
  formData: CreateCohort | { name: string; slug: string },
  userId?: string
): Promise<CreateOrgResult> {
  const supabase = await createClient();
  const serviceClient = await createServiceRoleClient();

  try {
    // If userId is not provided, get it from the current session
    if (!userId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return { error: "User not found" };
      }
      userId = user.id;
    }

    // Check if user exists in profiles
    const { data: profile, error: profileError } = await serviceClient
      .from("profiles")
      .select()
      .eq("id", userId)
      .single();

    if (profileError) {
      console.error("Profile check error:", profileError);
      return { error: "User profile not found" };
    }

    // Create organization
    const { data: org, error: orgError } = await serviceClient
      .from("group")
      .insert({
        name: formData.name,
        slug: formData.slug,
        ...(formData as CreateCohort).alternateName && {
          alternate_name: (formData as CreateCohort).alternateName,
        },
        ...(formData as CreateCohort).description && {
          description: (formData as CreateCohort).description,
        },
        ...(formData as CreateCohort).type && {
          type: (formData as CreateCohort).type,
        },
        // Support for new organization type fields
        ...(formData as any).typeCode && {
          type_code: (formData as any).typeCode,
        },
        ...(formData as any).metadata && {
          metadata: (formData as any).metadata,
        },
        created_by: userId,
      })
      .select()
      .single();

    if (orgError || !org) {
      console.error("Organization creation error:", {
        error: orgError,
        formData,
        userId,
      });
      if (orgError?.code === "23505") {
        return { error: "An organization with this slug already exists" };
      }
      return { error: `Failed to create organization: ${orgError?.message || 'Unknown error'}` };
    }

    console.log("Organization created successfully:", org);

    // Add user to org with explicit error handling using service role client
    const { error: orgUserError } = await serviceClient
      .from("group_users")
      .insert({
        group_id: org.id,
        user_id: userId,
        is_active: true,
      });

    if (orgUserError) {
      console.error("Error adding user to organization:", {
        error: orgUserError,
        userId,
        groupId: org.id,
      });
      await serviceClient.from("group").delete().eq("id", org.id);

      if (orgUserError.code === "23505") {
        return { error: "You are already a member of this organization" };
      }
      return { error: "Failed to add user to organization" };
    }

    console.log("User added to organization successfully");

    // Setup org roles with explicit error handling
    let orgRoles;
    try {
      orgRoles = await createOrgRoles(org.id);
    } catch (error) {
      console.error("Error creating organization roles:", {
        error,
        groupId: org.id,
      });
      await serviceClient.from("group_users").delete().eq("group_id", org.id);
      await serviceClient.from("group").delete().eq("id", org.id);
      return { error: "Failed to create organization roles" };
    }

    console.log("Organization roles created successfully");

    // Assign admin role to creator with explicit error handling
    const { error: userRoleError } = await serviceClient
      .from("user_roles")
      .insert({
        group_role_id: orgRoles[0].id, // admin role
        user_id: userId,
        is_active: true,
      });

    if (userRoleError) {
      console.error("Error assigning admin role:", {
        error: userRoleError,
        userId,
        roleId: orgRoles[0].id,
      });

      await serviceClient.from("user_roles").delete().eq("group_role_id", orgRoles[0].id);
      await serviceClient.from("group_roles").delete().eq("group_id", org.id);
      await serviceClient.from("group_users").delete().eq("group_id", org.id);
      await serviceClient.from("group").delete().eq("id", org.id);

      if (userRoleError.code === "23505") {
        return { error: "User already has a role in this organization" };
      }
      return { error: "Failed to assign admin role" };
    }

    console.log("Admin role assigned successfully");
    return { data: org };
  } catch (error: any) {
    console.error("Unexpected error in createOrg:", error);
    return { error: "An unexpected error occurred while creating the organization" };
  }
}
