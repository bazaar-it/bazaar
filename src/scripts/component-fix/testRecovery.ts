//src/scripts/component-fix/testRecovery.ts

/**
 * Component Recovery System Validation Script
 * 
 * This script validates the component recovery system by:
 * 1. Loading sample failed components from test fixtures
 * 2. Using the TSX preprocessor to attempt to fix them
 * 3. Reporting success rates and issues fixed
 */

import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import { preprocessTsx, isErrorFixableByPreprocessor } from '~/server/utils/tsxPreprocessor';
import logger from '~/lib/logger';

// Test fixture directory
const FIXTURES_DIR = path.join(process.cwd(), 'src/scripts/component-fix/fixtures');

interface TestComponent {
  name: string;
  originalCode: string;
  error: string;
  expectedFixable: boolean;
}

// Create fixtures directory if it doesn't exist
if (!fs.existsSync(FIXTURES_DIR)) {
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });
}

// Test components with various issues
const testComponents: TestComponent[] = [
  {
    name: 'VariableRedeclaration',
    originalCode: `
      import React from 'react';
      import { useCurrentFrame } from 'remotion';
      
      export const VariableRedeclaration = () => {
        const frame = useCurrentFrame();
        const opacity = Math.min(1, frame / 30);
        const frame = frame * 2; // Redeclared variable
        
        return (
          <div style={{ opacity, fontFamily: 'Arial', fontSize: 40 }}>
            Variable redeclaration test
          </div>
        );
      };
    `,
    error: "Identifier 'frame' has already been declared",
    expectedFixable: true
  },
  {
    name: 'UnclosedJsxTag',
    originalCode: `
      import React from 'react';
      import { useCurrentFrame } from 'remotion';
      
      export const UnclosedJsxTag = () => {
        const frame = useCurrentFrame();
        
        return (
          <div style={{ fontFamily: 'Arial', fontSize: 40 }}>
            <span>Unclosed tag test
          </div>
        );
      };
    `,
    error: "Unexpected token",
    expectedFixable: true
  },
  {
    name: 'MissingExport',
    originalCode: `
      import React from 'react';
      import { useCurrentFrame } from 'remotion';
      
      const MissingExport = () => {
        const frame = useCurrentFrame();
        
        return (
          <div style={{ fontFamily: 'Arial', fontSize: 40 }}>
            Missing export test
          </div>
        );
      };
    `,
    error: "Missing export statement",
    expectedFixable: true
  },
  {
    name: 'UnescapedHtml',
    originalCode: `
      import React from 'react';
      import { useCurrentFrame } from 'remotion';
      
      export const UnescapedHtml = () => {
        const frame = useCurrentFrame();
        
        return (
          <div style={{ fontFamily: 'Arial', fontSize: 40 }}>
            <div>x < y && y > z</div>
          </div>
        );
      };
    `,
    error: "Unexpected token",
    expectedFixable: true
  }
];

// Save test components to fixtures directory
function saveTestFixtures() {
  console.log(chalk.blue('Saving test fixtures...'));
  
  testComponents.forEach(component => {
    const filePath = path.join(FIXTURES_DIR, `${component.name}.tsx`);
    fs.writeFileSync(filePath, component.originalCode);
    console.log(chalk.gray(`- Saved ${component.name} to ${filePath}`));
  });
}

