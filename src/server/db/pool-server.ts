// src/server/db/pool-server.ts
// This file should only be imported in server-side code
import 'server-only'; // This will throw an error if imported client-side

import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { env } from "~/env";
import * as schema from "./schema";

// Import and configure WebSocket
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';

// Configure WebSocket for pooling
neonConfig.webSocketConstructor = ws;

// Global pool instance
let globalPool: Pool | undefined;
let globalDb: ReturnType<typeof drizzle<typeof schema>> | undefined;

/**
 * Get or create the connection pool (server-side only)
 */
export function getServerPool(): Pool {
  if (!globalPool) {
    console.log('[DB Pool Server] Creating new connection pool');
    globalPool = new Pool({
      connectionString: env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    // Connection monitoring
    let connectCount = 0;
    globalPool.on('connect', () => {
      connectCount++;
      console.log(`[DB Pool Server] Connection established (#${connectCount})`);
    });
    
    globalPool.on('error', (err) => {
      console.error('[DB Pool Server] Pool error:', err);
    });
  }
  return globalPool;
}

/**
 * Get the pooled database instance (server-side only)
 */
export function getServerPooledDb() {
  if (!globalDb) {
    console.log('[DB Pool Server] Creating pooled Drizzle instance');
    const pool = getServerPool();
    globalDb = drizzle(pool, { schema });
  }
  return globalDb;
}