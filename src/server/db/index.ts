// src/server/db/index.ts
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import postgres from "postgres";
import { neon, neonConfig } from "@neondatabase/serverless";

import { env } from "~/env";
import * as schema from "./schema";

/**
 * Cache the database connection in development. This avoids creating a new connection on every HMR
 * update.
 */
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

// Configure Neon to cache connections
neonConfig.fetchConnectionCache = true;

export const db = (() => {
  // For production with Vercel, use the Neon serverless driver
  if (env.NODE_ENV === "production") {
    // Use Neon serverless driver in production (edge-compatible)
    const sql = neon(env.DATABASE_URL);
    return drizzleNeon(sql, { schema });
  }
  
  // In development, use connection pooling with postgres.js
  if (!globalForDb.conn) {
    globalForDb.conn = postgres(env.DATABASE_URL);
  }
  return drizzlePostgres(globalForDb.conn, { schema });
})();

// Export schema for use in other files
export * from './schema';
