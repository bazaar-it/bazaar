// src/server/db/index.ts
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { neon, neonConfig } from "@neondatabase/serverless";

import { env } from "~/env";
import * as schema from "./schema";

// Setup and export the database connection
export const db = (() => {
  try {
    console.log("Initializing Neon database connection");
    
    // Use custom fetch options directly in the neon connection
    const sql = neon(env.DATABASE_URL, { 
      fetchOptions: { 
        keepalive: true,
        timeout: 10000 // 10 seconds
      }
    });
    
    return drizzleNeon(sql, { schema });
  } catch (error) {
    console.error("Failed to initialize database connection:", error);
    // Return a dummy DB instance that will throw clear errors
    // This prevents app from crashing on startup, but will throw proper errors when used
    return drizzleNeon(neon("postgresql://user:password@localhost:5432/dummy"), { schema });
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
  initialDelay = 100
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
          // Neon specific errors
          error.message.includes('Error connecting to database') ||
          error.message.includes('Connection terminated unexpectedly')
        );
      
      if (!isTransientError || attempt === maxRetries) {
        // Not a transient error or we've exhausted our retries
        throw error;
      }
      
      console.warn(`Database operation failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms:`, 
        error instanceof Error ? error.message : String(error));
      
      // Exponential backoff with jitter
      await new Promise(resolve => setTimeout(resolve, delay + Math.random() * 50));
      delay *= 2; // Exponential backoff
    }
  }
  
  // This should never be reached due to the throw in the loop, but TypeScript needs it
  throw lastError;
}

// Export schema for use in other files
export * from './schema';
