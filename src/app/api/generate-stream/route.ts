import { NextRequest } from 'next/server';
import { auth } from '~/server/auth';
import { db } from '~/server/db';
import { messages, projects } from '~/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { messageService } from '~/server/services/data/message.service';
import { generateTitle } from '~/server/services/ai/titleGenerator.service';

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
  const videoUrls = searchParams.get('videoUrls');

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
      // 1. Create the user message FIRST to ensure correct sequence order
      const parsedImageUrls = imageUrls ? JSON.parse(imageUrls) : undefined;
      const parsedVideoUrls = videoUrls ? JSON.parse(videoUrls) : undefined;
      
      // For now, store video URLs in imageUrls field (until we add a separate videoUrls column)
      const allMediaUrls = [...(parsedImageUrls || []), ...(parsedVideoUrls || [])];
      
      const userMsg = await messageService.createMessage({
        projectId,
        content: userMessage,
        role: "user",
        imageUrls: allMediaUrls.length > 0 ? allMediaUrls : undefined,
      });

      if (!userMsg) {
        throw new Error('Failed to create user message');
      }

      // 2. Check if this is the first user message and generate title if needed
      try {
        const existingMessages = await db.query.messages.findMany({
          where: eq(messages.projectId, projectId),
          orderBy: [desc(messages.sequence)],
          limit: 5, // Check a few messages to be sure
        });

        // Check if this is the first user message (only this message exists, or only welcome/assistant messages before)
        const userMessages = existingMessages.filter(msg => msg.role === 'user');
        const isFirstUserMessage = userMessages.length === 1 && userMessages[0]?.id === userMsg.id;

        if (isFirstUserMessage) {
          console.log('[SSE] First user message detected, generating title...');
          
          // Generate title based on the user's first message
          const titleResult = await generateTitle({
            prompt: userMessage,
            contextId: projectId,
          });

          let finalTitle = titleResult.title;
          
          // ✅ NEW: If title generation failed (returned "Untitled Video"), use proper numbering
          if (finalTitle === "Untitled Video") {
            // Get all user's projects with "Untitled Video" pattern to find next number
            const userProjects = await db.query.projects.findMany({
              columns: { title: true },
              where: eq(projects.userId, userId), // Use the authenticated userId
            });
            
            // Find the highest number used in "Untitled Video X" titles
            let highestNumber = 0;
            const untitledProjects = userProjects.filter(p => p.title.startsWith('Untitled Video'));
            
            for (const project of untitledProjects) {
              const match = /^Untitled Video (\d+)$/.exec(project.title);
              if (match?.[1]) {
                const num = parseInt(match[1], 10);
                if (!isNaN(num) && num > highestNumber) {
                  highestNumber = num;
                }
              }
            }
            
            // Generate proper numbered fallback
            finalTitle = untitledProjects.length === 0 ? "Untitled Video" : `Untitled Video ${highestNumber + 1}`;
          }

          // Update the project title
          await db.update(projects)
            .set({ 
              title: finalTitle,
              updatedAt: new Date(),
            })
            .where(eq(projects.id, projectId));

          console.log(`[SSE] Generated and set title: "${finalTitle}" for project ${projectId}`);
          
          // ✅ NEW: Send title update to client so it can invalidate queries
          await writer.write(encoder.encode(formatSSE({
            type: 'title_updated',
            title: finalTitle,
            projectId: projectId
          })));
        }
      } catch (titleError) {
        // Don't fail the whole request if title generation fails
        console.error('[SSE] Title generation failed:', titleError);
      }
      
      // 3. Just send the user data back - no assistant message yet
      await writer.write(encoder.encode(formatSSE({
        type: 'ready',
        userMessageId: userMsg.id,
        userMessage: userMessage,
        imageUrls: parsedImageUrls,
        videoUrls: parsedVideoUrls
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