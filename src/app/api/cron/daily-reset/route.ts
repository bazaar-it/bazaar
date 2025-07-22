import { NextRequest, NextResponse } from 'next/server';
import { db } from '~/server/db';
import { userUsage } from '~/server/db/schema';
import { sql, lte, and } from 'drizzle-orm';

/**
 * Cron endpoint for daily usage reset
 * Should be called daily at midnight UTC by Vercel Cron
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron authorization
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET;
    
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      console.warn('🚫 [DailyReset] Unauthorized cron attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔄 [DailyReset] Starting daily usage reset...');
    
    // Get yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(23, 59, 59, 999);
    
    // Option 1: Delete old usage records (keeps DB clean)
    // This approach removes usage records older than 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const deletedResult = await db.delete(userUsage)
      .where(lte(userUsage.date, sevenDaysAgo.toISOString().split('T')[0]));
    
    console.log(`🗑️ [DailyReset] Deleted ${deletedResult.rowCount} old usage records`);
    
    // The daily reset is handled automatically by the UsageService
    // which checks the date and creates new records for today
    // No need to reset userCredits.dailyResetAt as it's handled per-user
    
    console.log('✅ [DailyReset] Daily reset completed successfully');

    return NextResponse.json({
      success: true,
      deletedRecords: deletedResult.rowCount,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [DailyReset] Daily reset failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}