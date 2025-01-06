"use server";
import { z } from "zod";
import { createClient } from "@/lib/utils/supabase/server";
import snakecaseKeys from "snakecase-keys";
import { groupUpdateSchema } from "@/lib/types/zod-schemas";

export async function updateCohortDetailsAction(
  currentState: z.infer<typeof groupUpdateSchema>,
  data: FormData,
) {
  const formData = snakecaseKeys(Object.fromEntries(data));
  const parsedFormData = groupUpdateSchema
    .pick({ name: true, id: true, alternate_name: true, description: true })
    .safeParse(formData);
  if (!parsedFormData.success) {
    return { error: parsedFormData.error.errors };
  }

  const supabase = await createClient();
  const {
    error: userError,
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || userError) {
    return { error: userError || "You must be logged in to update a cohort" };
  }

  const { data: groupData, error } = await supabase
    .from("group")
    .update({ ...parsedFormData.data, created_by: user.id })
    .eq("id", parsedFormData.data.id);

  if (error) {
    return { form: formData, error: error.message };
  } else {
    return { success: true };
  }
}
