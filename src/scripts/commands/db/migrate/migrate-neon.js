// @ts-nocheck
// src/scripts/commands/db/migrate/migrate-neon.js
import { drizzle } from "drizzle-orm/neon-http";
import { neon, neonConfig } from "@neondatabase/serverless";
import { migrate } from "drizzle-orm/neon-http/migrator";
import * as schema from "../server/db/schema";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Make sure not to timeout when running migrations
neonConfig.fetchConnectionCache = true;

// This script pushes your Drizzle schema to Neon directly
// Run with: npx tsx src/scripts/migrate-neon.ts

async function main() {
  // Get the non-pooled connection string
  const connectionString = process.env.DATABASE_URL_NON_POOLED || 
    process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error("Missing DATABASE_URL_NON_POOLED or DATABASE_URL environment variable");
  }

  console.log("🔄 Connecting to Neon database...");
  
  // Create a Neon HTTP client (this is different from the serverless driver approach)
  const sql = neon(connectionString);
  // Create a Drizzle ORM instance specifically for HTTP migrations
  const db = drizzle(sql);
  
  console.log("🔄 Running migrations...");
  
  try {
    // Run migrations from the migrations folder
    await migrate(db, { migrationsFolder: "./drizzle/migrations" });
    console.log("✅ Migrations completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

main(); 