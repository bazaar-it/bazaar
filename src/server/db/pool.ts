// src/server/db/pool.ts
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import { env } from "~/env";
import * as schema from "./schema";

// Configure Neon to use WebSockets for connection pooling
import { neonConfig } from '@neondatabase/serverless';
neonConfig.webSocketConstructor = ws;

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

    // Log pool events in development
    if (process.env.NODE_ENV === 'development') {
      globalPool.on('connect', () => console.log('[DB Pool] New connection established'));
      globalPool.on('remove', () => console.log('[DB Pool] Connection removed from pool'));
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