import { type OpenAI } from "openai";
import { TRPCError } from "@trpc/server";
import { type Subject } from "rxjs";
import { type Operation } from "fast-json-patch";
import { db } from "~/server/db";
import { messages, patches } from "~/server/db/schema";
import { SYSTEM_PROMPT, MAX_CONTEXT_MESSAGES } from "~/server/constants/chat";
import { CHAT_TOOLS } from "~/server/lib/openai/tools";
import { handleScenePlan } from "./scenePlanner.service";
import { generateComponent } from "./componentGenerator.service";
import { type InputProps } from "~/types/input-props";
import { type JsonPatch } from "~/types/json-patch";
import { type StreamEventType, StreamEventType as EventType, type ToolCallAccumulator } from "~/types/chat";
import { eq, desc } from "drizzle-orm";
import { eventBufferService } from "~/server/services/eventBuffer.service";
import { randomUUID } from "crypto";

/**
 * Structure of a tool call response
 */
interface ToolCallResponse {
    message: string;
    patches?: Operation[];
}

/**
 * Structure for timing metrics in stream processing
 */
interface StreamTimingMetrics {
    streamStart: number;
    contentChunksReceived: number;
    toolCallFragmentsReceived: number;
    toolCallsCompleted: number;
    toolCallsExecuted: number;
    toolCallExecutionTimes: Record<string, number>;
    streamEnd?: number;
    totalDuration?: number;
}

/**
 * Processes a user message in a project context and streams the response
 * 
 * @param projectId - ID of the project being worked on
 * @param userId - ID of the user sending the message
 * @param userMessageId - ID of the newly inserted user message
 * @param assistantMessageId - ID of the newly inserted assistant message (will be updated)
 * @param content - User message content
 * @param projectProps - Current project properties
 * @param openaiClient - OpenAI client instance
 * @param emitter - Subject to emit streaming events
 * @param clientId - Identifier for the client
 * @param shouldResume - Whether to resume from a saved state
 */
