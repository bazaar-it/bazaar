// src/server/services/chatOrchestration.service.ts
import { type OpenAI } from "openai";
import { TRPCError } from "@trpc/server";
import { type Subject } from "rxjs";
import { type Operation } from "fast-json-patch";
import { db } from "~/server/db";
import { messages } from "~/server/db/schema";
import { SYSTEM_PROMPT, MAX_CONTEXT_MESSAGES } from "~/server/constants/chat";
import { type InputProps } from "~/types/input-props";
import { type StreamEventType, StreamEventType as EventType, type ToolCallAccumulator } from "~/types/chat";
import { eq, desc } from "drizzle-orm";
import { eventBufferService } from "~/server/services/eventBuffer.service";
import { LLMService } from "./llm/LLMService";
import { toolExecutionService } from "./toolExecution.service";
import { randomUUID } from "crypto";
import { chatLogger, logChatStream, logChatTool } from "~/lib/logger";

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
    
    chatLogger.info(assistantMessageId, `Starting stream processing for project ${projectId}`, {
        projectId,
        clientId,
        userMessageId
    });
    
    // If we should resume from a saved state, get it from the buffer
    if (shouldResume && clientId) {
        chatLogger.info(assistantMessageId, `Attempting to resume from saved state`, {
            clientId
        });
        const savedState = eventBufferService.getToolCallState(assistantMessageId);
        if (savedState) {
            chatLogger.info(assistantMessageId, `Found saved state`, {
                status: savedState.status,
                executedCallsCount: savedState.executedCalls.length
            });
            // We could add state resumption logic here, but for now just logging
        }
    }
    
    try {
        // Fetch conversation context limited to MAX_CONTEXT_MESSAGES
        const conversationContext = await fetchConversationContext(projectId, userMessageId, assistantMessageId);
        
        // Create the API messages with context
        const apiMessages = buildApiMessages(conversationContext, content, projectProps);
        
        chatLogger.info(assistantMessageId, `Creating stream`, {
            contextMessageCount: apiMessages.length
        });
        
        // Create the LLM service and streaming request
        const llm = new LLMService(openaiClient);
        const stream = await llm.streamChat(apiMessages);
        emitter.next({ type: EventType.PROGRESS, message: "llm_stream_started", stage: "llm" });
        
        logChatStream(chatLogger, assistantMessageId, `Stream created`, {
            duration: Date.now() - metrics.streamStart
        });
        
        // Set up variables for tracking the stream state
        let streamedContent = "";
        
        // Initialize an accumulator for tool calls
        const accumulatedToolCalls: Record<number, ToolCallAccumulator> = {};
        
        // Process the stream
        logChatStream(chatLogger, assistantMessageId, `Starting to process stream chunks`);
        for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta;
            
            // Skip if no delta
            if (!delta) continue;
            
            // Process tool call deltas in a structured way
            if (delta.tool_calls) {
                metrics.toolCallFragmentsReceived += 1;
                
                for (const toolCallDelta of delta.tool_calls) {
                    // Skip if no index
                    if (toolCallDelta.index === undefined) continue;
                    
                    // Process tool call delta
                    processToolCallDelta(
                        toolCallDelta, 
                        accumulatedToolCalls, 
                        assistantMessageId, 
                        emitter
                    );
                }
            } else if (delta.content) {
                // Process regular content
                metrics.contentChunksReceived += 1;
                streamedContent += delta.content;
                
                // Log every 50 chars to avoid excessive logging
                if (streamedContent.length % 50 === 0) {
                    logChatStream(chatLogger, assistantMessageId, `Received content`, {
                        contentLength: streamedContent.length
                    });
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
                await handleToolCallsFinishReason(
                    accumulatedToolCalls, 
                    streamedContent, 
                    assistantMessageId, 
                    metrics,
                    emitter
                );
            }
            else if (finishReason === "stop") {
                // The model has completed its response
                await handleStopFinishReason(
                    accumulatedToolCalls, 
                    streamedContent, 
                    assistantMessageId, 
                    metrics,
                    emitter
                );
                
                // If there are no tool calls, we're done
                if (Object.keys(accumulatedToolCalls).length === 0) {
                    finalizeMetrics(metrics);
                    emitter.next({ type: EventType.DONE });
                    break;
                }
            }
        }
        
        // Process accumulated tool calls if any remain
        await executeToolCalls(
            accumulatedToolCalls,
            projectId,
            userId,
            assistantMessageId,
            streamedContent,
            metrics,
            emitter
        );
        
        // Finalize the stream
        finalizeMetrics(metrics);
        emitter.next({ type: EventType.PROGRESS, message: "stream_complete", stage: "done" });
        emitter.next({ type: EventType.DONE });
        
    } catch (error) {
        await handleProcessingError(error, assistantMessageId, metrics, emitter);
    }
}

