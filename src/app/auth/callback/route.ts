import { createClient } from "@/lib/utils/supabase/server";
import { NextResponse } from "next/server";

// This route handles the code exchange after a user clicks a magic link or OAuth link
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // The redirectTo path provided in the initial CemailRedirectTo option (e.g., /@orgSlug)
  const next = searchParams.get("next") || "/"; 

  console.log(`Auth Callback: code=${code}, next=${next}, origin=${origin}`);

  // Extract org slug from 'next' parameter if available
  let orgSlug = "";
  const orgSlugMatch = next.match(/\/@([^\/]+)/);
  if (orgSlugMatch && orgSlugMatch[1]) {
    orgSlug = orgSlug || orgSlugMatch[1];
    console.log(`Auth Callback: Extracted org slug: ${orgSlug}`);
  }

  // Also extract org slug from the next parameter if it contains orgSlug=
  const orgSlugParam = next.match(/orgSlug=([^&]+)/);
  if (orgSlugParam && orgSlugParam[1]) {
    orgSlug = orgSlug || orgSlugParam[1];
    console.log(`Auth Callback: Extracted org slug from param: ${orgSlug}`);
  }

  if (code) {
    try {
      // We need to modify how we create the Supabase client to ensure 
      // cookie handling is properly configured
      const supabase = await createClient();
      
      console.log("Auth Callback: About to exchange code for session...");
      
      // Exchange code for session - this should set cookies automatically
      // through the Supabase client's cookie handlers
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error("Auth Callback: Error exchanging code:", error);
        return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent(error.message)}`);
      }
      
      console.log("Auth Callback: Code exchanged successfully.");
      
      // Check if we got a session
      const { data: { session } } = await supabase.auth.getSession();
      console.log("Auth Callback: Session after exchange:", session ? `Valid (user: ${session.user.id})` : "Not found");
      
      if (session) {
        // Check if the user has completed their profile setup
        const { data: profile } = await supabase
          .from("user_profile")
          .select("first_name, last_name")
          .eq("user_id", session.user.id)
          .single();
        
        console.log("Auth Callback: Profile check result:", profile ? "Found" : "Not found", 
                   "First name:", profile?.first_name, "Last name:", profile?.last_name);
        
        // If the profile is incomplete, redirect to account setup with the org slug
        if (!profile?.first_name || !profile?.last_name) {
          console.log("Auth Callback: Profile incomplete, redirecting to account setup");
          
          // Create destination URL
          const setupUrl = orgSlug
            ? `/public-account-setup?orgSlug=${orgSlug}`
            : `/public-account-setup`;
            
          // Create NEW session ID to workaround Next.js cookie forwarding issues
          // This will help ensure the session cookies are properly set
          const setupCookie = `sb-setup-${new Date().getTime()}=true; Path=/; Max-Age=60; SameSite=Lax`;
          
          // Add custom header with session ID to help diagnose in the browser
          if (session?.user?.id) {
            const sessionIdHeader = `X-Auth-Session-Id: ${session.user.id}`;
            console.log(`Auth Callback: Adding session tracking header: ${sessionIdHeader}`);
          }
            
          // Create response with redirect and additional headers
          const response = NextResponse.redirect(`${origin}${setupUrl}`);
          
          // Explicitly add set-cookie header with our tracking cookie
          response.headers.append('Set-Cookie', setupCookie);
          
          if (session?.user?.id) {
            response.headers.append('X-Auth-Session-Id', session.user.id);
          }
          
          // Log response details
          console.log("Auth Callback: Redirecting to:", response.headers.get("Location"));
          console.log("Auth Callback: Added custom setup cookie:", setupCookie);
          
          return response;
        }
      }

      // Redirect to the intended final destination with session ID header if available
      console.log(`Auth Callback: Profile complete, redirecting to final destination: ${origin}${next}`);
      const response = NextResponse.redirect(`${origin}${next}`);
      
      if (session?.user?.id) {
        response.headers.append('X-Auth-Session-Id', session.user.id);
      }
      
      return response;
    } catch (error) {
      console.error("Auth Callback: Unexpected error:", error);
      return NextResponse.redirect(`${origin}/auth/auth-code-error?error=Unexpected+error`);
    }
  }

  // Redirect to an error page or home page if code is missing or exchange fails
  console.warn("Auth Callback: Code missing or exchange failed. Redirecting to /auth/auth-code-error");
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
} 