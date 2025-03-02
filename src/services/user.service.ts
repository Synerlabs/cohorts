import { createClient } from "@/lib/utils/supabase/server";
import camelcaseKeys from "camelcase-keys";
import type { Database } from "@/lib/types/database.types";

type GroupRole = Database["public"]["Tables"]["group_roles"]["Row"];
type UserRole = Database["public"]["Tables"]["user_roles"]["Row"];

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    return { error: error.message };
  } else {
    return { data };
  }
}

export async function getUsers() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("*");

  if (error) {
    return { error: error.message };
  } else {
    return { data };
  }
}

/**
 * Get user's directly assigned roles for a specific group or all groups.
 * Note: This function only returns directly assigned roles, not roles from memberships.
 * For membership roles, use the membership_roles_view or check the user's permissions
 * through checkUserAccess which combines both direct roles and membership roles.
 */
export async function getUserRoles({
  id,
  groupId,
}: {
  id: string;
  groupId: string;
}): Promise<(UserRole & { group_roles: GroupRole | null })[]> {
  const supabase = await createClient();
  const query = supabase
    .from("user_roles")
    .select(
      "*, group_roles (*)",
    )
    .eq("user_id", id);

  // Only filter by group_id if not fetching all groups
  if (groupId !== '*') {
    query.eq("group_roles.group_id", groupId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data || [];
}

export async function getUserOrgs({ id }: { id: string }) {
  const supabase = await createClient();
  type GroupResponse = {
    group: {
      id: string;
    } | null;
  };
  
  const { data, error } = await supabase
    .from("group_users")
    .select("group:group_id (id)")
    .eq("user_id", id)
    .returns<GroupResponse[]>();

  if (error) {
    throw error;
  }

  return data?.map((d) => d.group?.id).filter((id): id is string => id !== null) || [];
}

export async function getGroupUser({
  userId,
  groupId,
}: {
  userId: string;
  groupId: string;
}) {
  const supabase = await createClient();
  
  try {
    // console.log('Fetching group user:', { userId, groupId });
    
    const { data, error } = await supabase
      .from("group_users")
      .select("*")
      .eq("user_id", userId)
      .eq("group_id", groupId);

    if (error) {
      console.error("Error fetching group user:", error);
      return null;
    }

    if (!data || data.length === 0) {
      console.log('No group user found for', { userId, groupId });
      return null;
    }

    // console.log('Found group user:', data[0]);
    return camelcaseKeys(data[0]);
  } catch (error) {
    console.error("Exception in getGroupUser:", error);
    return null;
  }
}
