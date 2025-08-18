// src/server/db/index.ts
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { env } from "~/env";
import * as schema from "./schema";

// fetchConnectionCache is deprecated and now always true

// Try to use pooling if available, otherwise fall back to HTTP
let db: ReturnType<typeof drizzleNeon<typeof schema>>;

try {
  // Only try pooling on server-side
  if (typeof window === 'undefined') {
    // Try to require the server-only pool module
    const poolModule = require('./pool-server');
    db = poolModule.getServerPooledDb();
    console.log("[DB] ✅ Using WebSocket-based connection pooling");
  } else {
    throw new Error("Client-side execution");
  }
} catch (error) {
  // Fallback to HTTP connection
  // Only log in development
  if (process.env.NODE_ENV === 'development') {
    console.log("[DB] Using HTTP-based connection (pooling not available)");
  }
  const sql = neon(env.DATABASE_URL, {
    fetchOptions: {
      keepalive: true,
      timeout: 30000,
    },
  });
  db = drizzleNeon(sql, { schema });
}

export { db };

// Keep the old HTTP-based connection as a fallback
// Can be used if WebSocket connections fail in certain environments
const createHttpConnection = () => {
  // Only log in development
  if (process.env.NODE_ENV === 'development') {
    console.log("[DB] Creating HTTP-based fallback connection");
  }
  const sql = neon(env.DATABASE_URL, {
    fetchOptions: {
      keepalive: true,
      timeout: 30000, // 30 seconds
    },
  });
  return drizzleNeon(sql, { schema });
};

// Export the HTTP client as a fallback option
// Usage: import { httpDb } from "~/server/db" (only if needed)
export const httpDb = (() => {
  try {
    return createHttpConnection();
  } catch (error) {
    console.error("[DB] Failed to create HTTP fallback connection:", error);
    // Return a dummy connection that will fail on use
    const dummySql = neon("postgresql://user:password@localhost:5432/dummy");
    return drizzleNeon(dummySql, { schema });
  }
})();

/**
 * Execute a database operation with retry logic for transient connection issues
 * @param operation Function that performs the database operation
 * @param maxRetries Maximum number of retry attempts
 * @param initialDelay Initial delay between retries in ms
 * @returns Result of the database operation
 */
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 200
): Promise<T> {
  let lastError: unknown;
  let delay = initialDelay;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Check if this is a connection-related error that might be transient
      const isTransientError = 
        error instanceof Error && 
        (
          // Common network errors
          error.message.includes('ECONNRESET') ||
          error.message.includes('socket hang up') ||
          error.message.includes('connection timeout') ||
          error.message.includes('network error') ||
          error.message.includes('fetch failed') ||
          error.message.includes('Connect Timeout Error') ||
          error.message.includes('UND_ERR_CONNECT_TIMEOUT') ||
          // Neon specific errors
          error.message.includes('Error connecting to database') ||
          error.message.includes('Connection terminated unexpectedly') ||
          error.message.includes('NeonDbError') ||
          error.message.includes('ConnectTimeoutError')
        );
      
      if (!isTransientError || attempt === maxRetries) {
        // Not a transient error or we've exhausted our retries
        throw error;
      }
      
      console.warn(`Database operation failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms:`, 
        error instanceof Error ? error.message : String(error));
      
      // Exponential backoff with jitter
      await new Promise(resolve => setTimeout(resolve, delay + Math.random() * 100));
      delay = Math.min(delay * 2, 5000); // Exponential backoff with max 5s delay
    }
  }
  
  // This should never be reached due to the throw in the loop, but TypeScript needs it
  throw lastError;
}

// Export schema for use in other files
export * from './schema';
