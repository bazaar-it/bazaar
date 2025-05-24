// @ts-nocheck
// src/scripts/validateFpsFix.ts
// Script to validate that our fps duplication fix works correctly

import { repairComponentSyntax } from '../server/workers/repairComponentSyntax';
import { applyComponentTemplate } from '../server/workers/componentTemplate';

console.log('='.repeat(80));
console.log('VALIDATING FPS DUPLICATION FIX');
console.log('='.repeat(80));

// Test cases with different fps declaration patterns
const testCases = [
  {
    name: 'Standard destructuring + duplicate direct property',
    code: `
      const { width, height, fps, durationInFrames } = useVideoConfig();
      
      // Some code...
      
      const fps = useVideoConfig().fps; // Duplicate - should be fixed
      
      function MyComponent() {
        return <div>FPS: {fps}</div>;
      }
      
      export default MyComponent;
    `
  },
  {
    name: 'Standard destructuring + duplicate destructuring',
    code: `
      const { width, height, fps, durationInFrames } = useVideoConfig();
      
      // Some code...
      
      const { fps } = useVideoConfig(); // Duplicate - should be fixed
      
      function MyComponent() {
        return <div>FPS: {fps}</div>;
      }
      
      export default MyComponent;
    `
  },
  {
    name: 'Standard destructuring + duplicate through config variable',
    code: `
      const { width, height, fps, durationInFrames } = useVideoConfig();
      
      // Some code...
      
      const config = useVideoConfig();
      const fps = config.fps; // Duplicate - should be fixed
      
      function MyComponent() {
        return <div>FPS: {fps}</div>;
      }
      
      export default MyComponent;
    `
  },
  {
    name: 'FPS in component template',
    code: `
      function MyComponent() {
        const { width, height, fps, durationInFrames } = useVideoConfig();
        // Later in the component we have another declaration
        const fps = useVideoConfig().fps; // Duplicate - should be fixed
        
        return <div>FPS: {fps}</div>;
      }
      
      export default MyComponent;
    `
  },
  {
    name: 'Multiple fps declarations of different types',
    code: `
      // First declaration
      const { width, height, fps, durationInFrames } = useVideoConfig();
      
      // Second declaration (different format)
      const fps = useVideoConfig().fps;
      
      // Third declaration (different format)
      const videoConfig = useVideoConfig();
      const fps = videoConfig.fps;
      
      function MyComponent() {
        return <div>FPS: {fps}</div>;
      }
      
      export default MyComponent;
    `
  },
  {
    name: 'Testing with component template applied',
    code: `
      // Using useVideoConfig inside the implementation
      const myFps = useVideoConfig().fps;
      const factor = myFps / 30;
      
      function MyComponent() {
        // Get fps again here - this should be caught when template is applied
        const { width, height, fps } = useVideoConfig();
        
        return <div>FPS: {fps}, Factor: {factor}</div>;
      }
      
      export default MyComponent;
    `
  }
];

// Run the tests
console.log('\n[TESTING REPAIR COMPONENT SYNTAX FUNCTION]\n');

testCases.forEach((testCase, index) => {
  console.log(`\nTEST CASE ${index + 1}: ${testCase.name}`);
  console.log('-'.repeat(80));
  
  const { code, fixes, fixedSyntaxErrors } = repairComponentSyntax(testCase.code);
  
  console.log('Fixed Syntax Errors:', fixedSyntaxErrors ? '✅ YES' : '❌ NO');
  console.log('Applied Fixes:');
  if (fixes.length === 0) {
    console.log('  None');
  } else {
    fixes.forEach(fix => console.log(`  - ${fix}`));
  }
  
  // Show diff of changed sections
  if (fixedSyntaxErrors) {
    console.log('\nChanges Made:');
    
    // Simple diff implementation to show changes
    const originalLines = testCase.code.split('\n');
    const fixedLines = code.split('\n');
    
    for (let i = 0; i < fixedLines.length; i++) {
      if (i >= originalLines.length || originalLines[i] !== fixedLines[i]) {
        if (fixedLines[i].includes('// Removed duplicate:')) {
          console.log(`  ${i}: ${fixedLines[i]}`);
        }
      }
    }
  }
});

// Test the component template
console.log('\n\n[TESTING COMPONENT TEMPLATE APPLICATION]\n');

// Create a sample component for testing
const componentName = 'TestFpsComponent';
const implementation = `
  // Using useVideoConfig inside the implementation
  const myFps = useVideoConfig().fps;
  const factor = myFps / 30;
  
  // Get fps again here - this should be caught when template is applied
  const { width, height, fps } = useVideoConfig();
`;
const render = `<div>FPS: {fps}, Factor: {factor}</div>`;

console.log('Applying component template...');
const templateResult = applyComponentTemplate(componentName, implementation, render);

// Check if the fps declaration is properly handled
console.log('\nChecking for duplicate fps declarations...');
if (templateResult.includes('/* Hook already declared above */')) {
  console.log('✅ Template correctly handled duplicate hook declarations');
} else {
  console.log('❌ Template did not handle duplicate hook declarations');
}

// Check if the template correctly adds the window.__REMOTION_COMPONENT assignment
console.log('\nChecking for window.__REMOTION_COMPONENT assignment...');
if (templateResult.includes('window.__REMOTION_COMPONENT = TestFpsComponent')) {
  console.log('✅ Template correctly added window.__REMOTION_COMPONENT assignment');
} else {
  console.log('❌ Template did not add window.__REMOTION_COMPONENT assignment');
}

// Now run the repair function on the template output
console.log('\nRunning repair function on template output...');
const { code: repairedTemplate, fixes: templateFixes, fixedSyntaxErrors: templateFixed } = repairComponentSyntax(templateResult);

console.log('Fixed Syntax Errors:', templateFixed ? '✅ YES' : '❌ NO');
console.log('Applied Fixes:');
if (templateFixes.length === 0) {
  console.log('  None');
} else {
  templateFixes.forEach(fix => console.log(`  - ${fix}`));
}

console.log('\n='.repeat(80));
console.log('VALIDATION COMPLETE');
console.log('='.repeat(80));

// Summary of all tests
const allTestsPassed = testCases.every((testCase) => {
  const result = repairComponentSyntax(testCase.code);
  return result.fixes.some(fix => fix.includes('fps'));
});

if (allTestsPassed) {
  console.log('\n✅ SUCCESS: All test cases were handled correctly');
} else {
  console.log('\n❌ FAILURE: Some test cases were not handled correctly');
}

console.log('\nNote: Run this script whenever you update the fps duplication fix to ensure it works correctly on all patterns'); 