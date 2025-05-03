//src/scripts/backfill-message-kind.ts
import { db } from "~/server/db";
import { messages } from "~/server/db/schema";
import { sql } from "drizzle-orm";

/**
 * Backfill script to update existing message rows with kind="message"
 * This ensures backward compatibility after schema migration
 */
async function backfillMessageKind() {
  console.log("Starting backfill of message.kind field...");
  
  try {
    // Update all existing messages with kind='message'
    const result = await db.execute(
      sql`UPDATE "bazaar-vid_message" SET "kind" = 'message' WHERE "kind" IS NULL`
    );
    
    console.log(`Updated messages with kind='message'`);
    console.log("Backfill completed successfully");
  } catch (error) {
    console.error("Error during backfill:", error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  backfillMessageKind()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Backfill failed:", error);
      process.exit(1);
    });
}

export { backfillMessageKind };
