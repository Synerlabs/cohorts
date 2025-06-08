"use server";
import { createClient } from "@/lib/utils/supabase/server";

export async function sendResetEmail(formData: FormData) {
  const email = formData.get("email") as string;
  let orgSlug = formData.get("orgSlug") as string | undefined;
  if (orgSlug) orgSlug = orgSlug.replace(/^@/, "");
  if (!email) return { error: "Email is required" };
    console.log("ORGSLUG", orgSlug);
  const supabase = await createClient();
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
  const redirectTo = orgSlug
    ? `${baseUrl}/@${orgSlug}/reset-password`
    : `${baseUrl}/reset-password`;
    console.log("REDIRECTTO", redirectTo);
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) return { error: error.message };
  return { success: true };
} 