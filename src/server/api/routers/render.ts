import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { prepareRenderConfig } from "~/server/services/render/render.service";
import { renderVideoOnLambda } from "~/server/services/render/lambda-cli.service";
import { renderState } from "~/server/services/render/render-state";
import crypto from "crypto";

// User quota limits
const USER_DAILY_EXPORT_LIMIT = parseInt(process.env.USER_DAILY_EXPORT_LIMIT || '10');
const MAX_RENDER_DURATION_MINUTES = parseInt(process.env.MAX_RENDER_DURATION_MINUTES || '30');

// Future-ready: Check if we're using Lambda
const isLambda = process.env.RENDER_MODE === 'lambda';

export const renderRouter = createTRPCRouter({
  // Start a new render job
  startRender: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      format: z.enum(['mp4', 'webm', 'gif']).default('mp4'),
      quality: z.enum(['low', 'medium', 'high']).default('high'),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check daily quota
      const todayRenderCount = renderState.getUserTodayRenderCount(ctx.session.user.id);
      if (todayRenderCount >= USER_DAILY_EXPORT_LIMIT) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: `Daily export limit reached (${USER_DAILY_EXPORT_LIMIT} exports per day). Try again tomorrow!`,
        });
      }

      // For MVP: Only one render at a time globally
      if (!isLambda && renderState.isRendering()) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: "Server is busy rendering another video. Please try again in a few minutes.",
        });
      }

      // Check if user already has a render in progress
      if (renderState.userHasActiveRender(ctx.session.user.id)) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: "You already have a render in progress. Please wait for it to complete.",
        });
      }

      // Get project with scenes
      const project = await ctx.db.query.projects.findFirst({
        where: (projects, { eq, and }) => and(
          eq(projects.id, input.projectId),
          eq(projects.userId, ctx.session.user.id)
        ),
        with: {
          scenes: {
            orderBy: (scenes, { asc }) => asc(scenes.order),
          },
        },
      });

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: "Project not found",
        });
      }

      if (!project.scenes || project.scenes.length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: "Project has no scenes to render",
        });
      }

      // Estimate duration and check limits
      const estimatedDuration = project.scenes.reduce((sum, scene) => {
        return sum + (scene.duration || 150); // Default 5 seconds
      }, 0) / 30 / 60; // Convert frames to minutes (assuming 30fps)

      if (estimatedDuration > MAX_RENDER_DURATION_MINUTES) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Video too long (${Math.round(estimatedDuration)} minutes). Maximum allowed: ${MAX_RENDER_DURATION_MINUTES} minutes.`,
        });
      }

      const renderId = crypto.randomUUID();

      // Prepare render configuration
      const renderConfig = prepareRenderConfig({
        projectId: input.projectId,
        scenes: project.scenes,
        format: input.format,
        quality: input.quality,
      });

      if (isLambda) {
        try {
          // Attempt Lambda render
          const result = await renderVideoOnLambda({
            ...renderConfig,
            webhookUrl: `${process.env.NEXTAUTH_URL}/api/webhooks/render`,
          });
          
          // Store in state for tracking
          renderState.set(result.renderId, {
            id: result.renderId,
            status: 'rendering',
            progress: 0,
            userId: ctx.session.user.id,
            projectId: input.projectId,
            format: input.format,
            quality: input.quality,
            createdAt: Date.now(),
            bucketName: result.bucketName,
          });
          
          // Update state if we got an output URL immediately
          if (result.outputUrl) {
            renderState.set(result.renderId, {
              ...renderState.get(result.renderId)!,
              outputUrl: result.outputUrl,
            });
          }
          
          return { renderId: result.renderId };
        } catch (error) {
          // Lambda not set up yet
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: "Video export requires AWS Lambda setup. Please contact support or follow the setup guide.",
          });
        }
      } else {
        // Lambda is required for production
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: "Video export is currently being set up. Please try again later or contact support.",
        });
      }
    }),

  // Get render status
  getRenderStatus: protectedProcedure
    .input(z.object({ renderId: z.string() }))
    .query(async ({ ctx, input }) => {
      const job = renderState.get(input.renderId);
      
      if (!job) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: "Render job not found",
        });
      }

      // Security check
      if (job.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: "Access denied",
        });
      }

      // If using Lambda and job is still rendering, check real-time progress
      if (isLambda && job.status === 'rendering' && job.bucketName) {
        try {
          const { getLambdaRenderProgress } = await import("~/server/services/render/lambda-cli.service");
          const progress = await getLambdaRenderProgress(input.renderId, job.bucketName);
          
          // Update local state with latest progress
          if (progress.done) {
            renderState.set(input.renderId, {
              ...job,
              status: 'completed',
              progress: 100,
              outputUrl: progress.outputFile || undefined,
            });
          } else if (progress.errors && progress.errors.length > 0) {
            renderState.set(input.renderId, {
              ...job,
              status: 'failed',
              error: progress.errors[0]?.message || "Unknown error",
            });
          } else {
            renderState.set(input.renderId, {
              ...job,
              progress: Math.round((progress.overallProgress || 0) * 100),
              isFinalizingFFmpeg: progress.encodedFrames === progress.renderedFrames && progress.overallProgress < 1,
            });
          }
          
          // Get updated job
          const updatedJob = renderState.get(input.renderId)!;
          
          return {
            status: updatedJob.status,
            progress: updatedJob.progress,
            error: updatedJob.error,
            outputUrl: updatedJob.outputUrl,
            isFinalizingFFmpeg: updatedJob.isFinalizingFFmpeg,
          };
        } catch (error) {
          console.error("[Render] Failed to check Lambda progress:", error);
          // Fall through to return cached state
        }
      }

      return {
        status: job.status,
        progress: job.progress,
        error: job.error,
        outputUrl: job.outputUrl,
        isFinalizingFFmpeg: job.isFinalizingFFmpeg,
      };
    }),

  // List user's recent renders
  listRenders: protectedProcedure
    .query(async ({ ctx }) => {
      const renders = renderState.getUserRenders(ctx.session.user.id);
      
      // Return last 10 renders
      return renders.slice(0, 10).map(job => ({
        id: job.id,
        projectId: job.projectId,
        status: job.status,
        format: job.format,
        quality: job.quality,
        createdAt: new Date(job.createdAt).toISOString(),
        progress: job.progress,
      }));
    }),
}); 