"use server";
import snakecaseKeys from "snakecase-keys";
import { groupRolesInsertSchema } from "@/lib/types/zod-schemas";
import { createClient } from "@/lib/utils/supabase/server";
import { redirect } from "next/navigation";

type PrevState = {
  message?: string;
  issues?: any[];
  fields?: any[];
} | null;

export async function createGroupRoleAction(
  prevState: PrevState,
  form: FormData,
) {
  const formData = snakecaseKeys(Object.fromEntries(form));
  const parsedFormData = groupRolesInsertSchema.safeParse(formData);

  if (!parsedFormData.success) {
    return { issues: parsedFormData.error.errors };
  }

  const supabase = createClient();
  const {
    error: userError,
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || userError) {
    return { error: userError || "You must be logged in to update a cohort" };
  }
  const { data, error } = await supabase
    .from("group_roles")
    .insert(parsedFormData.data)
    .select("id")
    .single();

  if (error) {
    return { issues: error, message: error.message };
  } else {
    redirect(`./${data.id}`);
  }
}
