// middleware.ts
import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    
    // Only redirect authenticated users from homepage
    if (pathname === '/') {
      console.log('[Middleware] Authenticated user detected, redirecting to /projects/new');
      return NextResponse.redirect(new URL('/projects/new', req.url));
    }
    
    return NextResponse.next();
  },
  {
    callbacks: {
      // This function determines if the middleware should run
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        
        // For homepage, check if user has valid token (authenticated)
        if (pathname === '/') {
          return !!token; // Only run middleware if user is authenticated
        }
        
        // For other paths, don't run this middleware
        return false;
      },
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match homepage and protected routes
     * Exclude api, static files, etc.
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
