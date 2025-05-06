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
import { type StreamEventType, StreamEventType as EventType } from "~/types/chat";
import { eq, desc } from "drizzle-orm";

/**
 * Structure of a tool call response
 */
interface ToolCallResponse {
    message: string;
    patches?: Operation[];
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
    }>
): Promise<void> {
    try {
        // Fetch conversation context limited to MAX_CONTEXT_MESSAGES
        // Each pair is a user message and its assistant response
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
        
        // Create the streaming request
        const stream = await openaiClient.chat.completions.create({
            model: "gpt-4o-mini", // or other OpenAI model that supports function calling
            messages: apiMessages,
            stream: true,
            tools: CHAT_TOOLS,
        });
        
        // Set up variables for tracking the stream state
        let streamedContent = "";
        let toolCalls: any[] = [];
        let inToolCallJson = false;
        let toolCallBuffer = "";
        let toolCallIndex = -1;
        
        // Process the stream
        for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta;
            
            // Skip if no delta
            if (!delta) continue;
            
            // Process a finished tool call
            if (delta.tool_calls && delta.tool_calls.length > 0) {
                // Check if there's a new tool call being created
                for (const toolCall of delta.tool_calls) {
                    if (toolCall.index !== undefined && toolCall.index > toolCallIndex) {
                        toolCallIndex = toolCall.index;
                        inToolCallJson = true;
                        
                        // Emit the start of a tool call
                        emitter.next({
                            type: EventType.TOOL_CALL,
                            name: toolCall.function?.name || "unknown",
                            index: toolCallIndex
                        });
                        
                        // Reset the buffer for this new tool call
                        toolCallBuffer = "";
                    }
                    
                    // Add to the function arguments if present
                    if (toolCall.function?.arguments) {
                        toolCallBuffer += toolCall.function.arguments;
                    }
                    
                    // Try to parse complete JSON when we get a closing brace
                    if (toolCallBuffer.includes("}") && toolCall.function?.name) {
                        try {
                            const args = JSON.parse(toolCallBuffer);
                            
                            // Add to our tracked tool calls
                            toolCalls.push({
                                name: toolCall.function.name,
                                args,
                                index: toolCallIndex
                            });
                            
                            // Reset for next potential tool call
                            inToolCallJson = false;
                            
                        } catch (e) {
                            // Incomplete JSON, continue collecting
                        }
                    }
                }
            } else if (delta.content) {
                // Process regular content
                streamedContent += delta.content;
                
                // Stream the content to the client
                emitter.next({
                    type: EventType.CHUNK,
                    content: delta.content,
                });
            }
            
            // Handle content completion
            if (chunk.choices[0]?.finish_reason === "tool_calls") {
                emitter.next({
                    type: EventType.CONTENT_COMPLETE,
                });
                
                // Update the message content in the database
                await db.update(messages)
                    .set({ content: streamedContent })
                    .where(eq(messages.id, assistantMessageId));
            }
            else if (chunk.choices[0]?.finish_reason === "stop") {
                emitter.next({
                    type: EventType.CONTENT_COMPLETE,
                });
                
                // Update the message content in the database
                await db.update(messages)
                    .set({ content: streamedContent })
                    .where(eq(messages.id, assistantMessageId));
                
                // Finalize the stream
                emitter.next({
                    type: EventType.DONE,
                });
                
                break;
            }
        }
        
        // Process tool calls
        console.log(`Processing ${toolCalls.length} tool calls...`);
        for (const toolCall of toolCalls) {
            try {
                // Process based on tool name
                let response: ToolCallResponse;
                
                switch (toolCall.name) {
                    case "applyJsonPatch":
                        response = await handleApplyJsonPatch(
                            projectId,
                            toolCall.args.operations,
                            toolCall.args.explanation
                        );
                        break;
                        
                    case "generateRemotionComponent":
                        response = await handleGenerateComponent(
                            projectId,
                            userId,
                            toolCall.args.effectDescription,
                            assistantMessageId
                        );
                        break;
                        
                    case "planVideoScenes":
                        response = await handlePlanScenes(
                            projectId,
                            userId,
                            toolCall.args,
                            assistantMessageId,
                            emitter
                        );
                        break;
                        
                    default:
                        response = {
                            message: `Error: Unknown tool call "${toolCall.name}"`
                        };
                }
                
                // Send tool result message to the client
                emitter.next({
                    type: EventType.TOOL_RESULT,
                    result: response.message,
                    toolName: toolCall.name,
                    index: toolCall.index,
                    patches: response.patches
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
                console.error(`Error processing tool call ${toolCall.name}:`, error);
                
                // Send error message to the client
                const errorMessage = error instanceof Error ? error.message : String(error);
                emitter.next({
                    type: EventType.TOOL_RESULT,
                    result: `Error: ${errorMessage}`,
                    toolName: toolCall.name,
                    index: toolCall.index,
                    error: true
                });
                
                // Update the message content with the error
                await db.update(messages)
                    .set({ 
                        content: streamedContent + `\n\n---\nError processing ${toolCall.name}: ${errorMessage}` 
                    })
                    .where(eq(messages.id, assistantMessageId));
                
                // Update streamedContent
                streamedContent += `\n\n---\nError processing ${toolCall.name}: ${errorMessage}`;
            }
        }
        
        // Finalize the stream if not already done
        emitter.next({
            type: EventType.DONE,
        });
    } catch (error) {
        // Handle any errors in the main process
        console.error("Error processing user message:", error);
        
        // Update the message status to error
        await db.update(messages)
            .set({ 
                content: "Error processing your message. Please try again.",
                status: "error"
            })
            .where(eq(messages.id, assistantMessageId));
        
        // Send error to the client
        const errorMessage = error instanceof Error ? error.message : String(error);
        emitter.next({
            type: EventType.ERROR,
            error: errorMessage,
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
    const { jobId, effect } = await generateComponent(
        projectId,
        effectDescription,
        assistantMessageId,
        6, // Default 6 seconds
        30, // Default 30fps
        undefined, // No scene ID in this context
        userId
    );
    
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
    
    // Process the scene plan using the scene planner service
    const result = await handleScenePlan(
        projectId,
        userId,
        scenePlan,
        assistantMessageId,
        db,
        emitter
    );
    
    return result;
} 