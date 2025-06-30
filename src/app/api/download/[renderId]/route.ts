// src/app/api/download/[renderId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { renderState } from "~/server/services/render/render-state";
import { ExportTrackingService } from "~/server/services/render/export-tracking.service";
import fs from "fs";
import path from "path";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";

// Initialize S3 client if AWS credentials are available
const s3Client = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
  ? new S3Client({
      region: process.env.AWS_REGION!,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    })
  : null;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ renderId: string }> }
) {
  // Check authentication
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { renderId } = await params;
  const searchParams = req.nextUrl.searchParams;
  const projectId = searchParams.get("projectId");
  const format = searchParams.get("format") || "mp4";

  // First try to get from local render state
  const job = renderState.get(renderId);
  
  if (job) {
    // Local render handling (existing code)
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
      
      // Track the download
      await ExportTrackingService.trackDownload(
        renderId,
        req.headers.get('user-agent') || undefined,
        req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined
      );
      
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

  // If not in local render state and we have S3 client, try S3
  if (s3Client && projectId) {
    try {
      // Construct S3 key
      const s3Key = `renders/${renderId}/${projectId}.${format}`;
      const bucketName = process.env.REMOTION_BUCKET_NAME!;

      console.log(`[Download] Fetching from S3: ${bucketName}/${s3Key}`);

      // Get object from S3
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
      });

      const response = await s3Client.send(command);
      
      if (!response.Body) {
        return new NextResponse("File not found", { status: 404 });
      }

      // Convert the S3 stream to a Web Stream
      const stream = response.Body as Readable;
      const webStream = Readable.toWeb(stream) as ReadableStream<Uint8Array>;

      // Set appropriate headers
      const headers = new Headers();
      headers.set("Content-Type", response.ContentType || `video/${format}`);
      headers.set("Content-Disposition", `attachment; filename="bazaar-vid-${projectId}.${format}"`);
      
      if (response.ContentLength) {
        headers.set("Content-Length", response.ContentLength.toString());
      }

      // Track the download
      await ExportTrackingService.trackDownload(
        renderId,
        req.headers.get('user-agent') || undefined,
        req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined
      );

      return new NextResponse(webStream, {
        status: 200,
        headers,
      });
    } catch (error) {
      console.error("[Download] S3 Error:", error);
      
      if (error instanceof Error) {
        if (error.name === "NoSuchKey") {
          return new NextResponse("Video not found", { status: 404 });
        }
        if (error.name === "AccessDenied") {
          return new NextResponse("Access denied to video file", { status: 403 });
        }
      }
      
      return new NextResponse("Internal server error", { status: 500 });
    }
  }

  return new NextResponse("Render not found", { status: 404 });
}