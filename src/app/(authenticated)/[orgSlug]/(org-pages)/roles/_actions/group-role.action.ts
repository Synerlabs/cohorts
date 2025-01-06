"use server";
import snakecaseKeys from "snakecase-keys";
import {
  groupRolesInsertSchema,
  groupRolesUpdateSchema,
  rolePermissionsInsertSchema,
} from "@/lib/types/zod-schemas";
import { createClient } from "@/lib/utils/supabase/server";
import { redirect } from "next/navigation";
import { z } from "zod";

type PrevState = {
  message?: string;
  issues?: any[];
  fields?: any[];
} | null;

export async function createGroupRoleAction(
  prevState: PrevState,
  form:
    | z.infer<typeof groupRolesInsertSchema>
    | z.infer<typeof groupRolesUpdateSchema>,
) {
  const formData = snakecaseKeys(form);
  const parsedFormData = formData.id
    ? groupRolesUpdateSchema.safeParse(formData)
    : groupRolesInsertSchema.safeParse(formData);

  if (!parsedFormData.success) {
    console.error(parsedFormData.error.errors);
    return { issues: parsedFormData.error.errors };
  }

  const supabase = await createClient();
  const {
    error: userError,
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || userError) {
    return { error: userError || "You must be logged in to update a cohort" };
  }

  const { data, error } = await supabase
    .from("group_roles")
    .upsert(parsedFormData.data)
    .select("id")
    .single();

  if (error) {
    return { issues: error, message: error.message };
  } else {
    redirect(`./${data.id}`);
  }
}
