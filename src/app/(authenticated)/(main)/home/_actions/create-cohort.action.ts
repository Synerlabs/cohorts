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
    .select();

  if (error) {
    return { form: formData, error: error.message };
  } else {
    redirect(`@${formData.slug}`);
  }
}
