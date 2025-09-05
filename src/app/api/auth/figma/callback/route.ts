/**
 * Figma OAuth Callback Handler
 * This endpoint handles the OAuth callback from Figma
 */

import { NextRequest, NextResponse } from 'next/server';
import { createCaller } from '~/server/api/root';
import { createTRPCContext } from '~/server/api/trpc';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  
  // Handle error case
  if (error) {
    return NextResponse.redirect(
      new URL(`/projects?error=figma_auth_${error}`, request.url)
    );
  }
  
  // Validate required parameters
  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/projects?error=figma_auth_invalid', request.url)
    );
  }
  
  try {
    // Decode state to get user ID
    const userId = Buffer.from(state, 'base64').toString();
    
    // Exchange code for tokens using our tRPC endpoint
    // Create a basic context with headers
    const ctx = await createTRPCContext({
      headers: new Headers(),
    });
    
    // Override the session in the context
    const ctxWithSession = {
      ...ctx,
      session: {
        user: { id: userId },
        expires: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
      },
    };
    
    const caller = createCaller(ctxWithSession);
    
    await caller.figma.connect({
      method: 'oauth',
      code,
    });
    
    // Redirect back to the app with success
    return NextResponse.redirect(
      new URL('/projects?figma_connected=true', request.url)
    );
  } catch (error) {
    console.error('Figma OAuth callback error:', error);
    
    // Redirect with error
    return NextResponse.redirect(
      new URL('/projects?error=figma_auth_failed', request.url)
    );
  }
}