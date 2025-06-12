// src/server/api/routers/generation.simplified.ts
// Clean generation router that uses simplified brain architecture

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { brainOrchestrator } from "~/server/services/brain/orchestrator.simplified";
import { sceneService } from "~/server/services/scene/scene.service";
import { db } from "~/server/db";
import { scenes, projects, messages } from "~/server/db/schema";
import { eq, and, desc } from "drizzle-orm";
import type { StandardApiResponse, SceneOperationResponse, DeleteOperationResponse } from "~/lib/types/api/golden-rule-contracts";
import type { 
  isAddSceneDecision, 
  isEditSceneDecision, 
  isDeleteSceneDecision, 
  isClarificationNeeded 
} from "~/lib/types/api/brain-contracts";
import { TRPCError } from "@trpc/server";

export const generationRouter = createTRPCRouter({
  /**
   * Simplified scene generation endpoint
   * 1. Get brain decision
   * 2. Execute tool
   * 3. Return standardized response
   */
  generateScene: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      userMessage: z.string(),
      sceneId: z.string().optional(),
      userContext: z.object({
        imageUrls: z.array(z.string()).optional(),
        selectedSceneId: z.string().optional(),
      }).optional(),
    }))
    .mutation(async ({ input, ctx }): Promise<StandardApiResponse<any>> => {
      const { projectId, userMessage, userContext } = input;
      const userId = ctx.session.user.id;

      console.log("[Generation] Request received:", {
        projectId,
        userMessage: userMessage.substring(0, 100),
        hasImages: !!userContext?.imageUrls?.length
      });

      try {
        // 1. Verify project ownership
        const project = await db.query.projects.findFirst({
          where: and(
            eq(projects.id, projectId),
            eq(projects.userId, userId)
          ),
        });

        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found or access denied"
          });
        }

        // 2. Store user message
        await db.insert(messages).values({
          projectId,
          content: userMessage,
          role: "user",
          createdAt: new Date(),
          imageUrls: userContext?.imageUrls || [],
        });

        // 3. Get brain decision
        const decision = await brainOrchestrator.orchestrate({
          prompt: userMessage,
          projectId,
          userId,
          imageUrls: userContext?.imageUrls,
          selectedSceneId: userContext?.selectedSceneId,
        });

        console.log("[Generation] Brain decision:", {
          tool: decision.tool,
          reasoning: decision.reasoning,
          confidence: decision.confidence
        });

        // 4. Handle clarification if needed
        if (decision.tool === 'clarification') {
          // Return clarification request
          return {
            success: false,
            operation: 'analyze' as const,
            data: null,
            error: {
              code: 'CLARIFICATION_NEEDED',
              message: decision.context.question,
              details: { suggestions: decision.context.suggestions }
            },
            metadata: {
              timestamp: Date.now(),
              affectedIds: [],
              chatResponse: decision.context.question
            }
          };
        }

        // 5. Execute the chosen tool with proper typing
        let result: StandardApiResponse<any>;

        if (decision.tool === 'addScene') {
          const { context } = decision;
          result = await sceneService.addScene({
            projectId: context.projectId,
            prompt: context.prompt,
            imageUrls: context.imageUrls,
            previousSceneJson: context.previousSceneStyle?.layout,
            order: context.order
          });
        } 
        else if (decision.tool === 'editScene') {
          const { context } = decision;
          result = await sceneService.editScene({
            sceneId: context.sceneId,
            prompt: context.prompt,
            editType: context.editType,
            imageUrls: context.imageUrls,
            duration: context.newDuration,
          });
        } 
        else if (decision.tool === 'deleteScene') {
          const { context } = decision;
          result = await sceneService.deleteScene({
            sceneId: context.sceneId,
          });
          
          // Handle timeline adjustments
          if (context.affectedScenes?.length > 0) {
            // TODO: Update affected scene start/end times
          }
        } 
        else {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Unknown tool: ${(decision as any).tool}`
          });
        }

        // 6. Store assistant response
        const chatResponse = result.metadata?.chatResponse || decision.reasoning;
        await db.insert(messages).values({
          projectId,
          content: chatResponse,
          role: "assistant",
          createdAt: new Date(),
        });

        // 6. Add decision info to metadata
        result.metadata = {
          ...result.metadata,
          chatResponse,
          reasoning: decision.reasoning,
          toolUsed: decision.tool,
          confidence: decision.confidence,
        };

        console.log("[Generation] Operation completed:", {
          success: result.success,
          operation: result.operation,
          tool: decision.tool
        });

        return result;

      } catch (error) {
        console.error("[Generation] Error:", error);
        
        // Return standardized error response
        return {
          success: false,
          operation: 'create',
          data: null,
          error: {
            code: error instanceof TRPCError ? error.code : 'INTERNAL_ERROR',
            message: error instanceof Error ? error.message : 'An error occurred',
            details: error
          },
          metadata: {
            timestamp: Date.now(),
            affectedIds: [],
            chatResponse: "I encountered an error processing your request. Please try again."
          }
        };
      }
    }),
});