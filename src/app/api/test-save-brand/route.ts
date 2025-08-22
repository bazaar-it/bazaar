import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { saveBrandProfile } from "~/server/services/website/save-brand-profile";

export async function GET() {
  console.log("🚀 Testing brand profile save from existing data\n");
  
  try {
    // Get the web analysis data from project memory
    const result = await db.query.projectMemory.findFirst({
      where: (pm, { eq, and }) => and(
        eq(pm.projectId, 'ffc2e0f5-ad3f-445f-94bc-dada71ed1a4e'),
        eq(pm.memoryKey, 'https://revolut.com')
      ),
    });
    
    if (!result) {
      return NextResponse.json({ 
        success: false, 
        error: "No web analysis found in project memory" 
      });
    }
    
    console.log("📊 Found web analysis data, saving to brand_profile...");
    
    // Parse the stored JSON
    const webAnalysisData = typeof result.memoryValue === 'string' 
      ? JSON.parse(result.memoryValue)
      : result.memoryValue;
    
    // Save to brand profile
    const brandProfile = await saveBrandProfile(
      'ffc2e0f5-ad3f-445f-94bc-dada71ed1a4e',
      'https://revolut.com',
      webAnalysisData
    );
    
    console.log("✅ Brand profile saved successfully!");
    console.log("Profile ID:", brandProfile.id);
    
    return NextResponse.json({
      success: true,
      profileId: brandProfile.id,
      projectId: brandProfile.projectId,
      websiteUrl: brandProfile.websiteUrl,
      extractionVersion: brandProfile.extractionVersion,
      screenshotCount: brandProfile.screenshots?.length || 0,
      mediaAssetCount: brandProfile.mediaAssets?.length || 0,
      colors: brandProfile.colors,
      typography: {
        fonts: brandProfile.typography?.fonts?.slice(0, 3),
        scale: brandProfile.typography?.scale
      }
    });
    
  } catch (error) {
    console.error("❌ Error:", error);
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