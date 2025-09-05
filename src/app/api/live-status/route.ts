// src/app/api/live-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db, metrics } from '~/server/db';
import { coerceLiveFromEvent, coerceLiveFromStatus, getCurrentLiveStatus } from '~/lib/utils/liveStatus';

const postSchema = z.object({
  live: z.boolean().optional(),
  url: z.string().url().optional(),
  platform: z.string().optional(), // e.g., 'x', 'youtube', 'twitch'
  // Accept pass-through for Restream style events
  type: z.string().optional(), // 'stream.started' | 'stream.stopped'
  event: z.string().optional(),
  status: z.union([z.string(), z.number()]).optional(), // 'live' | 'offline' | 1 | 0
});

function getSecret(): string | undefined {
  return process.env.LIVE_STATUS_SECRET;
}

function getDefaultUrl(): string | undefined {
  return process.env.LIVE_URL_DEFAULT;
}

export async function GET() {
  const result = await getCurrentLiveStatus();
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  // Verify secret via Authorization bearer, X-Webhook-Token header, or token query param
  const auth = req.headers.get('authorization') || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : undefined;
  const headerToken = req.headers.get('x-webhook-token') || undefined;
  const urlObj = new URL(req.url);
  const queryToken = urlObj.searchParams.get('token') || undefined;
  const provided = bearer || headerToken || queryToken;
  const secret = getSecret();
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const { live: liveExplicit, url, platform, type, event, status } = parsed.data;
  const fromEvent = coerceLiveFromEvent(type || event);
  const fromStatus = coerceLiveFromStatus(status);
  const live = liveExplicit ?? fromEvent ?? fromStatus;

  if (typeof live !== 'boolean') {
    return NextResponse.json({ error: 'missing_live_state' }, { status: 400 });
  }

  // Persist as a metric row to avoid schema migration
  try {
    await db.insert(metrics).values({
      name: 'live_status',
      value: live ? 1 : 0,
      tags: {
        url: url || getDefaultUrl(),
        platform: platform || 'x',
        source: 'restream',
      },
    });

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('[live-status][POST] DB insert error:', error);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
}
