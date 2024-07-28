"use server";
import { createClient } from "@/lib/utils/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

type PrevState = {
  message?: string;
  issues?: any[];
  fields?: any[];
} | null;

export async function addRoleUserAction(
  prevState: PrevState,
  form: { userIds: string[]; groupRoleId: string },
) {
  const supabase = createClient();
  const {
    error: userError,
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || userError) {
    return { error: userError || "You must be logged in to update a cohort" };
  }

  const { data, error } = await supabase
    .from("user_roles")
    .upsert(
      form.userIds.map((id) => ({
        user_id: id,
        group_role_id: form.groupRoleId,
      })),
    )
    .select("id");

  if (error) {
    return { issues: error, message: error.message };
  } else {
    revalidatePath("/", "layout");
    return { success: true };
  }
}

export async function removeRoleUserAction(
  prevState: PrevState,
  form: { id: string },
) {
  const supabase = createClient();
  const {
    error: userError,
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || userError) {
    return { error: userError || "You must be logged in to update a cohort" };
  }

  const { data, error } = await supabase
    .from("user_roles")
    .delete()
    .match({ id: form.id });

  console.log("WTH", form, data, error);
  if (error) {
    return { issues: error, message: error.message };
  } else {
    revalidatePath("/", "layout");
    return { success: true, message: "User removed successfully." };
  }
}
