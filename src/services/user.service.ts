import { createClient } from "@/lib/utils/supabase/server";
import { id } from "postcss-selector-parser";
import camelcaseKeys from "camelcase-keys";

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

export async function getUser({ id }: { id: string }) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser(id);

  if (error) {
    return { error: error.message };
  } else {
    return { data };
  }
}

export async function getUserByEmail({ email }: { email: string }) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUserByEmail(email);

  if (error) {
    return { error: error.message };
  } else {
    return { data };
  }
}
export async function getUserByProvider({ provider }: { provider: string }) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUserByProvider(provider);

  if (error) {
    return { error: error.message };
  } else {
    return { data };
  }
}

export async function getUserRoles({
  id,
  groupId,
}: {
  id: string;
  groupId: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_roles")
    .select(
      "group_roles (role_name, description, permissions), group_role_id, isActive:is_active",
    )
    .eq("user_id", id)
    .eq("group_roles.group_id", groupId);

  if (error) {
    throw error;
  } else {
    return data?.map((d) => camelcaseKeys(d));
  }
}

export async function getUserOrgs({ id }: { id: string }) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("group_users")
    .select("group (id)")
    .eq("user_id", id);

  if (error) {
    throw error;
  } else {
    return data?.map((d) => d?.group?.id);
  }
}

export async function getGroupUser({
  userId,
  groupId,
}: {
  userId: string;
  groupId: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("group_users")
    .select("*")
    .eq("user_id", userId)
    .eq("group_id", groupId)
    .single();

  if (error) {
    console.log("Error fetching group user:", error);
    return {
      error: error.message,
    };
  }

  return data ? camelcaseKeys(data) : null;
}
