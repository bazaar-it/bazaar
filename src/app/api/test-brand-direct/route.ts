import { NextResponse } from "next/server";
import { EnhancedWebAnalyzer } from "~/tools/webAnalysis/WebAnalysisEnhanced";
import { BrandFormatter } from "~/server/services/website/brand-formatter";
import { db } from "~/server/db";
import { brandProfiles } from "~/server/db/schema";

export async function GET() {
  console.log("🚀 Starting direct brand extraction test for Stripe.com\n");
  
  try {
    const startTime = Date.now();
    
    // Initialize extractor
    const extractor = new EnhancedWebAnalyzer();
    
    // Extract website data
    console.log("🌐 Extracting from: https://stripe.com");
    console.log("⏳ This will take 30-60 seconds...\n");
    
    const websiteData = await extractor.analyzeWebsite("https://stripe.com");
    
    console.log("✅ Website data extracted!");
    console.log(`📸 Screenshots captured: ${websiteData.screenshots?.length || 0}`);
    console.log(`🖼️ Media assets found: ${websiteData.media?.length || 0}`);
    
    // Format brand data
    const formatter = new BrandFormatter();
    const formattedBrand = formatter.format(websiteData);
    
    console.log("\n📊 Formatted Brand Style:");
    console.log(`  Primary Color: ${formattedBrand.colors.primary}`);
    console.log(`  Secondary Color: ${formattedBrand.colors.secondary}`);
    console.log(`  Primary Font: ${formattedBrand.typography.primaryFont}`);
    console.log(`  Animation Style: ${formattedBrand.animation.style}`);
    
    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);
    
    // Prepare response
    const response = {
      success: true,
      elapsedTime: `${elapsedTime}s`,
      websiteData: {
        url: websiteData.url,
        title: websiteData.title,
        description: websiteData.description,
        screenshotCount: websiteData.screenshots?.length || 0,
        mediaAssetCount: websiteData.media?.length || 0,
      },
      extractedBrand: {
        colors: websiteData.brand.colors,
        typography: websiteData.brand.typography,
        logos: websiteData.brand.logos,
        copyVoice: websiteData.brand.copyVoice,
        socialProof: websiteData.brand.socialProof,
      },
      formattedStyle: formattedBrand,
      screenshots: websiteData.screenshots?.map(s => ({
        viewport: s.viewport,
        position: s.position,
        url: s.url,
      })),
      mediaAssets: Array.isArray(websiteData.media) 
        ? websiteData.media.slice(0, 10).map(m => ({
            type: m.type,
            url: m.url,
            alt: m.alt,
          }))
        : [],
    };
    
    // Log full response to server console
    console.log("\n📋 Full Extraction Result:");
    console.log(JSON.stringify(response, null, 2));
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error("❌ Error during extraction:", error);
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