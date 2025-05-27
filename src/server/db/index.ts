// src/server/db/index.ts
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { neon, neonConfig } from "@neondatabase/serverless";

import { env } from "~/env";
import * as schema from "./schema";

// Recommended by Neon for Drizzle to cache connection details.
neonConfig.fetchConnectionCache = true;

// Augment the NodeJS global type for HMR-proofing in development
declare global {
  // eslint-disable-next-line no-var
  var __drizzleNeonClient__: ReturnType<typeof drizzleNeon<typeof schema>> | undefined;
}

const createDbConnection = () => {
  // console.log("Creating new Neon database connection instance"); 
  const sql = neon(env.DATABASE_URL, {
    fetchOptions: {
      keepalive: true,
      timeout: 30000, // 30 seconds (increased from 10)
    },
  });
  return drizzleNeon(sql, { schema });
};

const createDummyDbConnection = () => {
  // console.warn("Falling back to dummy Neon database connection instance"); 
  const dummySql = neon("postgresql://user:password@localhost:5432/dummy");
  return drizzleNeon(dummySql, { schema });
};

let dbConnectionInstance: ReturnType<typeof drizzleNeon<typeof schema>>;

if (process.env.NODE_ENV === "production") {
  try {
    console.log("Initializing Neon database connection for PRODUCTION");
    dbConnectionInstance = createDbConnection();
  } catch (error) {
    console.error("Failed to initialize database connection for PRODUCTION:", error);
    dbConnectionInstance = createDummyDbConnection();
  }
} else {
  // Development: cache the connection on the global object to reuse across HMR reloads.
  if (!global.__drizzleNeonClient__) {
    console.log("Initializing Neon database connection for DEVELOPMENT (new global instance)");
    try {
      global.__drizzleNeonClient__ = createDbConnection();
    } catch (error) {
      console.error("Failed to initialize globally cached database connection for DEVELOPMENT:", error);
      global.__drizzleNeonClient__ = createDummyDbConnection();
    }
  } else {
    console.log("Reusing existing Neon database connection for DEVELOPMENT from global cache");
  }
  dbConnectionInstance = global.__drizzleNeonClient__;
}

export const db = dbConnectionInstance;

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
