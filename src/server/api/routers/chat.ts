/* ------------------------------------------------------------------ */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* ------------------------------------------------------------------ */
/* src/server/api/routers/chat.ts                                     */
/* (Optimized Streaming Approach - Revision 2)                        */
/* Features:                                                          */
/* - tRPC v11 compatible                                              */
/* - Uses experimental_stream for HTTP Streaming Subscriptions (SSE)  */
/* - Single OpenAI streaming call (context-aware)                     */
/* - Handles text deltas & tool calls                                 */
/* - Single final database update for assistant message             */
/* - Structured client events                                         */
/* ------------------------------------------------------------------ */                                    
/* (Optimized Streaming Approach - Single LLM Call, Single DB Update) */
/* ------------------------------------------------------------------ */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { observable } from "@trpc/server/observable";
import { db } from "~/server/db";
import { projects, patches, messages, customComponentJobs } from "~/server/db/schema";
import { eq, desc, and, lt } from "drizzle-orm"; // Added lt for time comparison
import { openai } from "~/server/lib/openai";
import { nanoid } from "nanoid";
import { randomUUID } from "crypto";
import { applyPatch, type Operation } from 'fast-json-patch';
import { inputPropsSchema } from "~/types/input-props";
import { jsonPatchSchema, type JsonPatch } from "~/types/json-patch";
import { generateComponentCode } from "~/server/workers/generateComponentCode";
import { processPendingJobs } from "~/server/workers/buildCustomComponent";
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
  ChatCompletionToolChoiceOption
} from "openai/resources/chat/completions";
import { Subject } from "rxjs";

// --- Constants ---
const SYSTEM_PROMPT = "You are a Remotion video assistant. Analyze the user request in the context of the current video properties (`currentProps`). Decide whether to apply a JSON patch for direct modifications or request a new custom component generation for complex effects. Use `applyJsonPatch` for modifications. Use `generateRemotionComponent` for new effects. Respond naturally if neither tool is appropriate or more information is needed.";
const MAX_CONTEXT_MESSAGES = 10; // How many *pairs* of user/assistant messages to fetch

// Set to track active streams and prevent duplicates
const activeStreamIds = new Set<string>();

// --- Helper Functions ---

// --- Tool Definitions ---
const applyPatchTool: ChatCompletionTool = {
    type: "function",
    function: {
        name: "applyJsonPatch",
        description: "Apply a JSON-Patch (RFC-6902) to modify the current video properties.",
        parameters: {
            type: "object",
            properties: {
                operations: {
                    type: "array",
                    description: "An array of JSON Patch operations.",
                    items: {
                        type: "object",
                        properties: {
                            op: { type: "string", enum: ["add", "remove", "replace", "copy", "move", "test"] },
                            path: { type: "string", description: "A JSON Pointer path." },
                            value: { description: "The value for 'add' or 'replace' operations." },
                            from: { type: "string", description: "A JSON Pointer path for 'copy' or 'move'." }
                        },
                        required: ["op", "path"]
                    }
                },
                explanation: { // Optional explanation for better UX
                   type: "string",
                   description: "A brief explanation of the changes made, to show the user."
                }
            },
            required: ["operations"]
        }
    }
};

const generateRemotionComponentTool: ChatCompletionTool = {
    type: "function",
    function: {
        name: "generateRemotionComponent",
        description: "Request the generation of a new custom Remotion component when the desired effect cannot be achieved with simple property changes via JSON Patch.",
        parameters: {
            type: "object",
            properties: {
                effectDescription: {
                    type: "string",
                    description: "A detailed natural language description of the visual effect needed for the new component.",
                },
            },
            required: ["effectDescription"],
        },
    },
};

const scenePlannerTool: ChatCompletionTool = {
    type: "function",
    function: {
        name: "planVideoScenes",
        description: "Analyze user intent to plan multiple scenes with appropriate durations",
        parameters: {
            type: "object",
            properties: {
                intent: {
                    type: "string",
                    description: "Summary of the user's overall video intent"
                },
                sceneCount: {
                    type: "integer",
                    description: "Number of scenes needed to fulfill the request (minimum 1, maximum 10)",
                    minimum: 1,
                    maximum: 10
                },
                totalDuration: {
                    type: "integer",
                    description: "Total suggested video duration in seconds (maximum 60 seconds)",
                    minimum: 1,
                    maximum: 60
                },
                fps: {
                    type: "integer",
                    description: "Frames per second (normally 30)",
                    default: 30
                },
                scenes: {
                    type: "array",
                    description: "Detailed breakdown of each scene",
                    items: {
                        type: "object",
                        properties: {
                            id: {
                                type: "string",
                                description: "Unique ID for this scene to track across generation steps"
                            },
                            description: {
                                type: "string", 
                                description: "Detailed description of this scene's content and purpose"
                            },
                            durationInSeconds: {
                                type: "number",
                                description: "Recommended duration for this scene in seconds"
                            },
                            effectType: {
                                type: "string",
                                enum: ["text", "image", "custom"],
                                description: "Preferred scene type for this content"
                            }
                        },
                        required: ["id", "description", "durationInSeconds", "effectType"]
                    }
                }
            },
            required: ["intent", "sceneCount", "totalDuration", "fps", "scenes"]
        }
    }
};

const TOOLS: ChatCompletionTool[] = [scenePlannerTool, generateRemotionComponentTool, applyPatchTool];

