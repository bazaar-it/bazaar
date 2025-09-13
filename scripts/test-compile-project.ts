/**
 * Test script to compile scenes for a specific project
 * Sprint 106: Testing hybrid compilation
 */

import { db } from '../src/server/db';
import { scenes } from '../src/server/db/schema';
import { eq } from 'drizzle-orm';
import { compileSceneToJS } from '../src/server/utils/compile-scene';

const PROJECT_ID = 'b1d9fd38-78b9-44ec-9e35-b14b31ee4142';

async function compileProjectScenes() {
  console.log('\n🔧 Testing Scene Compilation for Project:', PROJECT_ID);
  console.log('=' .repeat(60));
  
  // Fetch all scenes for the project
  const projectScenes = await db.query.scenes.findMany({
    where: eq(scenes.projectId, PROJECT_ID),
    orderBy: scenes.order
  });
  
  console.log(`\nFound ${projectScenes.length} scenes to compile\n`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const scene of projectScenes) {
    console.log(`\n📄 Scene ${scene.order + 1}: ${scene.name}`);
    console.log('-'.repeat(40));
    
    // Show TSX preview
    console.log('TSX Preview:', scene.tsxCode.substring(0, 100) + '...');
    
    // Compile the scene
    const result = compileSceneToJS(scene.tsxCode);
    
    if (result.success) {
      successCount++;
      console.log('✅ Compilation successful!');
      console.log('JS Preview:', result.jsCode?.substring(0, 100) + '...');
      console.log('JS Size:', result.jsCode?.length, 'bytes');
      console.log('TSX Size:', scene.tsxCode.length, 'bytes');
      console.log('Size ratio:', ((result.jsCode?.length || 0) / scene.tsxCode.length).toFixed(2) + 'x');
      
      // Update the database with compiled JS
      await db.update(scenes)
        .set({
          jsCode: result.jsCode,
          jsCompiledAt: new Date(),
          compilationError: null
        })
        .where(eq(scenes.id, scene.id));
        
      console.log('💾 Saved to database');
      
    } else {
      errorCount++;
      console.log('❌ Compilation failed!');
      console.log('Error:', result.error);
      
      // Save the error
      await db.update(scenes)
        .set({
          compilationError: result.error,
          jsCompiledAt: new Date()
        })
        .where(eq(scenes.id, scene.id));
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Compilation Results:');
  console.log(`✅ Success: ${successCount}/${projectScenes.length}`);
  console.log(`❌ Failed: ${errorCount}/${projectScenes.length}`);
  console.log(`📈 Success Rate: ${((successCount / projectScenes.length) * 100).toFixed(1)}%`);
  
  // Verify the updates
  console.log('\n🔍 Verifying database updates...');
  const updatedScenes = await db.query.scenes.findMany({
    where: eq(scenes.projectId, PROJECT_ID),
    columns: {
      id: true,
      name: true,
      jsCode: true,
      jsCompiledAt: true,
      compilationError: true
    }
  });
  
  console.log('\nDatabase Status:');
  for (const scene of updatedScenes) {
    const status = scene.jsCode ? '✅' : scene.compilationError ? '❌' : '⏳';
    const detail = scene.jsCode 
      ? `${(scene.jsCode.length / 1024).toFixed(1)}KB JS`
      : scene.compilationError || 'Not compiled';
    console.log(`${status} ${scene.name}: ${detail}`);
  }
  
  console.log('\n✨ Test complete!\n');
}

// Run the script
compileProjectScenes()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });