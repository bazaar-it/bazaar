// @ts-nocheck
// src/server/services/scenePlanner.service.ts
import { type Operation } from "fast-json-patch";
import { type Subject } from "rxjs";
import crypto from "crypto";
import { db } from "~/server/db";
import { scenePlans } from "~/server/db/schema";
import { MAX_SCENES } from "~/server/constants/chat";
import { type ComponentJob, type SceneResult, type SceneStatus, type ScenePlanResponse } from "~/types/chat";
import { analyzeSceneContent } from "./sceneAnalyzer.service";
import { generateComponent } from "./componentGenerator.service";
import { 
  generateAnimationDesignBrief, 
  type AnimationBriefGenerationParams 
} from "./animationDesigner.service";
import { type AnimationDesignBrief } from "~/lib/schemas/animationDesignBrief.schema";
import { scenePlannerLogger } from "~/lib/logger";

// Define the database type
type DB = typeof db;

/**
 * Checks if a string is a valid UUID
 * @param str String to check
 * @returns True if string is a valid UUID
 */
function isValidUuid(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Ensures that a scene ID is a valid UUID, generating a new one if not
 * @param sceneId Scene ID to validate
 * @returns Valid UUID
 */
function ensureValidUuid(sceneId: string): string {
  if (isValidUuid(sceneId)) {
    return sceneId;
  }
  
  // Generate a deterministic UUID based on the input string
  // This ensures the same sceneId string always maps to the same UUID
  const hash = crypto.createHash('md5').update(sceneId).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

/**
 * Processes a scene plan from the LLM tool and coordinates generation of any needed components
 * 
 * @param projectId - The project being edited
 * @param userId - The user who initiated the request
 * @param scenesPlan - The plan object from the LLM
 * @param assistantMessageId - ID of the assistant message to update
 * @param dbInstance - Database connection, defaults to global db instance
 * @param emitter - Optional event emitter for real-time updates
 * @returns A message summarizing the plan and optionally patches to apply
 */
export async function handleScenePlan(
    projectId: string,
    userId: string,
    scenesPlan: any,
    assistantMessageId: string,
    dbInstance: DB = db,
    emitter?: Subject<any>
): Promise<ScenePlanResponse> {
    const startTime = Date.now();
    const planId = crypto.randomUUID();
    scenePlannerLogger.start(planId, `Processing scene plan with ${scenesPlan.scenes?.length ?? 0} scenes for project ${projectId}`);
    
    // More intelligent handling of scene plan validation
    if (!scenesPlan.scenes || !Array.isArray(scenesPlan.scenes) || scenesPlan.scenes.length === 0) {
        scenePlannerLogger.error(planId, "Received empty scene plan - generating helpful response instead of error", { type: "VALIDATION" });
        // Instead of returning an error, return a helpful message that encourages the LLM
        // to try again with scene planning
        return {
            message: "I'll help you create a video based on your request. Let me plan out some scenes for you. What specific elements would you like to include in your video?"
        };
    }
    
    // Cap scenes at MAX_SCENES for safety
    if (scenesPlan.scenes.length > MAX_SCENES) {
        scenePlannerLogger.error(planId, `Scene plan has ${scenesPlan.scenes.length} scenes, capping at ${MAX_SCENES}`, { type: "VALIDATION" });
        scenesPlan.scenes = scenesPlan.scenes.slice(0, MAX_SCENES);
    }
    
    const fps = scenesPlan.fps || 30; // Default to 30fps if not specified
    let responseMessage = `I've planned your video with ${scenesPlan.scenes.length} scenes:\n\n`; // Added colon and double newline for list start
    
    // Keep track of components we need to create
    const componentJobs: ComponentJob[] = [];
    
    // Process each scene and build scene-specific operations
    const sceneResults: SceneResult[] = [];
    
    const projectPatches: Operation[] = [];
    
    // Process each scene in the plan
    for (let i = 0; i < scenesPlan.scenes.length; i++) {
        const scene = scenesPlan.scenes[i];
        
        // Validate required scene properties
        if (!scene.id) scene.id = crypto.randomUUID();
        
        // Ensure scene.id is a valid UUID
        scene.id = ensureValidUuid(scene.id);
        
        if (!scene.description) scene.description = `Scene ${i+1}`;
        if (!scene.durationInSeconds || typeof scene.durationInSeconds !== 'number') {
            scene.durationInSeconds = 5; // Default 5 seconds
        }
        if (!scene.effectType) scene.effectType = "text"; // Default to text
        
        // Analyze scene content to determine if it should be a custom component
        // and what components it might need
        const sceneAnalysis = analyzeSceneContent(scene.description, i, scenesPlan.scenes.length);
        
        // Automatically upgrade text scenes to custom scenes for more sophisticated descriptions
        // that would benefit from a proper component rather than just text overlay
        if (scene.effectType === "text" && sceneAnalysis.complexity > 0.6) {
            scenePlannerLogger.start(planId, `Upgrading to custom component based on content analysis (complexity: ${sceneAnalysis.complexity})`, { 
                sceneIndex: i,
                sceneId: scene.id,
                complexity: sceneAnalysis.complexity 
            });
            scene.effectType = "custom";
        }
        
        // Calculate duration in frames
        const durationInFrames = Math.round(scene.durationInSeconds * fps);
        const sceneId = scene.id;
        
        // Add scene information to the response message 
        responseMessage += `* **Scene ${i+1}**: ${scene.description} (${scene.durationInSeconds}s)\n`; // Added '*' for list item
        
        // If we have an emitter, send scene status = "pending"
        if (emitter) {
            emitter.next({
                type: "sceneStatus",
                sceneId,
                sceneIndex: i,
                status: "pending"
            });
        }
        
        try {
            // Handle different effect types
            if (scene.effectType === "custom") {
                try {
                    // --- BEGIN Animation Design Brief Integration ---
                    const videoDimensions = { width: 1920, height: 1080 }; // TODO: Get from project settings or plan

                    const animationBriefParams: AnimationBriefGenerationParams = {
                        projectId,
                        sceneId,
                        scenePurpose: scene.description, // Or a more specific field from scene plan
                        sceneElementsDescription: scene.description, // Or a more detailed field
                        desiredDurationInFrames: durationInFrames,
                        dimensions: videoDimensions,
                        // componentJobId: undefined, // Can be linked later if needed
                    };

                    scenePlannerLogger.adb(planId, sceneId, "Generating Animation Design Brief...");
                    const adbStartTime = Date.now();
                    const { brief, briefId } = await generateAnimationDesignBrief(animationBriefParams);
                    const adbDuration = Date.now() - adbStartTime;
                    scenePlannerLogger.adb(planId, sceneId, `ADB generation complete in ${adbDuration}ms`, { 
                        duration: adbDuration, 
                        briefId 
                    });
                    
                    // Log ADB brief structure for debugging
                    scenePlannerLogger.adb(planId, sceneId, "Animation design brief generated", { 
                        elementsCount: brief.elements?.length || 0, 
                        animationsCount: brief.elements?.[0]?.animations?.length || 0 
                    });
                    // --- END Animation Design Brief Integration ---

                    // Generate a custom component with explicit duration, now using the detailed brief
                    scenePlannerLogger.component(planId, sceneId, `Starting component generation with ADB briefId: ${briefId}`);
                    const componentStartTime = Date.now();
                    const { jobId, effect, componentMetadata } = await generateComponent(
                        projectId,
                        brief, // Pass the detailed AnimationDesignBrief object
                        assistantMessageId,
                        scene.durationInSeconds, // Pass the planned duration (brief also contains duration)
                        fps,                     // Pass fps from plan (brief also contains fps)
                        sceneId,                 // Pass the scene ID from planner
                        userId,                  // Pass user ID
                        briefId                  // Pass the briefId for linking/logging
                    );
                    const componentDuration = Date.now() - componentStartTime;
                    scenePlannerLogger.component(planId, sceneId, `Component generation completed in ${componentDuration}ms`, { 
                        duration: componentDuration, 
                        jobId, 
                        effect 
                    });
                    
                    // Add to our tracking
                    componentJobs.push({
                        id: crypto.randomUUID(), // Add missing id field
                        description: scene.description,
                        jobId: scene.id,
                        name: scene.name || effect,
                        prompt: scene.description, // Add missing prompt field
                    });
                    
                    // If we have an emitter, update scene status = "building"
                    if (emitter) {
                        emitter.next({
                            type: "sceneStatus",
                            sceneId,
                            sceneIndex: i,
                            status: "building",
                            jobId
                        });
                    }
                    
                    // Handle component over-run: If component declares a different duration, trust the component
                    let actualDurationInFrames = durationInFrames;
                    if (componentMetadata?.durationInFrames && 
                        componentMetadata.durationInFrames > durationInFrames) {
                        
                        scenePlannerLogger.adb(planId, sceneId, `Component declared ${componentMetadata.durationInFrames} frames, exceeds planned ${durationInFrames}. Using component's duration.`, { 
                            duration: componentMetadata.durationInFrames, 
                            plannedDuration: durationInFrames 
                        });
                        
                        // Trust the component's duration
                        actualDurationInFrames = componentMetadata.durationInFrames;
                    }
                    
                    // Add to our scene results
                    sceneResults.push({
                        sceneId,
                        type: scene.effectType,
                        durationInFrames: actualDurationInFrames,
                        jobId,
                        effect,
                        status: "building"
                    });
                } catch (error) {
                    // Handle errors - fall back to a text scene if component generation fails
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    scenePlannerLogger.error(planId, `Error generating component: ${errorMessage}`, { 
                        sceneIndex: i,
                        sceneId: scene.id,
                        error: errorMessage 
                    });
                    if (emitter) {
                        emitter.next({
                            type: "sceneStatus",
                            sceneId,
                            sceneIndex: i,
                            status: "error",
                            error: errorMessage
                        });
                    }
                    
                    // Fall back to text
                    sceneResults.push({
                        sceneId,
                        type: "text", // Fall back to text scene
                        durationInFrames,
                        status: "error",
                        error: errorMessage
                    });
                }
            } else {
                // Text or other basic scene type - no component generation needed
                scenePlannerLogger.adb(planId, sceneId, `Using simple ${scene.effectType} scene type, no component generation needed`);
                sceneResults.push({
                    sceneId,
                    type: scene.effectType,
                    durationInFrames,
                    status: "success" // Mark as immediately done since no generation needed
                });
                
                // Immediately update status since no async work is needed
                if (emitter) {
                    emitter.next({
                        type: "sceneStatus",
                        sceneId,
                        sceneIndex: i,
                        status: "success"
                    });
                }
            }
            
        } catch (error) {
            // Handle any uncaught errors at the scene level
            const errorMessage = error instanceof Error ? error.message : String(error);
            scenePlannerLogger.error(planId, `Unhandled error: ${errorMessage}`, { 
                sceneIndex: i,
                sceneId: scene.id,
                error: errorMessage 
            });
            sceneResults.push({
                sceneId,
                type: "text", // Fall back to text
                durationInFrames,
                status: "error",
                error: errorMessage
            });
            
            if (emitter) {
                emitter.next({
                    type: "sceneStatus",
                    sceneId,
                    sceneIndex: i,
                    status: "error",
                    error: errorMessage
                });
            }
        }
    }
    
    // Now build the operations to update the project's scenes
    // First, completely replace the scenes array with our new scenes
    projectPatches.push({
        op: "replace",
        path: "/scenes",
        value: sceneResults.map((scene, i) => {
            // Map our internal scene results to scene objects in the input props format
            return {
                id: scene.sceneId,
                type: scene.type,
                start: i === 0 ? 0 : 'auto', // First scene starts at 0, others use auto-placement
                duration: scene.durationInFrames,
                data: {
                    // Include component info if we have it
                    componentId: scene.jobId,
                    name: scene.effect,
                    text: scenesPlan.scenes[i]?.description || `Scene ${i+1}`
                }
            };
        })
    });
    
    // Also update the video's fps and durationInFrames to match the plan
    projectPatches.push({ op: "replace", path: "/fps", value: fps });
    
    // Add info about component jobs to the response
    if (componentJobs.length > 0) {
        responseMessage += "\n\nI'm generating these custom components:\n";
        for (const job of componentJobs) {
            responseMessage += `- ${job.name}: ${job.description}\n`;
        }
    }

    // CRITICAL FIX: Save the scene plan to the database
    try {
        // Calculate total duration across all scenes
        const totalDuration = scenesPlan.scenes.reduce((total: number, scene: any) => total + (scene.durationInSeconds || 0), 0);
        
        // DB Save start time for metrics
        const dbSaveStartTime = Date.now();
        
        // Create scene plan record in the database
        await dbInstance.insert(scenePlans).values({
            projectId,
            messageId: assistantMessageId,
            rawReasoning: scenesPlan.reasoning || "",
            userPrompt: scenesPlan.intent || "Video scene plan",
            planData: {
                intent: scenesPlan.intent || "",
                reasoning: scenesPlan.reasoning || "",
                scenes: scenesPlan.scenes,
                sceneCount: scenesPlan.scenes.length,
                totalDuration,
                fps: fps
            },
            createdAt: new Date()
        });
        
        const dbSaveDuration = Date.now() - dbSaveStartTime;
        scenePlannerLogger.db(planId, `Saved scene plan to database in ${dbSaveDuration}ms for project ${projectId}, message ${assistantMessageId}`);
    } catch (dbError) {
        scenePlannerLogger.error(planId, `Error saving scene plan: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
        // Don't fail the whole operation if DB save fails, just log it
    }

    const totalDuration = Date.now() - startTime;
    scenePlannerLogger.complete(planId, `Scene planning pipeline completed in ${totalDuration}ms with ${componentJobs.length} component jobs`);

    return {
        message: responseMessage,
        patches: projectPatches
    };
} 