export async function processUserMessage(
    projectId: string,
    userId: string,
    userMessageId: string,
    assistantMessageId: string,
    content: string,
    projectProps: InputProps,
    openaiClient: OpenAI,
    emitter: Subject<{
        type: StreamEventType;
        [key: string]: any;
    }>,
    clientId?: string,
    shouldResume?: boolean
): Promise<void> {
    // Initialize timing metrics for performance tracking
    const metrics: StreamTimingMetrics = {
        streamStart: Date.now(),
        contentChunksReceived: 0,
        toolCallFragmentsReceived: 0,
        toolCallsCompleted: 0,
        toolCallsExecuted: 0,
        toolCallExecutionTimes: {},
    };
    
    console.log(`[${assistantMessageId}] Starting stream processing for project ${projectId}${clientId ? `, client: ${clientId}` : ''}`);
    
    // If we should resume from a saved state, get it from the buffer
    if (shouldResume && clientId) {
        console.log(`[${assistantMessageId}] Attempting to resume from saved state for client ${clientId}`);
        const savedState = eventBufferService.getToolCallState(assistantMessageId);
        if (savedState) {
            console.log(`[${assistantMessageId}] Found saved state with status: ${savedState.status}, executed calls: ${savedState.executedCalls.length}`);
            // We could add state resumption logic here, but for now just logging
        }
    }
    
    try {
        // Fetch conversation context limited to MAX_CONTEXT_MESSAGES
        // Each pair is a user message and its assistant response
        const fetchStartTime = Date.now();
        const conversationContext = await db.query.messages.findMany({
            where: (table, { eq, and, ne }) => 
                and(
                    eq(table.projectId, projectId),
                    ne(table.id, userMessageId),  // exclude current message
                    ne(table.id, assistantMessageId) // exclude the pending assistant message
                ),
            orderBy: [desc(messages.createdAt)],
            limit: MAX_CONTEXT_MESSAGES * 2,
        });
        const fetchEndTime = Date.now();
        console.log(`[${assistantMessageId}] Fetched ${conversationContext.length} messages in ${fetchEndTime - fetchStartTime}ms`);
        
        // Create the OpenAI API request with tools
        const apiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
            { role: "system", content: SYSTEM_PROMPT },
            ...conversationContext
                .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()) // re-sort in ascending order
                .map(msg => ({ 
                    role: msg.role as "user" | "assistant", 
                    content: msg.content 
                })),
            { 
                role: "user", 
                content 
            }
        ];
        
        // Add current project props as context
        const userContextMessage: OpenAI.Chat.ChatCompletionMessageParam = {
            role: "system",
            content: `Current video properties (currentProps):\n\`\`\`json\n${JSON.stringify(projectProps, null, 2)}\n\`\`\``,
        };
        
        // Insert at position 1 (after system prompt, before messages)
        apiMessages.splice(1, 0, userContextMessage);
        
        console.log(`[${assistantMessageId}] Creating stream with ${apiMessages.length} messages in context`);
        
        // Create the streaming request
        const streamStartTime = Date.now();
        const stream = await openaiClient.chat.completions.create({
            model: "gpt-4o-mini", // or other OpenAI model that supports function calling
            messages: apiMessages,
            stream: true,
            tools: CHAT_TOOLS,
        });
        
        console.log(`[${assistantMessageId}] Stream created in ${Date.now() - streamStartTime}ms`);
        
        // Set up variables for tracking the stream state
        let streamedContent = "";
        
        // Initialize an accumulator for tool calls by index using our new interface
        const accumulatedToolCalls: Record<number, ToolCallAccumulator> = {};
        
        // Process the stream
        console.log(`[${assistantMessageId}] Starting to process stream chunks`);
        for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta;
            
            // Skip if no delta
            if (!delta) continue;
            
            // Process tool call deltas in a structured way
            if (delta.tool_calls) {
                metrics.toolCallFragmentsReceived += 1;
                
                console.log(`[${assistantMessageId}] Received tool call delta: ${JSON.stringify(delta.tool_calls)}`);
                
                for (const toolCallDelta of delta.tool_calls) {
                    // Make sure we have a valid index
                    if (toolCallDelta.index === undefined) continue;
                    
                    // Create the tool call record if it doesn't exist
                    if (!accumulatedToolCalls[toolCallDelta.index]) {
                        // This is a new tool call, emit the start event
                        if (toolCallDelta.function?.name) {
                            console.log(`[${assistantMessageId}] New tool call detected: ${toolCallDelta.function.name} (index: ${toolCallDelta.index})`);
                            
                            emitter.next({
                                type: EventType.TOOL_CALL,
                                name: toolCallDelta.function.name,
                                index: toolCallDelta.index
                            });
                        }
                        
                        // Initialize the tool call accumulator
                        accumulatedToolCalls[toolCallDelta.index] = {
                            id: toolCallDelta.id || `call_${toolCallDelta.index}`,
                            index: toolCallDelta.index,
                            type: toolCallDelta.type || "function",
                            function: {
                                name: toolCallDelta.function?.name || "",
                                arguments: ""
                            },
                            complete: false
                        };
                    }
                    
                    // Update the accumulated tool call with this delta
                    const toolCall = accumulatedToolCalls[toolCallDelta.index];
                    
                    // Only continue if we have a valid tool call record
                    if (toolCall) {
                        // Append function name if present
                        if (toolCallDelta.function?.name && !toolCall.function.name) {
                            toolCall.function.name = toolCallDelta.function.name;
                            console.log(`[${assistantMessageId}] Updated tool call name: ${toolCall.function.name} (index: ${toolCall.index})`);
                        }
                        
                        // Append function arguments if present
                        if (toolCallDelta.function?.arguments) {
                            const prevLength = toolCall.function.arguments.length;
                            toolCall.function.arguments += toolCallDelta.function.arguments;
                            
                            // Log every 100 chars to avoid excessive logging
                            if (Math.floor(prevLength / 100) !== Math.floor(toolCall.function.arguments.length / 100)) {
                                console.log(`[${assistantMessageId}] Tool call arguments for ${toolCall.function.name} now ${toolCall.function.arguments.length} chars`);
                            }
                        }
                    }
                }
            } else if (delta.content) {
                // Process regular content
                metrics.contentChunksReceived += 1;
                streamedContent += delta.content;
                
                // Log every 50 chars to avoid excessive logging
                if (streamedContent.length % 50 === 0) {
                    console.log(`[${assistantMessageId}] Received content: now ${streamedContent.length} chars total`);
                }
                
                // Stream the content to the client
                emitter.next({
                    type: EventType.CHUNK,
                    content: delta.content,
                });
            }
            
            // Check for completion based on finish_reason
            const finishReason = chunk.choices[0]?.finish_reason;
            
            if (finishReason === "tool_calls") {
                // The model has indicated tool calls are ready for execution
                console.log(`[${assistantMessageId}] Stream finished with reason: tool_calls`);
                emitter.next({
                    type: EventType.CONTENT_COMPLETE,
                });
                
                // Mark all tool calls as complete
                Object.values(accumulatedToolCalls).forEach(tool => {
                    tool.complete = true;
                    metrics.toolCallsCompleted += 1;
                });
                
                console.log(`[${assistantMessageId}] Marked ${metrics.toolCallsCompleted} tool calls as complete`);
                
                // Update the message content in the database
                await db.update(messages)
                    .set({ content: streamedContent })
                    .where(eq(messages.id, assistantMessageId));
            }
            else if (finishReason === "stop") {
                console.log(`[${assistantMessageId}] Stream finished with reason: stop`);
                emitter.next({
                    type: EventType.CONTENT_COMPLETE,
                });
                
                // Update the message content in the database
                await db.update(messages)
                    .set({ content: streamedContent })
                    .where(eq(messages.id, assistantMessageId));
                
                // Finalize the stream if there are no tool calls
                if (Object.keys(accumulatedToolCalls).length === 0) {
                    metrics.streamEnd = Date.now();
                    metrics.totalDuration = metrics.streamEnd - metrics.streamStart;
                    
                    console.log(`[${assistantMessageId}] Stream completed in ${metrics.totalDuration}ms with no tool calls`);
                    console.log(`[${assistantMessageId}] Content chunks: ${metrics.contentChunksReceived}, final content length: ${streamedContent.length}`);
                    
                    emitter.next({
                        type: EventType.DONE,
                    });
                    
                    break;
                }
            }
        }
        
        // Process accumulated tool calls
        const completedToolCalls = Object.values(accumulatedToolCalls).filter(tool => tool.complete);
        console.log(`[${assistantMessageId}] Processing ${completedToolCalls.length} accumulated tool calls...`);
        
        // Execute each tool call one by one
        for (const accumulatedToolCall of completedToolCalls) {
            try {
                const toolCallStartTime = Date.now();
                console.log(`[${assistantMessageId}] Executing tool call: ${accumulatedToolCall.function.name} (index: ${accumulatedToolCall.index})`);
                
                // Parse the arguments
                let args;
                try {
                    args = JSON.parse(accumulatedToolCall.function.arguments);
                    console.log(`[${assistantMessageId}] Parsed args for ${accumulatedToolCall.function.name}:`, JSON.stringify(args).substring(0, 100) + (JSON.stringify(args).length > 100 ? '...' : ''));
                } catch (e) {
                    const errorMessage = `Failed to parse tool call arguments: ${accumulatedToolCall.function.arguments.substring(0, 100)}...`;
                    console.error(`[${assistantMessageId}] ${errorMessage}`);
                    throw new Error(`Invalid JSON in tool call arguments: ${e instanceof Error ? e.message : String(e)}`);
                }
                
                // Process based on tool name
                let response: ToolCallResponse;
                
                switch (accumulatedToolCall.function.name) {
                    case "applyJsonPatch":
                        console.log(`[${assistantMessageId}] Applying JSON patch with ${args.operations?.length || 0} operations`);
                        response = await handleApplyJsonPatch(
                            projectId,
                            args.operations,
                            args.explanation
                        );
                        break;
                        
                    case "generateRemotionComponent":
                        console.log(`[${assistantMessageId}] Generating component: ${args.effectDescription?.substring(0, 50)}...`);
                        response = await handleGenerateComponent(
                            projectId,
                            userId,
                            args.effectDescription,
                            assistantMessageId
                        );
                        break;
                        
                    case "planVideoScenes":
                        console.log(`[${assistantMessageId}] Planning video scenes: ${args.scenes?.length || 0} scenes`);
                        response = await handlePlanScenes(
                            projectId,
                            userId,
                            args,
                            assistantMessageId,
                            emitter
                        );
                        break;
                        
                    default:
                        console.warn(`[${assistantMessageId}] Unknown tool call: ${accumulatedToolCall.function.name}`);
                        response = {
                            message: `Error: Unknown tool call "${accumulatedToolCall.function.name}"`
                        };
                }
                
                const toolCallEndTime = Date.now();
                const executionTime = toolCallEndTime - toolCallStartTime;
                
                // Record execution time in metrics
                metrics.toolCallsExecuted += 1;
                metrics.toolCallExecutionTimes[accumulatedToolCall.function.name] = executionTime;
                
                console.log(`[${assistantMessageId}] Tool ${accumulatedToolCall.function.name} executed in ${executionTime}ms`);
                
                // Send tool result message to the client
                emitter.next({
                    type: EventType.TOOL_RESULT,
                    result: response.message,
                    toolName: accumulatedToolCall.function.name,
                    index: accumulatedToolCall.index,
                    patches: response.patches,
                    success: true
                });
                
                // Update the message content to include the tool result
                await db.update(messages)
                    .set({ 
                        content: streamedContent + "\n\n---\n" + response.message 
                    })
                    .where(eq(messages.id, assistantMessageId));
                
                // Update streamedContent to reflect the updated database content
                streamedContent += "\n\n---\n" + response.message;
                
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error(`[${assistantMessageId}] Error processing tool call ${accumulatedToolCall.function.name}:`, errorMessage);
                console.error(`[${assistantMessageId}] Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
                
                // Send error message to the client
                emitter.next({
                    type: EventType.TOOL_RESULT,
                    result: `Error: ${errorMessage}`,
                    toolName: accumulatedToolCall.function.name,
                    index: accumulatedToolCall.index,
                    error: true,
                    success: false
                });
                
                // Update the message content with the error
                await db.update(messages)
                    .set({ 
                        content: streamedContent + `\n\n---\nError processing ${accumulatedToolCall.function.name}: ${errorMessage}` 
                    })
                    .where(eq(messages.id, assistantMessageId));
                
                // Update streamedContent
                streamedContent += `\n\n---\nError processing ${accumulatedToolCall.function.name}: ${errorMessage}`;
            }
        }
        
        // Finalize the stream and log metrics
        metrics.streamEnd = Date.now();
        metrics.totalDuration = metrics.streamEnd - metrics.streamStart;
        
        console.log(`[${assistantMessageId}] Stream processing completed in ${metrics.totalDuration}ms`);
        console.log(`[${assistantMessageId}] Performance metrics:`, {
            contentChunks: metrics.contentChunksReceived,
            toolCallFragments: metrics.toolCallFragmentsReceived,
            toolCallsCompleted: metrics.toolCallsCompleted,
            toolCallsExecuted: metrics.toolCallsExecuted,
            toolCallExecutionTimes: metrics.toolCallExecutionTimes,
            totalDuration: metrics.totalDuration
        });
        
        emitter.next({
            type: EventType.DONE,
        });
    } catch (error) {
        // Handle any errors in the main process
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[${assistantMessageId}] Fatal error in stream processing:`, errorMessage);
        console.error(`[${assistantMessageId}] Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
        
        // Calculate partial metrics even in error case
        if (!metrics.streamEnd) {
            metrics.streamEnd = Date.now();
            metrics.totalDuration = metrics.streamEnd - metrics.streamStart;
            
            console.log(`[${assistantMessageId}] Stream processing failed after ${metrics.totalDuration}ms`);
            console.log(`[${assistantMessageId}] Partial metrics:`, {
                contentChunks: metrics.contentChunksReceived,
                toolCallFragments: metrics.toolCallFragmentsReceived,
                toolCallsCompleted: metrics.toolCallsCompleted,
                toolCallsExecuted: metrics.toolCallsExecuted,
                totalDuration: metrics.totalDuration
            });
        }
        
        // Update the message status to error
        await db.update(messages)
            .set({ 
                content: "Error processing your message. Please try again.",
                status: "error"
            })
            .where(eq(messages.id, assistantMessageId));
        
        // Send structured error to the client
        emitter.next({
            type: EventType.ERROR,
            error: errorMessage,
            errorDetail: error instanceof Error ? error.stack : undefined,
            phase: 'stream_processing',
            timestamp: Date.now()
        });
        
        // Finalize the stream
        emitter.next({
            type: EventType.DONE,
        });
    }
}

/**
 * Handles the applyJsonPatch tool call
 * 
 * @param projectId - ID of the project
 * @param operations - JSON patch operations to apply
 * @param explanation - Optional explanation
 * @returns Response message and patches
 */
async function handleApplyJsonPatch(
    projectId: string,
    operations: Operation[],
    explanation?: string
): Promise<ToolCallResponse> {
    if (!operations || !Array.isArray(operations) || operations.length === 0) {
        throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid or empty patch operations",
        });
    }
    
    console.log(`Applying ${operations.length} JSON patch operations to project ${projectId}`);
    
    // Insert the patch into the database
    // Operations are type-safe as they match the JsonPatch type expected by the database
    await db.insert(patches).values({
        projectId,
        patch: operations as JsonPatch,
    });
    
    return {
        message: explanation || `Applied ${operations.length} patch operations to your video.`,
        patches: operations
    };
}

/**
 * Handles the generateRemotionComponent tool call
 * 
 * @param projectId - ID of the project
 * @param userId - ID of the user
 * @param effectDescription - Description of the desired effect
 * @param assistantMessageId - ID of the assistant message
 * @returns Response message
 */
async function handleGenerateComponent(
    projectId: string,
    userId: string,
    effectDescription: string,
    assistantMessageId: string
): Promise<ToolCallResponse> {
    if (!effectDescription || typeof effectDescription !== "string") {
        throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Missing or invalid effect description",
        });
    }
    
    console.log(`Generating component for project ${projectId} with description: ${effectDescription}`);
    
    // Call the component generator
    const startTime = Date.now();
    const { jobId, effect } = await generateComponent(
        projectId,
        effectDescription,
        assistantMessageId,
        6, // Default 6 seconds
        30, // Default 30fps
        undefined, // No scene ID in this context
        userId
    );
    const duration = Date.now() - startTime;
    
    console.log(`Generated component ${effect} (jobId: ${jobId}) in ${duration}ms`);
    
    return {
        message: `I'm generating a custom "${effect}" component based on your description. This might take a minute. You'll be able to add it to your timeline once it's ready.`
    };
}

/**
 * Handles the planVideoScenes tool call
 * 
 * @param projectId - ID of the project
 * @param userId - ID of the user
 * @param scenePlan - The scene plan object
 * @param assistantMessageId - ID of the assistant message
 * @param emitter - Event emitter for streaming updates
 * @returns Response message and patches
 */
async function handlePlanScenes(
    projectId: string,
    userId: string,
    scenePlan: any,
    assistantMessageId: string,
    emitter: Subject<any>
): Promise<ToolCallResponse> {
    if (!scenePlan || !scenePlan.scenes || !Array.isArray(scenePlan.scenes)) {
        throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid scene plan format",
        });
    }
    
    console.log(`Planning video with ${scenePlan.scenes.length} scenes for project ${projectId}`);
    
    // Additional validation logging for scene plan
    try {
        // Validate scene structure
        for (let i = 0; i < scenePlan.scenes.length; i++) {
            const scene = scenePlan.scenes[i];
            if (!scene.id) {
                console.warn(`[${assistantMessageId}] Scene at index ${i} is missing an ID`);
            }
            if (!scene.description) {
                console.warn(`[${assistantMessageId}] Scene ${scene.id || i} is missing a description`);
            }
            if (typeof scene.durationInSeconds !== 'number') {
                console.warn(`[${assistantMessageId}] Scene ${scene.id || i} has invalid duration: ${scene.durationInSeconds}`);
            }
            if (!scene.effectType) {
                console.warn(`[${assistantMessageId}] Scene ${scene.id || i} is missing an effect type`);
            }
        }
    } catch (validationError) {
        console.error(`[${assistantMessageId}] Error validating scene plan:`, validationError);
    }
    
    // Process the scene plan using the scene planner service
    const startTime = Date.now();
    const result = await handleScenePlan(
        projectId,
        userId,
        scenePlan,
        assistantMessageId,
        db,
        emitter
    );
    const duration = Date.now() - startTime;
    
    console.log(`[${assistantMessageId}] Scene planning completed in ${duration}ms with ${result.patches?.length || 0} patches`);
    
    return result;
}

