"use server";
import Cookies from "js-cookie";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/utils/supabase/server";

type CurrentState = {
  email: string;
  password: string;
  error: string;
};

export async function loginAction(
  currentState: CurrentState | null,
  formData: FormData,
) {
  const supabase = createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const redirectTo = formData.get("redirect") as string | null; // Get the redirect value

  console.log(currentState, formData);

  // Validate the inputs and sanitize redirect if needed
  const data = {
    email,
    password,
  };

  const { error, ...res } = await supabase.auth.signInWithPassword(data);

  if (error) {
    return { email, password, error: error.message };
  } else {
    revalidatePath("/", "layout");

    // Use redirectTo if available, otherwise fallback to /home
    redirect(redirectTo || "/home");
  }
}
