import { NextRequest, NextResponse } from 'next/server';
import { dataLifecycleService } from '~/server/services/data/dataLifecycle.service';

/**
 * Cron endpoint for automated data lifecycle cleanup
 * Called by Vercel Cron or external scheduler
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron authorization (basic security)
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET;
    
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      console.warn('🚫 [DataLifecycle] Unauthorized cron attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🗂️ [DataLifecycle] Cron cleanup started');
    
    // Perform cleanup with production settings
    const result = await dataLifecycleService.performCleanup({
      imageAnalysisRetentionDays: 30,
      conversationContextRetentionDays: 90,
      sceneIterationsRetentionDays: 60,
      projectMemoryRetentionDays: 180,
      enableAutoCleanup: true,
      cleanupIntervalHours: 24
    });

    console.log('✅ [DataLifecycle] Cron cleanup completed successfully');

    return NextResponse.json({
      success: true,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [DataLifecycle] Cron cleanup failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Health check endpoint
export async function POST(request: NextRequest) {
  try {
    // Get lifecycle statistics
    const stats = await dataLifecycleService.getLifecycleStats();
    
    return NextResponse.json({
      status: 'healthy',
      stats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [DataLifecycle] Health check failed:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 