"use server";
import { createClient } from "@/lib/utils/supabase/server";

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
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    options: {
      data: {
        firstName,
        lastName,
      },
    },
  };

  const { error } = await supabase.auth.signUp(data);
  if (error) {
    return {
      email,
      password,
      firstName,
      lastName,
      success: false,
      error: error.message,
    };
  } else {
    return {
      success: true,
      message: "Sign up successful",
    };
  }
}