// --- Internal Helper for Component Generation ---
// This is called directly by the streamResponse logic when the tool is invoked.
async function handleComponentGenerationInternal(
    projectId: string,
    effectDescription: string,
    assistantMessageId: string, // ID of the message being updated
    durationInSeconds: number = 6, // Default duration of 6 seconds (180 frames)
    fps: number = 30, // Default fps
    sceneId?: string // Scene ID from the planner
): Promise<{ jobId: string; effect: string; componentMetadata: Record<string, any> }> {
    console.log(`[COMPONENT GEN INTERNAL] Starting for AsstMsgID: ${assistantMessageId}, Desc: ${effectDescription}`);
    
    try {
        // Generate the component code using OpenAI
        const { effect, tsxCode } = await generateComponentCode(effectDescription);
        
        // Create a unique ID for this job
        const jobId = randomUUID();
        
        console.log(`[COMPONENT GEN INTERNAL] Generated code for "${effect}", jobId: ${jobId}`);
        
        // Create metadata object with duration info
        const metadata = { 
            durationInFrames: Math.round(durationInSeconds * fps), // Convert using provided fps
            durationInSeconds,
            fps,
            scenePlanId: sceneId // Store the reference to the scene plan
        };
        
        // Store the job in the database
        await db.insert(customComponentJobs).values({
                id: jobId,
                projectId,
                effect,
                tsxCode,
            status: "pending",
                retryCount: 0,
                errorMessage: null,
            metadata,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

        return { jobId, effect, componentMetadata: metadata };
    } catch (error) {
        console.error(`[COMPONENT GEN INTERNAL] Error:`, error);
        throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to generate component: ${error instanceof Error ? error.message : String(error)}`,
            cause: error,
        });
    }
}

// --- Internal Helper for Scene Planning ---
// This processes the scene plan and triggers component generation for each custom scene

// Define the SceneResult interface
interface SceneResult {
    sceneId: string;
    type: string;
    durationInFrames: number;
    start?: number; // Position will be calculated later
    jobId?: string;
    effect?: string;
    description: string;
    data?: {
        text?: string;
        color?: string;
        fontSize?: number;
        fontFamily?: string;
        componentId?: string;
        name?: string;
    };
}

async function handleScenePlanInternal(
    projectId: string,
    userId: string,
    scenesPlan: any,
    assistantMessageId: string,
    db: any,
    emitter?: Subject<any> // For streaming updates
): Promise<{ message: string, patches?: Operation[] }> {
    console.log(`[SCENE PLANNER] Processing scene plan for project ${projectId}`);
    
    try {
        // Validate scene plan structure first
        if (!scenesPlan || !Array.isArray(scenesPlan.scenes) || scenesPlan.scenes.length === 0) {
            throw new Error("Invalid scene plan: must include at least one scene");
        }
        
        if (!scenesPlan.fps || typeof scenesPlan.fps !== 'number' || scenesPlan.fps <= 0) {
            console.log("Scene plan missing fps, defaulting to 30");
            scenesPlan.fps = 30; // Default to 30fps if not specified
        }
        
        if (scenesPlan.scenes.length > 10) {
            console.warn(`Scene plan has ${scenesPlan.scenes.length} scenes, capping at 10`);
            scenesPlan.scenes = scenesPlan.scenes.slice(0, 10); // Cap at maximum 10 scenes
        }
        
        // Get current project state
        const project = await db.query.projects.findFirst({
            where: eq(projects.id, projectId),
        });
        
        if (!project) {
            throw new Error(`Project ${projectId} not found`);
        }
        
        // Verify ownership (additional security check)
        if (project.userId !== userId) {
            throw new TRPCError({
                code: "FORBIDDEN",
                message: "You don't have permission to modify this project"
            });
        }
        
        // Store the plan in project metadata
        await db.update(projects)
            .set({ 
                metadata: {
                    ...project.metadata,
                    lastScenePlan: scenesPlan
                },
                updatedAt: new Date()
            })
            .where(eq(projects.id, projectId));
        
        // If we have an emitter, immediately stream back the plan 
        if (emitter) {
            emitter.next({
                type: "scenePlan",
                plan: scenesPlan,
                status: "planning_complete"
            });
        }
        
        // Begin constructing our response
        let responseMessage = `I've planned your video with ${scenesPlan.sceneCount} scenes:\n\n`;
        
        // Array to hold all our operations
        const operations: Operation[] = [];
        
        // Track custom component generation jobs
        const componentJobs: { description: string, jobId: string, name: string }[] = [];
        
        // Track scene generation to properly position scenes
        let needsRepositioning = false;
        const sceneResults: SceneResult[] = [];
        const fps = scenesPlan.fps;
        
        // Create a function for calculating scene positions
        const calculateScenePositions = (scenes: SceneResult[]) => {
            let currentPosition = 0;
            for (const scene of scenes) {
                scene.start = currentPosition;
                currentPosition += scene.durationInFrames;
            }
            return currentPosition; // Return the total duration
        };
        
        // Process each scene, capturing all errors and generating placeholders when needed
        for (let i = 0; i < scenesPlan.scenes.length; i++) {
            const scene = scenesPlan.scenes[i];
            
            // Validate required scene properties
            if (!scene.id) scene.id = crypto.randomUUID();
            if (!scene.description) scene.description = `Scene ${i+1}`;
            if (!scene.durationInSeconds || typeof scene.durationInSeconds !== 'number') {
                scene.durationInSeconds = 5; // Default 5 seconds
            }
            if (!scene.effectType) scene.effectType = "text"; // Default to text
            
            const durationInFrames = Math.round(scene.durationInSeconds * fps); // Convert to frames using plan fps
            const sceneId = scene.id;
            
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
                        const { jobId, effect, componentMetadata } = await handleComponentGenerationInternal(
                            projectId,
                            scene.description,
                            assistantMessageId,
                            scene.durationInSeconds, // Pass the planned duration
                            fps,                     // Pass fps from plan
                            sceneId                  // Pass the scene ID from planner
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
                            needsRepositioning = true; // Flag that we need to recalculate positions
                        }
                        
                        // Store this scene result with its actual duration
                        sceneResults.push({
                            sceneId,
                            type: "custom",
                            durationInFrames: actualDurationInFrames,
                            jobId,
                            effect,
                            description: scene.description
                        });
                        
                    } catch (error) {
                        console.error(`[SCENE PLANNER] Error generating custom scene ${i}:`, error);
                        
                        // If we have an emitter, update scene status = "error"
                        if (emitter) {
                            emitter.next({
                                type: "sceneStatus",
                                sceneId,
                                sceneIndex: i,
                                status: "error",
                                error: error instanceof Error ? error.message : String(error)
                            });
                        }
                        
                        // Fall back to a placeholder text scene on error
                        sceneResults.push({
                            sceneId,
                            type: "text",
                            durationInFrames: Math.round(5 * fps), // 5 seconds fallback using plan fps
                            data: { 
                                text: `Scene ${i + 1}: ${scene.description} (Error: ${error instanceof Error ? error.message : String(error)})`,
                                color: "#FFFFFF",
                                fontSize: 32,
                                fontFamily: "Arial"
                            },
                            description: scene.description
                        });
                    }
                } else if (scene.effectType === "text") {
                    // Add a simple text scene
                    sceneResults.push({
                        sceneId,
                        type: "text",
                        durationInFrames,
                        data: {
                            text: scene.description,
                            color: "#FFFFFF",
                            fontSize: 32,
                            fontFamily: "Arial"
                        },
                        description: scene.description
                    });
                } else if (scene.effectType === "image") {
                    // For now, create a text scene saying "Image: [description]"
                    sceneResults.push({
                        sceneId,
                        type: "text",
                        durationInFrames,
                        data: {
                            text: `Image: ${scene.description}`,
                            color: "#FFFFFF",
                            fontSize: 32,
                            fontFamily: "Arial"
                        },
                        description: scene.description
                    });
                } else {
                    // Unknown scene type - create a simple text scene as fallback
                    console.warn(`Unknown scene type: ${scene.effectType}, defaulting to text`);
                    sceneResults.push({
                        sceneId,
                        type: "text",
                        durationInFrames,
                        data: {
                            text: scene.description,
                            color: "#FFFFFF",
                            fontSize: 32,
                            fontFamily: "Arial"
                        },
                        description: scene.description
                    });
                }
            } catch (error) {
                // Top-level error handler to ensure the process continues even if a scene fails
                console.error(`[SCENE PLANNER] Critical error processing scene ${i}:`, error);
                
                // Create a fallback scene
                sceneResults.push({
                    sceneId,
                    type: "text",
                    durationInFrames: Math.round(5 * fps), // 5 seconds fallback using plan fps
                    data: { 
                        text: `Scene ${i + 1}: Error (${error instanceof Error ? error.message : String(error)})`,
                        color: "#FF0000", // Red color to indicate error
                        fontSize: 32,
                        fontFamily: "Arial"
                    },
                    description: `Error in scene ${i + 1}`
                });
            }
        }
        
        // After processing all scenes, recalculate positions if needed
        const totalDuration = calculateScenePositions(sceneResults);
        
        // Create operations for adding each scene
        for (const scene of sceneResults) {
            if (scene.type === "custom") {
                operations.push({
                    op: "add",
                    path: `/scenes/-`,
                    value: {
                        id: scene.sceneId,
                        type: "custom",
                        start: scene.start,
                        duration: scene.durationInFrames,
                        data: {
                            componentId: scene.jobId,
                            name: scene.effect,
                            description: scene.description
                        }
                    }
                });
            } else if (scene.type === "text") {
                operations.push({
                    op: "add",
                    path: `/scenes/-`,
                    value: {
                        id: scene.sceneId,
                        type: "text",
                        start: scene.start,
                        duration: scene.durationInFrames,
                        data: scene.data
                    }
                });
            }
        }
        
        // Update the total duration
        operations.push({
            op: "replace",
            path: "/meta/duration",
            value: totalDuration
        });
        
        // Validate the entire patch against our schema before applying
        try {
            // Create a test object to validate final state
            const testProps = applyPatch(
                structuredClone(project.props), 
                operations
            ).newDocument;
            
            // Validate with Zod schema
            const validationResult = inputPropsSchema.safeParse(testProps);
            
            if (!validationResult.success) {
                throw new Error(`Invalid patch: ${validationResult.error.message}`);
            }
            
            // Additional checks for total duration and scene count
            if (testProps.scenes.length > 10) {
                throw new Error("Too many scenes: maximum allowed is 10");
            }
            
            if (testProps.meta.duration > 60 * fps) { // 60 seconds @ configured fps
                throw new Error(`Total duration exceeds maximum of 60 seconds (${60 * fps} frames at ${fps} fps)`);
            }
            
            // Comprehensive timing integrity validation
            let expectedPosition = 0;
            let scenesHaveGaps = false;
            let scenesOverlap = false;
            
            for (const scene of testProps.scenes) {
                // Check for positional accuracy
                if (scene.start !== expectedPosition) {
                    if (scene.start < expectedPosition) {
                        scenesOverlap = true;
                        console.error(`Scene positioning error: scene ${scene.id} starts at ${scene.start}, overlapping with previous scene that ends at ${expectedPosition}`);
                    } else if (scene.start > expectedPosition) {
                        scenesHaveGaps = true;
                        console.error(`Scene positioning error: gap between scenes detected from ${expectedPosition} to ${scene.start}`);
                    }
                }
                
                // Validate scene duration
                if (scene.duration <= 0) {
                    throw new Error(`Invalid scene duration for scene ${scene.id}: ${scene.duration}`);
                }
                
                // Update expected position
                expectedPosition = scene.start + scene.duration;
            }
            
            // Check total duration consistency
            if (expectedPosition !== testProps.meta.duration) {
                throw new Error(`Duration mismatch: scenes sum to ${expectedPosition}, meta.duration is ${testProps.meta.duration}`);
            }
            
            // Warn about positioning issues but don't fail
            if (scenesHaveGaps) {
                console.warn("Warning: Scene plan has gaps between scenes");
            }
            
            if (scenesOverlap) {
                console.warn("Warning: Scene plan has overlapping scenes");
            }
            
        } catch (error) {
            console.error("[SCENE PLANNER] Patch validation failed:", error);
            
            // Instead of throwing, try to fix the issues
            if (error instanceof Error && error.message.includes("Duration mismatch")) {
                // Fix the total duration to match the sum of scene durations
                const lastOperation = operations[operations.length - 1];
                // Check if lastOperation exists and is a replace operation with path /meta/duration
                if (lastOperation && 
                    lastOperation.op === "replace" && 
                    lastOperation.path === "/meta/duration" &&
                    'value' in lastOperation) { // Type guard to check if 'value' property exists
                    // Recalculate total duration manually
                    let calculatedDuration = 0;
                    for (const scene of sceneResults) {
                        calculatedDuration += scene.durationInFrames;
                    }
                    
                    // Update the operation with corrected duration
                    lastOperation.value = calculatedDuration;
                    console.log(`[SCENE PLANNER] Fixed duration mismatch: updated to ${calculatedDuration}`);
                }
            } else {
                // For other errors, try a simpler approach: one scene with reasonable duration
                console.error(`[SCENE PLANNER] Creating minimal fallback plan due to validation errors`);
                
                // Clear existing operations
                operations.length = 0;
                
                // Create a single simple text scene
                const fallbackId = crypto.randomUUID();
                operations.push({
                    op: "add",
                    path: `/scenes/-`,
                    value: {
                        id: fallbackId,
                        type: "text",
                        start: 0,
                        duration: Math.round(5 * fps), // 5 seconds using plan fps
                        data: {
                            text: "Scene planning error - please try again",
                            color: "#FF0000",
                            fontSize: 32,
                            fontFamily: "Arial"
                        }
                    }
                });
                
                // Set total duration
                operations.push({
                    op: "replace",
                    path: "/meta/duration",
                    value: Math.round(5 * fps)
                });
                
                responseMessage = "I encountered an issue while planning your video. Please try a simpler request or provide more details.";
            }
        }
        
        // Add info about components being generated
        if (componentJobs.length > 0) {
            responseMessage += "\n\nI'm generating these custom components:\n";
            componentJobs.forEach(job => {
                responseMessage += `- "${job.name}" (processing)\n`;
            });
            responseMessage += "\nThey'll appear in your timeline once processing is complete.";
        }
        
        return {
            message: responseMessage,
            patches: operations
        };
    } catch (error) {
        console.error(`[SCENE PLANNER] Error:`, error);
        
        // If we have an emitter, send error
        if (emitter) {
            emitter.next({
                type: "scenePlan",
                status: "error",
                error: error instanceof Error ? error.message : String(error)
            });
        }
        
        // Create a minimal fallback response
        return {
            message: `I encountered an error while planning your video: ${error instanceof Error ? error.message : String(error)}. Please try again with a simpler request.`,
            patches: [{
                op: "add",
                path: `/scenes/-`,
                value: {
                    id: crypto.randomUUID(),
                    type: "text",
                    start: 0,
                    duration: 150, // 5 seconds at 30fps
                    data: {
                        text: "Error in scene planning. Please try again.",
                        color: "#FF0000",
                        fontSize: 32,
                        fontFamily: "Arial"
                    }
                }
            }, {
                op: "replace",
                path: "/meta/duration",
                value: 150
            }]
        };
    }
}

