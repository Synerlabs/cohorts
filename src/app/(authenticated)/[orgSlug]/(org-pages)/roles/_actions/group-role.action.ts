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
    | (z.infer<typeof groupRolesInsertSchema> & { redirectTo?: string })
    | (z.infer<typeof groupRolesUpdateSchema> & { redirectTo?: string }),
) {
  const { redirectTo, ...formDataWithoutRedirect } = form;
  const formData = snakecaseKeys(formDataWithoutRedirect);
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
    return { 
      success: false,
      issues: error, 
      message: error.message 
    };
  } else {
    if (form.redirectTo) {
      redirect(`${form.redirectTo}/${data.id}`);
    }
    return { 
      success: true,
      message: "Group role created successfully",
      id: data.id
    };
  }
}
