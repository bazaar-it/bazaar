import { NextResponse } from 'next/server';
import { auth } from '~/server/auth';
import { apiKeyRotation } from '~/server/services/ai/apiKeyRotation.service';
import { simpleRateLimiter } from '~/server/services/ai/simpleRateLimiter';
import { aiMonitoring } from '~/server/services/ai/monitoring.service';

export async function GET() {
  try {
    // Check if user is authenticated and admin
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // For now, allow any authenticated user to view health (you can restrict to admins later)
    
    // Get health status from all services
    const [keyHealth, queueStats, monitoringHealth] = await Promise.all([
      apiKeyRotation.getKeysHealth(),
      Promise.resolve(simpleRateLimiter.getStats()),
      aiMonitoring.getHealthStatus(),
    ]);
    
    const statistics = await aiMonitoring.getStatistics('hour');
    
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        apiKeys: keyHealth,
        rateLimiter: queueStats,
        monitoring: monitoringHealth,
      },
      statistics,
    });
  } catch (error) {
    console.error('[AI Health] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get health status' },
      { status: 500 }
    );
  }
}