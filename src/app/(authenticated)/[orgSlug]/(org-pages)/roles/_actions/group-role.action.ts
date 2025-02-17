"use server";
import snakecaseKeys from "snakecase-keys";
import {
  groupRolesInsertSchema,
  groupRolesUpdateSchema,
} from "@/lib/types/zod-schemas";
import { createClient } from "@/lib/utils/supabase/server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { permissions } from "@/lib/types/permissions";
import { withPermissions } from "@/lib/utils/action-permissions";

type PrevState = {
  message?: string;
  issues?: any[];
  fields?: any[];
} | null;

const handleGroupRoleAction = async (
  context: { userId: string; groupId: string },
  params: {
    form: z.infer<typeof groupRolesInsertSchema> | z.infer<typeof groupRolesUpdateSchema>;
  }
) => {
  const formData = snakecaseKeys(params.form);
  const parsedFormData = formData.id
    ? groupRolesUpdateSchema.safeParse(formData)
    : groupRolesInsertSchema.safeParse(formData);

  if (!parsedFormData.success) {
    console.error(parsedFormData.error.errors);
    return { issues: parsedFormData.error.errors };
  }

  const supabase = await createClient();

  // First get the org slug
  const { data: org, error: orgError } = await supabase
    .from("group")
    .select("slug")
    .eq("id", context.groupId)
    .single();

  if (orgError) {
    return {
      success: false,
      issues: orgError,
      message: orgError.message,
    };
  }

  const { data, error } = await supabase
    .from("group_roles")
    .upsert({
      ...parsedFormData.data,
      group_id: context.groupId,
      created_by: context.userId
    })
    .select("id")
    .single();

  if (error) {
    return {
      success: false,
      issues: error,
      message: error.message,
    };
  }

  revalidatePath(`/${org.slug}/roles`);
  return {
    success: true,
    message: "Group role created successfully",
    id: data.id,
  };
};

export async function createGroupRoleAction(
  prevState: PrevState,
  form: z.infer<typeof groupRolesInsertSchema> | z.infer<typeof groupRolesUpdateSchema>
) {
  const handler = await withPermissions(
    handleGroupRoleAction,
    () => ({
      groupId: form.id ? undefined : form.group_id as string,
      moduleId: form.id,
      moduleType: form.id ? 'role' : undefined,
      requiredPermissions: [
        form.id ? permissions.roles.edit : permissions.roles.create
      ],
    })
  );

  return handler(prevState, { form });
}
