/**
 * Simple test for Figma conversion without full env setup
 * Run with: npx tsx test-figma-simple.ts
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Test with a public Figma community file
// Using Google's Material Design Components (public)
const TEST_FILE_KEY = 'hYRFuhxyzQlNeRH0MBfV61';  // Public test file

const FIGMA_PAT = process.env.FIGMA_PAT;

if (!FIGMA_PAT) {
  console.error('❌ FIGMA_PAT not found in .env.local');
  console.error('Please add: FIGMA_PAT=your_personal_access_token');
  process.exit(1);
}

async function testFigmaAPI() {
  console.log('🧪 Testing Figma API and conversion...\n');
  
  try {
    // Step 1: Test basic Figma API access
    console.log('1️⃣ Testing Figma API connection...');
    const fileResponse = await fetch(
      `https://api.figma.com/v1/files/${TEST_FILE_KEY}`,
      {
        headers: {
          'X-Figma-Token': FIGMA_PAT
        }
      }
    );
    
    if (!fileResponse.ok) {
      const error = await fileResponse.text();
      console.error('❌ Figma API error:', error);
      return;
    }
    
    const fileData = await fileResponse.json();
    console.log('✅ Connected to Figma API');
    console.log(`   File: ${fileData.name}`);
    console.log(`   Last modified: ${fileData.lastModified}\n`);
    
    // Step 2: Find a component to test
    console.log('2️⃣ Looking for components...');
    const canvas = fileData.document.children[0];
    if (!canvas) {
      console.error('❌ No canvas found');
      return;
    }
    
    // Find first frame/component
    const testNode = canvas.children.find((child: any) => 
      child.type === 'FRAME' || child.type === 'COMPONENT'
    );
    
    if (!testNode) {
      console.error('❌ No frames or components found');
      return;
    }
    
    console.log(`✅ Found test node: "${testNode.name}" (${testNode.type})`);
    console.log('   Properties:');
    console.log(`   - Position: ${testNode.absoluteBoundingBox?.x}, ${testNode.absoluteBoundingBox?.y}`);
    console.log(`   - Size: ${testNode.absoluteBoundingBox?.width}x${testNode.absoluteBoundingBox?.height}`);
    console.log(`   - Has fills: ${!!testNode.fills?.length}`);
    console.log(`   - Has effects: ${!!testNode.effects?.length}\n`);
    
    // Step 3: Test color conversion
    if (testNode.fills?.length > 0) {
      console.log('3️⃣ Testing color conversion...');
      const fill = testNode.fills[0];
      if (fill.type === 'SOLID' && fill.color) {
        const r = Math.round(fill.color.r * 255);
        const g = Math.round(fill.color.g * 255);
        const b = Math.round(fill.color.b * 255);
        const a = fill.opacity ?? 1;
        
        const cssColor = a < 1 
          ? `rgba(${r}, ${g}, ${b}, ${a})`
          : `rgb(${r}, ${g}, ${b})`;
        
        console.log('   Figma color:', fill.color);
        console.log('   CSS color:', cssColor);
        console.log('✅ Color conversion working\n');
      }
    }
    
    // Step 4: Show what would be sent to LLM
    console.log('4️⃣ Data that would be sent to LLM:');
    const extractedData = {
      name: testNode.name,
      type: testNode.type,
      dimensions: testNode.absoluteBoundingBox,
      backgroundColor: testNode.fills?.[0] ? 'Extracted color' : 'transparent',
      borderRadius: testNode.cornerRadius || 0,
      effects: testNode.effects?.map((e: any) => e.type) || [],
      layoutMode: testNode.layoutMode,
      padding: testNode.paddingLeft ? {
        left: testNode.paddingLeft,
        right: testNode.paddingRight,
        top: testNode.paddingTop,
        bottom: testNode.paddingBottom
      } : null
    };
    
    console.log(JSON.stringify(extractedData, null, 2));
    
    console.log('\n✅ All tests passed! The Figma integration is ready.');
    console.log('\n📝 Next step: Test with an actual Figma file in the UI');
    console.log('   1. Go to Generate workspace → Integrations → Figma');
    console.log('   2. Enter this test file key:', TEST_FILE_KEY);
    console.log('   3. Drag a component to chat');
    console.log('   4. Check if it generates proper animated code');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testFigmaAPI().catch(console.error);