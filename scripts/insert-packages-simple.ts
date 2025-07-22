#!/usr/bin/env tsx

import { db } from "~/server/db";
import { creditPackages } from "~/server/db/schema";

const packages = [
  {
    id: "starter-pack",
    name: "Starter Pack",
    credits: 100,
    price: 1000, // $10.00
    popular: false,
    active: true,
  },
  {
    id: "popular-pack", 
    name: "Popular",
    credits: 250,
    price: 2000, // $20.00
    popular: true,
    active: true,
  },
  {
    id: "pro-bundle",
    name: "Pro",
    credits: 500,
    price: 3500, // $35.00
    popular: false,
    active: true,
  },
];

async function insertPackages() {
  console.log("🚀 Inserting packages...");

  for (const pkg of packages) {
    try {
      await db.insert(creditPackages).values(pkg);
      console.log(`✅ ${pkg.name}: ${pkg.credits} prompts for $${pkg.price/100}`);
    } catch (error) {
      console.log(`⏭️  ${pkg.name} already exists`);
    }
  }

  console.log("✨ Done!");
}

insertPackages().catch(console.error);