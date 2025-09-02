// middleware.ts
import { auth } from "~/server/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  
  // Admin route protection
  if (pathname.startsWith('/admin')) {
    const session = await auth();
    
    // Not logged in at all
    if (!session?.user) {
      console.log('[Middleware] Unauthorized admin access attempt - no session');
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    // Logged in but not admin
    if (!session.user.isAdmin) {
      console.log('[Middleware] Unauthorized admin access attempt - user not admin:', session.user.id);
      return NextResponse.redirect(new URL('/403', request.url));
    }
    
    // User is admin, allow access
    return NextResponse.next();
  }
  
  // Homepage processing
  if (pathname === '/') {
    // Check if user is authenticated
    const session = await auth();
    
    if (!session?.user) {
      // Not authenticated, show landing page
      return NextResponse.next();
    }
    
    // Check if user explicitly wants to view landing page
    const intentionalLanding = searchParams.has('view') || searchParams.has('landing');
    
    // Redirect authenticated users from homepage if not intentional
    if (!intentionalLanding) {
      console.log('[Middleware] Authenticated user detected, redirecting to /projects/quick-create');
      return NextResponse.redirect(new URL('/projects/quick-create', request.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match homepage, admin routes, and other protected routes
     * Exclude api, static files, etc.
     */
    '/',
    '/admin/:path*',
  ],
}
