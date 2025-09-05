import { db } from "./src/server/db";
import { scenes } from "./src/server/db/schema";
import { eq } from "drizzle-orm";

async function checkAndFixScene() {
  const sceneId = "ff1c93d5-8d64-4682-9b7f-bbcd290f01ab";
  
  // Get the scene
  const scene = await db.query.scenes.findFirst({
    where: eq(scenes.id, sceneId),
  });
  
  if (!scene) {
    console.log("Scene not found!");
    return;
  }
  
  console.log("Scene found:", scene.name);
  
  // Check for the broken URL
  const brokenUrl = "https://files.bazaarvideo.com/uploads/1735047892_image.png";
  const correctUrl = "https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/projects/4ea08b31-de1b-46aa-a6ab-3f921eeba4d0/images/1753141081712-1f7d83d0-661c-438f-9cd5-68a83e080cae.JPG";
  
  if (scene.tsxCode.includes(brokenUrl)) {
    console.log("Found broken URL in scene code!");
    console.log("Replacing with correct URL...");
    
    // Replace the URL
    const updatedCode = scene.tsxCode.replace(new RegExp(brokenUrl, 'g'), correctUrl);
    
    // Update the scene in database
    await db.update(scenes)
      .set({ tsxCode: updatedCode })
      .where(eq(scenes.id, sceneId));
      
    console.log("Scene updated successfully!");
  } else {
    console.log("Broken URL not found in scene code.");
    console.log("Checking for any image URLs...");
    
    // Find all image URLs in the code
    const imgRegex = /<Img[^>]*src=["']([^"']+)["'][^>]*>/g;
    const matches = [...scene.tsxCode.matchAll(imgRegex)];
    
    if (matches.length > 0) {
      console.log("Found image URLs:");
      matches.forEach((match, index) => {
        console.log(`${index + 1}. ${match[1]}`);
      });
    } else {
      console.log("No image URLs found in the scene code.");
    }
  }
  
  process.exit(0);
}

checkAndFixScene().catch(console.error);