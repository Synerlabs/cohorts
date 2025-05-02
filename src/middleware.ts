import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { response: supabaseResponse, session } = await updateSession(request)

  // Check if this is an authenticated route
  const isAuthenticatedRoute = request.nextUrl.pathname.startsWith('/@') && request.nextUrl.pathname.split('/').length > 2;

  if (isAuthenticatedRoute) {
    // Routes that allow guests
    const guestRoutes = ['/join'];
    const currentPath = '/' + request.nextUrl.pathname.split('/').slice(2).join('/');
    
    // Don't redirect if it's a guest route
    if (guestRoutes.some(route => currentPath.startsWith(route))) {
      return supabaseResponse;
    }

    // Extract org slug from path
    const orgSlug = request.nextUrl.pathname.split('/')[1];

    // Check if user is authenticated
    if (!session) {
      // Redirect to org's public page by modifying the existing response
      const redirectUrl = new URL(`/${orgSlug}`, request.url);
      console.log(`[Middleware] Unauthenticated access to ${request.nextUrl.pathname}. Redirecting to ${redirectUrl.toString()}`);
      
      // Modify the status and headers of the original supabaseResponse for redirect
      supabaseResponse.headers.set('Location', redirectUrl.toString());
      // Use 307 Temporary Redirect status code
      const responseWithRedirect = new NextResponse(null, {
          status: 307, 
          headers: supabaseResponse.headers 
      });
      
      // Ensure cookies from the original response are carried over
      // Although modifying supabaseResponse headers *should* preserve them,
      // creating a new NextResponse requires explicit copying.
      supabaseResponse.cookies.getAll().forEach(cookie => {
        responseWithRedirect.cookies.set(cookie);
      });

      return responseWithRedirect; // Return the modified response
    }
  }

  // For all other cases (including /invitation-accepted), return the original response
  // which allows the Supabase client library to handle hash/cookies.
  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - auth/ (auth routes)
     * - public-account-setup
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|auth/|public-account-setup|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
