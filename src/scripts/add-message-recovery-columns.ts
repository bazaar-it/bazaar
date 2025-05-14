// src/scripts/add-message-recovery-columns.ts
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
  
  console.log("🔄 Adding recovery columns to message table...");
  
  try {
    // SQL statements to add the component recovery columns if they don't exist
    const sqlStatements = [
      // Add columns to message table
      `ALTER TABLE "bazaar-vid_message" 
       ADD COLUMN IF NOT EXISTS "originalTsxCode" TEXT,
       ADD COLUMN IF NOT EXISTS "lastFixAttempt" TIMESTAMP WITH TIME ZONE,
       ADD COLUMN IF NOT EXISTS "fixIssues" TEXT;`,
      
      // Add comments to the columns
      `COMMENT ON COLUMN "bazaar-vid_message"."originalTsxCode" IS 'Original TSX code before any fixes are applied';`,
      `COMMENT ON COLUMN "bazaar-vid_message"."lastFixAttempt" IS 'Timestamp of the most recent fix attempt';`,
      `COMMENT ON COLUMN "bazaar-vid_message"."fixIssues" IS 'List of issues identified and fixed by the preprocessor';`
    ];
    
    // Execute each SQL statement
    for (const statement of sqlStatements) {
      console.log(`Executing SQL: ${statement.slice(0, 80)}...`);
      await sql(statement);
    }
    
    console.log("✅ Recovery columns added to message table successfully!");
  } catch (error) {
    console.error("❌ Failed to add recovery columns to message table:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

main(); 