/**
 * GitHub OAuth Connection Flow - Step 1: Redirect to GitHub
 * Initiates the OAuth flow for connecting user's GitHub account
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '~/server/auth';

const GITHUB_OAUTH_URL = 'https://github.com/login/oauth/authorize';

export async function GET(request: NextRequest) {
  // Check if user is authenticated
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'You must be logged in to connect GitHub' },
      { status: 401 }
    );
  }
  
  // Generate state for CSRF protection and store return URL
  const state = crypto.randomUUID();
  const returnUrl = request.headers.get('referer') || `${process.env.NEXTAUTH_URL}/`;
  
  // Debug log to verify env var
  console.log('[GitHub Connect] Using Client ID:', process.env.GITHUB_CLIENT_ID);
  console.log('[GitHub Connect] Redirect URI:', `${process.env.NEXTAUTH_URL}/api/auth/github/callback`);
  
  // Store state in cookie for verification
  const response = NextResponse.redirect(
    `${GITHUB_OAUTH_URL}?` +
    new URLSearchParams({
      // Use GitHub App client ID for repository access, not the OAuth login app
      client_id: process.env.GITHUB_CLIENT_ID!,
      redirect_uri: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/github/callback`,
      scope: 'repo user:email read:org',
      state: state,
      allow_signup: 'false',
    })
  );
  
  // Set secure cookies with state and return URL
  response.cookies.set('github_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
  });
  
  response.cookies.set('github_oauth_return_url', returnUrl, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
  });
  
  return response;
}