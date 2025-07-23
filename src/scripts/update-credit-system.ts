import { db } from "~/server/db";
import { userCredits, creditTransactions, usageLimits, users } from "~/server/db/schema";
import { eq, sql } from "drizzle-orm";

async function updateCreditSystem() {
  console.log("🚀 Starting credit system update...");

  try {
    // 1. Update daily prompt limit from 20 to 5
    console.log("📝 Updating daily prompt limit to 5...");
    await db.update(usageLimits)
      .set({ 
        freeTierLimit: 5,
        updatedAt: new Date()
      })
      .where(eq(usageLimits.limitKey, 'daily_prompts'));

    // If the limit doesn't exist, create it
    await db.insert(usageLimits)
      .values({
        limitKey: 'daily_prompts',
        freeTierLimit: 5,
        description: 'Daily free prompts for all users',
        resetPeriod: 'daily',
        isActive: true
      })
      .onConflictDoNothing();

    // 2. Get all existing users
    console.log("👥 Fetching all users...");
    const allUsers = await db.select({ id: users.id }).from(users);
    console.log(`Found ${allUsers.length} users`);

    // 3. Add 20 gift prompts to all users
    console.log("🎁 Adding 20 gift prompts to all users...");
    
    for (const user of allUsers) {
      // Ensure user has a credits record
      await db.insert(userCredits)
        .values({
          userId: user.id,
          dailyCredits: 5, // New daily limit
          purchasedCredits: 20, // 20 gift prompts
          lifetimeCredits: 20,
          dailyResetAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
        })
        .onConflictDoUpdate({
          target: [userCredits.userId],
          set: {
            dailyCredits: 5, // Update daily limit
            purchasedCredits: sql`${userCredits.purchasedCredits} + 20`, // Add 20 gift prompts
            lifetimeCredits: sql`${userCredits.lifetimeCredits} + 20`,
            updatedAt: new Date()
          }
        });

      // Log the gift transaction
      await db.insert(creditTransactions).values({
        userId: user.id,
        type: 'bonus',
        amount: 20,
        balance: 20, // We'll update this properly in production
        description: 'Welcome gift - 20 free prompts',
        metadata: {
          reason: 'v3_launch_gift',
          grantedAt: new Date().toISOString()
        }
      });
    }

    console.log("✅ Credit system update completed successfully!");
    console.log("📊 Summary:");
    console.log("- Daily limit updated to 5 prompts");
    console.log(`- Added 20 gift prompts to ${allUsers.length} users`);

  } catch (error) {
    console.error("❌ Error updating credit system:", error);
    throw error;
  }
}

// Run the update
updateCreditSystem()
  .then(() => {
    console.log("🎉 All done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Failed:", error);
    process.exit(1);
  });