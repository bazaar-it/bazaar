import { NextResponse } from 'next/server';
import { db } from '~/server/db';
import { customComponentJobs } from '~/server/db/schema';
import { eq } from 'drizzle-orm';
import logger from '~/lib/logger';

// Create a specialized logger for component metadata API requests
const apiRouteLogger = {
  request: (componentId: string, message: string, meta: Record<string, any> = {}) => {
    logger.info(`[API:COMPONENT:METADATA:REQUEST][ID:${componentId}] ${message}`, meta);
  },
  error: (componentId: string, message: string, meta: Record<string, any> = {}) => {
    logger.error(`[API:COMPONENT:METADATA:ERROR][ID:${componentId}] ${message}`, meta);
  },
  debug: (componentId: string, message: string, meta: Record<string, any> = {}) => {
    logger.debug(`[API:COMPONENT:METADATA:DEBUG][ID:${componentId}] ${message}`, meta);
  }
};

export async function GET(
  request: Request,
  { params }: { params: { componentId: string } }
) {
  const componentId = params.componentId;
  
  apiRouteLogger.request(componentId, "Component metadata request received", {
    url: request.url,
    headers: Object.fromEntries([...request.headers.entries()])
  });
  
  try {
    // Get the component job metadata from the database
    const job = await db.query.customComponentJobs.findFirst({
      where: eq(customComponentJobs.id, componentId),
      columns: {
        id: true,
        effect: true,
        status: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
        projectId: true
      }
    });
    
    // Handle not found case
    if (!job) {
      apiRouteLogger.error(componentId, "Component job not found");
      return NextResponse.json({ error: "Component not found" }, { 
        status: 404,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cross-Origin-Resource-Policy': 'cross-origin',
        } 
      });
    }
    
    // Check if the component is ready
    if (job.status !== "complete") {
      apiRouteLogger.debug(componentId, "Component job not ready", { status: job.status });
      return NextResponse.json({ 
        status: job.status,
        message: "Component is still being processed"
      }, { 
        status: 202,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cross-Origin-Resource-Policy': 'cross-origin',
        } 
      });
    }
    
    // Check if we have animation design brief ID
    const metadata = job.metadata as Record<string, unknown> || {};
    
    // Get animation design brief ID from job metadata (should be assigned during component generation)
    const animationDesignBriefId = metadata.animationDesignBriefId as string;
    
    if (!animationDesignBriefId) {
      apiRouteLogger.error(componentId, "Animation design brief ID not found in component metadata");
      return NextResponse.json({ 
        error: "Animation design brief ID not found",
        message: "This component does not have an associated animation design brief"
      }, { 
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cross-Origin-Resource-Policy': 'cross-origin',
        } 
      });
    }
    
    apiRouteLogger.debug(componentId, "Component metadata fetched successfully", {
      animationDesignBriefId
    });
    
    // Return the metadata with the animationDesignBriefId
    return NextResponse.json({
      ...metadata,
      animationDesignBriefId,
      componentId: job.id,
      effect: job.effect,
      status: job.status,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'Cache-Control': 'public, max-age=3600',
      }
    });
  } catch (error) {
    apiRouteLogger.error(componentId, "Error processing component metadata request", { 
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