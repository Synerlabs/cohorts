import { createClient } from "@/lib/utils/supabase/server";
import { redirect } from "next/navigation";

export async function GET() {
  const supabase = createClient();

  const { error } = await supabase.auth.signOut();
  if (!error) {
    return redirect("/");
  }
}
