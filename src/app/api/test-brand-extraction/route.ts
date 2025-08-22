import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { users, projects } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";

export async function GET() {
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
    
    // Prepare detailed response
    const response = {
      success: true,
      elapsedTime: `${elapsedTime}s`,
      profileId: result.id,
      projectId: project.id,
      extraction: {
        colors: {
          primary: result.brandData.colors.primary,
          secondary: result.brandData.colors.secondary,
          accents: result.brandData.colors.accents,
          gradients: result.brandData.colors.gradients?.length || 0,
        },
        typography: {
          fonts: result.brandData.typography.fonts?.map((f: any) => f.family),
          h1Size: result.brandData.typography.scale?.h1?.size,
          bodySize: result.brandData.typography.scale?.body?.size,
        },
        logos: {
          primary: result.brandData.logos?.primary?.url,
          variations: result.brandData.logos?.variations?.length || 0,
        },
        copyVoice: {
          tone: result.brandData.copyVoice?.tone,
          style: result.brandData.copyVoice?.style,
          headlineCount: result.brandData.copyVoice?.headlines?.length || 0,
          sampleHeadline: result.brandData.copyVoice?.headlines?.[0],
        },
        socialProof: {
          testimonials: result.brandData.socialProof?.testimonials?.length || 0,
          clientLogos: result.brandData.socialProof?.clientLogos?.length || 0,
          stats: result.brandData.socialProof?.stats?.length || 0,
        },
        screenshots: {
          total: result.screenshots?.length || 0,
          details: result.screenshots?.map((s: any) => ({
            viewport: s.viewport,
            position: s.position,
            url: s.url,
          })),
        },
        mediaAssets: {
          total: result.mediaAssets?.length || 0,
          byType: result.mediaAssets?.reduce((acc: any, asset: any) => {
            acc[asset.type] = (acc[asset.type] || 0) + 1;
            return acc;
          }, {}),
        },
      },
    };
    
    // Log to server console
    console.log("📊 Extracted Brand Data:");
    console.log(JSON.stringify(response, null, 2));
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error("❌ Error during brand extraction:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}