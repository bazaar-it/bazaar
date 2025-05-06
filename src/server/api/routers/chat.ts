/* ------------------------------------------------------------------ */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* ------------------------------------------------------------------ */
/* src/server/api/routers/chat.ts                                     */
/* (Optimized Streaming Approach - Revision 3)                        */
/* Features:                                                          */
/* - tRPC v11 compatible                                              */
/* - Uses experimental_stream for HTTP Streaming Subscriptions (SSE)  */
/* - Single OpenAI streaming call (context-aware)                     */
/* - Handles text deltas & tool calls                                 */
/* - Single final database update for assistant message               */
/* - Structured client events                                         */
/* ------------------------------------------------------------------ */                                    

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { observable } from "@trpc/server/observable";
import { db } from "~/server/db";
import { projects, patches, messages, customComponentJobs, scenePlans } from "~/server/db/schema";
import { eq, desc, and, lt } from "drizzle-orm";
import { openai } from "~/server/lib/openai";
import { randomUUID } from "crypto";
import { applyPatch, type Operation } from 'fast-json-patch';
import { inputPropsSchema } from "~/types/input-props";
import { type JsonPatch } from "~/types/json-patch";
import { Subject } from "rxjs";
import { processUserMessage } from "~/server/services/chatOrchestration.service";
import { SYSTEM_PROMPT, MAX_CONTEXT_MESSAGES } from "~/server/constants/chat";
import { type StreamEvent, StreamEventType } from "~/types/chat";
import { generateComponent } from "~/server/services/componentGenerator.service";
import { handleScenePlan } from "~/server/services/scenePlanner.service";
import { getSceneDetails, analyzeSceneDescription } from "~/server/services/sceneAnalyzer.service";

