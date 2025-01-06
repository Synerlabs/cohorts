import { createClient } from "@/lib/utils/supabase/server";
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

export async function getOrgMembers({ id }: { id: string }) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("group_users")
    .select(
      `id, created_at, user_id, profile:user_id ( first_name, last_name, avatar_url )`,
    )
    .eq("group_id", id);

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
  const { data: member, error } = await supabase
    .from("group_users")
    .insert({
      user_id: userId,
      group_id: groupId,
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  } else {
    return member;
  }
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
  formData: CreateCohort,
  userId: string
): Promise<CreateOrgResult> {
  const supabase = await createClient();

  // Start transaction
  const { data, error } = await supabase.auth.getSession();
  if (error) return { error: "Authentication error" };

  const { data: org, error: orgError } = await supabase.from("group")
    .insert([{
      name: formData.name,
      alternate_name: formData.alternateName,
      slug: formData.slug,
      description: formData.description,
      type: formData.type,
      created_by: userId,
    }])
    .select()
    .single();

  if (orgError || !org) {
    return { error: orgError?.message || "Failed to create organization" };
  }

  // Add user to org
  const { error: orgUserError } = await supabase
    .from("group_users")
    .insert([{
      group_id: org.id,
      user_id: userId,
      is_active: true,
    }]);

  if (orgUserError) {
    // Rollback org creation
    await supabase.from("group").delete().eq("id", org.id);
    return { error: "Failed to add user to organization" };
  }

  // Setup org roles
  const { data: orgRoles, error: orgRolesError } = await supabase
    .from("group_roles")
    .insert([
      {
        group_id: org.id,
        role_name: "admin",
        description: "Admin role for the organization",
        permissions: [
          permissions.permissions.edit,
          permissions.permissions.view,
          permissions.permissions.delete,
          permissions.group.create,
          permissions.group.edit,
          permissions.group.view,
          permissions.group.delete,
          permissions.members.edit,
          permissions.members.view,
          permissions.members.delete,
          permissions.members.add,
          permissions.roles.view,
          permissions.roles.create,
          permissions.roles.delete,
          permissions.roles.edit,
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
    // Rollback previous operations
    await supabase.from("group_users").delete().eq("group_id", org.id);
    await supabase.from("group").delete().eq("id", org.id);
    return { error: "Failed to create organization roles" };
  }

  // Assign admin role to creator
  const { error: userRoleError } = await supabase
    .from("user_roles")
    .insert([{
      group_role_id: orgRoles[0].id, // admin role
      user_id: userId,
      is_active: true,
    }]);

  if (userRoleError) {
    // Rollback all previous operations
    await supabase.from("user_roles").delete().eq("group_role_id", orgRoles[0].id);
    await supabase.from("group_roles").delete().eq("group_id", org.id);
    await supabase.from("group_users").delete().eq("group_id", org.id);
    await supabase.from("group").delete().eq("id", org.id);
    return { error: "Failed to assign admin role" };
  }

  return { data: org };
}
