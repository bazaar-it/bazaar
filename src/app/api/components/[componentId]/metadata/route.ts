import { NextResponse, type NextRequest } from 'next/server';
import { db } from '~/server/db';
import { customComponentJobs } from '~/server/db/schema';
import { eq } from 'drizzle-orm';
import logger from '~/lib/utils/logger';

// Specialized logger for this API route
const metadataApiLogger = {
  info: (componentId: string, message: string, meta?: any) => {
    logger.info(`[MetadataAPI:${componentId}] ${message}`, meta);
  },
  error: (componentId: string, message: string, meta?: any) => {
    logger.error(`[MetadataAPI:${componentId}] ${message}`, meta);
  },
  debug: (componentId: string, message: string, meta?: any) => {
    logger.debug(`[MetadataAPI:${componentId}] ${message}`, meta);
  }
};

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
  request: NextRequest
) {
  // Extract componentId directly from the URL path to avoid params issues
  const pathname = request.nextUrl.pathname;
  const pathParts = pathname.split('/');
  // The componentId will be the second to last part (/components/[componentId]/metadata)
  const componentId = pathParts[pathParts.length - 2] || '';
  
  // Validate componentId
  if (!componentId) {
    return NextResponse.json({ error: 'Invalid component ID' }, { status: 400 });
  }
  
  apiRouteLogger.request(componentId, "Component metadata request received", {
    url: request.url,
    headers: Object.fromEntries(request.headers.entries()),
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
    
    // Check if the component is ready - accept both "complete" and "ready" statuses
    if (job.status !== "complete" && job.status !== "ready") {
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
    
    // SELF-HEALING: Get additional information to check for inconsistencies
    const componentDetails = await db.query.customComponentJobs.findFirst({
      where: eq(customComponentJobs.id, componentId),
      columns: {
        outputUrl: true,
        tsxCode: true
      }
    });
    
    // Auto-repair mechanism for components with ready/complete status but missing outputUrl
    if ((job.status === "ready" || job.status === "complete") && (!componentDetails?.outputUrl)) {
      metadataApiLogger.error(componentId, "Detected component with ready/complete status but missing outputUrl", { 
        status: job.status,
        hasTsxCode: !!componentDetails?.tsxCode
      });
      
      try {
        // Update component to error state so it can be rebuilt
        await db.update(customComponentJobs)
          .set({
            status: 'error',
            errorMessage: `Component was marked as ${job.status} but had no output URL. Please rebuild.`,
            updatedAt: new Date()
          })
          .where(eq(customComponentJobs.id, componentId));
          
        metadataApiLogger.info(componentId, "Auto-repaired component with missing outputUrl", {
          previousStatus: job.status,
          newStatus: 'error'
        });
        
        // Return informative response
        return NextResponse.json({ 
          status: 'error', // Return error status instead of ready/complete
          message: "Component needs to be rebuilt",
          error: "Component had inconsistent state and was auto-repaired. Please rebuild."
        }, { 
          status: 400, // Return 400 to indicate there was an issue
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Cross-Origin-Resource-Policy': 'cross-origin',
          } 
        });
      } catch (repairError) {
        metadataApiLogger.error(componentId, "Failed to auto-repair component", { error: repairError });
      }
    }
    
    // Check if we have metadata at all
    if (!job.metadata) {
      apiRouteLogger.error(componentId, "Component has NULL metadata");
      return NextResponse.json({ 
        error: "Component metadata missing",
        message: "This component has no metadata. It may need to be rebuilt."
      }, { 
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cross-Origin-Resource-Policy': 'cross-origin',
        } 
      });
    }
    
    // Parse the metadata
    const metadata = job.metadata as Record<string, unknown>;
    
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
        'Cache-Control': 'no-store',
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