"use server";
import { createClient } from "@/lib/utils/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { permissions } from "@/lib/types/permissions";
import { withPermissions } from "@/lib/utils/action-permissions";

type PrevState = {
  message?: string;
  issues?: any[];
  fields?: any[];
} | null;

interface UserRole {
  id: string;
  user_id: string;
  group_role_id: string;
  group_roles: {
    group_id: string;
  } | null;
}

const handleAddRoleUserAction = async (
  context: { userId: string; groupId: string },
  params: { userIds: string[]; groupRoleId: string }
) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_roles")
    .upsert(
      params.userIds.map((id) => ({
        user_id: id,
        group_role_id: params.groupRoleId,
        is_active: true
      })),
    )
    .select("id");

  if (error) {
    return { issues: error, message: error.message };
  } else {
    revalidatePath("/", "layout");
    return { success: true };
  }
};

export async function addRoleUserAction(
  prevState: PrevState,
  formData: FormData
) {
  const groupRoleId = formData.get('groupRoleId') as string;
  const userIds = formData.getAll('userIds[]').map(id => id.toString());

  const handler = await withPermissions(
    handleAddRoleUserAction,
    () => ({
      moduleId: groupRoleId,
      moduleType: 'role' as const,
      requiredPermissions: permissions.roles.assign
    })
  );

  return handler(prevState, { userIds, groupRoleId });
}

const handleRemoveRoleUserAction = async (
  context: { userId: string; groupId: string },
  params: { userRoleId: string }
) => {
  const supabase = await createClient();

  // First get the user role details to verify it exists
  const { data: userRole, error: fetchError } = await supabase
    .from("user_roles")
    .select("id")
    .eq("id", params.userRoleId)
    .single();

  if (fetchError || !userRole) {
    return { issues: fetchError, message: fetchError?.message || "User role not found" };
  }

  // Now delete the user role
  const { error: deleteError } = await supabase
    .from("user_roles")
    .delete()
    .eq("id", params.userRoleId);

  if (deleteError) {
    return { issues: deleteError, message: deleteError.message };
  } else {
    revalidatePath("/", "layout");
    return { success: true };
  }
};

export async function removeRoleUserAction(
  prevState: PrevState,
  formData: {id: string}
) {
  const userRoleId = formData.id;

  const handler = await withPermissions(
    handleRemoveRoleUserAction,
    () => ({
      moduleId: userRoleId,
      moduleType: 'user_role' as const,
      requiredPermissions: permissions.roles.assign
    })
  );

  return handler(prevState, { userRoleId });
}
