#!/usr/bin/env tsx
/**
 * Test script for generating story arcs from saved brand extractions
 * Run with: npm run test:story-arc <extraction-id>
 */

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { brandExtractions } from '~/server/db/schema';
import { eq } from 'drizzle-orm';
import { heroJourneyV2 } from '~/tools/narrative/herosJourneyV2';
import type { BrandJSONV2 } from '~/server/services/brand/BrandAnalyzerV2';

// Load environment variables
config({ path: '.env.local' });

async function testStoryArc(extractionId?: string) {
  console.log('🚀 Starting Story Arc Generation Test...\n');
  
  // Setup database connection
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ DATABASE_URL not found in environment variables');
    process.exit(1);
  }

  const client = postgres(connectionString);
  const db = drizzle(client);

  try {
    // Get extraction ID from args or use the latest
    let extraction;
    
    if (extractionId) {
      console.log(`📦 Loading extraction: ${extractionId}`);
      const [found] = await db
        .select()
        .from(brandExtractions)
        .where(eq(brandExtractions.extractionId, extractionId))
        .limit(1);
      extraction = found;
    } else {
      console.log('📦 Loading latest extraction...');
      const [latest] = await db
        .select()
        .from(brandExtractions)
        .orderBy(brandExtractions.createdAt)
        .limit(1);
      extraction = latest;
    }

    if (!extraction) {
      console.error('❌ No extraction found');
      process.exit(1);
    }

    console.log(`\n✅ Found extraction for: ${extraction.url}`);
    console.log(`   Brand: ${extraction.brandName || 'Unknown'}`);
    console.log(`   Created: ${extraction.createdAt}`);
    console.log(`   ID: ${extraction.extractionId}\n`);

    // Reconstruct BrandJSONV2 from database
    const brandJSON: BrandJSONV2 = {
      id: `brand_${Date.now()}`,
      url: extraction.url,
      extractionId: extraction.extractionId,
      createdAt: extraction.createdAt!.toISOString(),
      
      visualAnalysis: extraction.visualAnalysis as any,
      contentAnalysis: extraction.contentAnalysis as any,
      synthesis: extraction.synthesis as any,
      
      brand: {
        name: extraction.brandName || '',
        tagline: extraction.brandTagline || '',
        mission: '',
        vision: '',
        values: [],
        archetype: '',
        voice: [],
        evidence: {
          screenshotId: 'full_001',
          confidence: 0.85,
          extractedAt: extraction.createdAt!.toISOString()
        }
      },
      
      design: extraction.designData as any || {},
      product: extraction.productData as any || {},
      socialProof: extraction.socialProofData as any || {},
      sections: extraction.sectionsData as any || [],
      content: extraction.contentData as any || {},
      
      confidence: extraction.confidence as any || { overall: 0.85 },
      metadata: {
        analysisVersion: extraction.extractionVersion,
        timestamp: extraction.createdAt!.toISOString(),
        processingTime: extraction.processingTimeMs || 0,
        tokensUsed: extraction.tokensUsed || 0
      }
    };

    console.log('🎬 Generating story arc...\n');
    console.log('Options:');
    console.log('  - Scene Count: 5');
    console.log('  - Duration: 15 seconds');
    console.log('  - Style: professional\n');

    // Generate story arc
    const storyArc = await heroJourneyV2.generateStoryArc(brandJSON, {
      sceneCount: 5,
      totalDurationSeconds: 15,
      style: 'professional'
    });

    console.log('✨ Story Arc Generated!\n');
    console.log('═══════════════════════════════════════════════════════\n');
    
    // Display story arc details
    console.log(`📽️  Title: ${storyArc.title}`);
    console.log(`🎭  Narrative Structure: ${storyArc.narrativeStructure}`);
    console.log(`⏱️  Total Duration: ${storyArc.totalDuration} frames (${storyArc.totalDuration / 30}s)\n`);
    
    console.log('🎬 Brand Context:');
    console.log(`   Name: ${storyArc.brandContext.name}`);
    console.log(`   Tagline: ${storyArc.brandContext.tagline}`);
    console.log(`   Problem: ${storyArc.brandContext.mainProblem}`);
    console.log(`   Solution: ${storyArc.brandContext.mainSolution}`);
    console.log(`   Features: ${storyArc.brandContext.keyFeatures.join(', ')}\n`);
    
    console.log('🎬 Scenes:\n');
    
    storyArc.scenes.forEach((scene, index) => {
      console.log(`Scene ${index + 1}: ${scene.title}`);
      console.log(`   ID: ${scene.id}`);
      console.log(`   Duration: ${scene.duration} frames (${(scene.duration / 30).toFixed(1)}s)`);
      console.log(`   Emotional Beat: ${scene.emotionalBeat}`);
      console.log(`   Template: ${scene.template.name} (${scene.template.variant || 'default'})`);
      console.log(`   Narrative: ${scene.narrative}`);
      
      if (scene.text.headline) {
        console.log(`   Headline: "${scene.text.headline}"`);
      }
      if (scene.text.cta) {
        console.log(`   CTA: "${scene.text.cta}"`);
      }
      
      console.log(`   Background: ${scene.visuals.background}`);
      console.log(`   Animations: ${scene.visuals.animations.join(', ')}`);
      console.log(`   Transition: ${scene.visuals.transitions}`);
      
      if (scene.uiElements.stats && scene.uiElements.stats.length > 0) {
        console.log(`   Stats: ${scene.uiElements.stats.length} metrics`);
      }
      
      console.log('');
    });
    
    // Generate edit instructions
    console.log('🎨 Generating Edit Instructions...\n');
    const editInstructions = await heroJourneyV2.generateEditInstructions(storyArc);
    
    console.log('📝 Sample Edit Instruction (Scene 1):\n');
    console.log(editInstructions[0]?.editPrompt || 'No instructions generated');
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the test
const extractionId = process.argv[2];
testStoryArc(extractionId)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });