// src/server/db/pool.ts
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { env } from "~/env";
import * as schema from "./schema";

// Configure Neon to use WebSockets for connection pooling
import { neonConfig } from '@neondatabase/serverless';

// Only set up WebSocket in Node.js environment
if (typeof window === 'undefined' && typeof global !== 'undefined') {
  // Dynamically import ws only on server side
  const setupWebSocket = async () => {
    try {
      const ws = await import('ws');
      neonConfig.webSocketConstructor = ws.default || ws;
      console.log('[DB Pool] WebSocket configured successfully');
    } catch (error) {
      console.error('[DB Pool] Failed to configure WebSocket:', error);
      // Fall back to fetch-based pooling
      neonConfig.poolQueryViaFetch = true;
    }
  };
  
  // Execute the setup
  setupWebSocket();
} else {
  // Use fetch-based pooling in non-Node environments
  neonConfig.poolQueryViaFetch = true;
}

// Global pool instance for connection reuse
let globalPool: Pool | undefined;
let globalDb: ReturnType<typeof drizzle<typeof schema>> | undefined;

/**
 * Get or create a connection pool
 * This maintains persistent connections that can be reused
 */
function getPool(): Pool {
  if (!globalPool) {
    console.log('[DB Pool] Creating new connection pool');
    globalPool = new Pool({
      connectionString: env.DATABASE_URL,
      // Pool configuration
      max: 10, // Maximum number of connections in the pool
      idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
      connectionTimeoutMillis: 10000, // Timeout for new connections
    });

    // Log pool events for monitoring
    let connectCount = 0;
    let queryCount = 0;
    
    globalPool.on('connect', () => {
      connectCount++;
      console.log(`[DB Pool] New connection established (#${connectCount})`);
    });
    
    globalPool.on('remove', () => {
      console.log('[DB Pool] Connection removed from pool');
    });
    
    // Log pool stats periodically in development
    if (process.env.NODE_ENV === 'development') {
      setInterval(() => {
        if (queryCount > 0) {
          console.log(`[DB Pool Stats] Connections: ${connectCount}, Queries: ${queryCount}, Avg queries/connection: ${(queryCount / connectCount).toFixed(1)}`);
        }
      }, 30000); // Every 30 seconds
    }
    
    // Monkey-patch to count queries (development only)
    if (process.env.NODE_ENV === 'development') {
      const originalQuery = globalPool.query.bind(globalPool);
      globalPool.query = function(...args: any[]) {
        queryCount++;
        return originalQuery(...args);
      };
    }
  }
  return globalPool;
}

/**
 * Get the pooled database instance
 * This reuses connections from the pool for all queries
 */
export function getPooledDb() {
  if (!globalDb) {
    console.log('[DB Pool] Creating Drizzle instance with connection pool');
    const pool = getPool();
    globalDb = drizzle(pool, { schema });
  }
  return globalDb;
}

/**
 * Execute a query with the pooled connection
 * This automatically handles connection acquisition and release
 */
export async function withPool<T>(
  operation: (db: ReturnType<typeof drizzle<typeof schema>>) => Promise<T>
): Promise<T> {
  const db = getPooledDb();
  return operation(db);
}

// Export for use in API routes that can benefit from pooling
export const pooledDb = getPooledDb();