import { NextRequest } from "next/server";
import { taskManager } from "~/server/services/a2a/taskManager.service";
import type { SSEEvent } from "~/types/a2a";
import { a2aLogger } from "~/lib/logger";
import { messageBus } from "~/server/agents/message-bus";
import type { AgentMessage } from "~/server/agents/base-agent";
import crypto from "crypto";

/**
 * Server-Sent Events (SSE) endpoint for task status updates
 * 
 * Implements the Google A2A streaming protocol for real-time task updates
 * @see https://github.com/google/A2A/blob/main/docs/tasks.md#streaming
 */
export async function GET(
  request: NextRequest,
  // This is the standard way to access route params in App Router
  context: { params: { taskId: string } }
) {
  try {
    // CRITICAL: We must await the params to satisfy Next.js App Router requirements
    const { taskId } = await Promise.resolve(context.params);
    a2aLogger.sseSubscription(taskId, "SSE connection requested.");
    
    if (!taskId) {
      a2aLogger.warn("system", "SSE connection denied: Task ID is required.");
      return new Response('Task ID is required', { status: 400 });
    }
    
    // Validate task existence
    const task = await taskManager.getTaskStatus(taskId);
    if (task.state === 'unknown') {
      a2aLogger.warn(taskId, "SSE connection denied: Task not found.");
      return new Response('Task not found', { status: 404 });
    }
    
    a2aLogger.sseSubscription(taskId, `SSE stream starting. Initial task state: ${task.state}`);
    // Set up SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Helper to send SSE events with proper SSE protocol formatting
        function sendEvent(eventType: string, eventData: any) {
          const eventId = crypto.randomUUID();
          const formattedData = JSON.stringify(eventData);
          
          a2aLogger.sseEventSent(taskId, eventType, eventData, { eventId });
          // Format according to SSE spec: id, event, data fields followed by double newline
          controller.enqueue(encoder.encode(`id: ${eventId}\nevent: ${eventType}\ndata: ${formattedData}\n\n`));
        }
        
        // Send initial state event, include agentName if available
        sendEvent('task_status_update', {
          task_id: taskId,
          state: task.state,
          message: task.message,
          agentName: task.message?.metadata?.agentName
        });
        
        // Send artifact info if available
        if (task.artifacts && task.artifacts.length > 0) {
          for (const artifact of task.artifacts) {
            sendEvent('task_artifact_update', {
              task_id: taskId,
              artifact
            });
          }
        }
        
        // Register for task updates
        const taskCleanup = taskManager.subscribeToTaskUpdates(taskId, (update) => {
          if (update.type === 'status') {
            sendEvent('task_status_update', {
              task_id: taskId,
              state: update.state!,
              message: update.message,
              agentName: update.message?.metadata?.agentName
            });
          } else if (update.type === 'artifact') {
            sendEvent('task_artifact_update', {
              task_id: taskId,
              artifact: update.artifact!
            });
          }
        });
        
        // Register for agent message bus events related to this task
        // Set up a message bus listener and filter for task-related messages
        
        // Common agent names in the A2A system
        const agentNames = [
          'CoordinatorAgent',
          'ScenePlannerAgent',
          'ADBAgent',
          'BuilderAgent',
          'ErrorFixerAgent',
          'R2StorageAgent'
        ];
        
        // Keep track of message subscribers for cleanup
        const messageBusCleanups: Array<() => void> = [];
        
        // For each agent, subscribe to messages
        for (const agentName of agentNames) {
          const messageBusCleanup = messageBus.subscribeToAgentMessages(agentName, async (message: AgentMessage) => {
            // Only relay messages related to this specific task
            const taskIdInMessage = 
              (message.payload as any)?.taskId || 
              (message.payload as any)?.componentJobId;
              
            if (taskIdInMessage === taskId) {
              // Send the agent communication event to the client
              sendEvent('agent_message', {
                task_id: taskId,
                message_id: message.id,
                from: message.sender,
                to: message.recipient,
                type: message.type,
                timestamp: new Date().toISOString(),
                payload: message.payload
              });
            }
          });
          
          messageBusCleanups.push(messageBusCleanup);
        }
        
        // Close stream when appropriate (e.g., task reaches terminal state)
        const intervalId = setInterval(async () => {
          const currentStatus = await taskManager.getTaskStatus(taskId);
          if (['completed', 'failed', 'canceled', 'unknown'].includes(currentStatus.state)) {
            clearInterval(intervalId);
            
            // Clean up all subscriptions
            taskCleanup();
            messageBusCleanups.forEach(cleanupFn => cleanupFn());
            
            controller.close();
            a2aLogger.sseSubscription(taskId, `SSE stream closed due to terminal task state: ${currentStatus.state}.`);
          }
        }, 5000);
        
        // Handle client disconnection
        request.signal.addEventListener('abort', () => {
          clearInterval(intervalId);
          
          // Clean up all subscriptions
          taskCleanup();
          messageBusCleanups.forEach(cleanupFn => cleanupFn());
          
          controller.close();
          a2aLogger.sseSubscription(taskId, "SSE stream aborted by client.");
        });
      }
    });
    
    // Return the stream with correct headers
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no' // Prevents proxy buffering
      }
    });
  } catch (error: any) {
    // Try to get taskId if possible, even in error, for better logging context
    let taskIdForErrorLog = "system";
    try {
      const resolvedParams = await Promise.resolve(context?.params);
      if (resolvedParams?.taskId) {
        taskIdForErrorLog = resolvedParams.taskId;
      }
    } catch (_) {
      // Ignore if context or params are not available
    }
    a2aLogger.error(taskIdForErrorLog, `SSE stream error: ${error.message}`, error, { requestUrl: request.url });
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}