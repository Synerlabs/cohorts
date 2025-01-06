import { RegistrationForm } from "@/app/(public)/(home)/sign-up/components/registration-form";
import { createClient } from "@/lib/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function SignUp() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getUser();
  if (data?.user) {
    redirect("/home");
  }

  return <RegistrationForm />;
}
