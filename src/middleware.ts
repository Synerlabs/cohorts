import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res });
  const { data: { session } } = await supabase.auth.getSession();

  // Check if this is an authenticated route
  const isAuthenticatedRoute = request.nextUrl.pathname.startsWith('/@') && request.nextUrl.pathname.split('/').length > 2;

  if (isAuthenticatedRoute && !session) {
    // Routes that allow guests
    const guestRoutes = ['/join'];
    const currentPath = '/' + request.nextUrl.pathname.split('/').slice(2).join('/');
    
    // Don't redirect if it's a guest route
    if (guestRoutes.some(route => currentPath.startsWith(route))) {
      return res;
    }

    // Extract org slug from path
    const orgSlug = request.nextUrl.pathname.split('/')[1];
    // Redirect to org's public page
    return NextResponse.redirect(new URL(`/${orgSlug}`, request.url));
  }

  return res;
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
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
