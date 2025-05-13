// src/server/db/index.ts
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { neon, neonConfig } from "@neondatabase/serverless";

import { env } from "~/env";
import * as schema from "./schema";

// Configure Neon to cache connections // DEPRECATED
// neonConfig.fetchConnectionCache = true;

// Ensure DATABASE_URL is set, with a fallback for local/test environments if not provided
// process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test'; 

export const db = (() => {
  // Always use Neon serverless driver regardless of environment
  const sql = neon(env.DATABASE_URL);
  return drizzleNeon(sql, { schema });
})();

// Export schema for use in other files
export * from './schema';
