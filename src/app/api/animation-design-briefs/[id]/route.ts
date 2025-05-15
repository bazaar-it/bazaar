import { NextResponse, NextRequest } from 'next/server';
import { db } from '~/server/db';
import { eq } from 'drizzle-orm';
import { animationDesignBriefs } from '~/server/db/schema';
import logger from '~/lib/logger';

// Create a logger for this API route
const apiRouteLogger = {
  request: (briefId: string, message: string, meta: Record<string, any> = {}) => {
    logger.info(`[API:ADB:REQUEST][ID:${briefId}] ${message}`, meta);
  },
  error: (briefId: string, message: string, meta: Record<string, any> = {}) => {
    logger.error(`[API:ADB:ERROR][ID:${briefId}] ${message}`, meta);
  },
  debug: (briefId: string, message: string, meta: Record<string, any> = {}) => {
    logger.debug(`[API:ADB:DEBUG][ID:${briefId}] ${message}`, meta);
  }
};

export async function GET(
  request: NextRequest
) {
  // Extract the id from the URL pattern directly to avoid params issues
  const pathname = request.nextUrl.pathname;
  const id = pathname.split('/').pop() || ''; // Safely extract the last part of the URL
  
  apiRouteLogger.request(id, "ADB request received", {
    url: request.url,
    headers: Object.fromEntries([...request.headers.entries()])
  });
  
  try {
    // Get the animation design brief from the database
    const brief = await db.query.animationDesignBriefs.findFirst({
      where: eq(animationDesignBriefs.id, id),
    });
    
    // Handle not found case
    if (!brief) {
      apiRouteLogger.error(id, "ADB not found");
      return NextResponse.json({ error: "Animation design brief not found" }, { 
        status: 404,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cross-Origin-Resource-Policy': 'cross-origin',
        }
      });
    }
    
    // Return the ADB data with proper CORS headers
    apiRouteLogger.debug(id, "ADB found", { 
      designBrief: brief.designBrief ? 'present' : 'missing',
      sceneId: brief.sceneId,
      createdAt: brief.createdAt
    });
    
    return NextResponse.json(brief, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'Cache-Control': 'public, max-age=3600',
      }
    });
  } catch (error) {
    apiRouteLogger.error(id, "Error processing ADB request", { 
      error: error instanceof Error ? error.message : String(error)
    });
    return NextResponse.json({ error: "Internal server error" }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cross-Origin-Resource-Policy': 'cross-origin',
      }
    });
  }
} 