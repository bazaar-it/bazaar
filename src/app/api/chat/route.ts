import { streamText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { auth } from '~/server/auth';
import { db } from '~/server/db';
import { projects, scenes, messages } from '~/server/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { sceneBuilderService } from '~/lib/services/sceneBuilder.service';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { messages: chatMessages, projectId } = await req.json();
    
    // Verify project ownership
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });

    if (!project || project.userId !== session.user.id) {
      return new Response('Project not found', { status: 404 });
    }

    // ✅ UNIFIED: Single AI SDK brain handles everything
    const addSceneTool = tool({
      description: 'Create a new scene from user prompt',
      parameters: z.object({
        userPrompt: z.string().describe('User description of the scene'),
      }),
      execute: async ({ userPrompt }) => {
        console.log(`[AI SDK] 🎯 Creating scene: ${userPrompt.substring(0, 100)}...`);
        
        try {
          // ✅ DIRECT: Use scene builder service directly
          const result = await sceneBuilderService.generateTwoStepCode({
            userPrompt,
            projectId,
            sceneNumber: undefined,
            previousSceneJson: undefined,
          });

          // ✅ DIRECT: Save to database
          const maxOrderResult = await db
            .select({ maxOrder: sql<number>`COALESCE(MAX("order"), -1)` })
            .from(scenes)
            .where(eq(scenes.projectId, projectId));
          
          const nextOrder = (maxOrderResult[0]?.maxOrder ?? -1) + 1;
          
          const [newScene] = await db.insert(scenes)
            .values({
              projectId,
              name: result.name,
              order: nextOrder,
              tsxCode: result.code,
              duration: result.duration || 180,
              layoutJson: result.layoutJson ? JSON.stringify(result.layoutJson) : undefined,
              props: {},
            })
            .returning();

          console.log(`[AI SDK] ✅ Scene saved to database:`, newScene?.id);

          return {
            success: true,
            sceneId: newScene?.id || 'unknown',
            sceneName: newScene?.name || 'Generated Scene',
            chatResponse: `I've created your scene! [SCENE_ID: ${newScene?.id}] Check your video player to see the result.`,
          };
        } catch (error) {
          console.error(`[AI SDK] ❌ Scene creation failed:`, error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            chatResponse: `Sorry, I couldn't create your scene. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      },
    });

    const editSceneTool = tool({
      description: 'Edit an existing scene',
      parameters: z.object({
        userPrompt: z.string().describe('Edit instructions'),
        sceneId: z.string().describe('Scene ID to edit'),
      }),
      execute: async ({ userPrompt, sceneId }) => {
        console.log(`[AI SDK] ✏️ Editing scene ${sceneId}: ${userPrompt}`);
        
        try {
          // Get existing scene
          const scene = await db.query.scenes.findFirst({
            where: eq(scenes.id, sceneId),
          });

          if (!scene) {
            throw new Error('Scene not found');
          }

          // Use scene builder for editing
          const result = await sceneBuilderService.generateTwoStepCode({
            userPrompt: `EDIT REQUEST: ${userPrompt}\n\nCURRENT SCENE: ${scene.name}`,
            projectId,
            sceneNumber: scene.order,
            previousSceneJson: scene.layoutJson,
          });

          // Update scene in database
          const [updatedScene] = await db.update(scenes)
            .set({
              name: result.name,
              tsxCode: result.code,
              duration: result.duration || scene.duration,
              layoutJson: result.layoutJson ? JSON.stringify(result.layoutJson) : undefined,
              updatedAt: new Date(),
            })
            .where(eq(scenes.id, sceneId))
            .returning();

          console.log(`[AI SDK] ✅ Scene updated:`, updatedScene?.id);

          return {
            success: true,
            sceneId: updatedScene?.id,
            sceneName: updatedScene?.name,
            chatResponse: `I've updated your scene! [SCENE_ID: ${updatedScene?.id}] Check out the changes in your preview.`,
          };
        } catch (error) {
          console.error(`[AI SDK] ❌ Scene edit failed:`, error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            chatResponse: `Sorry, I couldn't edit your scene. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      },
    });

    const deleteSceneTool = tool({
      description: 'Delete a scene',
      parameters: z.object({
        sceneId: z.string().describe('Scene ID to delete'),
      }),
      execute: async ({ sceneId }) => {
        console.log(`[AI SDK] 🗑️ Deleting scene:`, sceneId);
        
        try {
          // Get scene info before deletion
          const scene = await db.query.scenes.findFirst({
            where: eq(scenes.id, sceneId),
          });

          if (!scene) {
            throw new Error('Scene not found');
          }

          // Delete scene
          await db.delete(scenes).where(eq(scenes.id, sceneId));

          console.log(`[AI SDK] ✅ Scene deleted:`, scene.name);

          return {
            success: true,
            deletedSceneId: sceneId,
            deletedSceneName: scene.name,
            chatResponse: `I've deleted the scene "${scene.name}" successfully! [SCENE_ID: ${sceneId}]`,
          };
        } catch (error) {
          console.error(`[AI SDK] ❌ Scene deletion failed:`, error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            chatResponse: `Sorry, I couldn't delete the scene. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      },
    });

    // Get the last user message
    const lastMessage = chatMessages[chatMessages.length - 1];
    if (!lastMessage || lastMessage.role !== 'user') {
      return new Response('Invalid message format', { status: 400 });
    }

    // ✅ SAVE: User message to database immediately
    await db.insert(messages).values({
      projectId,
      content: lastMessage.content,
      role: "user",
      createdAt: new Date(),
    });

    // ✅ SINGLE BRAIN: One LLM makes all decisions
    const result = await streamText({
      model: openai('gpt-4o-mini'),
      messages: [
        {
          role: 'system',
          content: `You are a video scene creation assistant. Help users create, edit, and delete video scenes.
          
When users want to:
- Create new scenes: Use the addScene tool
- Edit existing scenes: Use the editScene tool  
- Delete scenes: Use the deleteScene tool

IMPORTANT: After using any tool, always provide a clear response about what you accomplished. 

CRITICAL: When you create or edit a scene, ALWAYS include the scene ID in your response like this:
- "I've created your scene! [SCENE_ID: abc123] You can now see it in your video player."
- "I've updated the scene! [SCENE_ID: xyz789] Check out the changes in your preview."

Always explain what the user can see in their video player, and what they can do next.`,
        },
        ...chatMessages,
      ],
      tools: {
        addScene: addSceneTool,
        editScene: editSceneTool,
        deleteScene: deleteSceneTool,
      },
      toolChoice: 'auto',
      temperature: 0.7,
      onFinish: async (result) => {
        // ✅ SAVE: Assistant response to database
        if (result.text) {
          await db.insert(messages).values({
            projectId,
            content: result.text,
            role: "assistant",
            createdAt: new Date(),
          });
        }
      },
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('AI SDK route error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
} 