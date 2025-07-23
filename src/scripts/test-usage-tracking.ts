import { db } from "~/server/db";
import { UsageService } from "~/server/services/usage/usage.service";

async function testUsageTracking() {
  console.log("🧪 Testing usage tracking...\n");

  // Test user ID (Lysaker)
  const userId = "b0f9c12d-a3e5-4169-aa66-ee860e6977aa";
  
  try {
    // 1. Check current usage
    console.log("1️⃣ Checking current usage...");
    const before = await UsageService.getTodayPromptUsage(userId, "Europe/Oslo");
    console.log("Before:", before);
    
    // 2. Check if allowed
    console.log("\n2️⃣ Checking if usage allowed...");
    const allowed = await UsageService.checkPromptUsage(userId, "Europe/Oslo");
    console.log("Allowed:", allowed);
    
    // 3. Try to increment
    console.log("\n3️⃣ Incrementing usage...");
    await UsageService.incrementPromptUsage(userId, "Europe/Oslo");
    console.log("✅ Increment successful");
    
    // 4. Check after increment
    console.log("\n4️⃣ Checking usage after increment...");
    const after = await UsageService.getTodayPromptUsage(userId, "Europe/Oslo");
    console.log("After:", after);
    
    // 5. Raw database check
    console.log("\n5️⃣ Raw database check...");
    const rawUsage = await db.query.userUsage.findFirst({
      where: (usage, { and, eq }) => and(
        eq(usage.userId, userId),
        eq(usage.date, new Date().toISOString().split('T')[0]),
        eq(usage.usageType, 'prompts')
      )
    });
    console.log("Raw DB record:", rawUsage);

  } catch (error) {
    console.error("❌ Error:", error);
  }
}

testUsageTracking()
  .then(() => {
    console.log("\n✅ Test complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Test failed:", error);
    process.exit(1);
  });