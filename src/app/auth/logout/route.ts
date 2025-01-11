import { createClient } from "@/lib/utils/supabase/server";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const searchParams = request.nextUrl.searchParams;
  const orgSlug = searchParams.get('orgSlug');

  const { error } = await supabase.auth.signOut();
  if (!error) {
    // If orgSlug is provided, redirect to org root
    if (orgSlug) {
      return redirect(`/@${orgSlug}`);
    }
    return redirect("/");
  }
}
