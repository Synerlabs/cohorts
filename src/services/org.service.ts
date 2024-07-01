import { createClient } from "@/lib/utils/supabase/server";

export async function getOrgBySlug(slug: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("group")
    .select("name")
    .eq("slug", slug)
    .single();

  if (error) {
    return { error: error.message };
  } else {
    return { data };
  }
}
