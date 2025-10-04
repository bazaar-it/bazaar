import { NextRequest } from 'next/server';
import { auth } from '~/server/auth';
import { db } from '~/server/db';
import { messages, projects } from '~/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { messageService } from '~/server/services/data/message.service';
import { generateTitle } from '~/server/services/ai/titleGenerator.service';
import { WebsiteToVideoHandler, type StreamingEvent } from '~/tools/website/websiteToVideoHandler';
import { WebsiteBrandingSceneApplier } from '~/server/services/website/website-branding-applier';
import type { StreamingEvent } from '~/tools/website/websiteToVideoHandler';
import type { UrlToVideoUserInputs } from '~/lib/types/url-to-video';
import { FEATURES } from "~/config/features";

// SSE helper to format messages
function formatSSE(data: any): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

// Retry helper with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    
    console.log(`[SSE] Retrying in ${delay}ms... (${retries} attempts left)`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryWithBackoff(fn, retries - 1, delay * 2);
  }
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
  const audioUrls = searchParams.get('audioUrls');
  const sceneUrls = searchParams.get('sceneUrls'); // 🚨 NEW: Scene attachments
  const modelOverride = searchParams.get('modelOverride');
  const useGitHub = searchParams.get('useGitHub') === 'true';
  const websiteUrl = searchParams.get('websiteUrl');
  const mode = (searchParams.get('mode') || 'multi-scene') as 'multi-scene' | 'current-scenes';
  const sceneIdsRaw = searchParams.get('sceneIds');
  const userInputsRaw = searchParams.get('userInputs');
  let userInputs: UrlToVideoUserInputs | undefined;
  let targetSceneIds: string[] | undefined;

  if (userInputsRaw) {
    try {
      userInputs = JSON.parse(userInputsRaw) as UrlToVideoUserInputs;
    } catch (error) {
      console.warn('[SSE] Failed to parse userInputs payload', error);
    }
  }

  if (sceneIdsRaw) {
    try {
      const parsedIds = JSON.parse(sceneIdsRaw);
      if (Array.isArray(parsedIds)) {
        targetSceneIds = parsedIds.filter((value): value is string => typeof value === 'string');
      }
    } catch (error) {
      console.warn('[SSE] Failed to parse sceneIds payload', error);
    }
  }

  if (!projectId || !userMessage) {
    return new Response('Missing required parameters', { status: 400 });
  }

  // Create a TransformStream for SSE
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  let sseClosed = false;
  const pendingTasks: Promise<unknown>[] = [];

  // Best-effort safe write that ignores attempts after close
  const safeWrite = async (data: any) => {
    if (sseClosed) return;
    try {
      await writer.write(encoder.encode(formatSSE(data)));
    } catch (err) {
      sseClosed = true;
      try { console.warn('[SSE] Attempted write after stream close; ignoring'); } catch {}
    }
  };

  try {
    // Abort handling: close stream if client disconnects
    (request as any)?.signal?.addEventListener?.('abort', async () => {
      sseClosed = true;
      try { await writer.close(); } catch {}
    });
  } catch {}

  // Start the async work
  (async () => {
    try {
      // 1. Create the user message FIRST to ensure correct sequence order
      const parsedImageUrls = imageUrls ? JSON.parse(imageUrls) : undefined;
      const parsedVideoUrls = videoUrls ? JSON.parse(videoUrls) : undefined;
      const parsedAudioUrls = audioUrls ? JSON.parse(audioUrls) : undefined;
      const parsedSceneUrls = sceneUrls ? JSON.parse(sceneUrls) : undefined; // 🚨 NEW: Scene attachments
      
      // ✅ NEW: Add retry logic for database operations
      const userMsg = await retryWithBackoff(async () => {
        return await messageService.createMessage({
          projectId,
          content: userMessage,
          role: "user",
          imageUrls: parsedImageUrls?.length > 0 ? parsedImageUrls : undefined,
          videoUrls: parsedVideoUrls?.length > 0 ? parsedVideoUrls : undefined,
          audioUrls: parsedAudioUrls?.length > 0 ? parsedAudioUrls : undefined,
          sceneUrls: parsedSceneUrls?.length > 0 ? parsedSceneUrls : undefined, // 🚨 NEW: Scene attachments
        });
      }, 3, 1000);

      if (!userMsg) {
        throw new Error('Failed to create user message');
      }

      // 2. Check if this is the first user message and generate title if needed
      try {
        const existingMessages = await retryWithBackoff(async () => {
          return await db.query.messages.findMany({
            where: eq(messages.projectId, projectId),
            orderBy: [desc(messages.sequence)],
            limit: 5, // Check a few messages to be sure
          });
        }, 2, 500);

        // Check if this is the first user message (only this message exists, or only welcome/assistant messages before)
        const userMessages = existingMessages.filter(msg => msg.role === 'user');
        const isFirstUserMessage = userMessages.length === 1 && userMessages[0]?.id === userMsg.id;

        if (isFirstUserMessage) {
          console.log('[SSE] First user message detected, checking if title generation is needed...');
          
          // Check current project title first - only generate if it's still an untitled project
          const currentProject = await retryWithBackoff(async () => {
            return await db.query.projects.findFirst({
              columns: { title: true },
              where: eq(projects.id, projectId),
            });
          }, 2, 500);
          
          // Only generate title if current title matches "Untitled Video" pattern (default names)
          const currentTitle = currentProject?.title || '';
          const isDefaultTitle = currentTitle.includes('Untitled Video');
          if (isDefaultTitle) {
            console.log(`[SSE] Project has default title "${currentTitle}", generating new title...`);
            
            // Generate title asynchronously to avoid blocking scene generation
            const titleTask = generateTitle({
              prompt: userMessage,
              contextId: projectId,
            }).then(async (titleResult) => {
              const candidateTitles = Array.from(new Set(
                (titleResult.titles || [])
                  .map((title) => title?.trim())
                  .filter((title): title is string => Boolean(title))
              ));

              const tryUpdateTitle = async (title: string) => {
                await retryWithBackoff(async () => {
                  await db
                    .update(projects)
                    .set({
                      title,
                      updatedAt: new Date(),
                    })
                    .where(eq(projects.id, projectId));
                }, 1, 250);
              };

              const uniqueViolation = (error: unknown) =>
                error &&
                typeof error === 'object' &&
                'code' in error &&
                (error as { code?: string }).code === '23505';

              let appliedTitle: string | null = null;

              for (const candidate of candidateTitles) {
                try {
                  await tryUpdateTitle(candidate);
                  appliedTitle = candidate;
                  break;
                } catch (error) {
                  if (uniqueViolation(error)) {
                    continue; // try next candidate
                  }
                  throw error;
                }
              }

              if (!appliedTitle) {
                // Fall back to deterministic "Untitled Video" numbering
                const userProjects = await retryWithBackoff(async () => {
                  return await db.query.projects.findMany({
                    columns: { title: true },
                    where: eq(projects.userId, userId),
                  });
                }, 2, 500);

                const untitledProjects = userProjects.filter((p) => p.title.startsWith('Untitled Video'));
                let highestNumber = 0;
                for (const project of untitledProjects) {
                  const match = /^Untitled Video (\d+)$/.exec(project.title);
                  if (match?.[1]) {
                    const num = Number.parseInt(match[1], 10);
                    if (!Number.isNaN(num) && num > highestNumber) {
                      highestNumber = num;
                    }
                  }
                }

                const fallbackTitle = untitledProjects.length === 0 ? 'Untitled Video' : `Untitled Video ${highestNumber + 1}`;
                await tryUpdateTitle(fallbackTitle);
                appliedTitle = fallbackTitle;
              }

              console.log(`[SSE] Generated and set title: "${appliedTitle}" for project ${projectId}`);

              await safeWrite({
                type: 'title_updated',
                title: appliedTitle,
                projectId: projectId,
              });
            }).catch((titleError) => {
              // Don't fail the whole request if title generation fails
              console.error('[SSE] Title generation failed:', titleError);
            });
            pendingTasks.push(titleTask);
          } else {
            console.log(`[SSE] Project already has custom title "${currentTitle}", skipping title generation`);
          }
        }
      } catch (titleError) {
        // Catch any synchronous errors
        console.error('[SSE] Title generation setup failed:', titleError);
      }
      
      // ✨ Check if this is a website-to-video request (feature-gated)
      if (websiteUrl && FEATURES.WEBSITE_TO_VIDEO_ENABLED) {
        console.log('[SSE] Website-to-video pipeline detected:', websiteUrl, 'mode:', mode);
        const domain = new URL(websiteUrl).hostname;

        if (mode === 'current-scenes') {
          if (!targetSceneIds?.length) {
            throw new Error('No scenes selected for branding update');
          }

          let assistantMessageContent = `Applying ${domain} branding to ${targetSceneIds.length} scene(s)...`;
          await safeWrite({
            type: 'assistant_message_chunk',
            message: assistantMessageContent,
            isComplete: false,
          });

          const streamingCallback = async (event: StreamingEvent | { type: 'scene_updated'; data: { sceneId: string; sceneName: string; sceneIndex: number; totalScenes: number; projectId: string } }) => {
            console.log('[SSE] Branding-applier event:', event.type);

            if (event.type === 'scene_updated') {
              const data = event.data;
              const progressMessage = `Updated scene ${data.sceneIndex + 1}/${data.totalScenes} → ${data.sceneName}`;
              assistantMessageContent += `\n\n${progressMessage}`;
              await safeWrite({
                type: 'assistant_message_chunk',
                message: progressMessage,
                isComplete: false,
              });
              await safeWrite({
                type: 'scene_updated',
                data: {
                  sceneId: data.sceneId,
                  sceneName: data.sceneName,
                  progress: Math.round(((data.sceneIndex + 1) / data.totalScenes) * 100),
                  sceneIndex: data.sceneIndex,
                  totalScenes: data.totalScenes,
                  projectId,
                },
              });
              return;
            }

            if (event.type === 'all_scenes_complete') {
              const completionMessage = `✨ Complete! Updated ${event.data.totalScenes} scene(s) with ${domain}'s branding.`;
              assistantMessageContent += `\n\n${completionMessage}`;
              await safeWrite({
                type: 'assistant_message_chunk',
                message: completionMessage,
                isComplete: true,
              });
              return;
            }

            // Fallback: handle legacy streaming events gracefully (shouldn't fire in edit mode)
            if ((event as StreamingEvent).type === 'scene_completed') {
              const data = (event as StreamingEvent).data;
              const progressMessage = `Scene ${data.sceneIndex + 1}/${data.totalScenes} complete → ${data.sceneName}`;
              assistantMessageContent += `\n\n${progressMessage}`;
              await safeWrite({
                type: 'assistant_message_chunk',
                message: progressMessage,
                isComplete: false,
              });
              await safeWrite({
                type: 'scene_updated',
                data: {
                  sceneId: data.sceneId ?? data.sceneName,
                  sceneName: data.sceneName,
                  progress: Math.round(((data.sceneIndex + 1) / data.totalScenes) * 100),
                  sceneIndex: data.sceneIndex,
                  totalScenes: data.totalScenes,
                  projectId,
                },
              });
              return;
            }
          };

          const result = await WebsiteBrandingSceneApplier.apply({
            projectId,
            userId,
            websiteUrl,
            sceneIds: targetSceneIds,
            userPrompt: userMessage,
            userInputs,
            streamingCallback,
          });

          if (!result.success) {
            throw new Error(result.error?.message || 'Website branding update failed');
          }

        } else {
          // Send initial analysis message
          await safeWrite({
            type: 'assistant_message_chunk',
            message: `Analyzing ${domain} and extracting brand data...`,
            isComplete: false
          });
          
          // Setup streaming callback for real-time updates
          let assistantMessageContent = `Analyzing ${domain} and extracting brand data...`;
          
          const streamingCallback = async (event: StreamingEvent) => {
            console.log('[SSE] Streaming event:', event.type);

            if (event.type === 'template_selected') {
              const data = event.data;
              const plannedMessage = `Selected ${data.templateName} template · ${data.totalScenes} scenes planned.`;
              assistantMessageContent += `\n\n${plannedMessage}`;
              await safeWrite({
                type: 'assistant_message_chunk',
                message: plannedMessage,
                isComplete: false,
              });
              return;
            }

            if (event.type === 'scene_completed') {
              const data = event.data;
              const progressMessage = `Scene ${data.sceneIndex + 1}/${data.totalScenes} complete → ${data.sceneName}`;
              assistantMessageContent += `\n\n${progressMessage}`;

              await safeWrite({
                type: 'assistant_message_chunk',
                message: progressMessage,
                isComplete: false,
              });

              await safeWrite({
                type: 'scene_added',
                data: {
                  sceneId: data.sceneId,
                  sceneName: data.sceneName,
                  progress: Math.round(((data.sceneIndex + 1) / data.totalScenes) * 100),
                },
              });
              return;
            }

            if (event.type === 'audio_added') {
              const data = event.data;
              const audioMessage = `Added background music: ${data.trackName}`;
              assistantMessageContent += `\n\n${audioMessage}`;
              await safeWrite({
                type: 'assistant_message_chunk',
                message: audioMessage,
                isComplete: false,
              });
              return;
            }

            if (event.type === 'all_scenes_complete') {
              const data = event.data;
              const completionMessage = `✨ Complete! Generated ${data.totalScenes} branded scenes using ${domain}'s colors and messaging.`;
              assistantMessageContent += `\n\n${completionMessage}`;

              await safeWrite({
                type: 'assistant_message_chunk',
                message: completionMessage,
                isComplete: true,
              });
            }
          };
          
          // Execute website pipeline with streaming
          const result = await WebsiteToVideoHandler.execute({
            userPrompt: userMessage,
            projectId,
            userId,
            websiteUrl,
            streamingCallback,
            userInputs,
          });
          
          if (result.success) {
            console.log('[SSE] Website pipeline completed successfully');
          } else {
            throw new Error(result.error?.message || 'Website pipeline failed');
          }
        }
      } else {
        // 3. Just send the user data back - no assistant message yet (regular flow)
        await safeWrite({
          type: 'ready',
          userMessageId: userMsg.id,
          userMessage: userMessage,
          imageUrls: parsedImageUrls,
          videoUrls: parsedVideoUrls,
          audioUrls: parsedAudioUrls,
          sceneUrls: parsedSceneUrls,
          modelOverride: modelOverride,
          useGitHub: useGitHub
        });
      }

    } catch (error) {
      console.error('[SSE] Error:', error);
      
      try {
        // ✅ NEW: More specific error messages
        let errorMessage = 'Failed to process request';
        
        if (error instanceof Error) {
          if (error.message.includes('ECONNRESET') || error.message.includes('fetch failed')) {
            errorMessage = 'Database connection issue. Please try again in a moment.';
          } else if (error.message.includes('timeout')) {
            errorMessage = 'Request timed out. Please try again.';
          } else if (error.message.includes('auth')) {
            errorMessage = 'Authentication issue. Please refresh the page.';
          }
        }
        
        // Send error to client
        await safeWrite({
          type: 'error',
          error: errorMessage,
          canRetry: true // ✅ NEW: Hint to client that retry is possible
        });
      } catch (writeError) {
        console.error('[SSE] Failed to write error:', writeError);
      }
    } finally {
      // Await any background tasks (e.g., title generation) before closing
      try { await Promise.allSettled(pendingTasks); } catch {}
      // Small delay to ensure the last message is sent
      await new Promise(resolve => setTimeout(resolve, 50));
      
      try {
        sseClosed = true;
        await writer.close();
      } catch (closeError) {
        // Stream might already be closed
        console.log('[SSE] Stream already closed');
      }
    }
  })();

  // Return SSE response with proper timeout configuration
  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable proxy buffering
    },
  });
}

// Export runtime config for longer execution
export const maxDuration = 300; // 5 minutes
