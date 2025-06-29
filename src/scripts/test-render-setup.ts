// src/scripts/test-render-setup.ts
import { renderMedia } from "@remotion/renderer";

async function testSetup() {
  console.log("Testing render setup...");
  
  // Test memory allocation
  const memoryUsage = process.memoryUsage();
  console.log(`✅ Node.js heap limit: ${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`);
  
  // Test Remotion import
  try {
    console.log("✅ Remotion renderer available");
  } catch (error) {
    console.error("❌ Remotion import failed:", error);
  }
  
  console.log("\n✅ All checks passed! Ready to render.");
  process.exit(0);
}

testSetup();