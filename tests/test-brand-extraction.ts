#!/usr/bin/env tsx
/**
 * Test script for brand extraction pipeline
 * Usage: npx tsx test-brand-extraction.ts
 */

import { appRouter } from "./src/server/api/root";
import { db } from "./src/server/db";
import { createTRPCContext } from "./src/server/api/trpc";
import { users, projects } from "./src/server/db/schema";
import { eq } from "drizzle-orm";

async function testBrandExtraction() {
  console.log("🚀 Starting brand extraction test for Stripe.com\n");
  
  try {
    // Get or create test user
    console.log("📋 Setting up test user and project...");
    let user = await db.query.users.findFirst({
      where: eq(users.email, "test@bazaar.it"),
    });
    
    if (!user) {
      console.log("Creating test user...");
      const [newUser] = await db.insert(users).values({
        id: "test-user-001",
        email: "test@bazaar.it",
        name: "Test User",
      }).returning();
      user = newUser;
    }
    console.log(`✅ User ready: ${user.email}\n`);
    
    // Get or create test project
    let project = await db.query.projects.findFirst({
      where: eq(projects.userId, user.id),
    });
    
    if (!project) {
      console.log("Creating test project...");
      const [newProject] = await db.insert(projects).values({
        userId: user.id,
        title: "Test Project - Brand Extraction",
        props: {},
        isWelcome: false,
      }).returning();
      project = newProject;
    }
    console.log(`✅ Project ready: ${project.title} (${project.id})\n`);
    
    // Create tRPC context
    const headers = new Headers();
    headers.set("x-user-id", user.id);
    const ctx = await createTRPCContext({
      headers,
    });
    
    // Create caller
    const caller = appRouter.createCaller(ctx);
    
    // Test brand extraction for Stripe.com
    console.log("🌐 Extracting brand from: https://stripe.com");
    console.log("⏳ This will take 30-60 seconds...\n");
    
    const startTime = Date.now();
    
    const result = await caller.websitePipeline.extractBrandProfile({
      projectId: project.id,
      websiteUrl: "https://stripe.com",
    });
    
    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log(`\n✅ Brand extraction completed in ${elapsedTime}s!\n`);
    console.log("📊 Extracted Brand Data:");
    console.log("=" + "=".repeat(79));
    
    // Log colors
    console.log("\n🎨 COLORS:");
    console.log(`  Primary: ${result.brandData.colors.primary}`);
    console.log(`  Secondary: ${result.brandData.colors.secondary}`);
    if (result.brandData.colors.accents?.length) {
      console.log(`  Accents: ${result.brandData.colors.accents.join(", ")}`);
    }
    if (result.brandData.colors.gradients?.length) {
      console.log(`  Gradients: ${result.brandData.colors.gradients.length} found`);
    }
    
    // Log typography
    console.log("\n✏️ TYPOGRAPHY:");
    if (result.brandData.typography.fonts?.length) {
      console.log(`  Fonts: ${result.brandData.typography.fonts.map(f => f.family).join(", ")}`);
    }
    if (result.brandData.typography.scale) {
      console.log(`  H1 Size: ${result.brandData.typography.scale.h1?.size}`);
      console.log(`  Body Size: ${result.brandData.typography.scale.body?.size}`);
    }
    
    // Log logos
    console.log("\n🏷️ LOGOS:");
    if (result.brandData.logos?.primary) {
      console.log(`  Primary: ${result.brandData.logos.primary.url}`);
    }
    if (result.brandData.logos?.variations?.length) {
      console.log(`  Variations: ${result.brandData.logos.variations.length} found`);
    }
    
    // Log copy voice
    console.log("\n📝 COPY VOICE:");
    if (result.brandData.copyVoice) {
      console.log(`  Tone: ${result.brandData.copyVoice.tone}`);
      console.log(`  Style: ${result.brandData.copyVoice.style}`);
      if (result.brandData.copyVoice.headlines?.length) {
        console.log(`  Headlines captured: ${result.brandData.copyVoice.headlines.length}`);
        console.log(`  Sample: "${result.brandData.copyVoice.headlines[0]?.substring(0, 60)}..."`);
      }
    }
    
    // Log social proof
    console.log("\n⭐ SOCIAL PROOF:");
    if (result.brandData.socialProof) {
      if (result.brandData.socialProof.testimonials?.length) {
        console.log(`  Testimonials: ${result.brandData.socialProof.testimonials.length} found`);
      }
      if (result.brandData.socialProof.clientLogos?.length) {
        console.log(`  Client logos: ${result.brandData.socialProof.clientLogos.length} found`);
      }
      if (result.brandData.socialProof.stats?.length) {
        console.log(`  Stats: ${result.brandData.socialProof.stats.length} found`);
      }
    }
    
    // Log screenshots
    console.log("\n📸 SCREENSHOTS:");
    if (result.screenshots?.length) {
      console.log(`  Total captured: ${result.screenshots.length}`);
      result.screenshots.forEach((screenshot, i) => {
        console.log(`  ${i + 1}. ${screenshot.viewport} - ${screenshot.position}`);
        console.log(`     URL: ${screenshot.url}`);
      });
    }
    
    // Log media assets
    console.log("\n🖼️ MEDIA ASSETS:");
    if (result.mediaAssets?.length) {
      console.log(`  Total found: ${result.mediaAssets.length}`);
      const byType = result.mediaAssets.reduce((acc, asset) => {
        acc[asset.type] = (acc[asset.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      Object.entries(byType).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });
    }
    
    console.log("\n" + "=".repeat(80));
    console.log("✨ Brand extraction test completed successfully!");
    console.log(`📁 Profile saved with ID: ${result.id}`);
    
    // Test retrieval
    console.log("\n🔍 Testing profile retrieval...");
    const retrieved = await caller.websitePipeline.getBrandProfile({
      projectId: project.id,
    });
    
    if (retrieved) {
      console.log("✅ Profile retrieved successfully!");
      console.log(`   Last analyzed: ${retrieved.lastAnalyzedAt}`);
      console.log(`   Version: ${retrieved.extractionVersion}`);
    } else {
      console.log("❌ Failed to retrieve profile");
    }
    
  } catch (error) {
    console.error("\n❌ Error during brand extraction:");
    console.error(error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the test
testBrandExtraction().catch(console.error);