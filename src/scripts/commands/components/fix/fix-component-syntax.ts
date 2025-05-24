// @ts-nocheck
// src/scripts/commands/components/fix/fix-component-syntax.ts

/**
 * Utility script to fix common syntax issues in Remotion custom components
 * 
 * This script reads a component code file, checks for common issues, and applies
 * fixes to make the component compatible with Remotion's requirements.
 * 
 * Usage:
 * npx tsx src/scripts/fix-component-syntax.ts <component-id>
 * 
 * Common issues fixed:
 * - Removes extra semicolons after JSX closing tags
 * - Ensures proper nesting of JSX elements
 * - Adds missing window.__REMOTION_COMPONENT assignment
 * - Ensures React/Remotion globals are properly referenced
 */

import { db } from '~/server/db';
import { customComponentJobs } from '~/server/db/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

// Get the component ID from command line args
const componentId = process.argv[2];

if (!componentId) {
  console.error('Please provide a component ID');
  console.error('Usage: npx tsx src/scripts/fix-component-syntax.ts <component-id>');
  process.exit(1);
}

// Pattern to detect common syntax errors
const PATTERNS = {
  EXTRA_SEMICOLONS: /(<\/\w+>);(\s*[);])/g,
  MISSING_REMOTION_COMPONENT: /window\.__REMOTION_COMPONENT\s*=/,
  IMPROPER_REACT_REFERENCE: /const\s+React\s*=\s*window\.React/,
  IMPROPER_REMOTION_REFERENCE: /const\s*{\s*AbsoluteFill\s*}\s*=\s*window\.Remotion/,
};

// Template for missing parts
const TEMPLATES = {
  REACT_REFERENCE: 'const React = window.React;',
  REMOTION_REFERENCE: 'const { AbsoluteFill } = window.Remotion;',
  REMOTION_COMPONENT_ASSIGNMENT: '\n// IMPORTANT: This is required for Remotion to find the component\nwindow.__REMOTION_COMPONENT = '
};

async function fixComponentSyntax() {
  try {
    console.log(`Looking for component with ID: ${componentId}`);
    
    // Fetch the component from the database
    // Use a type assertion to ensure componentId is treated as a non-null string
    const component = await db.query.customComponentJobs.findFirst({
      where: eq(customComponentJobs.id, componentId)
    });
    
    if (!component) {
      console.error(`Component with ID ${componentId} not found`);
      process.exit(1);
    }
    
    console.log(`Found component: ${component.effect}`);
    
    if (!component.tsxCode) {
      console.error(`Component has no TSX code`);
      process.exit(1);
    }
    
    // Create backup of original code
    const backupDir = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const backupFile = path.join(backupDir, `${componentId}-original.tsx`);
    fs.writeFileSync(backupFile, component.tsxCode);
    console.log(`Original code backed up to ${backupFile}`);
    
    // Start fixing the code
    let fixedCode = component.tsxCode;
    const issues = [];
    
    // Fix 1: Remove extra semicolons after JSX closing tags
    if (PATTERNS.EXTRA_SEMICOLONS.test(fixedCode)) {
      issues.push('Found extra semicolons after JSX closing tags');
      fixedCode = fixedCode.replace(PATTERNS.EXTRA_SEMICOLONS, '$1$2');
    }
    
    // Fix 2: Check for proper React reference
    if (!PATTERNS.IMPROPER_REACT_REFERENCE.test(fixedCode)) {
      issues.push('Missing proper React reference');
      // Add React reference at the top of the file
      fixedCode = `${TEMPLATES.REACT_REFERENCE}\n${fixedCode}`;
    }
    
    // Fix 3: Check for proper Remotion reference
    if (!PATTERNS.IMPROPER_REMOTION_REFERENCE.test(fixedCode)) {
      issues.push('Missing proper Remotion reference');
      // Add Remotion reference after React reference
      if (fixedCode.includes(TEMPLATES.REACT_REFERENCE)) {
        fixedCode = fixedCode.replace(
          TEMPLATES.REACT_REFERENCE,
          `${TEMPLATES.REACT_REFERENCE}\n${TEMPLATES.REMOTION_REFERENCE}`
        );
      } else {
        fixedCode = `${TEMPLATES.REMOTION_REFERENCE}\n${fixedCode}`;
      }
    }
    
    // Fix 4: Check for window.__REMOTION_COMPONENT assignment
    if (!PATTERNS.MISSING_REMOTION_COMPONENT.test(fixedCode)) {
      issues.push('Missing window.__REMOTION_COMPONENT assignment');
      
      // Try to find the component name
      const componentNameMatch = fixedCode.match(/const\s+(\w+)\s*=\s*[\(\{]/);
      let componentName = componentNameMatch ? componentNameMatch[1] : null;
      
      if (!componentName) {
        // Try to find an exported function component
        const exportedComponentMatch = fixedCode.match(/export\s+(?:default\s+)?(?:function|const)\s+(\w+)/);
        componentName = exportedComponentMatch ? exportedComponentMatch[1] : 'MyComponent';
      }
      
      // Add the assignment at the end of the file
      fixedCode += `${TEMPLATES.REMOTION_COMPONENT_ASSIGNMENT}${componentName};`;
    }
    
    // Save the fixed code
    const fixedFile = path.join(backupDir, `${componentId}-fixed.tsx`);
    fs.writeFileSync(fixedFile, fixedCode);
    console.log(`Fixed code saved to ${fixedFile}`);
    
    if (issues.length === 0) {
      console.log('No issues found in the component code');
    } else {
      console.log(`Fixed ${issues.length} issues:`);
      issues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue}`);
      });
      
      // Ask if we should update the component in the database
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      readline.question('Update component in the database? (y/n): ', async (answer: string) => {
        if (answer.toLowerCase() === 'y') {
          // Update the component in the database
          // Use a type assertion for componentId to ensure it's treated as a non-null string
          await db.update(customComponentJobs)
            .set({
              tsxCode: fixedCode,
              status: 'pending', // Reset to pending to trigger rebuild
              outputUrl: null,   // Clear output URL to ensure rebuild
              updatedAt: new Date()
            })
            .where(eq(customComponentJobs.id, componentId));
          
          console.log('Component updated in the database and queued for rebuild');
        } else {
          console.log('Component not updated in the database');
        }
        
        readline.close();
      });
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixComponentSyntax(); 