//src/scripts/migrate-schema.ts
import { migrate } from "drizzle-orm/neon-http/migrator";
import { db } from "@bazaar/database";
import { backfillMessageKind } from "./backfill-message-kind";

/**
 * Run Drizzle migrations and optional backfill scripts
 * 
 * Usage:
 * pnpm tsx src/scripts/migrate-schema.ts
 */
async function runMigrations() {
  console.log("Starting database migrations...");
  
  try {
    // Run all pending migrations
    await migrate(db, { migrationsFolder: "src/server/db/migrations" });
    console.log("Base migrations completed successfully");
    
    // Run backfill scripts
    console.log("Running backfill scripts...");
    await backfillMessageKind();
    
    console.log("All migrations and backfill scripts completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Error running migrations:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  runMigrations().catch(console.error);
}

export { runMigrations };
