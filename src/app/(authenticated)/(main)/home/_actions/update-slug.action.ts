"use server";
import { z } from "zod";
import { createClient } from "@/lib/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  CreateCohort,
  createCohortSchema,
} from "@/lib/types/create-cohort.type";
import { Camelized } from "humps";
import { Tables } from "@/lib/types/database.types";
import snakecaseKeys from "snakecase-keys";
import { groupUpdateSchema } from "@/lib/types/zod-schemas";
import { permissions } from "@/lib/types/permissions";
import { withPermissions } from "@/lib/utils/action-permissions";

const updateSlug = async (
  context: { userId: string; groupId: string },
  params: { formData: FormData }
) => {
  const formData = snakecaseKeys(Object.fromEntries(params.formData));
  const parsedFormData = groupUpdateSchema
    .pick({ slug: true, id: true })
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

  // Return the new slug for redirection
  return { success: true, data: { slug: parsedFormData.data.slug } };
};

export async function updateSlugAction(
  currentState: any,
  formData: FormData
) {
  const handler = await withPermissions(
    updateSlug,
    (params: { formData: FormData }) => {
      const formData = Object.fromEntries(params.formData);
      return {
        groupId: formData.id as string,
        requiredPermissions: [permissions.group.edit],
      };
    }
  );
  
  const result = await handler(currentState, { formData });
  
  if (result.success && result.data?.slug) {
    redirect(`/@${result.data.slug}/settings`);
  }
  
  return result;
}
