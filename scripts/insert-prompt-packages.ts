#!/usr/bin/env tsx

/**
 * Script to insert prompt packages into the database
 * Run with: npm run tsx scripts/insert-prompt-packages.ts
 */

import { db } from "~/server/db";
import { creditPackages } from "~/server/db/schema";
import { eq } from "drizzle-orm";

const packages = [
  {
    id: "starter-pack-50",
    name: "Starter Pack",
    description: "Perfect for trying out premium features",
    promptCount: 50,
    price: 500, // $5.00
    stripeProductId: null, // Will be set when Stripe is configured
    stripePriceId: null,
    isActive: true,
  },
  {
    id: "popular-pack-100", 
    name: "Popular Pack",
    description: "Most popular choice for regular users",
    promptCount: 100,
    price: 1000, // $10.00
    stripeProductId: null,
    stripePriceId: null,
    isActive: true,
  },
  {
    id: "power-pack-250",
    name: "Power Pack", 
    description: "Best value for heavy users (20% savings)",
    promptCount: 250,
    price: 2000, // $20.00 (normally $25 = 20% discount)
    stripeProductId: null,
    stripePriceId: null,
    isActive: true,
  },
  {
    id: "pro-bundle-500",
    name: "Pro Bundle",
    description: "Maximum savings for power users (30% savings)", 
    promptCount: 500,
    price: 3500, // $35.00 (normally $50 = 30% discount)
    stripeProductId: null,
    stripePriceId: null,
    isActive: true,
  },
];

async function insertPackages() {
  console.log("🚀 Starting prompt package insertion...");

  for (const pkg of packages) {
    try {
      // Check if package already exists
      const [existing] = await db.select()
        .from(creditPackages)
        .where(eq(creditPackages.id, pkg.id))
        .limit(1);

      if (existing) {
        console.log(`⏭️  Package "${pkg.name}" already exists, skipping...`);
        continue;
      }

      // Insert the package
      await db.insert(creditPackages).values(pkg);
      console.log(`✅ Inserted package: ${pkg.name} (${pkg.promptCount} prompts for $${pkg.price/100})`);
    } catch (error) {
      console.error(`❌ Failed to insert package "${pkg.name}":`, error);
    }
  }

  console.log("🎉 Package insertion complete!");

  // Show summary
  const allPackages = await db.select().from(creditPackages);
  console.log(`\n📊 Total packages in database: ${allPackages.length}`);
  
  console.log("\n📦 Current packages:");
  allPackages.forEach(pkg => {
    const pricePerPrompt = pkg.price / pkg.promptCount;
    console.log(`  • ${pkg.name}: ${pkg.promptCount} prompts for $${pkg.price/100} (${pricePerPrompt.toFixed(1)}¢ each)`);
  });
}

// Run the script
insertPackages()
  .then(() => {
    console.log("\n✨ Script completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Script failed:", error);
    process.exit(1);
  });