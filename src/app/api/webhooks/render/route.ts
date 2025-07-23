import { NextRequest, NextResponse } from "next/server";
import { renderState } from "~/server/services/render/render-state";
import { ExportTrackingService } from "~/server/services/render/export-tracking.service";
import crypto from "crypto";

// Verify webhook signature from Remotion
function verifyWebhookSignature(body: string, signature: string | null, secret: string | undefined): boolean {
  if (!signature || !secret) {
    console.warn("[Webhook] Missing signature or secret");
    return false;
  }
  
  // Handle the special case where no secret is provided
  if (signature === "NO_SECRET_PROVIDED") {
    console.warn("[Webhook] Signature indicates no secret was provided to Remotion");
    return false;
  }
  
  // Remotion uses SHA-512, not SHA-256
  const expectedSignature = crypto
    .createHmac("sha512", secret)  // Changed from sha256 to sha512
    .update(body)
    .digest("hex");
  
  // Ensure both strings are the same length before converting to buffers
  // This prevents the ERR_CRYPTO_TIMING_SAFE_EQUAL_LENGTH error
  if (signature.length !== expectedSignature.length) {
    return false;
  }
    
  return crypto.timingSafeEqual(
    Buffer.from(signature, "hex"),
    Buffer.from(expectedSignature, "hex")
  );
}

export async function POST(req: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await req.text();
    const body = JSON.parse(rawBody);
    
    // Log webhook receipt
    console.log("[Webhook] Received render webhook:", {
      renderId: body.renderId,
      type: body.type,
      bucketName: body.bucketName,
    });
    
    // Verify webhook signature if secret is configured
    if (process.env.WEBHOOK_SECRET) {
      const signature = req.headers.get("X-Remotion-Signature");
      const isValid = verifyWebhookSignature(rawBody, signature, process.env.WEBHOOK_SECRET);
      
      if (!isValid) {
        console.error("[Webhook] Invalid signature");
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }
    }
    
    // Update render state based on webhook type
    const job = renderState.get(body.renderId);
    if (!job) {
      console.warn(`[Webhook] Render job not found: ${body.renderId}`);
      // Still return success to prevent retries
      return NextResponse.json({ success: true });
    }
    
    // Handle different webhook types
    switch (body.type) {
      case "success":
        console.log("[Webhook] Render completed successfully");
        const outputUrl = body.outputUrl || body.outputFile;
        renderState.set(body.renderId, {
          ...job,
          status: "completed",
          progress: 100,
          outputUrl,
          error: undefined,
        });
        
        // Update database tracking
        try {
          await ExportTrackingService.updateExportStatus({
            renderId: body.renderId,
            status: 'completed',
            progress: 100,
            outputUrl,
            fileSize: body.size, // If available from webhook
          });
        } catch (dbError) {
          console.error("[Webhook] Failed to update database:", dbError);
          // Don't fail the webhook - we still want to update in-memory state
        }
        break;
        
      case "error":
        console.error("[Webhook] Render failed:", body.errors);
        const errorMessage = body.errors?.[0]?.message || "Render failed";
        renderState.set(body.renderId, {
          ...job,
          status: "failed",
          error: errorMessage,
        });
        
        // Update database tracking
        try {
          await ExportTrackingService.updateExportStatus({
            renderId: body.renderId,
            status: 'failed',
            error: errorMessage,
          });
        } catch (dbError) {
          console.error("[Webhook] Failed to update database:", dbError);
          // Don't fail the webhook - we still want to update in-memory state
        }
        break;
        
      case "progress":
        // Update progress
        const progress = body.overallProgress ? Math.round(body.overallProgress * 100) : job.progress;
        renderState.set(body.renderId, {
          ...job,
          progress,
          // Check if we're in FFmpeg finalization phase
          isFinalizingFFmpeg: body.renderedFrames === body.encodedFrames && progress < 100,
        });
        
        // Update database tracking periodically (every 10% progress)
        if (progress % 10 === 0 && progress !== job.progress) {
          try {
            await ExportTrackingService.updateExportStatus({
              renderId: body.renderId,
              status: 'rendering',
              progress,
            });
          } catch (dbError) {
            console.error("[Webhook] Failed to update database:", dbError);
            // Don't fail the webhook - we still want to update in-memory state
          }
        }
        break;
        
      case "timeout":
        console.error("[Webhook] Render timed out");
        const timeoutError = "Render timed out. Video may be too long or complex.";
        renderState.set(body.renderId, {
          ...job,
          status: "failed",
          error: timeoutError,
        });
        
        // Update database tracking
        try {
          await ExportTrackingService.updateExportStatus({
            renderId: body.renderId,
            status: 'failed',
            error: timeoutError,
          });
        } catch (dbError) {
          console.error("[Webhook] Failed to update database:", dbError);
          // Don't fail the webhook - we still want to update in-memory state
        }
        break;
        
      default:
        console.warn(`[Webhook] Unknown webhook type: ${body.type}`);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Webhook] Error processing webhook:", error);
    // Return success to prevent retries even on error
    return NextResponse.json({ success: true });
  }
}