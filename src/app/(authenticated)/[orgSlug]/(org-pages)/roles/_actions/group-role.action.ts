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
  form: z.infer<typeof groupRolesInsertSchema> | z.infer<typeof groupRolesUpdateSchema>
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
  
  // First get the org slug
  const { data: org, error: orgError } = await supabase
    .from('groups')
    .select('slug')
    .eq('id', parsedFormData.data.group_id)
    .single();

  if (orgError) {
    return { 
      success: false,
      issues: orgError, 
      message: orgError.message 
    };
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
  }
  
  revalidatePath(`/${org.slug}/roles`);
  return { 
    success: true,
    message: "Group role created successfully",
    id: data.id
  };
}
