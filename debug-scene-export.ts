// Debug script to check scene data issue
import { prepareRenderConfig } from "./src/server/services/render/render.service";

// Mock scene data that appears to be causing issues
const problematicScene = {
  id: "7a660806-91d0-4a8b-88a0-683c9e53dc9f",
  projectId: "some-project-id",
  name: "Scene",
  order: 0,
  duration: 150,
  tsxCode: `{"id":"7a660806-91d0-4a8b-88a0-683c9e53dc9f","projectId":"9f9f81e4-1225-40c9-a60e-7b8b039c3297","order":0,"name":"Scene","tsxCode":"import React from 'react';\\nimport { AbsoluteFill } from 'remotion';\\n\\nexport default function Scene() {\\n  return (\\n    <AbsoluteFill>\\n      <h1>Test Scene</h1>\\n    </AbsoluteFill>\\n  );\\n}","props":null,"duration":150}`,
  props: null,
  createdAt: new Date(),
  updatedAt: new Date()
};

async function debugSceneExport() {
  console.log("=== DEBUG SCENE EXPORT ===\n");
  
  // Check if tsxCode is actually JSON metadata
  console.log("1. Raw scene tsxCode:");
  console.log(problematicScene.tsxCode);
  console.log("\n");
  
  // Try to parse it as JSON
  try {
    const parsed = JSON.parse(problematicScene.tsxCode);
    console.log("2. ⚠️  PROBLEM DETECTED: tsxCode contains JSON metadata!");
    console.log("Parsed JSON:", parsed);
    
    if (parsed.tsxCode) {
      console.log("\n3. The actual TSX code is nested inside:");
      console.log(parsed.tsxCode);
      console.log("\n4. This suggests the scene was saved with metadata instead of just the code!");
    }
  } catch (e) {
    console.log("2. tsxCode is not JSON (this is good)");
  }
  
  // Test what prepareRenderConfig does with this
  console.log("\n5. Testing prepareRenderConfig...");
  try {
    const config = await prepareRenderConfig({
      projectId: "test-project",
      scenes: [problematicScene],
      format: 'mp4',
      quality: 'high',
      projectProps: { meta: { format: 'landscape', width: 1920, height: 1080 } }
    });
    
    console.log("\n6. prepareRenderConfig output:");
    console.log("Scene count:", config.scenes.length);
    if (config.scenes[0]) {
      console.log("First scene has jsCode:", !!config.scenes[0].jsCode);
      console.log("jsCode preview:", config.scenes[0].jsCode?.substring(0, 200) + "...");
    }
  } catch (error) {
    console.error("\n6. prepareRenderConfig failed:", error);
  }
  
  // Check if this is a data corruption issue
  console.log("\n7. DIAGNOSIS:");
  if (problematicScene.tsxCode.startsWith('{"id":')) {
    console.log("❌ The scene's tsxCode field contains the entire scene object as JSON!");
    console.log("This is a data corruption issue where the scene metadata was saved instead of just the code.");
    console.log("\nTO FIX:");
    console.log("1. Extract the actual tsxCode from the JSON metadata");
    console.log("2. Update the database to store only the TSX code, not the entire object");
    console.log("3. Add validation to prevent this from happening in the future");
  } else {
    console.log("✅ The scene's tsxCode appears to be actual code");
  }
}

debugSceneExport().catch(console.error);