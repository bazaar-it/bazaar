import { type Operation } from "fast-json-patch";
import { Subject } from "rxjs";
import crypto from "crypto";
import { db } from "~/server/db";
import { MAX_SCENES } from "~/server/constants/chat";
import { type ComponentJob, type SceneResult, type SceneStatus, type ScenePlanResponse } from "~/types/chat";
import { analyzeSceneContent } from "./sceneAnalyzer.service";
import { generateComponent } from "./componentGenerator.service";

// Define the database type
type DB = typeof db;

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
    console.log(`Processing scene plan with ${scenesPlan.scenes?.length ?? 0} scenes`);
    
    // Validate input
    if (!scenesPlan.scenes || !Array.isArray(scenesPlan.scenes) || scenesPlan.scenes.length === 0) {
        return {
            message: "No valid scenes were provided in the plan."
        };
    }
    
    // Cap scenes at MAX_SCENES for safety
    if (scenesPlan.scenes.length > MAX_SCENES) {
        console.warn(`Scene plan has ${scenesPlan.scenes.length} scenes, capping at ${MAX_SCENES}`);
        scenesPlan.scenes = scenesPlan.scenes.slice(0, MAX_SCENES);
    }
    
    const fps = scenesPlan.fps || 30; // Default to 30fps if not specified
    let responseMessage = `I've planned your video with ${scenesPlan.scenes.length} scenes: `;
    
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
            console.log(`Upgrading scene ${i} to custom component based on content analysis:`, sceneAnalysis);
            scene.effectType = "custom";
        }
        
        // Calculate duration in frames
        const durationInFrames = Math.round(scene.durationInSeconds * fps);
        const sceneId = scene.id;
        
        // Add scene information to the response message 
        responseMessage += `**Scene ${i+1}**: ${scene.description} (${scene.durationInSeconds}s)\n`;
        
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
                    // Generate a custom component with explicit duration
                    const { jobId, effect, componentMetadata } = await generateComponent(
                        projectId,
                        scene.description,
                        assistantMessageId,
                        scene.durationInSeconds, // Pass the planned duration
                        fps,                     // Pass fps from plan
                        sceneId,                 // Pass the scene ID from planner
                        userId                   // Pass user ID
                    );
                    
                    // Add to our tracking
                    componentJobs.push({
                        description: scene.description,
                        jobId,
                        name: effect
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
                        
                        console.log(`Scene ${i} (${sceneId}): Component declared ${componentMetadata.durationInFrames} frames, ` +
                                    `which exceeds planned ${durationInFrames}. Using component's duration.`);
                        
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
                    console.error(`Error generating scene ${i}:`, errorMessage);
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
            console.error(`Unhandled error processing scene ${i}:`, errorMessage);
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
    
    return {
        message: responseMessage,
        patches: projectPatches
    };
} 