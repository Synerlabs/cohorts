import { createClient } from "@/lib/utils/supabase/server";
import camelcaseKeys from "camelcase-keys";
import { Camelized } from "humps";
import { Tables } from "@/lib/types/database.types";

export async function getOrgs() {
  const supabase = createClient();
  const { data, error } = await supabase.from("group").select().limit(10);

  if (error) {
    return { error: error.message };
  } else {
    return data;
  }
}

export async function getOrgBySlug(slug: string) {
  const supabase = createClient();
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
  const supabase = createClient();
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
  const supabase = createClient();
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
  const supabase = createClient();
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
  const supabase = createClient();
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
  const supabase = createClient();
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
  const supabase = createClient();
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
  const supabase = createClient();
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

export async function createOrgMember({
  userId,
  groupId,
}: {
  userId: string;
  groupId: string;
}) {
  const supabase = createClient();
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

  const supabase = createClient();
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
