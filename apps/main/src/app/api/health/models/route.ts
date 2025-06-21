//src/app/api/health/models/route.ts

import { NextResponse } from 'next/server';
import { getModelManifest } from '~/config/models.config';

export async function GET() {
  try {
    const manifest = getModelManifest();
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      manifest,
    });
  } catch (error) {
    console.error('Model health check failed:', error);
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
