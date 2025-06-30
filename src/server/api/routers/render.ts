import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { prepareRenderConfig } from "~/server/services/render/render.service";
import { renderVideoOnLambda } from "~/server/services/render/lambda-cli.service";
import { renderState } from "~/server/services/render/render-state";
import { ExportTrackingService } from "~/server/services/render/export-tracking.service";
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
          
          // Track export in database
          const totalDuration = project.scenes.reduce((sum, scene) => sum + (scene.duration || 150), 0);
          await ExportTrackingService.trackExportStart({
            userId: ctx.session.user.id,
            projectId: input.projectId,
            renderId: result.renderId,
            format: input.format,
            quality: input.quality,
            duration: totalDuration,
          });
          
          // Update state if we got an output URL immediately
          if (result.outputUrl) {
            renderState.set(result.renderId, {
              ...renderState.get(result.renderId)!,
              status: 'completed',
              progress: 100,
              outputUrl: result.outputUrl,
            });
            
            // Update database tracking
            await ExportTrackingService.updateExportStatus({
              renderId: result.renderId,
              status: 'completed',
              progress: 100,
              outputUrl: result.outputUrl,
            });
          }
          
          return { renderId: result.renderId };
        } catch (error) {
          // Lambda not set up yet - provide helpful error message
          console.error("[Render] Lambda render failed:", error);
          
          // Check for specific missing configurations
          const missingConfigs = [];
          if (!process.env.AWS_REGION) missingConfigs.push("AWS_REGION");
          if (!process.env.REMOTION_FUNCTION_NAME) missingConfigs.push("REMOTION_FUNCTION_NAME");
          if (!process.env.REMOTION_BUCKET_NAME) missingConfigs.push("REMOTION_BUCKET_NAME");
          
          if (missingConfigs.length > 0) {
            throw new TRPCError({
              code: 'PRECONDITION_FAILED',
              message: `Export configuration missing: ${missingConfigs.join(", ")}. Please contact your administrator.`,
            });
          }
          
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: "Video export is temporarily unavailable. Please try again later or contact support.",
          });
        }
      } else {
        // Lambda is required for production
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: "Video export is not enabled. Please set RENDER_MODE=lambda in your environment configuration.",
        });
      }
    }),

  // Get render status
  getRenderStatus: protectedProcedure
    .input(z.object({ renderId: z.string() }))
    .query(async ({ ctx, input }) => {
      console.log(`[getRenderStatus] Checking status for render ID: ${input.renderId}`);
      const job = renderState.get(input.renderId);
      
      if (!job) {
        console.log(`[Render] Job ${input.renderId} not found in render state`);
        console.log(`[Render] Active render IDs:`, Array.from(renderState.getAllIds()));
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: "Render job not found",
        });
      }
      
      console.log(`[getRenderStatus] Found job:`, {
        id: job.id,
        status: job.status,
        progress: job.progress,
        outputUrl: job.outputUrl,
      });

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
          const progress = await getLambdaRenderProgress(input.renderId, job.bucketName, job.projectId, job.format);
          
          // Update local state with latest progress
          if (progress.done) {
            renderState.set(input.renderId, {
              ...job,
              status: 'completed',
              progress: 100,
              outputUrl: progress.outputFile || undefined,
            });
            
            // Update database tracking
            await ExportTrackingService.updateExportStatus({
              renderId: input.renderId,
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
            
            // Update database tracking
            await ExportTrackingService.updateExportStatus({
              renderId: input.renderId,
              status: 'failed',
              error: progress.errors[0]?.message || "Unknown error",
            });
          } else {
            const currentProgress = Math.round((progress.overallProgress || 0) * 100);
            renderState.set(input.renderId, {
              ...job,
              progress: currentProgress,
              isFinalizingFFmpeg: progress.encodedFrames === progress.renderedFrames && progress.overallProgress < 1,
            });
            
            // Update database tracking periodically (every 10% progress)
            if (currentProgress % 10 === 0 && currentProgress !== job.progress) {
              await ExportTrackingService.updateExportStatus({
                renderId: input.renderId,
                status: 'rendering',
                progress: currentProgress,
              });
            }
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

      const response = {
        status: job.status,
        progress: job.progress,
        error: job.error,
        outputUrl: job.outputUrl,
        isFinalizingFFmpeg: job.isFinalizingFFmpeg,
      };
      
      console.log(`[getRenderStatus] Returning response:`, response);
      return response;
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
    
  // Get user export statistics
  getExportStats: protectedProcedure
    .query(async ({ ctx }) => {
      return await ExportTrackingService.getUserExportStats(ctx.session.user.id);
    }),
    
  // Track download when user clicks download link
  trackDownload: protectedProcedure
    .input(z.object({ renderId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // In Next.js app router, headers are available from ctx.headers
      const userAgent = ctx.headers.get('user-agent') || undefined;
      const ipAddress = ctx.headers.get('x-forwarded-for') || ctx.headers.get('x-real-ip') || undefined;
      
      return await ExportTrackingService.trackDownload(
        input.renderId,
        userAgent,
        ipAddress
      );
    }),
}); 