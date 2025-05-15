//src/scripts/component-tools/fix-component-syntax.ts
import { db } from "../../server/db";
import { customComponentJobs } from "../../server/db/schema";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Support both ESM and CommonJS environments
const __filename = typeof __filename !== 'undefined' ? __filename : fileURLToPath(import.meta.url);
const __dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(__filename);

/**
 * Fix syntax issues in a component
 * 
 * This script modifies component code to ensure it has:
 * 1. Proper export statements
 * 2. Proper Remotion component assignments
 * 3. Correct import statements
 * 4. Fixed common syntax errors
 * 
 * Usage: npx tsx src/scripts/component-tools/fix-component-syntax.ts <componentId>
 */

const COMPONENT_FIXES = {
  missingExport: {
    detect: (code: string) => !code.includes("export default") && !code.includes("export const"),
    fix: (code: string, name: string) => {
      // Find the component definition
      const functionMatch = code.match(/function\s+([A-Za-z0-9_]+)/);
      const constMatch = code.match(/const\s+([A-Za-z0-9_]+)\s*=/);
      const className = functionMatch?.[1] || constMatch?.[1] || name || "Component";
      
      // Add export statement
      return `${code}\n\nexport default ${className};`;
    }
  },
  missingRemotionAssignment: {
    detect: (code: string) => !code.includes("window.__REMOTION_COMPONENT"),
    fix: (code: string, name: string) => {
      const componentName = name || "Component";
      return `${code}\n\nwindow.__REMOTION_COMPONENT = ${componentName};`;
    }
  },
  directImports: {
    detect: (code: string) => code.includes("from 'react'") || code.includes('from "react"'),
    fix: (code: string) => {
      // Replace direct imports with window globals
      return code
        .replace(/import\s+.*\s+from\s+['"]react['"]/g, "// Using window.React instead of import")
        .replace(/import\s+.*\s+from\s+['"]@remotion\/.*['"]/g, "// Using window.Remotion instead of import");
    }
  }
};

async function fixComponentSyntax(componentId: string) {
  console.log(`Fixing syntax for component ${componentId}...`);

  try {
    // Get component from database
    const component = await db.query.customComponentJobs.findFirst({
      where: eq(customComponentJobs.id, componentId),
    });

    if (!component) {
      console.error(`Component ${componentId} not found.`);
      return;
    }

    if (!component.tsxCode) {
      console.error(`Component ${componentId} has no TSX code.`);
      return;
    }

    let fixedCode = component.tsxCode;
    let fixesApplied = false;
    const componentName = component.effect || "Component";

    // Apply fixes
    for (const [fixName, fix] of Object.entries(COMPONENT_FIXES)) {
      if (fix.detect(fixedCode)) {
        console.log(`Applying fix: ${fixName}`);
        fixedCode = fix.fix(fixedCode, componentName);
        fixesApplied = true;
      }
    }

    if (!fixesApplied) {
      console.log("No syntax issues detected.");
      return;
    }

    // Update component in database
    await db.update(customComponentJobs)
      .set({ 
        tsxCode: fixedCode,
        status: "rebuild", // Mark for rebuilding
        updatedAt: new Date()
      })
      .where(eq(customComponentJobs.id, componentId));

    console.log("Component code fixed and queued for rebuild.");
    console.log("The component will be automatically rebuilt. Check the UI for status.");

  } catch (err) {
    console.error("Error fixing component:", err);
  }
}

// Run the script if executed directly
if (process.argv[2]) {
  fixComponentSyntax(process.argv[2])
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Script failed:", err);
      process.exit(1);
    });
} else {
  console.error("Usage: npx tsx src/scripts/component-tools/fix-component-syntax.ts <componentId>");
  process.exit(1);
}