/**
 * Fetches the conversation context from the database
 */
async function fetchConversationContext(projectId: string, userMessageId: string, assistantMessageId: string) {
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
    chatLogger.info(assistantMessageId, `Fetched conversation context`, {
        messageCount: conversationContext.length,
        duration: fetchEndTime - fetchStartTime
    });
    
    return conversationContext;
}

/**
 * Builds the API messages array with the conversation context
 */
function buildApiMessages(
    conversationContext: any[], 
    content: string, 
    projectProps: InputProps
): OpenAI.Chat.ChatCompletionMessageParam[] {
    // Create the OpenAI API request with system prompt and context
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
    
    return apiMessages;
}

/**
 * Processes a tool call delta from the LLM
 */
function processToolCallDelta(
    toolCallDelta: any, 
    accumulatedToolCalls: Record<number, ToolCallAccumulator>,
    assistantMessageId: string,
    emitter: Subject<any>
) {
    // Create the tool call record if it doesn't exist
    if (!accumulatedToolCalls[toolCallDelta.index]) {
        // This is a new tool call, emit the start event
        if (toolCallDelta.function?.name) {
            logChatTool(chatLogger, assistantMessageId, toolCallDelta.function.name, `New tool call detected`, {
                index: toolCallDelta.index
            });
            
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
            logChatTool(chatLogger, assistantMessageId, toolCall.function.name, `Updated tool call name`, {
                index: toolCall.index
            });
        }
        
        // Append function arguments if present
        if (toolCallDelta.function?.arguments) {
            const prevLength = toolCall.function.arguments.length;
            toolCall.function.arguments += toolCallDelta.function.arguments;
            
            // Log every 100 chars to avoid excessive logging
            if (Math.floor(prevLength / 100) !== Math.floor(toolCall.function.arguments.length / 100)) {
                logChatTool(chatLogger, assistantMessageId, toolCall.function.name, `Tool call arguments for ${toolCall.function.name} now ${toolCall.function.arguments.length} chars`);
            }
        }
    }
}

/**
 * Handles the tool_calls finish reason from the LLM
 */
async function handleToolCallsFinishReason(
    accumulatedToolCalls: Record<number, ToolCallAccumulator>,
    streamedContent: string,
    assistantMessageId: string,
    metrics: StreamTimingMetrics,
    emitter: Subject<any>
) {
    logChatStream(chatLogger, assistantMessageId, `Stream finished with reason: tool_calls`);
    emitter.next({ type: EventType.CONTENT_COMPLETE });
    
    // Mark all tool calls as complete
    Object.values(accumulatedToolCalls).forEach(tool => {
        tool.complete = true;
        metrics.toolCallsCompleted += 1;
    });
    
    chatLogger.info(assistantMessageId, `Marked tool calls as complete`, {
        toolCallsCompleted: metrics.toolCallsCompleted
    });
    
    // Update the message content in the database
    await db.update(messages)
        .set({ content: streamedContent })
        .where(eq(messages.id, assistantMessageId));
}

/**
 * Handles the stop finish reason from the LLM
 */
async function handleStopFinishReason(
    accumulatedToolCalls: Record<number, ToolCallAccumulator>,
    streamedContent: string,
    assistantMessageId: string,
    metrics: StreamTimingMetrics,
    emitter: Subject<any>
) {
    logChatStream(chatLogger, assistantMessageId, `Stream finished with reason: stop`);
    emitter.next({ type: EventType.CONTENT_COMPLETE });
    
    // Update the message content in the database
    await db.update(messages)
        .set({ content: streamedContent })
        .where(eq(messages.id, assistantMessageId));
}

/**
 * Executes accumulated tool calls
 */
