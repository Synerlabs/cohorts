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
      // Redirect to org's public page
      const redirectResponse = NextResponse.redirect(new URL(`/${orgSlug}`, request.url));
      // Copy over the cookies to maintain session state
      supabaseResponse.cookies.getAll().forEach(cookie => {
        redirectResponse.cookies.set(cookie);
      });
      return redirectResponse;
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
