import { NextResponse } from 'next/server';
import { FEATURES } from '~/config/features';

export async function GET() {
  return NextResponse.json({
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_ENABLE_WEBSITE_TO_VIDEO: process.env.NEXT_PUBLIC_ENABLE_WEBSITE_TO_VIDEO,
    WEBSITE_TO_VIDEO_ENABLED: FEATURES.WEBSITE_TO_VIDEO_ENABLED,
    VERCEL_ENV: process.env.VERCEL_ENV,
  });
}
