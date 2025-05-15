import { NextRequest } from "next/server";
import { taskManager } from "~/server/services/a2a/taskManager.service";
import type { SSEEvent } from "~/types/a2a";

/**
 * Server-Sent Events (SSE) endpoint for task status updates
 * 
 * Implements the Google A2A streaming protocol for real-time task updates
 * @see https://github.com/google/A2A/blob/main/docs/tasks.md#streaming
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { taskId: string }}
) {
  const taskId = params.taskId;
  
  // Validate task existence
  const task = await taskManager.getTaskStatus(taskId);
  if (task.state === 'unknown') {
    return new Response('Task not found', { status: 404 });
  }
  
  // Set up SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Helper to send SSE events
      function sendEvent(event: SSEEvent) {
        const data = JSON.stringify(event);
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      }
      
      // Initial state
      sendEvent({
        type: 'task_status_update',
        data: {
          task_id: taskId,
          state: task.state,
          message: task.message
        }
      });
      
      // Send artifact info if available
      if (task.artifacts && task.artifacts.length > 0) {
        for (const artifact of task.artifacts) {
          sendEvent({
            type: 'task_artifact_update',
            data: {
              task_id: taskId,
              artifact
            }
          });
        }
      }
      
      // Register for updates
      const cleanup = taskManager.subscribeToTaskUpdates(taskId, (update) => {
        if (update.type === 'status') {
          sendEvent({
            type: 'task_status_update',
            data: {
              task_id: taskId,
              state: update.state!,
              message: update.message
            }
          });
        } else if (update.type === 'artifact') {
          sendEvent({
            type: 'task_artifact_update',
            data: {
              task_id: taskId,
              artifact: update.artifact!
            }
          });
        }
      });
      
      // Close stream when appropriate (e.g., task reaches terminal state)
      const intervalId = setInterval(async () => {
        const currentStatus = await taskManager.getTaskStatus(taskId);
        if (['completed', 'failed', 'canceled', 'unknown'].includes(currentStatus.state)) {
          clearInterval(intervalId);
          cleanup();
          controller.close();
        }
      }, 5000);
      
      // Handle client disconnection
      req.signal.addEventListener('abort', () => {
        clearInterval(intervalId);
        cleanup();
        controller.close();
      });
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
} 