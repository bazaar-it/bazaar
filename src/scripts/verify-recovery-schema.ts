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
  
  console.log("🔍 Verifying component recovery schema...");
  
  try {
    // SQL queries to check the schema
    const verificationQueries = [
      // Check custom_component_job columns
      {
        table: "bazaar-vid_custom_component_job",
        query: `
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'bazaar-vid_custom_component_job' 
            AND column_name IN ('originalTsxCode', 'lastFixAttempt', 'fixIssues');
        `
      },
      // Check animation_design_brief columns
      {
        table: "bazaar-vid_animation_design_brief",
        query: `
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'bazaar-vid_animation_design_brief' 
            AND column_name IN ('originalTsxCode', 'lastFixAttempt', 'fixIssues');
        `
      },
      // Check message columns
      {
        table: "bazaar-vid_message",
        query: `
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'bazaar-vid_message' 
            AND column_name IN ('originalTsxCode', 'lastFixAttempt', 'fixIssues');
        `
      },
      // Check status index
      {
        table: "Status index",
        query: `
          SELECT indexname, indexdef
          FROM pg_indexes
          WHERE tablename = 'bazaar-vid_custom_component_job'
            AND indexname = 'custom_component_jobs_status_idx';
        `
      },
      // Check fixable components count
      {
        table: "Fixable components",
        query: `
          SELECT COUNT(*) AS count 
          FROM "bazaar-vid_custom_component_job" 
          WHERE status = 'fixable';
        `
      }
    ];
    
    // Execute each verification query
    for (const verification of verificationQueries) {
      console.log(`\n🔍 Checking ${verification.table}...`);
      const result = await sql(verification.query);
      console.log(`Results: ${JSON.stringify(result, null, 2)}`);
    }
    
    console.log("\n✅ Component recovery schema verification complete!");
  } catch (error) {
    console.error("❌ Verification failed:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

main(); 