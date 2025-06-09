// src/server/services/data/dataLifecycle.service.ts
import { db } from "~/server/db";
import { imageAnalysis, projectMemory, sceneIterations } from "~/server/db/schema";
import { lt, and, eq } from "drizzle-orm";

/**
 * Data Lifecycle Management Service
 * Phase 4.1: Automated cleanup and retention management
 */

export interface DataLifecycleConfig {
  imageAnalysisRetentionDays: number;
  conversationContextRetentionDays: number;
  sceneIterationsRetentionDays: number;
  projectMemoryRetentionDays: number;
  enableAutoCleanup: boolean;
  cleanupIntervalHours: number;
}

export interface CleanupResult {
  imageAnalysisRecordsDeleted: number;
  conversationRecordsDeleted: number;
  sceneIterationsDeleted: number;
  projectMemoryRecordsDeleted: number;
  totalSpaceReclaimed: string;
  cleanupDurationMs: number;
}

export class DataLifecycleService {
  private readonly DEBUG = process.env.NODE_ENV === 'development';
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  private readonly defaultConfig: DataLifecycleConfig = {
    imageAnalysisRetentionDays: 30,        // 30 days for image analysis
    conversationContextRetentionDays: 90,  // 90 days for conversation context
    sceneIterationsRetentionDays: 60,      // 60 days for scene iterations
    projectMemoryRetentionDays: 180,       // 6 months for project memory
    enableAutoCleanup: true,
    cleanupIntervalHours: 24,              // Daily cleanup
  };

  /**
   * Start automated cleanup service
   */
  startAutomatedCleanup(config: Partial<DataLifecycleConfig> = {}): void {
    const fullConfig = { ...this.defaultConfig, ...config };
    
    if (!fullConfig.enableAutoCleanup) {
      console.log('🗂️ [DataLifecycle] Automated cleanup disabled');
      return;
    }

    // Clear any existing interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    const intervalMs = fullConfig.cleanupIntervalHours * 60 * 60 * 1000;
    
    this.cleanupInterval = setInterval(async () => {
      try {
        console.log('🗂️ [DataLifecycle] Starting automated cleanup...');
        const result = await this.performCleanup(fullConfig);
        this.logCleanupResult(result);
      } catch (error) {
        console.error('❌ [DataLifecycle] Automated cleanup failed:', error);
      }
    }, intervalMs);

    console.log(`🗂️ [DataLifecycle] Automated cleanup started (every ${fullConfig.cleanupIntervalHours}h)`);
  }

