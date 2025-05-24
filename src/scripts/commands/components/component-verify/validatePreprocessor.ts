// @ts-nocheck
// src/scripts/commands/components/component-verify/validatePreprocessor.ts

import fs from 'fs';
import path from 'path';
import { preprocessTsx } from '../../server/utils/tsxPreprocessor';

/**
 * Test the TSX preprocessor with problematic component examples
 * This script demonstrates how the preprocessor can fix common syntax issues
 */
async function validatePreprocessor() {
  console.log('TSX Preprocessor Validation');
  console.log('=========================');
  
  const componentsDir = path.join(__dirname, 'problematic-components');
  const outputDir = path.join(__dirname, 'fixed-components');
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Get all TSX files in the problematic components directory
  const files = fs.readdirSync(componentsDir)
    .filter(file => file.endsWith('.tsx'));
  
  console.log(`Found ${files.length} problematic component files to test\n`);
  
  // Process each file with the preprocessor
  for (const file of files) {
    const componentName = path.basename(file, '.tsx');
    const filePath = path.join(componentsDir, file);
    const outputPath = path.join(outputDir, file);
    
    console.log(`\nProcessing ${componentName}...`);
    
    try {
      // Read the component code
      const code = fs.readFileSync(filePath, 'utf8');
      
      // Process with the preprocessor
      console.log('Before preprocessing:');
      console.log('-------------------');
      
      // Check if we can parse the original code
      try {
        // This is a simple evaluation to check for syntax errors
        // In a real implementation, we'd use a proper TypeScript parser
        console.log(`Original code evaluation: ${checkSyntax(code) ? 'Valid' : 'Invalid'}`);
      } catch (error: any) {
        console.log(`Original code has syntax errors: ${error.message}`);
      }
      
      console.log('\nApplying preprocessor...');
      const result = preprocessTsx(code, componentName);
      
      console.log('\nPreprocessor Results:');
      console.log('-------------------');
      console.log(`Fixed: ${result.fixed}`);
      console.log('Issues found:');
      result.issues.forEach(issue => console.log(`- ${issue}`));
      
      // Save the fixed component
      fs.writeFileSync(outputPath, result.code, 'utf8');
      console.log(`\nFixed version saved to ${outputPath}`);
      
      // Check if we can parse the fixed code
      try {
        // This is a simple evaluation to check for syntax errors
        // In a real implementation, we'd use a proper TypeScript parser
        console.log(`Fixed code evaluation: ${checkSyntax(result.code) ? 'Valid' : 'Invalid'}`);
      } catch (error: any) {
        console.log(`Fixed code may still have syntax errors: ${error.message}`);
      }
      
    } catch (error: any) {
      console.error(`Error processing ${file}:`, error.message);
    }
  }
  
  console.log('\nValidation complete!');
}

/**
 * Basic syntax check - this is a simplified version
 * In production, you would use TypeScript's compiler API or parser
 */
function checkSyntax(code: string): boolean {
  try {
    // This will throw a SyntaxError if the code is invalid
    // NOTE: This is not a complete solution as it doesn't handle TypeScript or JSX syntax
    // For a real implementation, you'd use TypeScript's compiler API
    Function(`"use strict";{${code}}`);
    return true;
  } catch (error) {
    throw error;
  }
}

// Run the validation
validatePreprocessor().catch(error => {
  console.error('Validation script failed:', error);
  process.exit(1);
});
