// src/scripts/test-component-fix.js
// A test script to verify our component syntax fixes are working correctly

import { db } from '../server/db/index.js';
import { customComponentJobs } from '../server/db/schema.js'; 
import { eq } from 'drizzle-orm';
import { preprocessTsx } from '../server/utils/tsxPreprocessor.js';

async function testComponentFix() {
  console.log('🧪 Component Fix Test Tool');
  console.log('========================\n');
  
  // ID of the component to fix - pass from command line
  const componentId = process.argv[2];
  
  if (!componentId) {
    console.error('❌ Error: Please provide a component ID');
    console.error('Usage: node src/scripts/test-component-fix.js <componentId>');
    process.exit(1);
  }
  
  try {
    console.log(`📋 Looking up component: ${componentId}`);
    
    // Get the component from the database
    const component = await db.query.customComponentJobs.findFirst({
      where: eq(customComponentJobs.id, componentId)
    });
    
    if (!component) {
      console.error(`❌ Error: Component with ID ${componentId} not found`);
      process.exit(1);
    }
    
    console.log(`✅ Found component: ${component.effect} (${component.status})`);
    
    // Check if TSX code is available
    if (!component.tsxCode) {
      console.error(`❌ Error: Component has no TSX code to fix`);
      
      // If it has errorMessage, show it
      if (component.errorMessage) {
        console.log(`\n📝 Error message: ${component.errorMessage}`);
      }
      
      process.exit(1);
    }
    
    console.log('\n📊 Component Details:');
    console.log(`- ID: ${component.id}`);
    console.log(`- Effect: ${component.effect}`);
    console.log(`- Status: ${component.status}`);
    console.log(`- Project ID: ${component.projectId}`);
    console.log(`- Created: ${component.createdAt}`);
    console.log(`- Updated: ${component.updatedAt}`);
    
    // Preview the original code (first 10 lines)
    const codePreview = component.tsxCode.split('\n').slice(0, 10).join('\n');
    console.log('\n👀 Original Code Preview (first 10 lines):');
    console.log('----------------------------------------');
    console.log(codePreview);
    console.log('----------------------------------------');
    
    // Apply the preprocessing fixes
    console.log('\n🛠️ Applying syntax fixes...');
    const result = preprocessTsx(component.tsxCode, component.effect);
    
    console.log(`\n✅ Preprocessing complete. Fixed: ${result.fixed}`);
    
    if (result.issues.length > 0) {
      console.log('\n📋 Issues detected and fixed:');
      result.issues.forEach((issue, i) => {
        console.log(`${i + 1}. ${issue}`);
      });
    } else {
      console.log('\n✅ No issues detected');
    }
    
    // Preview the fixed code (first 20 lines)
    const fixedPreview = result.code.split('\n').slice(0, 20).join('\n');
    console.log('\n👀 Fixed Code Preview (first 20 lines):');
    console.log('----------------------------------------');
    console.log(fixedPreview);
    console.log('----------------------------------------');
    
    // Optionally update the database (if --apply flag is present)
    if (process.argv.includes('--apply')) {
      console.log('\n💾 Updating component in database...');
      
      await db.update(customComponentJobs)
        .set({
          tsxCode: result.code,
          status: 'pending', // Reset to pending to trigger rebuild
          errorMessage: null,
          updatedAt: new Date()
        })
        .where(eq(customComponentJobs.id, componentId));
      
      console.log('✅ Component updated successfully');
    } else {
      console.log('\n💡 This was a dry run. Use --apply flag to update the component in the database.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    // Close the database connection
    console.log('\n👋 Done!');
    process.exit(0);
  }
}

// Run the script
testComponentFix().catch(console.error);
