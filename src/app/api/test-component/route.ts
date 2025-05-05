//src/app/api/test-component/route.ts
import { db } from "~/server/db";
import { customComponentJobs } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { processPendingJobs } from "~/server/workers/buildCustomComponent";

// Sample Remotion component code with a rotating logo animation
const SAMPLE_COMPONENT = `
function RotatingLogo({ 
  logoText = "Bazaar", 
  backgroundColor = "#111",
  textColor = "#ff5722",
  rotationSpeed = 1,
  size = 100
}) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  
  // Calculate rotation based on frame
  const rotation = Math.sin(frame / (fps / (Math.PI * rotationSpeed))) * 30;
  
  // Scale effect
  const scale = interpolate(
    frame,
    [0, durationInFrames / 4, durationInFrames / 2, durationInFrames],
    [0.8, 1.2, 1, 1.1],
    {
      extrapolateRight: "clamp",
    }
  );
  
  // Color interpolation effect
  const color = interpolateColors(
    frame % (fps * 5) / (fps * 5),
    [0, 0.3, 0.6, 1],
    [textColor, "#4285f4", "#0f9d58", textColor]
  );
  
  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          transform: \`rotate(\${rotation}deg) scale(\${scale})\`,
          fontSize: size,
          fontWeight: "bold",
          color,
          textShadow: "0px 2px 20px rgba(0, 0, 0, 0.5)",
          fontFamily: "system-ui, sans-serif",
          transition: "transform 0.1s ease-out",
        }}
      >
        {logoText}
      </div>
    </AbsoluteFill>
  );
}
`;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const effect = searchParams.get("effect") || "Test Fade In Text";
  const forceProcess = searchParams.get("process") === "true";
  
  if (!projectId) {
    return NextResponse.json(
      { error: "Missing projectId parameter" },
      { status: 400 }
    );
  }
  
  try {
    // Create a test job
    const jobId = randomUUID();
    await db.insert(customComponentJobs).values({
      id: jobId,
      projectId,
      effect,
      tsxCode: SAMPLE_COMPONENT,
      status: "pending",
      retryCount: 0,
      updatedAt: new Date(),
      createdAt: new Date(),
    });
    
    console.log(`Created test component job: ${jobId}`);
    
    // Optionally trigger processing immediately
    if (forceProcess) {
      console.log("Forcing immediate processing...");
      await processPendingJobs();
    }
    
    return NextResponse.json({
      success: true,
      message: "Test component job created",
      jobId,
      projectId,
      effect,
    });
  } catch (error) {
    console.error("Error creating test component:", error);
    return NextResponse.json(
      { 
        error: "Failed to create test component",
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
