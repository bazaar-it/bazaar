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
import { applyPatch, type Operation } from 'fast-json-patch';
import { inputPropsSchema } from "~/types/input-props";
import { jsonPatchSchema, type JsonPatch } from "~/types/json-patch";
import { generateComponentCode } from "~/server/workers/generateComponentCode";
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
  ChatCompletionToolChoiceOption
} from "openai/resources/chat/completions";

// --- Constants ---
const SYSTEM_PROMPT = "You are a Remotion video assistant. Analyze the user request in the context of the current video properties (`currentProps`). Decide whether to apply a JSON patch for direct modifications or request a new custom component generation for complex effects. Use `applyJsonPatch` for modifications. Use `generateRemotionComponent` for new effects. Respond naturally if neither tool is appropriate or more information is needed.";
const MAX_CONTEXT_MESSAGES = 10; // How many *pairs* of user/assistant messages to fetch

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

const TOOLS: ChatCompletionTool[] = [applyPatchTool, generateRemotionComponentTool];

// --- Internal Helper for Component Generation ---
// This is called directly by the streamResponse logic when the tool is invoked.
async function handleComponentGenerationInternal(
    projectId: string,
    effectDescription: string,
    assistantMessageId: string // ID of the message being updated
): Promise<{ jobId: string; effect: string }> {
    console.log(`[COMPONENT GEN INTERNAL] Starting for AsstMsgID: ${assistantMessageId}, Desc: ${effectDescription}`);
    try {
        // 1. Generate code (can be slow)
        // TODO: Consider moving generateComponentCode to a background job triggered here
        // if it causes the stream handler to time out or hold resources too long.
        const { effect, tsxCode } = await generateComponentCode(effectDescription);
        console.log(`[COMPONENT GEN INTERNAL] Code generated for "${effect}"`);

        // 2. Create job record
        const jobId = nanoid();
        await db.insert(customComponentJobs)
            .values({
                id: jobId,
                projectId,
                effect,
                tsxCode,
                status: "pending", // Background worker should process this
                retryCount: 0,
                errorMessage: null,
                statusMessageId: assistantMessageId, // Link job to the message
                createdAt: new Date(),
                updatedAt: new Date(),
            });

        console.log(`[COMPONENT GEN INTERNAL] Job ${jobId} created for "${effect}"`);

        // Optional: Trigger build worker here explicitly if not polling
        // await triggerBuildWorker(job.id);

        return {
            jobId,
            effect
        };

    } catch (error: any) {
        console.error("[COMPONENT GEN INTERNAL] Error:", error);
        // Error will be caught by the streamResponse handler's try/catch
        // and update the final message status there.
        throw new TRPCError({ // Re-throw as TRPCError for consistent handling
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to generate component: ${error.message}`,
            cause: error
        });
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
        }))
        .mutation(async ({ ctx, input }) => {
            const { projectId, message } = input;
            const { session } = ctx;

            // 1. Auth Check
            const project = await ctx.db.query.projects.findFirst({
                columns: { id: true, userId: true },
                where: and(eq(projects.id, projectId), eq(projects.userId, session.user.id))
            });
            if (!project) throw new TRPCError({ code: "FORBIDDEN" });

            // 2. Insert User Message
            const userMessageId = nanoid();
            await ctx.db.insert(messages).values({
                id: userMessageId,
                projectId,
                content: message,
                role: "user",
                createdAt: new Date(),
            });

            // 3. Create Assistant Placeholder
            const assistantMessageId = nanoid();
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
        .subscription(({ ctx, input }) => {
            const { assistantMessageId, projectId } = input;
            const { session } = ctx;

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
                            model: "gpt-4o",
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
                                        if (toolName === "generateRemotionComponent" && toolArgsBuffer) {
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
                    // Cleanup logic (e.g., abort fetch controllers if needed)
                };
            }); // End observable return
        }),

}); // End createTRPCRouter

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
            model: "gpt-4o",
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: JSON.stringify({ currentProps: project.props, request: message }) },
            ],
            tools: [applyPatchTool, generateRemotionComponentTool],
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
                
                // Generate component code
                const { effect, tsxCode } = await generateComponentCode(effectDescription);
                
                // Create job
                const jobId = nanoid();
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
    | { type: "finalized"; status: "success" | "error" | "building" | "pending"; jobId?: string | null };