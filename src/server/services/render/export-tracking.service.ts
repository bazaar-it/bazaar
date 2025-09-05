import { db } from "~/server/db";
import { exports, exportAnalytics } from "~/server/db/schema";
import { eq, and, sql, gte } from "drizzle-orm";

interface TrackExportParams {
  userId: string;
  projectId: string;
  renderId: string;
  format: 'mp4' | 'webm' | 'gif';
  quality: 'low' | 'medium' | 'high';
  duration?: number;
}

interface UpdateExportStatusParams {
  renderId: string;
  status: 'rendering' | 'completed' | 'failed';
  progress?: number;
  outputUrl?: string;
  fileSize?: number;
  error?: string;
}

interface TrackExportEventParams {
  exportId: string;
  event: 'started' | 'progress' | 'completed' | 'failed' | 'downloaded' | 'viewed';
  eventData?: any;
  userAgent?: string;
  ipAddress?: string;
}

export class ExportTrackingService {
  /**
   * Create a new export record when rendering starts
   */
  static async trackExportStart(params: TrackExportParams) {
    try {
      const result = await db.insert(exports).values({
        id: crypto.randomUUID(), // Explicitly generate UUID
        userId: params.userId,
        projectId: params.projectId,
        renderId: params.renderId,
        status: 'pending',
        format: params.format,
        quality: params.quality,
        duration: params.duration,
        metadata: {
          startTime: new Date().toISOString(),
          userAgent: global.window?.navigator?.userAgent,
        }
      }).returning();

      const exportRecord = result[0];
      
      if (exportRecord) {
        // Track the start event
        await this.trackEvent({
          exportId: exportRecord.id,
          event: 'started',
          eventData: { format: params.format, quality: params.quality }
        });

        console.log(`[ExportTracking] Started tracking export ${exportRecord.id} for render ${params.renderId}`);
        return exportRecord;
      }
      
      return null;
    } catch (error) {
      console.error('[ExportTracking] Failed to track export start:', error);
      // Don't throw - we don't want to block rendering if tracking fails
      return null;
    }
  }

  /**
   * Update export status and progress
   */
  static async updateExportStatus(params: UpdateExportStatusParams) {
    try {
      const updateData: any = {
        status: params.status,
        progress: params.progress,
      };

      if (params.outputUrl) {
        updateData.outputUrl = params.outputUrl;
      }

      if (params.fileSize) {
        updateData.fileSize = params.fileSize;
      }

      if (params.error) {
        updateData.error = params.error;
      }

      if (params.status === 'completed') {
        updateData.completedAt = new Date();
      }

      const [updated] = await db.update(exports)
        .set(updateData)
        .where(eq(exports.renderId, params.renderId))
        .returning();

      if (updated) {
        // Track the status change event
        await this.trackEvent({
          exportId: updated.id,
          event: params.status === 'completed' ? 'completed' : 
                 params.status === 'failed' ? 'failed' : 'progress',
          eventData: { 
            progress: params.progress,
            outputUrl: params.outputUrl,
            error: params.error 
          }
        });
      }

      return updated;
    } catch (error) {
      console.error('[ExportTracking] Failed to update export status:', error);
      return null;
    }
  }

  /**
   * Merge metadata JSON for an export by renderId
   */
  static async updateExportMetadata(renderId: string, metadataPatch: Record<string, any>) {
    try {
      const [updated] = await db.update(exports)
        .set({
          metadata: sql`coalesce(${exports.metadata}, '{}'::jsonb) || ${JSON.stringify(metadataPatch)}::jsonb`
        })
        .where(eq(exports.renderId, renderId))
        .returning();
      return updated;
    } catch (error) {
      console.error('[ExportTracking] Failed to update export metadata:', error);
      return null;
    }
  }

  /**
   * Track when a user downloads an export
   */
  static async trackDownload(renderId: string, userAgent?: string, ipAddress?: string) {
    try {
      const [exportRecord] = await db.update(exports)
        .set({
          downloadCount: sql`${exports.downloadCount} + 1`,
          lastDownloadedAt: new Date()
        })
        .where(eq(exports.renderId, renderId))
        .returning();

      if (exportRecord) {
        await this.trackEvent({
          exportId: exportRecord.id,
          event: 'downloaded',
          userAgent,
          ipAddress
        });
      }

      return exportRecord;
    } catch (error) {
      console.error('[ExportTracking] Failed to track download:', error);
      return null;
    }
  }

  /**
   * Track analytics events
   */
  private static async trackEvent(params: TrackExportEventParams) {
    try {
      await db.insert(exportAnalytics).values({
        id: crypto.randomUUID(), // Explicitly generate UUID to avoid null constraint error
        exportId: params.exportId,
        event: params.event,
        eventData: params.eventData,
        userAgent: params.userAgent,
        ipAddress: params.ipAddress,
      });
    } catch (error) {
      console.error('[ExportTracking] Failed to track event:', error);
    }
  }

  /**
   * Get export stats for a user
   */
  static async getUserExportStats(userId: string) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const stats = await db.select({
        totalExports: sql<number>`count(*)::int`,
        todayExports: sql<number>`count(case when ${exports.createdAt} >= ${today} then 1 end)::int`,
        totalDownloads: sql<number>`coalesce(sum(${exports.downloadCount}), 0)::int`,
        successfulExports: sql<number>`count(case when ${exports.status} = 'completed' then 1 end)::int`,
        failedExports: sql<number>`count(case when ${exports.status} = 'failed' then 1 end)::int`,
      })
      .from(exports)
      .where(eq(exports.userId, userId));

      return stats[0] || {
        totalExports: 0,
        todayExports: 0,
        totalDownloads: 0,
        successfulExports: 0,
        failedExports: 0,
      };
    } catch (error) {
      console.error('[ExportTracking] Failed to get user stats:', error);
      return {
        totalExports: 0,
        todayExports: 0,
        totalDownloads: 0,
        successfulExports: 0,
        failedExports: 0,
      };
    }
  }

  /**
   * Get export by render ID
   */
  static async getExportByRenderId(renderId: string) {
    try {
      const result = await db.select()
        .from(exports)
        .where(eq(exports.renderId, renderId))
        .limit(1);
      
      return result[0];
    } catch (error) {
      console.error('[ExportTracking] Failed to get export by render ID:', error);
      return null;
    }
  }

  /**
   * Get recent exports for a user
   */
  static async getUserRecentExports(userId: string, limit = 10) {
    try {
      return await db.select()
        .from(exports)
        .where(eq(exports.userId, userId))
        .orderBy(sql`${exports.createdAt} desc`)
        .limit(limit);
    } catch (error) {
      console.error('[ExportTracking] Failed to get recent exports:', error);
      return [];
    }
  }
}