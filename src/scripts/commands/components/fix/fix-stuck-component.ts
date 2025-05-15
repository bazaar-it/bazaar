// src/scripts/fix-stuck-component.ts
/**
 * Script to fix a stuck component in the database by updating its status
 * Compatible with your project's TypeScript and ESM setup
 */

import { db } from "../server/db";
import { customComponentJobs } from "../server/db/schema";
import { eq } from "drizzle-orm";

async function fixStuckComponent() {
  console.log("Looking for stuck APerfectlyRoundScene component...");
  
  try {
    // Find the component
    const components = await db.query.customComponentJobs.findMany({
      where: eq(customComponentJobs.effect, "APerfectlyRoundScene"),
    });
    
    if (components.length === 0) {
      console.log("No components found with name APerfectlyRoundScene");
      return;
    }
    
    // Log found components
    console.log(`Found ${components.length} components:`);
    for (const comp of components) {
      console.log(`ID: ${comp.id}, Status: ${comp.status}`);
    }
    
    // Update all components that are 'queued' or have no status
    for (const comp of components) {
      if (comp.status === "queued" || !comp.status) {
        // Update the component's status
        const [updated] = await db.update(customComponentJobs)
          .set({
            status: "failed",
            errorMessage: "Generated component has syntax errors: Cannot use import statement outside a module",
            updatedAt: new Date(),
          })
          .where(eq(customComponentJobs.id, comp.id))
          .returning();
          
        console.log(`Updated component ${comp.id} to status 'failed':`, updated);
      }
    }
    
    console.log("Fix complete! Your component should now show the Fix button.");
    
  } catch (error) {
    console.error("Error fixing component:", error);
  }
}

// Run the function
fixStuckComponent()
  .catch(console.error)
  .finally(() => {
    console.log("Script complete");
    // Give Node.js time to cleanly close any connections
    setTimeout(() => process.exit(0), 1000);
  });
