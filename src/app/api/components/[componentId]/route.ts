import { NextResponse } from 'next/server';
import { db } from '~/server/db';
import { customComponentJobs } from '~/server/db/schema';
import { eq } from 'drizzle-orm';
import logger from '~/lib/logger';

// Create a specialized logger for component API requests
const apiRouteLogger = {
  request: (componentId: string, message: string, meta: Record<string, any> = {}) => {
    logger.info(`[API:COMPONENT:REQUEST][ID:${componentId}] ${message}`, meta);
  },
  redirect: (componentId: string, message: string, meta: Record<string, any> = {}) => {
    logger.info(`[API:COMPONENT:REDIRECT][ID:${componentId}] ${message}`, meta);
  },
  error: (componentId: string, message: string, meta: Record<string, any> = {}) => {
    logger.error(`[API:COMPONENT:ERROR][ID:${componentId}] ${message}`, meta);
  },
  debug: (componentId: string, message: string, meta: Record<string, any> = {}) => {
    logger.debug(`[API:COMPONENT:DEBUG][ID:${componentId}] ${message}`, meta);
  }
};

export async function GET(
  request: Request,
  { params }: { params: { componentId: string } }
) {
  const componentId = params.componentId;
  
  apiRouteLogger.request(componentId, "Component request received", {
    url: request.url,
    headers: Object.fromEntries([...request.headers.entries()])
  });
  
  try {
    // Get the component job from the database
    const job = await db.query.customComponentJobs.findFirst({
      where: eq(customComponentJobs.id, componentId),
      columns: {
        status: true,
        outputUrl: true,
        errorMessage: true,
        effect: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    // Handle not found case
    if (!job) {
      apiRouteLogger.error(componentId, "Component job not found");
      return NextResponse.json({ error: "Component not found" }, { status: 404 });
    }
    
    // Check if the component is ready
    if (job.status !== "complete" || !job.outputUrl) {
      if (job.status === "error") {
        apiRouteLogger.error(componentId, "Component job failed", { 
          error: job.errorMessage || "Unknown error" 
        });
        return NextResponse.json({ 
          error: "Component build failed", 
          message: job.errorMessage || "Unknown error" 
        }, { status: 500 });
      }
      
      apiRouteLogger.debug(componentId, "Component job not ready", { status: job.status });
      return NextResponse.json({ 
        status: job.status,
        message: "Component is still being processed"
      }, { status: 202 });
    }
    
    // PROXY: Instead of redirecting to the R2 URL, fetch it and serve it directly
    // This works around SSL issues with the R2 bucket
    try {
      apiRouteLogger.debug(componentId, "Proxying component from R2", { outputUrl: job.outputUrl });
      
      const response = await fetch(job.outputUrl, {
        cache: "no-store" // Don't cache the fetch to ensure we always get fresh content
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch component from R2: ${response.statusText}`);
      }
      
      const jsContent = await response.text();
      
      // Log the beginning of the content for debugging
      apiRouteLogger.debug(componentId, "Successfully proxied component JS", { 
        contentPreview: jsContent.substring(0, 100) + '...',
        contentLength: jsContent.length
      });
      
      // Return the JS content with appropriate headers
      return new NextResponse(jsContent, {
        headers: {
          'Content-Type': 'application/javascript',
          'Cache-Control': 'public, max-age=3600',
          'Cross-Origin-Resource-Policy': 'cross-origin',
          'Access-Control-Allow-Origin': '*', // Allow any domain to load this
        },
      });
    } catch (fetchError) {
      apiRouteLogger.error(componentId, "Failed to proxy component from R2", { 
        error: fetchError instanceof Error ? fetchError.message : String(fetchError),
        outputUrl: job.outputUrl
      });
      
      // If proxy fails, fall back to redirect with CORS headers
      apiRouteLogger.debug(componentId, "Falling back to redirect", { outputUrl: job.outputUrl });
      
      return NextResponse.redirect(job.outputUrl, {
        headers: {
          'Cross-Origin-Resource-Policy': 'cross-origin',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }
  } catch (error) {
    apiRouteLogger.error(componentId, "Error processing component request", { 
      error: error instanceof Error ? error.message : String(error)
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 