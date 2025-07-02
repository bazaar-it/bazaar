// src/middleware.ts - NextAuth v5 format
import { auth } from "~/server/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl
  console.log('[Middleware] Path:', pathname, 'Auth:', !!req.auth)
  
  // Only redirect authenticated users from homepage
  if (pathname === '/' && req.auth) {
    console.log('[Middleware] Authenticated user detected, redirecting')
    return NextResponse.redirect(new URL('/projects/new', req.url))
  }
  
  return NextResponse.next()
})

export const config = {
  matcher: [
    /*
     * Match homepage and protected routes
     * Exclude api, static files, etc.
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
