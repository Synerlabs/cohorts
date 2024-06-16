"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/utils/supabase/client";

type CurrentState = {
  email?: string;
  password?: string;
  success: boolean;
  error?: string;
} | null;

export async function signUpAction(
  currentState: CurrentState,
  formData: FormData,
) {
  const supabase = createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const { error, ...resp } = await supabase.auth.signUp(data);
  console.log("resp", resp);
  console.log("error", error);
  if (error) {
    return { email, password, success: false, error: error.message };
  } else {
    return {
      success: true,
      message: "Sign up successful",
    };
  }
}
