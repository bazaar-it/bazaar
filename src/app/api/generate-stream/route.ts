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
      // 1. Generate a temporary message ID (not saved to DB)
      const assistantMessageId = randomUUID();
      
      // 2. Send temporary "Generating code..." message to client only
      // This is NOT saved to the database - it's just for immediate UI feedback
      await writer.write(encoder.encode(formatSSE({
        type: 'message',
        id: assistantMessageId,
        content: "Generating code...",
        status: 'pending',
        isTemporary: true  // Flag to indicate this is not a real message
      })));

      // 3. The actual message will be created by the mutation
      // when it has the real content to save

    } catch (error) {
      console.error('[SSE] Error:', error);
      
      // Send error to client
      await writer.write(encoder.encode(formatSSE({
        type: 'error',
        error: 'Failed to process request'
      })));
    } finally {
      await writer.close();
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