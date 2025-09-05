/**
 * Test script to test the Figma-to-Remotion conversion
 * Run with: npx tsx test-figma-conversion.ts [fileKey]
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { FigmaDiscoveryService } from './src/server/services/figma/figma-discovery.service';
import { FigmaConverterService } from './src/server/services/figma/figma-converter.service';

const FIGMA_PAT = process.env.FIGMA_PAT;

if (!FIGMA_PAT) {
  console.error('❌ FIGMA_PAT not found in .env.local');
  process.exit(1);
}

// Use a test file key (you can provide one as argument)
const testFileKey = process.argv[2] || 'YOUR_TEST_FILE_KEY_HERE';

if (testFileKey === 'YOUR_TEST_FILE_KEY_HERE') {
  console.error('❌ Please provide a Figma file key as argument:');
  console.error('   npx tsx test-figma-conversion.ts YOUR_FILE_KEY');
  console.error('');
  console.error('💡 To get a file key:');
  console.error('   1. Open any Figma file you own');
  console.error('   2. Copy the key from URL: figma.com/file/FILE_KEY/...');
  process.exit(1);
}

async function testConversion() {
  console.log('🔍 Testing Figma-to-Remotion conversion...');
  console.log(`📄 File key: ${testFileKey}`);
  
  try {
    // Step 1: Discover components
    console.log('\n1️⃣ Discovering components...');
    const discoveryService = new FigmaDiscoveryService(FIGMA_PAT!);
    const catalog = await discoveryService.indexFile(testFileKey);
    
    // Show what we found
    const totalComponents = Object.values(catalog).flat().length;
    console.log(`✅ Found ${totalComponents} components:`);
    Object.entries(catalog).forEach(([category, items]) => {
      if (items.length > 0) {
        console.log(`   ${category}: ${items.length} items`);
      }
    });
    
    if (totalComponents === 0) {
      console.log('❌ No components found. Make sure your file has frames or components.');
      return;
    }
    
    // Step 2: Get the first component with highest score
    const allComponents = Object.values(catalog).flat();
    const bestComponent = allComponents.reduce((best, current) => 
      current.score > best.score ? current : best
    );
    
    console.log(`\n2️⃣ Converting best component: "${bestComponent.name}" (score: ${bestComponent.score})`);
    
    // Get the actual node data
    const nodeData = await discoveryService.getNode(testFileKey, bestComponent.nodeId!);
    if (!nodeData) {
      console.error('❌ Could not fetch node data');
      return;
    }
    
    console.log('✅ Got node data:', {
      type: nodeData.type,
      name: nodeData.name,
      hasChildren: !!nodeData.children?.length,
      hasFills: !!nodeData.fills?.length,
      dimensions: nodeData.absoluteBoundingBox
    });
    
    // Step 3: Convert to Remotion code
    console.log('\n3️⃣ Converting to Remotion code...');
    const converterService = new FigmaConverterService();
    const remotionCode = await converterService.convertToRemotionCode(nodeData);
    
    console.log('✅ Generated Remotion code:');
    console.log('━'.repeat(60));
    console.log(remotionCode);
    console.log('━'.repeat(60));
    
    // Step 4: Basic validation
    const hasImports = remotionCode.includes('from \'remotion\'');
    const hasExport = remotionCode.includes('export');
    const hasComponent = remotionCode.includes('AbsoluteFill') || remotionCode.includes('div');
    const hasAnimation = remotionCode.includes('spring') || remotionCode.includes('interpolate');
    
    console.log('\n4️⃣ Code validation:');
    console.log(`   Has Remotion imports: ${hasImports ? '✅' : '❌'}`);
    console.log(`   Has export: ${hasExport ? '✅' : '❌'}`);
    console.log(`   Has components: ${hasComponent ? '✅' : '❌'}`);
    console.log(`   Has animations: ${hasAnimation ? '✅' : '❌'}`);
    
    const score = [hasImports, hasExport, hasComponent, hasAnimation].filter(Boolean).length;
    console.log(`\n🎯 Conversion quality: ${score}/4`);
    
    if (score >= 3) {
      console.log('✅ Conversion looks good!');
    } else {
      console.log('⚠️  Conversion needs improvement');
    }
    
  } catch (error) {
    console.error('❌ Error during conversion:', error);
    
    // Show more details for debugging
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
  }
}

testConversion().catch(console.error);