//scripts/commands/db/migrate/add-component-recovery-columns.js
import { drizzle } from "drizzle-orm/neon-http";
import { neon, neonConfig } from "@neondatabase/serverless";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Make sure not to timeout when running migrations
neonConfig.fetchConnectionCache = true;

async function main() {
  // Get the non-pooled connection string
  const connectionString = process.env.DATABASE_URL_NON_POOLED || 
    process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error("Missing DATABASE_URL_NON_POOLED or DATABASE_URL environment variable");
  }

  console.log("🔄 Connecting to Neon database...");
  
  // Create a Neon HTTP client
  const sql = neon(connectionString);
  
  console.log("🔄 Adding component recovery columns...");
  
  try {
    // SQL statements to add the component recovery columns if they don't exist
    const sqlStatements = [
      // Add columns to custom_component_job table
      `ALTER TABLE "bazaar-vid_custom_component_job" 
       ADD COLUMN IF NOT EXISTS "originalTsxCode" TEXT,
       ADD COLUMN IF NOT EXISTS "lastFixAttempt" TIMESTAMP WITH TIME ZONE,
       ADD COLUMN IF NOT EXISTS "fixIssues" TEXT;`,
      
      // Add index if it doesn't exist
      `DO $$
       BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes 
          WHERE indexname = 'custom_component_jobs_status_idx'
        ) THEN
          CREATE INDEX custom_component_jobs_status_idx ON "bazaar-vid_custom_component_job" (status);
        END IF;
       END$$;`,
      
      // Update existing failed components to fixable status if they have code
      `UPDATE "bazaar-vid_custom_component_job"
       SET status = 'fixable'
       WHERE status = 'failed' 
       AND "tsxCode" IS NOT NULL;`,
      
      // Add comments to the columns
      `COMMENT ON COLUMN "bazaar-vid_custom_component_job"."originalTsxCode" IS 'Original TSX code before any fixes are applied';`,
      `COMMENT ON COLUMN "bazaar-vid_custom_component_job"."lastFixAttempt" IS 'Timestamp of the most recent fix attempt';`,
      `COMMENT ON COLUMN "bazaar-vid_custom_component_job"."fixIssues" IS 'List of issues identified and fixed by the preprocessor';`
    ];
    
    // Execute each SQL statement
    for (const statement of sqlStatements) {
      console.log(`Executing SQL: ${statement.slice(0, 80)}...`);
      await sql(statement);
    }
    
    console.log("✅ Component recovery columns added successfully!");
  } catch (error) {
    console.error("❌ Failed to add component recovery columns:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

main(); 