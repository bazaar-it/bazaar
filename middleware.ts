// middleware.ts
import { auth } from "~/server/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  
  // Only process homepage
  if (pathname !== '/') {
    return NextResponse.next();
  }
  
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
    console.log('[Middleware] Authenticated user detected, redirecting to /projects/new');
    return NextResponse.redirect(new URL('/projects/new', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match homepage and protected routes
     * Exclude api, static files, etc.
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
