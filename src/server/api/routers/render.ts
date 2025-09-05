import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { prepareRenderConfig } from "~/server/services/render/render.service";
import { renderVideoOnLambda } from "~/server/services/render/lambda-render.service";
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
      playbackSpeed: z.number().min(0.25).max(4).default(1).optional(),
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
      
      // Filter out scenes without code
      const scenesWithCode = project.scenes.filter(scene => {
        if (!scene.tsxCode || scene.tsxCode.trim().length === 0) {
          console.warn(`[Render] Filtering out scene ${scene.id} (${scene.name}) - no code to render`);
          return false;
        }
        return true;
      });
      
      if (scenesWithCode.length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: "No scenes with code to render. Please add content to your scenes.",
        });
      }
      
      if (scenesWithCode.length < project.scenes.length) {
        console.log(`[Render] Filtered ${project.scenes.length - scenesWithCode.length} scenes without code`);
      }

      // Estimate duration and check limits
      const estimatedDuration = scenesWithCode.reduce((sum, scene) => {
        return sum + (scene.duration || 150); // Default 5 seconds
      }, 0) / 30 / 60; // Convert frames to minutes (assuming 30fps)

      if (estimatedDuration > MAX_RENDER_DURATION_MINUTES) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Video too long (${Math.round(estimatedDuration)} minutes). Maximum allowed: ${MAX_RENDER_DURATION_MINUTES} minutes.`,
        });
      }

      const renderId = crypto.randomUUID();

      // Log the scenes we're sending to prepareRenderConfig
      console.log(`[Render] Preparing render config with ${scenesWithCode.length} scenes (filtered from ${project.scenes.length})`);
      scenesWithCode.forEach((scene, idx) => {
        console.log(`[Render] Scene ${idx}:`, {
          id: scene.id,
          name: scene.name,
          hasTsxCode: !!scene.tsxCode,
          tsxCodeLength: scene.tsxCode?.length || 0,
          tsxCodePreview: scene.tsxCode ? scene.tsxCode.substring(0, 100) + '...' : 'none'
        });
      });

      // Prepare render configuration with audio from database
      const renderConfig = await prepareRenderConfig({
        projectId: input.projectId,
        scenes: scenesWithCode,
        format: input.format,
        quality: input.quality,
        playbackSpeed: input.playbackSpeed,
        projectProps: project.props,
        audio: project.audio || undefined, // Get audio from database (convert null to undefined)
      });
      
      // Log what prepareRenderConfig returned
      console.log(`[Render] prepareRenderConfig returned:`);
      renderConfig.scenes.forEach((scene, idx) => {
        console.log(`[Render] Processed scene ${idx}:`, {
          id: scene.id,
          name: scene.name,
          hasJsCode: !!scene.jsCode,
          jsCodeLength: scene.jsCode?.length || 0,
          jsCodePreview: scene.jsCode ? scene.jsCode.substring(0, 100) + '...' : 'none'
        });
      });

      if (isLambda) {
        try {
          // Attempt Lambda render
          const result = await renderVideoOnLambda({
            ...renderConfig,
            webhookUrl: `${process.env.NEXTAUTH_URL}/api/webhooks/render`,
            renderWidth: renderConfig.renderWidth,
            renderHeight: renderConfig.renderHeight,
            audio: renderConfig.audio,
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
          const totalDuration = scenesWithCode.reduce((sum, scene) => sum + (scene.duration || 150), 0);
          await ExportTrackingService.trackExportStart({
            userId: ctx.session.user.id,
            projectId: input.projectId,
            renderId: result.renderId,
            format: input.format,
            quality: input.quality,
            duration: totalDuration,
          });
          
          // Lambda render doesn't return outputUrl immediately
          // It will be available when checking render progress
          
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
      let job = renderState.get(input.renderId);
      
      // If not in memory, check database (handles server restarts in development)
      if (!job) {
        console.log(`[Render] Job ${input.renderId} not found in memory, checking database...`);
        const dbExport = await ExportTrackingService.getExportByRenderId(input.renderId);
        
        if (dbExport && dbExport.userId === ctx.session.user.id) {
          // Reconstruct job from database
          job = {
            id: dbExport.renderId,
            status: dbExport.status as 'pending' | 'rendering' | 'completed' | 'failed',
            progress: dbExport.progress || 0,
            outputUrl: dbExport.outputUrl || undefined,
            error: dbExport.error || undefined,
            userId: dbExport.userId,
            projectId: dbExport.projectId,
            format: dbExport.format as 'mp4' | 'webm' | 'gif',
            quality: dbExport.quality as 'low' | 'medium' | 'high',
            createdAt: dbExport.createdAt.getTime(),
            bucketName: 'remotionlambda-useast1-yb1vzou9i7', // Default bucket
          };
          
          // Re-add to memory state for faster subsequent lookups
          renderState.set(input.renderId, job);
          console.log(`[Render] Restored job ${input.renderId} from database`);
        }
      }
      
      if (!job) {
        console.log(`[Render] Job ${input.renderId} not found in memory or database`);
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
          const { getLambdaRenderProgress } = await import("~/server/services/render/lambda-render.service");
          const progress = await getLambdaRenderProgress(input.renderId, job.bucketName);
          
          console.log(`[getRenderStatus] Lambda progress for ${input.renderId}:`, {
            done: progress.done,
            outputFile: progress.outputFile,
            overallProgress: progress.overallProgress,
            errors: progress.errors
          });
          
          // Update local state with latest progress
          if (progress.done) {
            // The outputFile from Lambda might be a full URL or just a key
            let outputUrl = progress.outputFile || undefined;
            
            if (outputUrl) {
              // If it's already a full S3 URL, use it as-is
              if (outputUrl.startsWith('https://')) {
                // Lambda already returns a complete, valid S3 URL
                // Just use it directly without any modification
                outputUrl = progress.outputFile;
              } else {
                // It's just a key, construct the full URL
                const bucketName = job.bucketName || process.env.REMOTION_BUCKET_NAME || 'remotionlambda-useast1-yb1vzou9i7';
                const region = process.env.AWS_REGION || 'us-east-1';
                outputUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${progress.outputFile}`;
              }
            }
            
            console.log(`[getRenderStatus] Generated output URL: ${outputUrl}`);
            
            renderState.set(input.renderId, {
              ...job,
              status: 'completed',
              progress: 100,
              outputUrl: outputUrl,
            });
            
            // Update database tracking
            await ExportTrackingService.updateExportStatus({
              renderId: input.renderId,
              status: 'completed',
              progress: 100,
              outputUrl: outputUrl,
            });
          } else if (progress.errors && progress.errors.length > 0) {
            const errorMessage = typeof progress.errors[0] === 'string' 
              ? progress.errors[0] 
              : progress.errors[0]?.message || "Unknown error";
            
            renderState.set(input.renderId, {
              ...job,
              status: 'failed',
              error: errorMessage,
            });
            
            // Update database tracking
            await ExportTrackingService.updateExportStatus({
              renderId: input.renderId,
              status: 'failed',
              error: errorMessage,
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