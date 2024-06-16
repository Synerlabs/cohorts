"use server";

import { createClient } from "@/lib/utils/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export const signout = async () => {
  const supabase = createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    console.log("ERROR!", error);
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/");
};
