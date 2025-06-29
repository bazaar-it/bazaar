// src/app/api/download/[renderId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "~/server/auth";
import { renderState } from "~/server/services/render/render-state";
import fs from "fs";
import path from "path";

export async function GET(
  req: NextRequest,
  { params }: { params: { renderId: string } }
) {
  // Check authentication
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Get render job
  const job = renderState.get(params.renderId);
  
  if (!job) {
    return new NextResponse("Render not found", { status: 404 });
  }

  // Security check - ensure user owns this render
  if (job.userId !== session.user.id) {
    return new NextResponse("Access denied", { status: 403 });
  }

  // Check if render is complete
  if (job.status !== 'completed' || !job.outputPath) {
    return new NextResponse("Render not ready", { status: 400 });
  }

  // Security check - ensure file is in the renders directory
  const normalizedPath = path.normalize(job.outputPath);
  const rendersDir = path.join(process.cwd(), 'tmp', 'renders');
  if (!normalizedPath.startsWith(rendersDir)) {
    console.error(`[Download] Security violation: Attempted to access file outside renders directory: ${normalizedPath}`);
    return new NextResponse("Invalid file path", { status: 403 });
  }

  try {
    // Check if file exists
    const fileStats = await fs.promises.stat(job.outputPath);
    
    // Check file age (24 hours max)
    const fileAge = Date.now() - fileStats.mtimeMs;
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    
    if (fileAge > TWENTY_FOUR_HOURS) {
      console.log(`[Download] File too old (${fileAge}ms), refusing download`);
      return new NextResponse("File expired", { status: 410 });
    }

    // Read file
    const file = await fs.promises.readFile(job.outputPath);
    
    // Determine content type based on format
    const contentTypes: Record<string, string> = {
      mp4: 'video/mp4',
      webm: 'video/webm',
      gif: 'image/gif',
    };
    
    const contentType = contentTypes[job.format] || 'application/octet-stream';
    
    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `bazaar-vid-export-${timestamp}.${job.format}`;
    
    return new NextResponse(file, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': file.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error("[Download] Error serving file:", error);
    
    if ((error as any).code === 'ENOENT') {
      return new NextResponse("File not found", { status: 404 });
    }
    
    return new NextResponse("Internal server error", { status: 500 });
  }
}