// --- tRPC Router ---
export const chatRouter = createTRPCRouter({

    /**
     * Fetches recent messages for a given project. (Unchanged)
     */
    getMessages: protectedProcedure
        .input(z.object({
            projectId: z.string().uuid(),
            limit: z.number().int().min(1).max(100).optional().default(50),
        }))
        .query(async ({ ctx, input }) => {
            const project = await ctx.db.query.projects.findFirst({
                columns: { id: true, userId: true },
                where: eq(projects.id, input.projectId),
            });
            if (!project || project.userId !== ctx.session.user.id) {
                throw new TRPCError({ code: "FORBIDDEN", message: "Project not found or access denied." });
            }
            const messageHistory = await ctx.db.query.messages.findMany({
                where: eq(messages.projectId, input.projectId),
                orderBy: [desc(messages.createdAt)],
                limit: input.limit,
            });
            return messageHistory.reverse();
        }),

    /**
     * LEGACY: Synchronous message processing (kept for potential non-streaming clients/tests).
     * NOTE: This likely duplicates logic now present in streamResponse.
     * Consider refactoring or removing if no longer needed.
     */
    sendMessage: protectedProcedure
        .input(z.object({ projectId: z.string().uuid(), message: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
             console.warn("Using legacy sendMessage instead of streaming flow.");
            return await processUserMessageInProject(ctx, input.projectId, input.message);
        }),

    /**
     * Initiates a chat interaction: saves user message, creates placeholder assistant message.
     * Returns the ID needed for the streamResponse subscription.
     */
    initiateChat: protectedProcedure
        .input(z.object({
            projectId: z.string().uuid(),
            message: z.string().min(1),
            sceneId: z.string().nullable().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const { projectId, message, sceneId } = input;
            const { session } = ctx;
            
            // Log if scene ID is provided for context-aware responses
            if (sceneId) {
                console.log(`Chat initiated with scene context: ${sceneId}`);
            }

            // 1. Auth Check
            const project = await ctx.db.query.projects.findFirst({
                columns: { id: true, userId: true },
                where: and(eq(projects.id, projectId), eq(projects.userId, session.user.id))
            });
            if (!project) throw new TRPCError({ code: "FORBIDDEN" });

            // 2. Insert User Message
            const userMessageId = randomUUID(); // Use standard UUID format instead of nanoid
            await ctx.db.insert(messages).values({
                id: userMessageId,
                projectId,
                content: message,
                role: "user",
                createdAt: new Date(),
            });

            // 3. Create Assistant Placeholder
            const assistantMessageId = randomUUID(); // Use standard UUID format instead of nanoid
            await ctx.db.insert(messages).values({
                id: assistantMessageId,
                projectId,
                content: "...", // Minimal initial content
                role: "assistant",
                kind: "status",
                status: "pending",
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            console.log(`Initiated chat for AsstMsgID: ${assistantMessageId} (UserMsgID: ${userMessageId})`);
            return { assistantMessageId };
        }),

    /**
     * Core streaming logic: Handles OpenAI stream, text deltas, tool execution,
     * and the final single DB update for the assistant message.
     */
    streamResponse: protectedProcedure
        .input(z.object({
            assistantMessageId: z.string(), // The ID returned by initiateChat
            projectId: z.string().uuid(),
        }))
        .mutation(async ({ ctx, input }) => {
            const { assistantMessageId, projectId } = input;
            const { session } = ctx;

            // Check if this message is already being streamed
            if (activeStreamIds.has(assistantMessageId)) {
                console.log(`[Stream] Message ${assistantMessageId} already streaming, preventing duplicate`);
                return observable<StreamEvent>((emit) => {
                    // Immediately send finalized event and complete
                    emit.next({ type: "finalized", status: "success" });
                    emit.complete();
                    return () => {};
                });
            }
            
            // Check if this message already exists and has been completed
            const existingMessage = await db.query.messages.findFirst({
                where: eq(messages.id, assistantMessageId),
                columns: { id: true, status: true, kind: true }
            });
            
            // Check if message exists and is already completed
            if (existingMessage && (
                existingMessage.status === "success" ||
                existingMessage.status === "error" ||
                existingMessage.kind === "tool_result"
            )) {
                console.log(`[Stream] Message ${assistantMessageId} already completed in DB, skipping stream`);
                return observable<StreamEvent>((emit) => {
                    emit.next({ type: "finalized", status: existingMessage.status as any || "success" });
                    emit.complete();
                    return () => {};
                });
            }
            
            // Check if there's a component job already created for this message
            const existingJob = await db.query.customComponentJobs.findFirst({
                where: eq(customComponentJobs.projectId, projectId),
                orderBy: [desc(customComponentJobs.createdAt)]
                // We don't need to set limit explicitly as findFirst already limits to one result
            });
            
            if (existingJob) {
                console.log(`[Stream] Recent job found for project ${projectId}, may be related to this message`);
            }
            
            // Mark message as being actively streamed
            activeStreamIds.add(assistantMessageId);
            
            // Start a new stream for this message
            return observable<StreamEvent>((emit) => {
                // Variables to buffer stream state
                let finalContent = ""; // Accumulates the full text response
                let finalStatus: "success" | "error" | "building" | "pending" = "pending"; // Final status for DB
                let finalKind: "text" | "tool_result" | "error" | "status" = "status"; // Final kind for DB
                let isToolCall = false;
                let toolName = "";
                let toolArgsBuffer = "";
                let toolCallId: string | null = null; // OpenAI provides IDs for tool calls
                let explanationFromTool: string | null = null;
                let jobId: string | null = null; // Store job ID if component generated

                const mainProcess = async () => {
                    try {
                        console.log(`[Stream ${assistantMessageId}] Starting subscription.`);
                        emit.next({ type: "status", status: "thinking" });

                        // --- 1. Fetch Context (Project & History) ---
                        const project = await db.query.projects.findFirst({
                            columns: { id: true, userId: true, props: true },
                            where: and(
                                eq(projects.id, projectId),
                                eq(projects.userId, session.user.id)
                            )
                        });
                        if (!project) throw new TRPCError({ code: "FORBIDDEN" });

                        // Find the placeholder message to get its creation time
                        const placeholderMessage = await db.query.messages.findFirst({
                            columns: { createdAt: true, id: true },
                            where: eq(messages.id, assistantMessageId)
                        });
                        if (!placeholderMessage) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Assistant placeholder not found." });


                        // Fetch recent messages *before* the placeholder was created
                        const history = await db.query.messages.findMany({
                            where: and(
                                eq(messages.projectId, projectId),
                                lt(messages.createdAt, placeholderMessage.createdAt) // Messages before placeholder
                            ),
                            orderBy: [desc(messages.createdAt)],
                            limit: MAX_CONTEXT_MESSAGES * 2 // Fetch more to ensure we get user/assistant pairs
                        });

                        // Find the most recent user message from the fetched history
                        // This assumes the user message immediately precedes the assistant placeholder creation
                        const lastUserMessage = history.find(m => m.role === 'user');
                        if (!lastUserMessage) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not find triggering user message in history." });

                        // --- 2. Construct OpenAI Request ---
                        // Prepare history for OpenAI, alternating roles, newest first, limit pairs
                        const openAIHistory: ChatCompletionMessageParam[] = history
                            .reverse() // Oldest first
                            .slice(-(MAX_CONTEXT_MESSAGES * 2)) // Limit total messages
                            .map(m => ({ role: m.role, content: m.content } as ChatCompletionMessageParam));

                        const currentRequestMessage: ChatCompletionMessageParam = {
                            role: "user",
                            content: JSON.stringify({
                                request: lastUserMessage.content, // The user's request
                                currentProps: project.props // Current state for context
                            })
                        };

                        const messagesForAPI: ChatCompletionMessageParam[] = [
                            { role: "system", content: SYSTEM_PROMPT },
                            ...openAIHistory, // Add historical context
                            currentRequestMessage // Add the current request + props
                        ];

                        // --- 3. Call OpenAI (Single Streaming Call) ---
                        console.log(`[Stream ${assistantMessageId}] Making OpenAI call with ${messagesForAPI.length} messages.`);
                        const openaiResponse = await openai.chat.completions.create({
                            model: "gpt-4o-mini",
                            messages: messagesForAPI,
                            tools: TOOLS,
                            tool_choice: "auto",
                            stream: true,
                        });

                        // --- 4. Process Stream Manually ---
                        for await (const chunk of openaiResponse) {
                            const delta = chunk.choices[0]?.delta;
                            const finishReason = chunk.choices[0]?.finish_reason;

                            // a) Process Content Updates (Text Deltas)
                            if (delta?.content) {
                                const contentDelta = delta.content;
                                // Keep building the final content
                                finalContent += contentDelta;
                                
                                // Only emit on significant text or the first delta
                                if (contentDelta.trim() || finalContent.length === contentDelta.length) {
                                    // Stream the content delta to client
                                    emit.next({ type: "delta", content: contentDelta });
                                }
                            }
                            
                            // b) Process Tool Calls
                            if (delta?.tool_calls && delta.tool_calls.length > 0) {
                                // Handle tool call start if not already in tool call mode
                                if (!isToolCall) {
                                    isToolCall = true;
                                    toolName = delta.tool_calls[0]?.function?.name || "unknown";
                                    toolCallId = delta.tool_calls[0]?.id || null;
                                    finalKind = "tool_result"; // Mark as tool call for DB update
                                    emit.next({ type: "tool_start", name: toolName });
                                    console.log(`[Stream ${assistantMessageId}] Tool start: ${toolName}`);
                                }
                                
                                // Accumulate function arguments (they may come in chunks)
                                if (delta.tool_calls[0]?.function?.arguments) {
                                    toolArgsBuffer += delta.tool_calls[0].function.arguments;
                                }
                            }
                            
                            // c) Handle Stream Finish Reason
                            if (finishReason) {
                                console.log(`[Stream ${assistantMessageId}] Finish Reason: ${finishReason}`);
                                if (finishReason === "tool_calls" && isToolCall) {
                                    console.log(`[Stream ${assistantMessageId}] Executing tool: ${toolName} with args: ${toolArgsBuffer}`);
                                    finalStatus = "building";
                                    
                                    // Signal to client that we're executing a tool
                                    emit.next({ type: "status", status: "tool_calling" });
                                    
                                    try {
                                        // Handle the tool calls based on function name
                                        if (toolName === "planVideoScenes" && toolArgsBuffer) {
                                            // Parse the tool arguments
                                            const scenePlan = JSON.parse(toolArgsBuffer);
                                            
                                            // Create an observable Subject for streaming updates
                                            const updateEmitter = new Subject<any>();
                                            
                                            // Subscribe to the emitter to forward events to client
                                            const subscription = updateEmitter.subscribe(update => {
                                                if (update.type === "scenePlan") {
                                                    emit.next({ 
                                                        type: "scenePlan", 
                                                        plan: update.plan,
                                                        status: update.status
                                                    });
                                                } else if (update.type === "sceneStatus") {
                                                    emit.next({ 
                                                        type: "sceneStatus", 
                                                        sceneId: update.sceneId,
                                                        sceneIndex: update.sceneIndex,
                                                        status: update.status,
                                                        jobId: update.jobId,
                                                        error: update.error
                                                    });
                                                }
                                            });
                                            
                                            try {
                                                // Process the scene plan (this handles DB entries and emits updates)
                                                const result = await handleScenePlanInternal(
                                                    projectId, 
                                                    session.user.id, 
                                                    scenePlan, 
                                                    assistantMessageId,
                                                    db,
                                                    updateEmitter
                                                );
                                                
                                                // Apply the patches to the project
                                                if (result.patches && result.patches.length > 0) {
                                                    // Apply the patch to props
                                                    const nextProps = applyPatch(structuredClone(project.props), result.patches, true, false).newDocument;
                                                    const validated = inputPropsSchema.safeParse(nextProps);
                                                    
                                                    if (!validated.success) {
                                                        throw new TRPCError({ code: "BAD_REQUEST", message: "Resulting document invalid" });
                                                    }
                                                    
                                                    // Save project changes and patch history
                                                    await db.update(projects)
                                                        .set({ props: validated.data, updatedAt: new Date() })
                                                        .where(eq(projects.id, projectId));
                                                        
                                                    await db.insert(patches).values({ 
                                                        projectId, 
                                                        patch: result.patches as unknown as JsonPatch 
                                                    });
                                                }
                                                
                                                // Update final content with the response message
                                                finalContent = result.message;
                                                finalStatus = "success";
                                                
                                                // Emit tool result to client
                                                emit.next({ 
                                                    type: "tool_result", 
                                                    name: toolName,
                                                    success: true,
                                                    finalContent
                                                });
                                            } finally {
                                                // Clean up subscription regardless of success/failure
                                                subscription.unsubscribe();
                                            }
                                        }
                                        else if (toolName === "generateRemotionComponent" && toolArgsBuffer) {
                                            // Parse the tool arguments
                                            const args = JSON.parse(toolArgsBuffer);
                                            const { effectDescription } = args;
                                            
                                            // Generate the component (this handles DB entries)
                                            const result = await handleComponentGenerationInternal(projectId, effectDescription, assistantMessageId);
                                            jobId = result.jobId;
                                            
                                            // Update final content and emit event to client
                                            finalContent = `I'm generating a custom component for: "${result.effect}"

Status: Processing
Job ID: ${jobId}

Your component is being compiled and will be available soon.`;
                                            
                                            emit.next({ 
                                                type: "tool_result", 
                                                name: toolName,
                                                success: true,
                                                jobId,
                                                finalContent
                                            });
                                        }
                                        else if (toolName === "applyJsonPatch" && toolArgsBuffer) {
                                            // Parse the tool arguments
                                            const args = JSON.parse(toolArgsBuffer);
                                            const { operations, explanation } = args;
                                            
                                            // Validate patch operations
                                            const parsed = jsonPatchSchema.safeParse(operations);
                                            if (!parsed.success) {
                                                throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid patch format" });
                                            }
                                            
                                            const patch = parsed.data;
                                            const patchOperations = patch as unknown as Operation[];
                                            
                                            // Apply the patch to props
                                            const nextProps = applyPatch(structuredClone(project.props), patchOperations, true, false).newDocument;
                                            const validated = inputPropsSchema.safeParse(nextProps);
                                            
                                            if (!validated.success) {
                                                throw new TRPCError({ code: "BAD_REQUEST", message: "Resulting document invalid" });
                                            }
                                            
                                            // Save project changes and patch history
                                            await db.update(projects)
                                                .set({ props: validated.data, updatedAt: new Date() })
                                                .where(eq(projects.id, projectId));
                                                
                                            await db.insert(patches).values({ 
                                                projectId, 
                                                patch: patchOperations as unknown as JsonPatch 
                                            });
                                            
                                            // Update the final content with the explanation
                                            const toolExplanation = explanation || `I've updated your video with ${patchOperations.length} changes.`;
                                            explanationFromTool = toolExplanation;
                                            finalContent = toolExplanation;
                                            finalStatus = "success";
                                            
                                            // Emit success to client
                                            emit.next({ 
                                                type: "tool_result", 
                                                name: toolName,
                                                success: true,
                                                finalContent
                                            });
                                        }
                                        else {
                                            // Unknown or empty tool call
                                            throw new TRPCError({ 
                                                code: "BAD_REQUEST", 
                                                message: `Unhandled tool: ${toolName}` 
                                            });
                                        }
                                    
                                    // For tool call execution errors
                                    } catch (toolError: any) {
                                        console.error(`[Stream ${assistantMessageId}] Tool execution error:`, toolError);
                                        finalStatus = "error";
                                        finalKind = "error";
                                        const errorMsg = toolError instanceof TRPCError ? toolError.message : (toolError.message ?? String(toolError));
                                        finalContent = `❌ Error executing ${toolName}: ${errorMsg}`;
                                        
                                        // Emit error to client
                                        emit.next({ 
                                            type: "tool_result", 
                                            name: toolName,
                                            success: false,
                                            finalContent 
                                        });
                                    }
                                } else if (finishReason === "stop") {
                                    // Normal completion (no tool calls)
                                    finalStatus = "success";
                                    emit.next({ type: "complete", finalContent });
                                } else {
                                    // Other finish reasons (length, content filter, etc.)
                                    console.log(`[Stream ${assistantMessageId}] Other finish reason: ${finishReason}`);
                                    finalStatus = "success"; // Still mark as success
                                    emit.next({ type: "complete", finalContent });
                                }
                                break; // Exit the loop once finished
                            } // End finishReason handling
                        } // End for await loop

                    } catch (error: any) {
                        console.error(`[Stream ${assistantMessageId}] Error during stream processing:`, error);
                        finalStatus = "error";
                        finalKind = "error";
                        const errorMsg = error instanceof TRPCError ? error.message : (error.message ?? String(error));
                        finalContent = finalContent ? `${finalContent}\n\n❌ Error: ${errorMsg}` : `❌ Error: ${errorMsg}`;
                        // Emit error details to client
                        emit.next({ type: "error", error: errorMsg, finalContent });
                        // DB update will happen in finally block
                    } finally {
                        // --- Final DB Update (Guaranteed Execution) ---
                        console.log(`[Stream ${assistantMessageId}] Updating final message: Status=${finalStatus}, Kind=${finalKind}`);
                        try {
                            await db.update(messages)
                                .set({ 
                                    content: finalContent, 
                                    status: finalStatus, 
                                    kind: finalKind, 
                                    updatedAt: new Date() 
                                })
                                .where(eq(messages.id, assistantMessageId));
                            
                            console.log(`[Stream ${assistantMessageId}] Final DB update successful.`);
                        } catch (dbError: any) {
                            console.error(`[Stream ${assistantMessageId}] CRITICAL: Failed to update final message status in DB:`, dbError);
                            // Emit might fail if connection is already closed, but try anyway
                            emit.next({ type: "error", error: `Failed to save final state: ${dbError.message}`});
                        }
                        
                        // Signal end to client
                        emit.next({ type: "finalized", status: finalStatus, jobId });
                        emit.complete(); // Signal observable completion
                        console.log(`[Stream ${assistantMessageId}] Stream processing finished and observable completed.`);
                    }    
                } // End for await loop

                // Execute the main process, catching any startup errors
                mainProcess().catch((error) => {
                    // Catch errors from the main async process starting itself
                    console.error(`[Stream ${assistantMessageId}] Fatal error starting mainProcess:`, error);
                    emit.error(new TRPCError({ // Signal error through the observable
                        code: 'INTERNAL_SERVER_ERROR',
                        message: error instanceof Error ? error.message : 'Unknown streaming setup error',
                        cause: error
                    }));
                    // No finally block here, error is emitted, observable ends. DB won't be updated.
                });
                
                // Return teardown function
                return () => {
                    console.log(`[Stream ${assistantMessageId}] Teardown: Client disconnected`);
                    // Remove from active streams set when disconnected
                    activeStreamIds.delete(assistantMessageId);
                };
            }); // End observable return
        }), // End observable
    }) // End streamResponse mutation
; // End createTRPCRouter

// ... (rest of the code remains the same)
export type SendMessageResult = {
    patch?: JsonPatch;
    userMessageId: string;
    noPatches?: boolean;
    jobId?: string;
    effect?: string;
};

/**
 * Process a user message within a project context, handling both standard video updates
 * and custom component generation requests.
 * 
 * Used by both the chat router and project router.
 * Acts as the temporary implementation of the legacy sendMessage until all client code
 * is updated to use the streaming API.
 */
export async function processUserMessageInProject(ctx: any, projectId: string, message: string): Promise<SendMessageResult> {
    try {
        // Check project access
        const [project] = await ctx.db
            .select({ props: projects.props, userId: projects.userId })
            .from(projects)
            .where(eq(projects.id, projectId));

        if (!project) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        }

        if (project.userId !== ctx.session.user.id) {
            throw new TRPCError({ code: "FORBIDDEN", message: "You don't have access to this project" });
        }

        // Insert user message
        const [userMessage] = await ctx.db
            .insert(messages)
            .values({ projectId, content: message, role: "user" })
            .returning();

        // Call OpenAI with tools for function calling
        const llmResp = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: JSON.stringify({ currentProps: project.props, request: message }) },
            ],
            tools: [scenePlannerTool, generateRemotionComponentTool],
            tool_choice: "auto",
        }).catch(async (error) => {
            console.error("OpenAI API error:", error);
            // Try with a fallback model
            try {
                return await openai.chat.completions.create({
                    model: "gpt-3.5-turbo",
                    messages: [
                        { role: "system", content: SYSTEM_PROMPT },
                        { role: "user", content: JSON.stringify({ currentProps: project.props, request: message }) },
                    ],
                    tools: [scenePlannerTool, generateRemotionComponentTool],
                    tool_choice: "auto",
                });
            } catch (fallbackError) {
                console.error("Fallback model error:", fallbackError);
                
                // Create a basic assistant message as fallback
                await ctx.db.insert(messages).values({ 
                    projectId, 
                    content: "Sorry, I encountered an issue processing your request. Please try again later.", 
                    role: "assistant" 
                });
                
                return null;
            }
        });

        // If all API calls failed, return early with the user message ID
        if (!llmResp) {
            return { userMessageId: userMessage.id, noPatches: true };
        }

        const msgResp = llmResp.choices[0]?.message;
        if (!msgResp) {
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "LLM returned no choices" });
        }

        // Handle tool calls
        if (msgResp.tool_calls && msgResp.tool_calls.length > 0) {
            const toolCall = msgResp.tool_calls[0];
            
            // Component generation
            if (toolCall && toolCall.function?.name === "generateRemotionComponent") {
                const args = JSON.parse(toolCall.function?.arguments || "{}");
                const { effectDescription } = args;
                
                // Generate component code
                const { effect, tsxCode } = await generateComponentCode(effectDescription);
                
                // Create job
                const jobId = randomUUID();
                await ctx.db.insert(customComponentJobs).values({
                    id: jobId,
                    projectId,
                    effect,
                    tsxCode,
                    status: "pending",
                    retryCount: 0,
                    errorMessage: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });
                
                // Assistant response
                const assistantMsg = `I'm generating a custom component for: "${effect}"

Status: Processing
Job ID: ${jobId}

Your component is being compiled and will be available soon.`;
                
                await ctx.db.insert(messages).values({
                    projectId,
                    content: assistantMsg,
                    role: "assistant",
                });
                
                return {
                    userMessageId: userMessage.id,
                    noPatches: true,
                    jobId,
                    effect,
                };
            }
            
            // JSON Patch
            if (toolCall && toolCall.function?.name === "applyJsonPatch") {
                const args = JSON.parse(toolCall.function?.arguments || "{}");
                const { operations, explanation } = args;
                
                // Validate patch
                const parsed = jsonPatchSchema.safeParse(operations);
                if (!parsed.success) {
                    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid patch format" });
                }
                
                const patch = parsed.data;
                const patchOperations = patch as unknown as Operation[];
                
                // Apply patch
                const nextProps = applyPatch(structuredClone(project.props), patchOperations, true, false).newDocument;
                const validated = inputPropsSchema.safeParse(nextProps);
                
                if (!validated.success) {
                    throw new TRPCError({ code: "BAD_REQUEST", message: "Resulting document invalid" });
                }
                
                // Save changes
                await ctx.db.update(projects)
                    .set({ props: validated.data, updatedAt: new Date() })
                    .where(eq(projects.id, projectId));
                    
                await ctx.db.insert(patches).values({ 
                    projectId, 
                    patch: patchOperations as unknown as JsonPatch 
                });
                
                // Assistant message
                const systemMessage = explanation || `I've updated your video with ${patchOperations.length} changes.`;
                await ctx.db.insert(messages).values({ 
                    projectId, 
                    content: systemMessage, 
                    role: "assistant" 
                });
                
                return { 
                    patch: patchOperations as unknown as JsonPatch, 
                    userMessageId: userMessage.id 
                };
            }
        }
        
        // No tool calls - just text response
        const content = msgResp.content || "I'm not sure how to help with that.";
        await ctx.db.insert(messages).values({ 
            projectId, 
            content, 
            role: "assistant" 
        });
        
        return { userMessageId: userMessage.id };
    } catch (error) {
        console.error("processUserMessageSynchronously error:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ 
            code: "INTERNAL_SERVER_ERROR", 
            message: `Failed to process message: ${error instanceof Error ? error.message : String(error)}` 
        });
    }
}

// Stream event types for the subscription
export type StreamEvent =
    | { type: "status"; status: "thinking" | "tool_calling" | "building" }
    | { type: "delta"; content: string }
    | { type: "tool_start"; name: string }
    | { type: "tool_result"; name: string; success: boolean; jobId?: string | null; finalContent?: string }
    | { type: "complete"; finalContent: string }
    | { type: "error"; error: string; finalContent?: string }
    | { type: "finalized"; status: "success" | "error" | "building" | "pending"; jobId?: string | null }
    | { type: "scenePlan"; plan: any; status: "planning_complete" }
    | { type: "sceneStatus"; sceneId: string; sceneIndex: number; status: "pending" | "building" | "success" | "error"; jobId?: string; error?: string };