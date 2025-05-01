import { createClient } from "@/lib/utils/supabase/server";
import { NextResponse } from "next/server";

// This route handles the code exchange after a user clicks a magic link or OAuth link
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // The redirectTo path provided in the initial CemailRedirectTo option (e.g., /@orgSlug)
  const next = searchParams.get("next") || "/"; 

  console.log(`Auth Callback: code=${code}, next=${next}, origin=${origin}`);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      console.log("Auth Callback: Code exchanged successfully. Redirecting to:", `${origin}${next}`);
      // --- Activation Call --- 
      // It might be cleaner to still rely on withOrgAccess to call activate 
      // when the user lands on the final destination (/orgSlug page).
      // Calling it here is possible but adds complexity (need user ID right away).
      // Let's stick with withOrgAccess handling activation for now.
      // --- End Activation Call --- 

      // Redirect to the intended final destination
      return NextResponse.redirect(`${origin}${next}`);
    }
     console.error("Auth Callback: Error exchanging code:", error);
  }

  // Redirect to an error page or home page if code is missing or exchange fails
  console.warn("Auth Callback: Code missing or exchange failed. Redirecting to /auth/auth-code-error");
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
} 