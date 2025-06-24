import { NextResponse } from 'next/server';
import { db } from '~/server/db';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Test the pooled connection
    const start = Date.now();
    
    // Run a simple query to test the connection
    const result = await db.execute(sql`SELECT current_timestamp, current_database()`);
    
    const queryTime = Date.now() - start;
    
    return NextResponse.json({
      success: true,
      connectionType: 'WebSocket Pooled',
      queryTime: `${queryTime}ms`,
      timestamp: new Date().toISOString(),
      database: result.rows[0],
      message: 'Connection pooling is active! Check server logs for pool statistics.'
    });
  } catch (error) {
    console.error('[Test Pool] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      connectionType: 'Failed',
    }, { status: 500 });
  }
}