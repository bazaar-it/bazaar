import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { scenes, messages, projects } from "~/server/db/schema";
import { eq, and } from "drizzle-orm";
import { addTool } from "~/tools/add/add";
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
              // Typography is now handled by addTool
              toolResult = await addTool.run({
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
            order: sceneNumber - 1,  // Use the planned scene number
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
    
  createAllScenes: publicProcedure
    .input(z.object({
      projectId: z.string(),
      userId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { projectId, userId } = input;
      
      console.log('[CREATE_ALL_SCENES] Starting bulk scene creation for project:', projectId);
      
      try {
        // Get all scene plan messages for this project that haven't been converted yet
        // Scene plans are created with kind='scene_plan' and status='success'
        const scenePlanMessages = await db.query.messages.findMany({
          where: and(
            eq(messages.projectId, projectId),
            eq(messages.kind, 'scene_plan'),
            eq(messages.status, 'success')
          ),
          orderBy: [messages.sequence],
        });
        
        if (!scenePlanMessages || scenePlanMessages.length === 0) {
          // Check if there are any scene plans that have already been converted
          const convertedScenePlans = await db.query.messages.findMany({
            where: and(
              eq(messages.projectId, projectId),
              eq(messages.kind, 'status'),
              eq(messages.status, 'success')
            ),
          });
          
          const hasConvertedPlans = convertedScenePlans.some(msg => 
            msg.content.includes('Scene') && msg.content.includes('created successfully')
          );
          
          return {
            success: false,
            error: hasConvertedPlans 
              ? 'All scene plans have already been created' 
              : 'No scene plans found. Generate a multi-scene video first.',
            results: [],
            errors: [],
          };
        }
        
        console.log(`[CREATE_ALL_SCENES] Found ${scenePlanMessages.length} scene plans to create`);
        
        const results = [];
        const errors = [];
        
        // Create scenes sequentially to maintain order and context
        for (const planMessage of scenePlanMessages) {
          try {
            // Extract scene plan data
            const match = planMessage.content.match(/<!-- SCENE_PLAN_DATA:(.*) -->/);
            if (!match || !match[1]) {
              console.error('[CREATE_ALL_SCENES] Failed to extract scene plan data from message:', planMessage.id);
              errors.push({
                messageId: planMessage.id,
                error: 'Failed to parse scene plan data'
              });
              continue;
            }
            
            const scenePlanData = JSON.parse(match[1]);
            
            console.log(`[CREATE_ALL_SCENES] Creating scene ${scenePlanData.sceneNumber}...`);
            
            // Reuse the core scene creation logic inline
            // (Could be extracted to a shared function later)
            const sceneNumber = scenePlanData.sceneNumber;
            const scenePlan = scenePlanData.scenePlan as ScenePlan;
            const projectFormat = scenePlanData.projectFormat || { width: 1920, height: 1080, fps: 30 };
            const imageUrls = scenePlanData.imageUrls || [];
            
            // Get current storyboard - IMPORTANT: Fetch fresh each time to include newly created scenes
            const storyboard = await db.query.scenes.findMany({
              where: eq(scenes.projectId, projectId),
              orderBy: [scenes.order],
            });
            
            console.log(`[CREATE_ALL_SCENES] Current storyboard has ${storyboard.length} scenes`);
            
            // Execute the appropriate tool
            let toolResult;
            
            // Get previous scene context if available
            const previousScene = storyboard.length > 0 ? storyboard[storyboard.length - 1] : null;
            
            // Extract existing identifiers from all scenes to avoid conflicts
            const existingIdentifiers = new Set<string>();
            storyboard.forEach(scene => {
              // Extract top-level const/function declarations
              const identifierRegex = /(?:const|let|var|function)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g;
              let match;
              while ((match = identifierRegex.exec(scene.tsxCode)) !== null) {
                if (match[1]) {
                  existingIdentifiers.add(match[1]);
                }
              }
            });
            
            console.log(`[CREATE_ALL_SCENES] Found existing identifiers: ${Array.from(existingIdentifiers).join(', ')}`);
            
            // Modify the prompt to include identifier avoidance
            let identifierWarning = '';
            if (sceneNumber > 1 || existingIdentifiers.size > 0) {
              const commonIdentifiers = ['script', 'sequences', 'currentFrame', 'currentStart', 'currentStartFrame', 'totalFrames'];
              const allUsedIdentifiers = new Set([...existingIdentifiers, ...commonIdentifiers]);
              identifierWarning = `\n\nCRITICAL: You are generating Scene ${sceneNumber}. ALL variable names must be unique. DO NOT use these identifiers: ${Array.from(allUsedIdentifiers).join(', ')}. \nInstead use: script${sceneNumber}, sequences${sceneNumber}, currentFrame${sceneNumber}, etc. This is REQUIRED to prevent conflicts.`;
            }
            
            const baseInput = {
              userPrompt: scenePlan.prompt + identifierWarning,
              projectId,
              userId,
              projectFormat,
              storyboardSoFar: storyboard.map(s => ({
                id: s.id,
                name: s.name,
                duration: s.duration,
                order: s.order,
                tsxCode: s.tsxCode,
              })),
              previousSceneContext: previousScene ? {
                tsxCode: previousScene.tsxCode,
                style: previousScene.name // Use name as a style hint
              } : undefined,
              sceneNumber: sceneNumber,
            };
            
            if (scenePlan.toolType === 'typography') {
              // Typography is now handled by addTool
              toolResult = await addTool.run(baseInput);
            } else if (scenePlan.toolType === 'recreate' && imageUrls.length > 0) {
              toolResult = await imageRecreatorTool.run({
                ...baseInput,
                imageUrls,
              });
            } else {
              // Default to add tool
              toolResult = await addTool.run({
                ...baseInput,
                imageUrls,
              });
            }
            
            if (!toolResult.success || !toolResult.data) {
              const errorMessage = typeof toolResult.error === 'string' 
                ? toolResult.error 
                : toolResult.error?.message || 'Tool execution failed';
              throw new Error(errorMessage);
            }
            
            // Save scene to database
            const [newScene] = await db.insert(scenes).values({
              projectId,
              name: toolResult.data.name,
              tsxCode: toolResult.data.tsxCode,
              duration: toolResult.data.duration || 150,
              order: sceneNumber - 1,  // Use the planned scene number
              props: (toolResult.data as any).props || {},
              layoutJson: (toolResult.data as any).layoutJson || null,
            }).returning();
            
            // Update message status
            await db.update(messages)
              .set({
                content: `Scene ${sceneNumber} created successfully`,
                status: 'success',
                kind: 'status',
                updatedAt: new Date(),
              })
              .where(eq(messages.id, planMessage.id));
            
            // Notify UI about the new scene (for server-side events)
            if (typeof globalThis !== 'undefined' && 'window' in globalThis) {
              // This won't work on server, but keeping for reference
              console.log(`[CREATE_ALL_SCENES] Would dispatch scene-created event if on client`);
            }
            
            const result = { success: true, scene: newScene };
            
            if (result.success) {
              console.log(`[CREATE_ALL_SCENES] ✅ Scene ${sceneNumber} created with order ${sceneNumber - 1}`);
              results.push({
                messageId: planMessage.id,
                sceneNumber: scenePlanData.sceneNumber,
                sceneName: result.scene?.name,
                sceneId: result.scene?.id,
                success: true
              });
            } else {
              console.error(`[CREATE_ALL_SCENES] ❌ Scene ${sceneNumber} failed`);
              errors.push({
                messageId: planMessage.id,
                sceneNumber: scenePlanData.sceneNumber,
                error: 'Scene creation failed'
              });
            }
            
            // Small delay between scenes to avoid overwhelming the system
            await new Promise(resolve => setTimeout(resolve, 500));
            
          } catch (error) {
            console.error('[CREATE_ALL_SCENES] Error creating scene from message:', planMessage.id, error);
            errors.push({
              messageId: planMessage.id,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
        
        console.log('[CREATE_ALL_SCENES] Bulk creation complete:', {
          total: scenePlanMessages.length,
          successful: results.length,
          failed: errors.length
        });
        
        return {
          success: true,
          results,
          errors,
          summary: {
            total: scenePlanMessages.length,
            successful: results.length,
            failed: errors.length
          }
        };
        
      } catch (error) {
        console.error('[CREATE_ALL_SCENES] Fatal error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create scenes',
          results: [],
          errors: [],
        };
      }
    }),
}); 