"use server";
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
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const redirectTo = formData.get("redirect") as string | null;

  const data = {
    email,
    password,
  };

  const { error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    return { email, password, error: error.message };
  }

  revalidatePath("/", "layout");

  // Extract the base URL and search params from redirectTo
  if (redirectTo) {
    const url = new URL(redirectTo, 'http://dummy.com');
    const firstLogin = url.searchParams.get('firstLogin');
    const baseUrl = url.pathname;

    // If this is first login and it's an org page, redirect to join
    if (firstLogin === 'true' && baseUrl.startsWith('/@')) {
      redirect(`${baseUrl}/join`);
    }

    redirect(baseUrl);
  }

  redirect("/home");
}
