//src/server/workers/generateComponentCode.enhancement.ts

import { customComponentJobs } from '~/lib/db/schema';
import { eq } from 'drizzle-orm';
import { db } from '~/lib/db';
import { isErrorFixableByPreprocessor } from '~/server/utils/tsxPreprocessor';
import logger from '~/lib/logger';

/**
 * Enhanced error handling for component generation to identify fixable errors
 */
export async function handleComponentGenerationError(
  jobId: string, 
  error: Error, 
  tsxCode?: string
): Promise<void> {
  logger.error(`Component generation error for job ${jobId}: ${error.message}`);
  
  // Default to failed status
  let status: 'failed' | 'fixable' = 'failed';
  
  // If we have code, check if the error is fixable
  if (tsxCode) {
    const isFixable = isErrorFixableByPreprocessor(error, tsxCode);
    if (isFixable) {
      status = 'fixable';
      logger.info(`Error in component ${jobId} is fixable, marking as 'fixable'`);
    }
  }
  
  // Update the job status
  await db.update(customComponentJobs)
    .set({ 
      status,
      errorMessage: error.message,
      // Store the original TSX code for later fixing
      originalTsxCode: tsxCode,
      updatedAt: new Date()
    })
    .where(eq(customComponentJobs.id, jobId));
}

/**
 * Implementation guide:
 * 
 * Replace the existing error handling in processComponentJob with this:
 * 
 * ```typescript
 * try {
 *   // Existing code...
 * } catch (error) {
 *   await handleComponentGenerationError(
 *     jobId, 
 *     error instanceof Error ? error : new Error(String(error)), 
 *     tsxCode
 *   );
 *   return false;
 * }
 * ```
 */
