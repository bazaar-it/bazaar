//src/app/api/cron/process-component-jobs/route.ts
import { processPendingJobs } from "~/server/workers/buildCustomComponent";
import { NextResponse } from "next/server";

/**
 * API route handler for processing pending custom component jobs
 * 
 * This is intended to be called by a cron job at regular intervals.
 * Configure this in Vercel:
 * - Settings > Cron Jobs
 * - Create a new cron job with the path /api/cron/process-component-jobs
 * - Set a schedule (e.g. every 5 minutes: "/5 * * * *")
 * - Add a secret for authorization (CRON_SECRET)
 */
export async function GET(request: Request) {
  // Verify the request is authorized
  const authHeader = request.headers.get("Authorization");
  
  if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    // Process any pending component jobs
    await processPendingJobs();
    
    return NextResponse.json(
      { success: true, message: "Jobs processed successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error processing component jobs:", error);
    
    return NextResponse.json(
      { 
        error: "Failed to process component jobs",
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
