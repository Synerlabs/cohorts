"use server";
import { z } from "zod";
import { createClient } from "@/lib/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  CreateCohort,
  createCohortSchema,
} from "@/lib/types/create-cohort.type";

export async function createCohortAction(
  currentState: CreateCohort,
  formData: CreateCohort,
) {
  // Validate formData using Zod
  const parsedFormData = createCohortSchema.safeParse(formData);
  if (!parsedFormData.success) {
    return { error: parsedFormData.error.errors };
  }

  const supabase = createClient();
  const {
    error: userError,
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || userError) {
    return { error: userError || "You must be logged in to create a cohort" };
  }

  const { data, error } = await supabase
    .from("group")
    .insert([
      {
        name: parsedFormData.data.name,
        alternate_name: parsedFormData.data.alternateName,
        slug: parsedFormData.data.slug,
        description: parsedFormData.data.description,
        type: parsedFormData.data.type,
        created_by: user.id,
      },
    ])
    .select()
    .single();

  if (error) {
    return { form: formData, error: error.message };
  } else {
    // setup group roles
    const { data: groupRoles, error: groupRolesError } = await supabase
      .from("group_roles")
      .insert([
        {
          group_id: data.id,
          role_name: "admin",
          description: "Admin role for the group",
        },
        {
          group_id: data.id,
          role_name: "member",
          description: "Member role for the group",
        },
      ])
      .select();

    // setup role permissions
    if (groupRoles) {
      const { data: rolePermissions, error: rolePermissionsError } =
        await supabase
          .from("role_permissions")
          .insert([
            {
              role_id: groupRoles[0].id,
              permission: "group.edit",
            },
            {
              role_id: groupRoles[0].id,
              permission: "group.delete",
            },
            {
              role_id: groupRoles[0].id,
              permission: "group.members.invite",
            },
            {
              role_id: groupRoles[0].id,
              permission: "group.members.approve",
            },
          ])
          .select();
      // add user to group
      const { data: userGroup, error: userGroupError } = await supabase
        .from("user_roles")
        .insert([
          {
            group_role_id: groupRoles[0].id,
            user_id: user.id,
          },
        ])
        .select();
    }
    redirect(`@${formData.slug}`);
  }
}
