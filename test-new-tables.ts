// Test script for new database tables
// Run this with: npx tsx test-new-tables.ts

import { db } from "./src/server/db";
import { promoCodes, paywallEvents, paywallAnalytics } from "./src/server/db/schema";
import { eq } from "drizzle-orm";

async function testNewTables() {
  console.log("🧪 Testing new database tables...\n");

  try {
    // 1. Test promoCodes table
    console.log("1. Testing promoCodes table:");
    const testPromo = await db.insert(promoCodes).values({
      code: "TESTCODE",
      description: "Test promo code",
      discountType: "percentage",
      discountValue: 20,
      maxUses: 10,
      createdBy: null, // No user needed for test
    }).returning();
    console.log("✅ Created promo code:", testPromo[0]?.code);

    // 2. Query the promo code
    const promos = await db.select().from(promoCodes).where(eq(promoCodes.code, "TESTCODE"));
    console.log("✅ Found promo codes:", promos.length);

    // 3. Test paywallAnalytics table
    console.log("\n2. Testing paywallAnalytics table:");
    const today = new Date().toISOString().split('T')[0];
    const analytics = await db.insert(paywallAnalytics).values({
      date: today,
      uniqueUsersHitPaywall: 5,
      uniqueUsersClickedPackage: 3,
      uniqueUsersInitiatedCheckout: 2,
      uniqueUsersCompletedPurchase: 1,
      totalRevenueCents: 999,
    }).onConflictDoUpdate({
      target: paywallAnalytics.date,
      set: {
        uniqueUsersHitPaywall: 5,
        updatedAt: new Date(),
      }
    }).returning();
    console.log("✅ Created/updated analytics for date:", analytics[0]?.date);

    // 4. Clean up test data
    console.log("\n3. Cleaning up test data:");
    await db.delete(promoCodes).where(eq(promoCodes.code, "TESTCODE"));
    console.log("✅ Deleted test promo code");

    await db.delete(paywallAnalytics).where(eq(paywallAnalytics.date, today));
    console.log("✅ Deleted test analytics");

    console.log("\n✨ All tests passed! New tables are working correctly.");

  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }

  process.exit(0);
}

testNewTables();