// Set to track active streams and prevent duplicates
const activeStreamIds = new Set<string>();

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
            const userMessageId = randomUUID();
            await ctx.db.insert(messages).values({
                id: userMessageId,
                projectId,
                content: message,
                role: "user",
                createdAt: new Date(),
            });

            // 3. Create Assistant Placeholder
            const assistantMessageId = randomUUID();
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
            return { assistantMessageId, userMessageId };
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
            });
            
            if (existingJob) {
                console.log(`[Stream] Recent job found for project ${projectId}, may be related to this message`);
            }
            
            // Mark message as being actively streamed
            activeStreamIds.add(assistantMessageId);
            
            // Start a new stream for this message
            return observable<StreamEvent>((emit) => {
                // Initialize an event emitter for the processing stream
                const eventEmitter = new Subject<{
                    type: StreamEventType;
                    [key: string]: any;
                }>();
                
                // Subscribe to events from the processing stream and forward them
                const subscription = eventEmitter.subscribe(event => {
                    switch (event.type) {
                        case StreamEventType.CHUNK:
                            emit.next({ type: "delta", content: event.content });
                            break;
                        case StreamEventType.TOOL_CALL:
                            emit.next({ type: "tool_start", name: event.name });
                            break;
                        case StreamEventType.TOOL_RESULT:
                            emit.next({ 
                                type: "tool_result", 
                                name: event.name, 
                                success: event.success, 
                                jobId: event.jobId, 
                                finalContent: event.content 
                            });
                            break;
                        case StreamEventType.CONTENT_COMPLETE:
                            emit.next({ type: "complete", finalContent: event.content });
                            break;
                        case StreamEventType.SCENE_STATUS:
                            emit.next({ 
                                type: "sceneStatus", 
                                sceneId: event.sceneId,
                                sceneIndex: event.sceneIndex,
                                status: event.status,
                                jobId: event.jobId,
                                error: event.error
                            });
                            break;
                        case StreamEventType.ERROR:
                            emit.next({ type: "error", error: event.error, finalContent: event.content });
                            break;
                        case StreamEventType.DONE:
                            emit.next({ 
                                type: "finalized", 
                                status: event.status, 
                                jobId: event.jobId 
                            });
                            emit.complete();
                            break;
                    }
                });
                
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
                        const lastUserMessage = history.find(m => m.role === 'user');
                        if (!lastUserMessage) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not find triggering user message in history." });

                        // Process the user message
                        await processUserMessage(
                            projectId,
                            session.user.id,
                            lastUserMessage.id,
                            assistantMessageId,
                            lastUserMessage.content,
                            project.props,
                            openai,
                            eventEmitter
                        );
                        
                    } catch (error: any) {
                        console.error(`[Stream ${assistantMessageId}] Error during stream processing:`, error);
                        eventEmitter.next({
                            type: StreamEventType.ERROR,
                            error: error instanceof Error ? error.message : String(error),
                            content: `❌ Error: ${error instanceof Error ? error.message : String(error)}`
                        });
                        
                        // Final status update
                        eventEmitter.next({
                            type: StreamEventType.DONE,
                            status: "error",
                            jobId: null
                        });
                    } finally {
                        // Remove from active streams set when processing is complete
                        activeStreamIds.delete(assistantMessageId);
                    }
                };

                // Execute the main process asynchronously
                mainProcess().catch(error => {
                    console.error(`[Stream ${assistantMessageId}] Fatal error in mainProcess:`, error);
                    emit.error(new TRPCError({
                        code: 'INTERNAL_SERVER_ERROR',
                        message: error instanceof Error ? error.message : 'Unknown streaming setup error',
                        cause: error
                    }));
                });
                
                // Return teardown function
                return () => {
                    console.log(`[Stream ${assistantMessageId}] Teardown: Client disconnected`);
                    subscription.unsubscribe();
                    activeStreamIds.delete(assistantMessageId);
                };
            });
        }),

    // Add new procedure for getting scene planning reasoning
    getScenePlanningHistory: protectedProcedure
        .input(z.object({
            projectId: z.string().uuid(),
            limit: z.number().min(1).max(50).default(10),
        }))
        .query(async ({ ctx, input }) => {
            const { projectId, limit } = input;
            
            // First ensure the user has access to this project
            const project = await ctx.db.query.projects.findFirst({
                where: and(
                    eq(projects.id, projectId),
                    eq(projects.userId, ctx.session.user.id)
                ),
            });
            
            if (!project) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "You don't have access to this project",
                });
            }
            
            // Fetch the scene planning records for this project
            const planningHistory = await ctx.db.query.scenePlans.findMany({
                where: eq(scenePlans.projectId, projectId),
                orderBy: [desc(scenePlans.createdAt)],
                limit,
            });
            
            return planningHistory;
        }),

    regenerateScene: protectedProcedure
        .input(
            z.object({
                projectId: z.string().uuid(),
                sceneId: z.string(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { db } = ctx;
            const userId = ctx.session.user.id;
            const { projectId, sceneId } = input;
            
            // Verify the project exists and belongs to the user
            const project = await db.query.projects.findFirst({
                where: (projects, { eq, and }) => and(
                    eq(projects.id, projectId),
                    eq(projects.userId, userId)
                ),
            });
            
            if (!project) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Project not found or access denied",
                });
            }
            
            // Get the current project properties to find the scene
            const projectProps = project.props as any;
            if (!projectProps || !projectProps.scenes) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Invalid project structure",
                });
            }
            
            // Find the scene to regenerate
            const sceneToRegenerate = projectProps.scenes.find(
                (scene: any) => scene.id === sceneId
            );
            
            if (!sceneToRegenerate) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Scene not found in project",
                });
            }
            
            // Only support regenerating custom components for now
            if (sceneToRegenerate.type !== "custom") {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Only custom components can be regenerated",
                });
            }
            
            // Create a system message for the regeneration context
            const systemMessage = await db.insert(messages).values({
                projectId,
                role: "system",
                content: `Regenerating scene ${sceneId}. Previous component: ${sceneToRegenerate.data?.name || "Unknown"}`,
                kind: "text",
                status: "success",
                createdAt: new Date(),
                updatedAt: new Date(),
            }).returning();
            
            try {
                // Get scene details and analysis
                const sceneDetails = await getSceneDetails(sceneToRegenerate);
                const scene = await analyzeSceneDescription(sceneDetails.description, sceneDetails.durationInSeconds);
                
                // Check if we have a valid system message
                if (!systemMessage || systemMessage.length === 0 || !systemMessage[0]) {
                    throw new Error("Failed to create system message for regeneration");
                }
                
                // Generate a new component
                const result = await generateComponent(
                    projectId,
                    scene.description,
                    systemMessage[0].id,
                    scene.durationInSeconds,
                    scene.fps || 30
                );
                
                // Create patch operation to update the component
                const patch: Operation[] = [
                    {
                        op: "replace",
                        path: `/scenes/${projectProps.scenes.findIndex((s: any) => s.id === sceneId)}/data/componentId`,
                        value: result.jobId,
                    },
                    {
                        op: "replace",
                        path: `/scenes/${projectProps.scenes.findIndex((s: any) => s.id === sceneId)}/data/name`,
                        value: result.effect,
                    },
                ];
                
                // If the component metadata includes a different duration, update the scene duration
                if (result.componentMetadata?.durationInFrames && 
                    result.componentMetadata.durationInFrames !== sceneToRegenerate.duration) {
                    // Add operation to update duration
                    patch.push({
                        op: "replace",
                        path: `/scenes/${projectProps.scenes.findIndex((s: any) => s.id === sceneId)}/duration`,
                        value: result.componentMetadata.durationInFrames,
                    });
                    
                    // Recalculate positions of subsequent scenes
                    const sceneIndex = projectProps.scenes.findIndex((s: any) => s.id === sceneId);
                    const durationDiff = result.componentMetadata.durationInFrames - sceneToRegenerate.duration;
                    
                    // Update position of all scenes after this one
                    for (let i = sceneIndex + 1; i < projectProps.scenes.length; i++) {
                        patch.push({
                            op: "replace",
                            path: `/scenes/${i}/start`,
                            value: projectProps.scenes[i].start + durationDiff,
                        });
                    }
                    
                    // Update total duration
                    if (projectProps.meta && typeof projectProps.meta.duration === "number") {
                        patch.push({
                            op: "replace",
                            path: "/meta/duration",
                            value: projectProps.meta.duration + durationDiff,
                        });
                    }
                }
                
                // Apply the patch to the project
                const updatedProject = await db.update(projects)
                    .set({
                        props: applyPatch({ ...projectProps }, patch).newDocument,
                        updatedAt: new Date(),
                    })
                    .where(eq(projects.id, projectId))
                    .returning();
                
                // Store the patch operation in the database
                await db.insert(patches).values({
                    projectId,
                    patch: patch as any,
                    createdAt: new Date(),
                });
                
                // Create an assistant message indicating successful regeneration
                await db.insert(messages).values({
                    projectId,
                    role: "assistant",
                    content: `Scene "${result.effect}" regenerated successfully.`,
                    kind: "text",
                    status: "success",
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });
                
                return {
                    success: true,
                    message: `Scene regenerated successfully`,
                    patch,
                    scene: {
                        id: sceneId,
                        componentId: result.jobId,
                        name: result.effect,
                        status: "building",
                    },
                };
            } catch (error) {
                // Create an error message
                await db.insert(messages).values({
                    projectId,
                    role: "assistant",
                    content: `Error regenerating scene: ${error instanceof Error ? error.message : "Unknown error"}`,
                    kind: "error",
                    status: "error",
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });
                
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: error instanceof Error ? error.message : "Unknown error during scene regeneration",
                    cause: error,
                });
            }
        }),
});

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
            tools: [
                {
                    type: "function",
                    function: {
                        name: "planVideoScenes",
                        description: "Analyze user intent to plan multiple scenes with appropriate durations",
                        parameters: {
                            type: "object",
                            properties: {
                                scenes: {
                                    type: "array",
                                    description: "Detailed breakdown of each scene",
                                    items: {
                                        type: "object"
                                    }
                                },
                                // Other parameters as needed
                            },
                            required: ["scenes"]
                        }
                    }
                },
                {
                    type: "function",
                    function: {
                        name: "generateRemotionComponent",
                        description: "Request the generation of a new custom Remotion component",
                        parameters: {
                            type: "object",
                            properties: {
                                effectDescription: {
                                    type: "string",
                                    description: "A detailed description of the visual effect needed",
                                },
                            },
                            required: ["effectDescription"],
                        },
                    },
                },
            ],
            tool_choice: "auto",
        });

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
                
                // Use the new service to generate component
                const result = await generateComponent(
                    projectId,
                    effectDescription,
                    userMessage.id,
                    6, // Default duration
                    30, // Default FPS
                    undefined, // No scene ID
                    project.userId // User ID
                );
                
                // Assistant response
                const assistantMsg = `I'm generating a custom component for: "${result.effect}"

Status: Processing
Job ID: ${result.jobId}

Your component is being compiled and will be available soon.`;
                
                await ctx.db.insert(messages).values({
                    projectId,
                    content: assistantMsg,
                    role: "assistant",
                });
                
                return {
                    userMessageId: userMessage.id,
                    noPatches: true,
                    jobId: result.jobId,
                    effect: result.effect,
                };
            }
            
            // Scene planning
            if (toolCall && toolCall.function?.name === "planVideoScenes") {
                const scenePlan = JSON.parse(toolCall.function?.arguments || "{}");
                
                // Create a simple subject for handling events
                const emitter = new Subject<any>();
                
                // Process the scene plan
                const result = await handleScenePlan(
                    projectId, 
                    project.userId, 
                    scenePlan, 
                    userMessage.id,
                    ctx.db,
                    emitter
                );
                
                // Apply the patches if any
                if (result.patches && result.patches.length > 0) {
                    // Apply the patch to get new props
                    const nextProps = applyPatch(
                        structuredClone(project.props), 
                        result.patches, 
                        true, 
                        false
                    ).newDocument;
                    
                    // Validate new props
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
                        patch: result.patches as unknown as JsonPatch 
                    });
                }
                
                // Store assistant message
                await ctx.db.insert(messages).values({
                    projectId,
                    content: result.message,
                    role: "assistant",
                });
                
                return {
                    userMessageId: userMessage.id,
                    patch: result.patches as unknown as JsonPatch,
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