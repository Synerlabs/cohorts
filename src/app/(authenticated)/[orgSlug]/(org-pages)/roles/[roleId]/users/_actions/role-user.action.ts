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
  params: { userIds: string[]; groupRoleId: string; groupId: string }
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
  form: { userIds: string[]; groupRoleId: string; groupId: string }
) {
  const handler = await withPermissions(
    handleAddRoleUserAction,
    (params) => ({
      groupId: params.groupId,
      requiredPermissions: [permissions.roles.assign],
    })
  );

  return handler(prevState, form);
}

const handleRemoveRoleUserAction = async (
  context: { userId: string; groupId: string },
  params: { userId: string; groupRoleId: string; groupId: string }
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
  form: { userId: string; groupRoleId: string; groupId: string }
) {
  const handler = await withPermissions(
    handleRemoveRoleUserAction,
    (params) => ({
      groupId: params.groupId,
      requiredPermissions: [permissions.roles.assign],
    })
  );

  return handler(prevState, form);
}
