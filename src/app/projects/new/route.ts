// src/app/projects/new/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createTRPCContext } from '~/server/api/trpc';
import { createCaller } from '~/server/api/root';

const VALID_FORMATS = new Set(['landscape', 'portrait', 'square']);

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const fmt = url.searchParams.get('format') || 'landscape';
    const format = VALID_FORMATS.has(fmt) ? (fmt as 'landscape' | 'portrait' | 'square') : 'landscape';

    // Create a TRPC server-side caller with the current request headers (includes cookies/session)
    const ctx = await createTRPCContext({ headers: req.headers });

    // If not authenticated, bounce to login with redirect back to this route
    if (!ctx.session?.user) {
      const redirectUrl = encodeURIComponent(`/projects/new?format=${format}`);
      return NextResponse.redirect(new URL(`/login?redirect=${redirectUrl}`, url.origin));
    }

    const caller = createCaller(ctx);
    const res = await caller.project.create({ format });

    if (!res?.projectId) {
      // Fallback to client quick-create page if something is off
      return NextResponse.redirect(new URL('/projects/quick-create', url.origin));
    }

    return NextResponse.redirect(new URL(`/projects/${res.projectId}/generate`, url.origin));
  } catch (error) {
    // Last-resort fallback: ensure the user lands somewhere safe
    try {
      const url = new URL(req.url);
      return NextResponse.redirect(new URL('/projects/quick-create', url.origin));
    } catch {
      return NextResponse.redirect('https://bazaar.it');
    }
  }
}