async function executeToolCalls(
    accumulatedToolCalls: Record<number, ToolCallAccumulator>,
    projectId: string,
    userId: string,
    assistantMessageId: string,
    streamedContent: string,
    metrics: StreamTimingMetrics,
    emitter: Subject<any>
) {
    const completedToolCalls = Object.values(accumulatedToolCalls).filter(tool => tool.complete);
    chatLogger.info(assistantMessageId, `Processing accumulated tool calls`, {
        toolCallsCount: completedToolCalls.length
    });
    
    // Execute each tool call one by one
    for (const toolCall of completedToolCalls) {
        try {
            const toolCallStartTime = Date.now();
            const toolName = toolCall.function.name;
            
            logChatTool(chatLogger, assistantMessageId, toolName, `Executing tool call`, {
                index: toolCall.index
            });
            
            // Parse the arguments
            let args;
            try {
                // Use the LLMService to parse arguments
                const llmService = new LLMService(null as any); // Temporary instance just for parsing
                args = llmService.parseToolCallArguments(toolCall, assistantMessageId);
            } catch (e) {
                const errorMessage = `Failed to parse tool call arguments: ${toolCall.function.arguments.substring(0, 100)}...`;
                chatLogger.error(assistantMessageId, errorMessage);
                throw new Error(`Invalid JSON in tool call arguments: ${e instanceof Error ? e.message : String(e)}`);
            }
            
            // Execute the tool using the ToolExecutionService
            const response = await toolExecutionService.executeTool(
                toolName,
                projectId,
                userId,
                args,
                assistantMessageId,
                emitter
            );
            
            const toolCallEndTime = Date.now();
            const executionTime = toolCallEndTime - toolCallStartTime;
            
            // Record execution time in metrics
            metrics.toolCallsExecuted += 1;
            metrics.toolCallExecutionTimes[toolName] = executionTime;
            
            logChatTool(chatLogger, assistantMessageId, toolName, `Executed in`, {
                duration: executionTime
            });
            
            // Send tool result message to the client
            emitter.next({
                type: EventType.TOOL_RESULT,
                result: response.message,
                toolName,
                index: toolCall.index,
                patches: response.patches,
                success: true
            });
            emitter.next({ 
                type: EventType.PROGRESS, 
                message: `tool_${toolName}_done`, 
                stage: "tool" 
            });
            
            // Update the message content to include the tool result
            const updatedContent = streamedContent + "\n\n---\n" + response.message;
            await db.update(messages)
                .set({ content: updatedContent })
                .where(eq(messages.id, assistantMessageId));
            
            // Update streamedContent to reflect the updated database content
            streamedContent = updatedContent;
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            chatLogger.error(assistantMessageId, `Error processing tool call`, {
                toolName: toolCall.function.name,
                index: toolCall.index,
                error: errorMessage,
                stack: error instanceof Error ? error.stack : undefined
            });
            
            // Send error message to the client
            emitter.next({
                type: EventType.TOOL_RESULT,
                result: `Error: ${errorMessage}`,
                toolName: toolCall.function.name,
                index: toolCall.index,
                error: true,
                success: false
            });
            
            // Update the message content with the error
            const updatedContent = streamedContent + `\n\n---\nError processing ${toolCall.function.name}: ${errorMessage}`;
            await db.update(messages)
                .set({ content: updatedContent })
                .where(eq(messages.id, assistantMessageId));
            
            // Update streamedContent
            streamedContent = updatedContent;
        }
    }
}

/**
 * Finalizes metrics for logging
 */
function finalizeMetrics(metrics: StreamTimingMetrics) {
    metrics.streamEnd = Date.now();
    metrics.totalDuration = metrics.streamEnd - metrics.streamStart;
}

/**
 * Handles errors during message processing
 */
async function handleProcessingError(
    error: unknown, 
    assistantMessageId: string, 
    metrics: StreamTimingMetrics,
    emitter: Subject<any>
) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    chatLogger.error(assistantMessageId, `Fatal error in stream processing`, {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
    });
    
    // Calculate partial metrics even in error case
    if (!metrics.streamEnd) {
        finalizeMetrics(metrics);
        logChatStream(chatLogger, assistantMessageId, `Stream processing failed after`, {
            duration: metrics.totalDuration
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

/**
 * Handles client reconnection
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
        chatLogger.error(messageId, `Client ${clientId} reconnection failed, no buffer available or window expired`);
        return false;
    }
    
    chatLogger.info(messageId, `Client ${clientId} reconnected, replaying ${reconnectionResult.events.length} missed events`);
    
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
        chatLogger.info(messageId, `Resuming tool call execution after reconnection`);
        
        // We need to resume the processing using the saved state
        // This will happen in the router, not here
        return true;
    }
    
    return true;
} 