"use server";
import { z } from "zod";
import { createClient } from "@/lib/utils/supabase/server";
import snakecaseKeys from "snakecase-keys";
import { groupUpdateSchema } from "@/lib/types/zod-schemas";
import { permissions } from "@/lib/types/permissions";
import { withPermissions } from "@/lib/utils/action-permissions";

const updateCohortDetails = async (
  context: { userId: string; groupId: string },
  params: { formData: FormData }
) => {
  const formData = snakecaseKeys(Object.fromEntries(params.formData));
  const parsedFormData = groupUpdateSchema
    .pick({ name: true, id: true, alternate_name: true, description: true })
    .safeParse(formData);

  if (!parsedFormData.success) {
    return { error: parsedFormData.error.errors };
  }

  const supabase = await createClient();
  const { data: groupData, error } = await supabase
    .from("group")
    .update({ ...parsedFormData.data, created_by: context.userId })
    .eq("id", context.groupId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
};

export async function updateCohortDetailsAction(
  currentState: any,
  formData: FormData
) {
  const handler = await withPermissions(
    updateCohortDetails,
    (params: { formData: FormData }) => {
      const formData = Object.fromEntries(params.formData);
      return {
        groupId: formData.id as string,
        requiredPermissions: [permissions.group.edit],
      };
    }
  );
  
  return handler(currentState, { formData });
}
