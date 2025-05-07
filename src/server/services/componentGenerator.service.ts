import { customComponentJobs, db } from "~/server/db";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { processComponentJob } from "~/server/workers/generateComponentCode";
import type { PgDatabase } from "drizzle-orm/pg-core";

// Type for the database instance
type DB = typeof db;

/**
 * Component metadata returned from generation process
 */
interface ComponentMetadata {
    durationInFrames?: number;
    fps?: number;
    width?: number;
    height?: number;
    complexity?: number;
}

/**
 * Result of component generation
 */
interface ComponentGenerationResult {
    jobId: string;
    effect: string;
    componentMetadata: ComponentMetadata;
}

/**
 * Generates a Remotion component based on a description and registers it in the database
 * 
 * @param projectId - The project ID the component belongs to
 * @param effectDescription - Description of the desired effect
 * @param assistantMessageId - ID of the assistant message for status updates
 * @param durationInSeconds - Duration in seconds (default: 6)
 * @param fps - Frames per second (default: 30)
 * @param sceneId - Optional scene ID if part of a scene plan
 * @param userId - The user who initiated the request
 * @returns Component generation result with job ID, effect name, and metadata
 */
export async function generateComponent(
    projectId: string,
    effectDescription: string,
    assistantMessageId: string,
    durationInSeconds: number = 6,
    fps: number = 30,
    sceneId?: string,
    userId?: string
): Promise<ComponentGenerationResult> {
    // Analyze the effect description to generate a better component name and planning context
    let componentName = 'CustomScene';
    
    // Extract a short name from the description (first 2-3 words capitalized)
    const nameSuggestion = effectDescription
        .split(/\s+/)
        .slice(0, 3)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('')
        .replace(/[^a-zA-Z0-9]/g, '');
        
    // Use the suggestion if it's at least 4 characters long, otherwise default
    if (nameSuggestion && nameSuggestion.length >= 4) {
        componentName = nameSuggestion + 'Scene';
    }
    
    // Estimate component complexity based on description length and keywords
    const estimatedComplexity = Math.min(1.0, effectDescription.length / 300);
    
    // Duration in frames
    const durationInFrames = Math.round(durationInSeconds * fps);
    
    // Create enhanced prompt with more structured guidance
    const enhancedDescription = `
Create a custom Remotion component for scene: "${effectDescription}"

Scene duration: ${durationInSeconds} seconds (${durationInFrames} frames at ${fps}fps)
Scene purpose: ${sceneId ? `Part of multi-scene video` : 'Standalone component'}

This component should:
1. Be self-contained with all necessary imports and styling
2. Handle all animation timing relative to useCurrentFrame()
3. Use appropriate animation techniques for smooth motion
4. Include all visual elements described in the scene
5. Return a properly structured React component

The recommended format is:
\`\`\`tsx
import { useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { AbsoluteFill } from 'remotion';

export const ${componentName}: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  
  // Animation calculations
  // ...
  
  return (
    <AbsoluteFill style={{ background: '...' }}>
      {/* Component content */}
    </AbsoluteFill>
  );
};
\`\`\`
`;

    // Generate unique ID for this job
    const jobId = uuidv4();
    
    // Add the job to the database
    const jobData = {
        prompt: enhancedDescription, // Use the enhanced description
        componentName,
        durationInFrames,
        fps,
        width: 1920, // Default HD width
        height: 1080, // Default HD height
        projectId,
        sceneId,
        // If we have a userId, include it for analytics/tracking
        userData: userId ? { userId } : undefined
    };

    // Insert the job record
    const [job] = await db.insert(customComponentJobs).values({
        id: jobId,
        projectId: projectId,
        effect: componentName,
        statusMessageId: assistantMessageId,
        status: "pending",
        metadata: jobData
    }).returning();

    console.log(`Created component generation job: ${jobId} for ${componentName}`);

    // Start generating the code (don't await - this happens asynchronously)
    // This will update the job status when complete
    processComponentJob(jobId)
        .catch(error => {
            console.error(`Error generating component code for job ${jobId}:`, error);
        });

    // Return immediately with the job ID and other metadata
    // This allows the chat experience to continue while generation happens in background
    return {
        jobId,
        effect: componentName,
        componentMetadata: {
            durationInFrames,
            fps,
            complexity: estimatedComplexity
        }
    };
}

/**
 * Updates the status of a component generation job
 * 
 * @param jobId - ID of the job to update
 * @param status - New status value
 * @param db - Database connection
 * @param outputUrl - Optional URL to the compiled output
 * @param errorMessage - Optional error message if status is 'error'
 */
export async function updateComponentStatus(
    jobId: string,
    status: 'pending' | 'building' | 'success' | 'error',
    dbInstance: DB = db,
    outputUrl?: string,
    errorMessage?: string
): Promise<void> {
    await dbInstance.update(customComponentJobs)
        .set({ 
            status,
            ...(outputUrl ? { outputUrl } : {}),
            ...(errorMessage ? { errorMessage } : {}),
            updatedAt: new Date()
        })
        .where(eq(customComponentJobs.id, jobId));
} 