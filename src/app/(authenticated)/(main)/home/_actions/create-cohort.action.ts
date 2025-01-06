"use server";
import { createCohortSchema } from "@/lib/types/create-cohort.type";
import { createClient } from "@/lib/utils/supabase/server";
import { redirect } from "next/navigation";
import { createOrg } from "@/services/org.service";

export type ActionState = {
  error?: string | any;
  success?: boolean;
};

export async function createCohortAction(currentState: ActionState | null, formData: any): Promise<ActionState> {
  // Validate formData using Zod
  const parsedFormData = createCohortSchema.safeParse(formData);
  console.log(parsedFormData);
  if (!parsedFormData.success) {
    return {
      error: parsedFormData.error.errors[0].message,
      success: false
    };
  }

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (!user || userError) {
    return {
      error: userError?.message || "You must be logged in to create an organization",
      success: false
    };
  }

  const result = await createOrg(parsedFormData.data, user.id);
  
  if (result.error) {
    return {
      error: result.error,
      success: false
    };
  }

  // Set success before redirect
  const response = {
    success: true
  };

  redirect(`/@${parsedFormData.data.slug}`);
  return response; // Note: This won't actually be returned due to the redirect
}
