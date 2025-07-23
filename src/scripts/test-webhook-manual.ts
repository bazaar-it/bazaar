import { db } from "~/server/db";
import { userCredits, creditTransactions } from "~/server/db/schema";
import { eq, sql } from "drizzle-orm";

/**
 * Manually simulate what the webhook would do
 * This is for testing the database operations
 */
async function testWebhookOperations() {
  const userId = "b0f9c12d-a3e5-4169-aa66-ee860e6977aa"; // Your user ID
  const promptsToAdd = 50; // Simulating a 50-prompt purchase
  
  console.log("🧪 Testing webhook operations manually...");
  
  try {
    // 1. Check current balance
    const [before] = await db.select()
      .from(userCredits)
      .where(eq(userCredits.userId, userId))
      .limit(1);
    
    console.log("📊 Before:");
    console.log(`- Purchased credits: ${before?.purchasedCredits || 0}`);
    console.log(`- Lifetime credits: ${before?.lifetimeCredits || 0}`);
    
    // 2. Add prompts (what webhook would do)
    await db.update(userCredits)
      .set({
        purchasedCredits: sql`${userCredits.purchasedCredits} + ${promptsToAdd}`,
        lifetimeCredits: sql`${userCredits.lifetimeCredits} + ${promptsToAdd}`,
        updatedAt: new Date(),
      })
      .where(eq(userCredits.userId, userId));
    
    // 3. Log transaction
    await db.insert(creditTransactions).values({
      userId,
      type: 'purchase',
      amount: promptsToAdd,
      balance: (before?.purchasedCredits || 0) + promptsToAdd,
      description: `TEST: Purchased ${promptsToAdd} prompts`,
      stripePaymentIntentId: 'pi_test_manual_' + Date.now(),
      metadata: {
        test: true,
        packageName: 'Test Package',
        amount: 500, // $5.00
        currency: 'usd',
      },
    });
    
    // 4. Verify update
    const [after] = await db.select()
      .from(userCredits)
      .where(eq(userCredits.userId, userId))
      .limit(1);
    
    console.log("\n📊 After:");
    console.log(`- Purchased credits: ${after?.purchasedCredits || 0}`);
    console.log(`- Lifetime credits: ${after?.lifetimeCredits || 0}`);
    console.log(`\n✅ Added ${promptsToAdd} credits successfully!`);
    
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

// Run the test
testWebhookOperations()
  .then(() => {
    console.log("\n🎉 Test complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Test failed:", error);
    process.exit(1);
  });