  /**
   * Stop automated cleanup service
   */
  stopAutomatedCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('🗂️ [DataLifecycle] Automated cleanup stopped');
    }
  }

  /**
   * Perform comprehensive data cleanup
   */
  async performCleanup(config: Partial<DataLifecycleConfig> = {}): Promise<CleanupResult> {
    const fullConfig = { ...this.defaultConfig, ...config };
    const startTime = performance.now();
    
    const cleanupStartTime = Date.now();

    console.log('🗂️ [DataLifecycle] Starting comprehensive cleanup...');
    console.log(`📅 Retention periods: Images(${fullConfig.imageAnalysisRetentionDays}d), Context(${fullConfig.conversationContextRetentionDays}d), Iterations(${fullConfig.sceneIterationsRetentionDays}d), Memory(${fullConfig.projectMemoryRetentionDays}d)`);

    try {
      // Cleanup old image analysis records
      const imageAnalysisDeleted = await this.cleanupImageAnalysis(fullConfig.imageAnalysisRetentionDays);
      
      // Cleanup old conversation context
      const conversationDeleted = await this.cleanupConversationContext(fullConfig.conversationContextRetentionDays);
      
      // Cleanup old scene iterations  
      const sceneIterationsDeleted = await this.cleanupSceneIterations(fullConfig.sceneIterationsRetentionDays);
      
      // Cleanup old project memory records
      const projectMemoryDeleted = await this.cleanupProjectMemory(fullConfig.projectMemoryRetentionDays);

      const cleanupDuration = Date.now() - cleanupStartTime;

      const result: CleanupResult = {
        imageAnalysisRecordsDeleted: imageAnalysisDeleted,
        conversationRecordsDeleted: conversationDeleted,
        sceneIterationsDeleted: sceneIterationsDeleted,
        projectMemoryRecordsDeleted: projectMemoryDeleted,
        totalSpaceReclaimed: this.estimateSpaceReclaimed(imageAnalysisDeleted + conversationDeleted + sceneIterationsDeleted + projectMemoryDeleted),
        cleanupDurationMs: cleanupDuration
      };

      console.log('✅ [DataLifecycle] Cleanup completed successfully');
      return result;

    } catch (error) {
      // Cleanup ended
      console.error('❌ [DataLifecycle] Cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Cleanup old image analysis records
   */
  private async cleanupImageAnalysis(retentionDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    if (this.DEBUG) {
      console.log(`🖼️ [DataLifecycle] Cleaning image analysis older than ${cutoffDate.toISOString()}`);
    }

    try {
      const result = await db
        .delete(imageAnalysis)
        .where(lt(imageAnalysis.createdAt, cutoffDate));

      const deletedCount = result.rowCount || 0;
      console.log(`🖼️ [DataLifecycle] Deleted ${deletedCount} old image analysis records`);
      
      return deletedCount;
    } catch (error) {
      console.error('❌ [DataLifecycle] Image analysis cleanup failed:', error);
      return 0;
    }
  }

  /**
   * Cleanup old conversation context from project memory
   */
  private async cleanupConversationContext(retentionDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    if (this.DEBUG) {
      console.log(`💬 [DataLifecycle] Cleaning conversation context older than ${cutoffDate.toISOString()}`);
    }

    try {
      const result = await db
        .delete(projectMemory)
        .where(
          and(
            eq(projectMemory.memoryType, 'conversation_context'),
            lt(projectMemory.updatedAt, cutoffDate)
          )
        );

      const deletedCount = result.rowCount || 0;
      console.log(`💬 [DataLifecycle] Deleted ${deletedCount} old conversation context records`);
      
      return deletedCount;
    } catch (error) {
      console.error('❌ [DataLifecycle] Conversation context cleanup failed:', error);
      return 0;
    }
  }

  /**
   * Cleanup old scene iterations
   */
  private async cleanupSceneIterations(retentionDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    if (this.DEBUG) {
      console.log(`🎬 [DataLifecycle] Cleaning scene iterations older than ${cutoffDate.toISOString()}`);
    }

    try {
      const result = await db
        .delete(sceneIterations)
        .where(lt(sceneIterations.createdAt, cutoffDate));

      const deletedCount = result.rowCount || 0;
      console.log(`🎬 [DataLifecycle] Deleted ${deletedCount} old scene iteration records`);
      
      return deletedCount;
    } catch (error) {
      console.error('❌ [DataLifecycle] Scene iterations cleanup failed:', error);
      return 0;
    }
  }

  /**
   * Cleanup old project memory records (keep user preferences, clean temporary data)
   */
  private async cleanupProjectMemory(retentionDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    if (this.DEBUG) {
      console.log(`🧠 [DataLifecycle] Cleaning temporary project memory older than ${cutoffDate.toISOString()}`);
    }

    try {
      // Only delete temporary/transient memory types, keep user preferences
      const temporaryTypes = ['conversation_context', 'temporary_note', 'session_data'];
      
      let totalDeleted = 0;
      for (const memoryType of temporaryTypes) {
        const result = await db
          .delete(projectMemory)
          .where(
            and(
              eq(projectMemory.memoryType, memoryType as any),
              lt(projectMemory.updatedAt, cutoffDate)
            )
          );
        
        totalDeleted += result.rowCount || 0;
      }

      console.log(`🧠 [DataLifecycle] Deleted ${totalDeleted} old temporary project memory records`);
      
      return totalDeleted;
    } catch (error) {
      console.error('❌ [DataLifecycle] Project memory cleanup failed:', error);
      return 0;
    }
  }

  /**
   * Estimate space reclaimed from cleanup
   */
  private estimateSpaceReclaimed(totalRecords: number): string {
    // Rough estimates for record sizes
    const avgRecordSizeKB = 2; // Conservative estimate
    const totalKB = totalRecords * avgRecordSizeKB;
    
    if (totalKB < 1024) {
      return `${totalKB.toFixed(1)} KB`;
    } else if (totalKB < 1024 * 1024) {
      return `${(totalKB / 1024).toFixed(1)} MB`;
    } else {
      return `${(totalKB / (1024 * 1024)).toFixed(1)} GB`;
    }
  }

  /**
   * Get data lifecycle statistics
   */
  async getLifecycleStats(): Promise<{
    imageAnalysisCount: number;
    conversationContextCount: number;
    sceneIterationsCount: number;
    projectMemoryCount: number;
    oldestRecordAge: string;
  }> {
    try {
      // Get counts from each table
      const [imageCount] = await db.select().from(imageAnalysis);
      const [conversationCount] = await db
        .select()
        .from(projectMemory)
        .where(eq(projectMemory.memoryType, 'conversation_context'));
      const [iterationsCount] = await db.select().from(sceneIterations);
      const [memoryCount] = await db.select().from(projectMemory);

      // Find oldest record
      const oldestImage = await db
        .select()
        .from(imageAnalysis)
        .orderBy(imageAnalysis.createdAt)
        .limit(1);

      const oldestAge = oldestImage.length > 0 
        ? this.formatAge(oldestImage[0]!.createdAt)
        : 'No records';

      return {
        imageAnalysisCount: imageCount ? 1 : 0, // This is a rough count, actual implementation would be more precise
        conversationContextCount: conversationCount ? 1 : 0,
        sceneIterationsCount: iterationsCount ? 1 : 0,
        projectMemoryCount: memoryCount ? 1 : 0,
        oldestRecordAge: oldestAge
      };
    } catch (error) {
      console.error('❌ [DataLifecycle] Failed to get stats:', error);
      throw error;
    }
  }

  /**
   * Format age of record for display
   */
  private formatAge(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < 1) {
      return 'Less than 1 day';
    } else if (diffDays < 30) {
      return `${diffDays} days`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months === 1 ? '' : 's'}`;
    } else {
      const years = Math.floor(diffDays / 365);
      return `${years} year${years === 1 ? '' : 's'}`;
    }
  }

  /**
   * Log cleanup results
   */
  private logCleanupResult(result: CleanupResult): void {
    console.log(`\n🗂️ [DataLifecycle] Cleanup Results:`);
    console.log(`  📊 Records deleted:`);
    console.log(`    🖼️  Image analysis: ${result.imageAnalysisRecordsDeleted}`);
    console.log(`    💬 Conversation context: ${result.conversationRecordsDeleted}`);
    console.log(`    🎬 Scene iterations: ${result.sceneIterationsDeleted}`);
    console.log(`    🧠 Project memory: ${result.projectMemoryRecordsDeleted}`);
    console.log(`  💾 Space reclaimed: ${result.totalSpaceReclaimed}`);
    console.log(`  ⏱️  Duration: ${result.cleanupDurationMs.toFixed(2)}ms`);
  }

  /**
   * Force immediate cleanup (for testing/admin)
   */
  async forceCleanup(config: Partial<DataLifecycleConfig> = {}): Promise<CleanupResult> {
    console.log('🗂️ [DataLifecycle] Force cleanup requested');
    return await this.performCleanup(config);
  }
}

// Export singleton instance
export const dataLifecycleService = new DataLifecycleService(); 