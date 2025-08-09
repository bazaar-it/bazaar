/**
 * GitHub OAuth Connection Flow - Step 2: Handle Callback
 * Exchanges code for access token and stores connection
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '~/server/auth';
import { db } from '~/server/db';
import { githubConnections } from '~/server/db/schema/github-connections';
import { eq } from 'drizzle-orm';
import { Octokit } from '@octokit/rest';

const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  
  // Check for errors from GitHub
  if (error) {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/settings?error=github_${error}`
    );
  }
  
  // Verify state for CSRF protection
  const storedState = request.cookies.get('github_oauth_state')?.value;
  if (!state || state !== storedState) {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/settings?error=invalid_state`
    );
  }
  
  // Check if user is authenticated
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/settings?error=not_authenticated`
    );
  }
  
  if (!code) {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/settings?error=no_code`
    );
  }
  
  try {
    // Exchange code for access token
    const tokenResponse = await fetch(GITHUB_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_OAUTH_CLIENT_ID!,
        client_secret: process.env.GITHUB_OAUTH_CLIENT_SECRET!,
        code: code,
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/github/callback`,
      }),
    });
    
    const tokenData = await tokenResponse.json();
    
    if (tokenData.error) {
      console.error('GitHub token error:', tokenData);
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/settings?error=token_exchange_failed`
      );
    }
    
    // Get GitHub user info
    const octokit = new Octokit({ auth: tokenData.access_token });
    const { data: githubUser } = await octokit.users.getAuthenticated();
    
    // Check if connection already exists
    const existingConnection = await db.query.githubConnections.findFirst({
      where: eq(githubConnections.userId, session.user.id),
    });
    
    if (existingConnection) {
      // Update existing connection
      await db
        .update(githubConnections)
        .set({
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          scope: tokenData.scope,
          githubUsername: githubUser.login,
          githubEmail: githubUser.email,
          lastSyncedAt: new Date(),
          isActive: true,
        })
        .where(eq(githubConnections.id, existingConnection.id));
    } else {
      // Create new connection
      await db.insert(githubConnections).values({
        userId: session.user.id,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenType: tokenData.token_type || 'bearer',
        scope: tokenData.scope,
        githubUserId: String(githubUser.id),
        githubUsername: githubUser.login,
        githubEmail: githubUser.email,
      });
    }
    
    // Clear state cookie
    const response = NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/settings?github=connected`
    );
    response.cookies.delete('github_oauth_state');
    
    return response;
    
  } catch (error) {
    console.error('GitHub OAuth callback error:', error);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/settings?error=connection_failed`
    );
  }
}