// Test preprocessor on components
async function testPreprocessor() {
  console.log(chalk.blue('\nTesting TSX Preprocessor...'));
  console.log(chalk.gray('='.repeat(50)));
  
  let totalTests = 0;
  let successfulFixes = 0;
  
  for (const component of testComponents) {
    totalTests++;
    console.log(chalk.yellow(`\nTesting component: ${component.name}`));
    console.log(chalk.gray('-'.repeat(30)));
    
    // Check if we can identify it as fixable
    const error = new Error(component.error);
    const identifiedAsFixable = isErrorFixableByPreprocessor(error, component.originalCode);
    
    console.log(`Identified as fixable: ${identifiedAsFixable ? chalk.green('Yes') : chalk.red('No')}`);
    
    if (identifiedAsFixable !== component.expectedFixable) {
      console.log(chalk.red(`❌ Error: Expected fixable=${component.expectedFixable}, but got ${identifiedAsFixable}`));
      continue;
    }
    
    if (!identifiedAsFixable) {
      console.log(chalk.yellow('Skipping fix attempt for non-fixable component'));
      continue;
    }
    
    // Apply the preprocessor
    console.log('Applying preprocessor...');
    const { code: fixedCode, issues, fixed } = preprocessTsx(component.originalCode, component.name);
    
    console.log(`Fixes applied: ${fixed ? chalk.green('Yes') : chalk.red('No')}`);
    
    if (issues.length > 0) {
      console.log('Issues found:');
      issues.forEach(issue => console.log(`  - ${chalk.yellow(issue)}`));
    }
    
    // Check if the code has been modified
    if (fixedCode !== component.originalCode) {
      console.log(chalk.green('✓ Code was modified by the preprocessor'));
      
      // Try to validate the fixed code
      try {
        // Basic validation - check if syntax is valid JavaScript
        new Function(fixedCode);
        console.log(chalk.green('✓ Fixed code has valid JavaScript syntax'));
        
        // Check if the error message no longer appears in the code
        if (component.error === "Missing export statement" && fixedCode.includes('export ')) {
          console.log(chalk.green('✓ Export statement was added'));
        }
        
        if (component.error.includes('already been declared')) {
          if (!fixedCode.match(/const\s+(\w+)\s*=[\s\S]*?const\s+\1\s*=/)) {
            console.log(chalk.green('✓ Variable redeclaration was fixed'));
          }
        }
        
        if (component.error.includes('Unexpected token') && component.name === 'UnclosedJsxTag') {
          const openingTags = (fixedCode.match(/<[^\/][\w]*/g) || []).length;
          const closingTags = (fixedCode.match(/<\/[\w]*/g) || []).length + (fixedCode.match(/\/>/g) || []).length;
          
          if (openingTags === closingTags) {
            console.log(chalk.green('✓ JSX tags are now balanced'));
          } else {
            console.log(chalk.red(`❌ JSX tags are still unbalanced (${openingTags} opening, ${closingTags} closing)`));
          }
        }
        
        if (component.name === 'UnescapedHtml' && !fixedCode.includes('x < y')) {
          console.log(chalk.green('✓ HTML tokens were properly escaped'));
        }
        
        successfulFixes++;
        console.log(chalk.green(`✅ Successfully fixed ${component.name}`));
      } catch (e) {
        console.log(chalk.red(`❌ Fixed code still has syntax errors: ${e}`));
      }
    } else {
      console.log(chalk.red('❌ Code was not modified by the preprocessor'));
    }
  }
  
  console.log(chalk.gray('\n='.repeat(50)));
  console.log(chalk.blue(`\nTest Summary:`));
  console.log(`Total components tested: ${chalk.white(totalTests)}`);
  console.log(`Successful fixes: ${successfulFixes === totalTests ? chalk.green(successfulFixes) : chalk.yellow(successfulFixes)}`);
  console.log(`Success rate: ${chalk.green((successfulFixes / totalTests * 100).toFixed(2) + '%')}`);
  
  // Save results to log
  logger.info(`Component recovery test: ${successfulFixes}/${totalTests} components fixed successfully (${(successfulFixes / totalTests * 100).toFixed(2)}%)`);
}

// Main function
async function main() {
  console.log(chalk.blue.bold('Component Recovery System Validation'));
  console.log(chalk.gray('='.repeat(50)));
  
  try {
    // Save test fixtures
    saveTestFixtures();
    
    // Test preprocessor
    await testPreprocessor();
  } catch (error) {
    console.error(chalk.red('Error during testing:'), error);
    process.exit(1);
  }
}

// Run the main function
main().catch(err => {
  console.error(err);
  process.exit(1);
});
