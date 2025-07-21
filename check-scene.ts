import { db } from "./src/server/db";
import { scenes } from "./src/server/db/schema";
import { eq } from "drizzle-orm";

async function checkScene() {
  const sceneId = "7a660806-91d0-4a8b-88a0-683c9e53dc9f";
  
  console.log(`Checking scene with ID: ${sceneId}\n`);
  
  try {
    // Query the scene
    const scene = await db.query.scenes.findFirst({
      where: eq(scenes.id, sceneId),
    });
    
    if (!scene) {
      console.log("Scene not found!");
      return;
    }
    
    console.log("Scene found:");
    console.log("Name:", scene.name);
    console.log("Order:", scene.order);
    console.log("Duration:", scene.duration);
    console.log("Created:", scene.createdAt);
    console.log("Updated:", scene.updatedAt);
    console.log("\n--- TSX Code Preview (first 500 chars) ---");
    console.log(scene.tsxCode.substring(0, 500));
    console.log("\n--- Full TSX Code Length ---");
    console.log(`${scene.tsxCode.length} characters`);
    
    // Check if it looks like metadata instead of actual code
    if (scene.tsxCode.includes('"id":') && scene.tsxCode.includes('"projectId":')) {
      console.log("\n⚠️  WARNING: TSX Code appears to contain JSON metadata instead of React code!");
      console.log("\n--- Full TSX Code ---");
      console.log(scene.tsxCode);
    }
    
    // Also check props if any
    if (scene.props) {
      console.log("\n--- Scene Props ---");
      console.log(JSON.stringify(scene.props, null, 2));
    }
    
  } catch (error) {
    console.error("Error querying scene:", error);
  }
  
  process.exit(0);
}

checkScene();