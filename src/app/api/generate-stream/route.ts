import { NextRequest } from 'next/server';
import { auth } from '~/server/auth';
import { db } from '~/server/db';
import { messages } from '~/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { messageService } from '~/server/services/data/message.service';

// SSE helper to format messages
function formatSSE(data: any): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function GET(request: NextRequest) {
  // Auth check
  const session = await auth();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }
  const userId = session.user.id;

  // Parse query params
  const searchParams = request.nextUrl.searchParams;
  const projectId = searchParams.get('projectId');
  const userMessage = searchParams.get('message');
  const imageUrls = searchParams.get('imageUrls');

  if (!projectId || !userMessage) {
    return new Response('Missing required parameters', { status: 400 });
  }

  // Create a TransformStream for SSE
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Start the async work
  (async () => {
    try {
      // 1. Create the assistant message in the database with pending status
      const assistantMessage = await messageService.createMessage({
        projectId,
        content: "Generating code...",
        role: "assistant",
        status: "pending",
      });

      if (!assistantMessage) {
        throw new Error('Failed to create assistant message');
      }
      
      // 2. Send the message to client with the real database ID
      await writer.write(encoder.encode(formatSSE({
        type: 'message',
        id: assistantMessage.id,
        content: assistantMessage.content,
        status: assistantMessage.status,
      })));

      // 3. Keep connection open - don't send complete yet
      // The mutation will update this message with the real content
      
      // 4. Send complete event after a small delay
      await new Promise(resolve => setTimeout(resolve, 100));
      await writer.write(encoder.encode(formatSSE({
        type: 'complete',
        id: assistantMessage.id,
      })));

    } catch (error) {
      console.error('[SSE] Error:', error);
      
      try {
        // Send error to client
        await writer.write(encoder.encode(formatSSE({
          type: 'error',
          error: 'Failed to process request'
        })));
      } catch (writeError) {
        console.error('[SSE] Failed to write error:', writeError);
      }
    } finally {
      // Small delay to ensure the last message is sent
      await new Promise(resolve => setTimeout(resolve, 100));
      
      try {
        await writer.close();
      } catch (closeError) {
        // Stream might already be closed
        console.log('[SSE] Stream already closed');
      }
    }
  })();

  // Return SSE response
  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}