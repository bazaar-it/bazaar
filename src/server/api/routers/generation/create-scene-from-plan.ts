import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { scenes, messages, projects } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { addTool } from "~/tools/add/add";
import { typographyTool } from "~/tools/typography/typography";
import { imageRecreatorTool } from "~/tools/image-recreator/image-recreator";
import type { ScenePlan } from "~/tools/helpers/types";

export const createSceneFromPlanRouter = createTRPCRouter({
  createScene: publicProcedure
    .input(z.object({
      messageId: z.string(),
      projectId: z.string(),
      userId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { messageId, projectId, userId } = input;
      
      try {
        console.log('[CREATE_SCENE_FROM_PLAN] Starting scene creation:', { messageId, projectId, userId });
        
        // Get the scene plan message
        const message = await db.query.messages.findFirst({
          where: eq(messages.id, messageId),
        });
        
        if (!message) {
          const error = "Scene plan message not found";
          console.error('[CREATE_SCENE_FROM_PLAN] Error:', error);
          
          // Don't throw - return error response
          return {
            success: false,
            error: error,
            message: 'Scene plan message not found in database'
          };
        }
        
        // Extract scene plan data from message content
        const scenePlanMatch = message.content.match(/<!-- SCENE_PLAN_DATA:(.*) -->/);
        if (!scenePlanMatch || !scenePlanMatch[1]) {
          const error = "Scene plan data not found in message";
          console.error('[CREATE_SCENE_FROM_PLAN] Error:', error);
          
          // Update message to show error
          await db.update(messages)
            .set({
              content: `❌ **Scene Creation Failed:** Scene plan data not found in message`,
              status: 'error',
              updatedAt: new Date(),
            })
            .where(eq(messages.id, messageId));
          
          return {
            success: false,
            error: error,
            message: 'Scene plan data not found in message'
          };
        }
        
        let scenePlanData;
        try {
          scenePlanData = JSON.parse(scenePlanMatch[1]);
        } catch (parseError) {
          const error = "Invalid scene plan data format";
          console.error('[CREATE_SCENE_FROM_PLAN] Parse error:', parseError);
          
          // Update message to show error
          await db.update(messages)
            .set({
              content: `❌ **Scene Creation Failed:** Invalid scene plan data format`,
              status: 'error',
              updatedAt: new Date(),
            })
            .where(eq(messages.id, messageId));
          
          return {
            success: false,
            error: error,
            message: 'Invalid scene plan data format'
          };
        }
        
        const { sceneNumber, scenePlan, projectFormat, imageUrls = [] } = scenePlanData;
        
        console.log('[CREATE_SCENE_FROM_PLAN] Extracted scene plan:', {
          sceneNumber,
          toolType: scenePlan.toolType,
          hasImages: imageUrls.length > 0,
          imageCount: imageUrls.length
        });
      
        // Get current storyboard
        const storyboard = await db.query.scenes.findMany({
          where: eq(scenes.projectId, projectId),
          orderBy: (scenes, { asc }) => [asc(scenes.order)]
        });
        
        // Execute the appropriate tool based on scene plan
        let toolResult;
        
        console.log('[CREATE_SCENE_FROM_PLAN] Executing tool:', scenePlan.toolType);
        
        switch (scenePlan.toolType) {
          case 'typography':
            try {
              toolResult = await typographyTool.run({
                userPrompt: scenePlan.prompt,
                projectId,
                userId,
                projectFormat,
              });
            } catch (toolError) {
              console.error('[CREATE_SCENE_FROM_PLAN] Typography tool error:', toolError);
              toolResult = { success: false, error: { message: toolError instanceof Error ? toolError.message : 'Typography tool failed' } };
            }
            break;
            
          case 'recreate':
            // Check if we have image URLs for recreation
            if (!imageUrls || imageUrls.length === 0) {
              console.warn(`[CREATE_SCENE_FROM_PLAN] No image URLs for recreation, falling back to code-generator`);
              // Fall back to code-generator if no images available
              try {
                toolResult = await addTool.run({
                  userPrompt: scenePlan.prompt,
                  projectId,
                  userId,
                  sceneNumber: storyboard.length + 1,
                  storyboardSoFar: storyboard,
                  projectFormat,
                });
              } catch (toolError) {
                console.error('[CREATE_SCENE_FROM_PLAN] Code-generator fallback error:', toolError);
                toolResult = { success: false, error: { message: toolError instanceof Error ? toolError.message : 'Code-generator fallback failed' } };
              }
            } else {
              try {
                toolResult = await imageRecreatorTool.run({
                  userPrompt: scenePlan.prompt,
                  projectId,
                  userId,
                  projectFormat,
                  imageUrls: imageUrls,
                  recreationType: 'full',
                });
              } catch (toolError) {
                console.error('[CREATE_SCENE_FROM_PLAN] Image recreator error:', toolError);
                // Fall back to code-generator if image recreator fails
                console.warn(`[CREATE_SCENE_FROM_PLAN] Image recreator failed, falling back to code-generator`);
                try {
                  toolResult = await addTool.run({
                    userPrompt: scenePlan.prompt,
                    projectId,
                    userId,
                    sceneNumber: storyboard.length + 1,
                    storyboardSoFar: storyboard,
                    projectFormat,
                    imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
                  });
                } catch (fallbackError) {
                  console.error('[CREATE_SCENE_FROM_PLAN] Code-generator fallback error:', fallbackError);
                  toolResult = { success: false, error: { message: fallbackError instanceof Error ? fallbackError.message : 'Both image recreator and code-generator failed' } };
                }
              }
            }
            break;
            
          case 'code-generator':
          default:
            try {
              toolResult = await addTool.run({
                userPrompt: scenePlan.prompt,
                projectId,
                userId,
                sceneNumber: storyboard.length + 1,
                storyboardSoFar: storyboard,
                projectFormat,
                imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
              });
            } catch (toolError) {
              console.error('[CREATE_SCENE_FROM_PLAN] Code-generator error:', toolError);
              toolResult = { success: false, error: { message: toolError instanceof Error ? toolError.message : 'Code-generator failed' } };
            }
            break;
        }
        
        if (!toolResult.success || !toolResult.data) {
          const errorMessage = toolResult.error?.message || 'Scene generation failed';
          console.error('[CREATE_SCENE_FROM_PLAN] Tool execution failed:', errorMessage);
          
          // Update message to show error
          await db.update(messages)
            .set({
              content: `❌ **Scene ${sceneNumber}:** Failed to create scene - ${errorMessage}`,
              status: 'error',
              updatedAt: new Date(),
            })
            .where(eq(messages.id, messageId));
          
          return {
            success: false,
            error: errorMessage,
            message: `Scene creation failed: ${errorMessage}`
          };
        }
        
        // Save the generated scene to database
        try {
          const [newScene] = await db.insert(scenes).values({
            projectId,
            name: toolResult.data.name,
            tsxCode: toolResult.data.tsxCode,
            duration: toolResult.data.duration || 150,
            order: storyboard.length,
            props: (toolResult.data as any).props || {},
            layoutJson: (toolResult.data as any).layoutJson || null,
          }).returning();
          
          if (!newScene) {
            const errorMessage = 'Failed to save scene to database';
            console.error('[CREATE_SCENE_FROM_PLAN] Database error:', errorMessage);
            
            // Update message to show error
            await db.update(messages)
              .set({
                content: `❌ **Scene ${sceneNumber}:** Failed to save scene to database`,
                status: 'error',
                updatedAt: new Date(),
              })
              .where(eq(messages.id, messageId));
            
            return {
              success: false,
              error: errorMessage,
              message: 'Failed to save scene to database'
            };
          }
          
          // Update the message to show it was created
          await db.update(messages)
            .set({
              content: `Scene ${sceneNumber} created successfully`,
              status: 'success',
              kind: 'status',
              updatedAt: new Date(),
            })
            .where(eq(messages.id, messageId));
          
          console.log('[CREATE_SCENE_FROM_PLAN] Scene created successfully:', {
            sceneId: newScene.id,
            sceneName: newScene.name,
            sceneNumber
          });
          
          return {
            success: true,
            scene: newScene,
            message: 'Scene created successfully'
          };
          
        } catch (dbError) {
          const errorMessage = dbError instanceof Error ? dbError.message : 'Database error';
          console.error('[CREATE_SCENE_FROM_PLAN] Database save error:', dbError);
          
          // Update message to show error
          await db.update(messages)
            .set({
              content: `❌ **Scene ${sceneNumber}:** Database error - ${errorMessage}`,
              status: 'error',
              updatedAt: new Date(),
            })
            .where(eq(messages.id, messageId));
          
          return {
            success: false,
            error: errorMessage,
            message: `Database error: ${errorMessage}`
          };
        }
        
      } catch (outerError) {
        // Catch any other unexpected errors
        const errorMessage = outerError instanceof Error ? outerError.message : 'Unknown error occurred';
        console.error('[CREATE_SCENE_FROM_PLAN] Unexpected error:', outerError);
        
        // Try to update message to show error (if possible)
        try {
          await db.update(messages)
            .set({
              content: `❌ **Scene Creation Failed:** ${errorMessage}`,
              status: 'error',
              updatedAt: new Date(),
            })
            .where(eq(messages.id, messageId));
        } catch (updateError) {
          console.error('[CREATE_SCENE_FROM_PLAN] Failed to update message after error:', updateError);
        }
        
        // Never throw - always return error response
        return {
          success: false,
          error: errorMessage,
          message: `Unexpected error: ${errorMessage}`
        };
      }
    }),
}); 