/**
 * Handles reconnection for a client that lost connection during streaming
 * 
 * @param clientId - Identifier for the client
 * @param messageId - ID of the message being streamed
 * @param lastEventId - Last event ID the client received
 * @param emitter - Event emitter to send missed events to
 * @returns True if reconnection was successful, false otherwise
 */
export async function handleClientReconnection(
    clientId: string,
    messageId: string,
    lastEventId: string | undefined,
    emitter: Subject<any>
): Promise<boolean> {
    // Get missed events from the buffer
    const reconnectionResult = eventBufferService.handleReconnection(clientId, lastEventId);
    
    if (!reconnectionResult) {
        console.log(`[${messageId}] Client ${clientId} reconnection failed, no buffer available or window expired`);
        return false;
    }
    
    console.log(`[${messageId}] Client ${clientId} reconnected, replaying ${reconnectionResult.events.length} missed events`);
    
    // First emit reconnection event
    emitter.next({
        ...reconnectionResult.reconnectEvent,
        eventId: randomUUID()
    });
    
    // Replay all missed events
    for (const event of reconnectionResult.events) {
        // Add a small delay between events to prevent overwhelming the client
        await new Promise(resolve => setTimeout(resolve, 5));
        
        // Emit the event with its original ID
        emitter.next({
            ...event.event,
            eventId: event.id
        });
    }
    
    // Check if we need to resume processing from a saved state
    const toolCallState = eventBufferService.getToolCallState(messageId);
    
    if (toolCallState && toolCallState.status === 'executing') {
        console.log(`[${messageId}] Resuming tool call execution after reconnection`);
        
        // We need to resume the processing using the saved state
        // This will happen in the router, not here
        return true;
    }
    
    return true;
} 