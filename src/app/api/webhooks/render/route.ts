import { NextRequest, NextResponse } from "next/server";
import { renderState } from "~/server/services/render/render-state";
import crypto from "crypto";

// Verify webhook signature from Remotion
function verifyWebhookSignature(body: string, signature: string | null, secret: string | undefined): boolean {
  if (!signature || !secret) {
    console.warn("[Webhook] Missing signature or secret");
    return false;
  }
  
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");
    
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
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
        renderState.set(body.renderId, {
          ...job,
          status: "completed",
          progress: 100,
          outputUrl: body.outputUrl || body.outputFile,
          error: undefined,
        });
        break;
        
      case "error":
        console.error("[Webhook] Render failed:", body.errors);
        renderState.set(body.renderId, {
          ...job,
          status: "failed",
          error: body.errors?.[0]?.message || "Render failed",
        });
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
        break;
        
      case "timeout":
        console.error("[Webhook] Render timed out");
        renderState.set(body.renderId, {
          ...job,
          status: "failed",
          error: "Render timed out. Video may be too long or complex.",
        });
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