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
  console.log("GETTING ORG BY SLUG", slug);
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
      .select("id")
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
    .select("id")
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
    const { data: orgRoles, error: orgRolesError } = await serviceClient
      .from("group_roles")
      .insert([
        {
          group_id: org.id,
          role_name: "admin",
          description: "Admin role for the organization",
          permissions: [
            // Group permissions
            permissions.group.view,
            permissions.group.create,
            permissions.group.edit,
            permissions.group.delete,
            // Members permissions
            permissions.members.view,
            permissions.members.add,
            permissions.members.edit,
            permissions.members.delete,
            // Roles permissions
            permissions.roles.view,
            permissions.roles.create,
            permissions.roles.edit,
            permissions.roles.delete,
            // Permissions management
            permissions.permissions.view,
            permissions.permissions.assign,
            // Memberships
            permissions.memberships.view,
            permissions.memberships.manage,
            // Applications
            permissions.applications.view,
            permissions.applications.create,
            permissions.applications.edit,
            permissions.applications.delete,
            permissions.applications.approve,
            permissions.applications.reject,
          ],
        },
        {
          group_id: org.id,
          role_name: "member",
          description: "Member role for the organization",
        },
      ])
      .select();

    if (orgRolesError || !orgRoles) {
      console.error("Error creating organization roles:", {
        error: orgRolesError,
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
