import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { TypedSupabaseClient } from "./types";

export async function createClient(): Promise<TypedSupabaseClient> {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const cookie = cookieStore.get(name);
          return cookie?.value;
        },
      },
    }
  ) as TypedSupabaseClient;
}
