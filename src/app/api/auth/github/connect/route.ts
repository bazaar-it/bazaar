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
  
  // Generate state for CSRF protection
  const state = crypto.randomUUID();
  
  // Store state in cookie for verification
  const response = NextResponse.redirect(
    `${GITHUB_OAUTH_URL}?` +
    new URLSearchParams({
      client_id: process.env.GITHUB_REPO_CLIENT_ID || process.env.AUTH_GITHUB_ID!,
      redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/github/callback`,
      scope: 'repo user:email read:org',
      state: state,
      allow_signup: 'false',
    })
  );
  
  // Set secure cookie with state
  response.cookies.set('github_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
  });
  
  return response;
}