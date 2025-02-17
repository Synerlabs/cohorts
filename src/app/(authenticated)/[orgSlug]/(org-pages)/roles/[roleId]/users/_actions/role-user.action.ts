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
  form: { userIds: string[]; groupRoleId: string }
) {
  const handler = await withPermissions(
    handleAddRoleUserAction,
    () => ({
      moduleId: form.groupRoleId,
      moduleType: 'role',
      requiredPermissions: [permissions.roles.assign],
    })
  );

  return handler(prevState, { userIds: form.userIds, groupRoleId: form.groupRoleId });
}

const handleRemoveRoleUserAction = async (
  context: { userId: string; groupId: string },
  params: { userId: string; groupRoleId: string }
) => {
  const supabase = await createClient();
  const { error } = await supabase
    .from("user_roles")
    .delete()
    .match({
      user_id: params.userId,
      group_role_id: params.groupRoleId,
    });

  if (error) {
    return { issues: error, message: error.message };
  } else {
    revalidatePath("/", "layout");
    return { success: true };
  }
};

export async function removeRoleUserAction(
  prevState: PrevState,
  form: { userId: string; groupRoleId: string }
) {
  const handler = await withPermissions(
    handleRemoveRoleUserAction,
    () => ({
      moduleId: form.groupRoleId,
      moduleType: 'role',
      requiredPermissions: [permissions.roles.assign],
    })
  );

  return handler(prevState, { userId: form.userId, groupRoleId: form.groupRoleId });
}
