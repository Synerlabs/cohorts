import { LoginForm } from "@/app/(public)/(home)/components/login/login-form";

import { createClient } from "@/lib/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function SignUp() {
  const supabase = createClient();

  const { data, error } = await supabase.auth.getUser();
  if (data?.user) {
    redirect("/home");
  }

  return <LoginForm />;
}
