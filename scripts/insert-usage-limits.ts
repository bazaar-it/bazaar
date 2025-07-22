import { db } from "~/server/db";
import { usageLimits } from "~/server/db/schema";

async function insertUsageLimits() {
  try {
    console.log("Inserting initial usage limits configuration...");
    
    await db.insert(usageLimits).values([
      {
        limitKey: 'daily_prompts',
        freeTierLimit: 20,
        description: 'Daily prompt limit for free tier users',
        resetPeriod: 'daily',
        isActive: true
      }
    ]);
    
    console.log("✅ Usage limits inserted successfully");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error inserting usage limits:", error);
    process.exit(1);
  }
}

insertUsageLimits();