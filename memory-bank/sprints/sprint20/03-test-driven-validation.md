# Test-Driven Validation Approach

## Overview

To validate our proposed solutions, we'll take a test-driven approach that leverages our existing testing infrastructure. This approach will:

1. Create test cases that reproduce the exact errors we're seeing in production
2. Demonstrate that our TSX pre-processor can fix these errors
3. Show that the enhanced prompts produce better results

## Test Case Design

We'll create test cases that systematically address each type of error we've identified:

### 1. Variable Redeclaration Test Case

```typescript
// Test case for the "Identifier 'frame' has already been declared" error
export const variableRedeclarationCase = `
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import React from 'react';

export default function TestComponent() {
  // This is the problematic line - redeclaring frame
  const frame = useCurrentFrame();
  
  return (
    <AbsoluteFill style={{backgroundColor: 'blue'}}>
      <div style={{color: 'white'}}>Frame: {frame}</div>
    </AbsoluteFill>
  );
}
`;
```

### 2. Malformed JSX Test Case

```typescript
// Test case for the "Unexpected token '<'" error
export const malformedJsxCase = `
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import React from 'react';

export default function TestComponent() {
  const frame = useCurrentFrame();
  
  // This SVG has unclosed tags
  return (
    <AbsoluteFill style={{backgroundColor: 'blue'}}>
      <svg width="100" height="100">
        <circle cx="50" cy="50" r="40" fill="red"
        <rect x="20" y="20" width="60" height="60" fill="blue"
      </svg>
    </AbsoluteFill>
  );
}
`;
```

### 3. Unescaped HTML in String Literals Test Case

```typescript
// Test case for issues with unescaped HTML in strings
export const unescapedHtmlCase = `
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import React from 'react';

export default function TestComponent() {
  const frame = useCurrentFrame();
  
  // This string has unescaped < and > characters
  const svgContent = "<svg><circle cx='50' cy='50' r='40'/></svg>";
  
  return (
    <AbsoluteFill style={{backgroundColor: 'blue'}}>
      <div dangerouslySetInnerHTML={{__html: svgContent}} />
    </AbsoluteFill>
  );
}
`;
```

### 4. Missing Export and Window Assignment Test Case

```typescript
// Test case for missing exports and window assignment
export const missingExportCase = `
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import React from 'react';

// Missing export keyword
function TestComponent() {
  const frame = useCurrentFrame();
  
  return (
    <AbsoluteFill style={{backgroundColor: 'blue'}}>
      <div style={{color: 'white'}}>Frame: {frame}</div>
    </AbsoluteFill>
  );
}
// Missing window.__REMOTION_COMPONENT assignment
`;
```

## Implementation of Test Suite

We'll implement a test suite that validates our TSX pre-processor and prompt enhancements:

```typescript
// src/tests/unit/tsxPreprocessor.test.ts
import { describe, it, expect } from 'vitest';
import { preprocessTsx } from '~/server/utils/tsxPreprocessor';
import { 
  variableRedeclarationCase,
  malformedJsxCase,
  unescapedHtmlCase,
  missingExportCase
} from './testCases';

describe('TSX Pre-processor', () => {
  it('should fix variable redeclaration issues', () => {
    // Arrange
    const code = variableRedeclarationCase;
    const componentName = 'TestComponent';
    
    // Act
    const result = preprocessTsx(code, componentName);
    
    // Assert
    expect(result.fixed).toBe(true);
    expect(result.issues).toContain('Fixed duplicate frame declaration');
    
    // Verify the fix actually works
    const frameMatches = result.code.match(/const\s+frame\s*=\s*useCurrentFrame\(\);/g);
    expect(frameMatches).toHaveLength(1);
  });
  
  it('should fix malformed JSX syntax', () => {
    // Arrange
    const code = malformedJsxCase;
    const componentName = 'TestComponent';
    
    // Act
    const result = preprocessTsx(code, componentName);
    
    // Assert
    expect(result.fixed).toBe(true);
    expect(result.issues.some(issue => issue.includes('closing tag'))).toBe(true);
    
    // Attempt to parse the fixed code (should not throw)
    expect(() => {
      require('@typescript-eslint/parser').parse(result.code, {
        sourceType: 'module',
        ecmaFeatures: { jsx: true }
      });
    }).not.toThrow();
  });
  
  it('should escape HTML in string literals', () => {
    // Arrange
    const code = unescapedHtmlCase;
    const componentName = 'TestComponent';
    
    // Act
    const result = preprocessTsx(code, componentName);
    
    // Assert
    expect(result.fixed).toBe(true);
    expect(result.issues).toContain('Fixed unescaped HTML characters in string literal');
    expect(result.code).toContain('&lt;svg&gt;');
  });
  
  it('should add missing exports and window assignments', () => {
    // Arrange
    const code = missingExportCase;
    const componentName = 'TestComponent';
    
    // Act
    const result = preprocessTsx(code, componentName);
    
    // Assert
    expect(result.fixed).toBe(true);
    expect(result.issues).toContain('Added missing default export for TestComponent');
    expect(result.issues).toContain('Added missing window.__REMOTION_COMPONENT assignment');
    expect(result.code).toContain('export default TestComponent');
    expect(result.code).toContain('window.__REMOTION_COMPONENT = TestComponent');
  });
});
```

## Integration Test with Build Pipeline

We'll extend our existing `fullComponentPipeline.e2e.test.ts` to include testing of the pre-processor in the full pipeline:

```typescript
// Add to src/tests/e2e/fullComponentPipeline.e2e.test.ts

it('should build a component with syntax errors after pre-processing', async () => {
  console.log(`Creating syntax error test component with ID ${syntaxErrorJobId}`);
  
  // Create a component with syntax errors similar to production failures
  const [job] = await db.insert(customComponentJobs).values({
    id: syntaxErrorJobId,
    projectId: testProjectId,
    tsxCode: `
      import { AbsoluteFill, useCurrentFrame } from 'remotion';
      import React from 'react';
      
      export default function SyntaxErrorComponent() {
        // Duplicate frame declaration (error)
        const frame = useCurrentFrame();
        const frame = useCurrentFrame();
        
        return (
          <AbsoluteFill style={{backgroundColor: 'purple'}}>
            <svg width="100" height="100">
              <circle cx="50" cy="50" r="40" fill="red" // Missing closing tag
            </svg>
          </AbsoluteFill>
        );
      }
    `,
    effect: JSON.stringify({ type: 'syntaxTest', duration: 1000 }),
    status: 'generated',
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();
  
  // Enable the preprocessor for this test
  // (In a real implementation, this would be part of the component build process)
  const originalTsxCode = job.tsxCode;
  if (!originalTsxCode) throw new Error('No TSX code found');
  
  const preprocessed = preprocessTsx(originalTsxCode, 'SyntaxErrorComponent');
  
  // Update the job with the preprocessed code
  await db.update(customComponentJobs)
    .set({ tsxCode: preprocessed.code })
    .where(eq(customComponentJobs.id, syntaxErrorJobId));
  
  console.log('Pre-processor applied fixes:', preprocessed.issues);
  console.log('Building component with pre-processed code...');
  
  // Build should now succeed with pre-processed code
  const buildResult = await buildCustomComponent(syntaxErrorJobId);
  
  // Check build succeeded
  expect(buildResult).toBe(true);
  
  // Verify component record was updated in DB
  const updatedComponent = await db.query.customComponentJobs.findFirst({
    where: eq(customComponentJobs.id, syntaxErrorJobId),
  });
  
  // Status should be 'complete'
  expect(updatedComponent?.status).toBe('complete');
  
  // Should have an R2 outputUrl with the expected format
  expect(updatedComponent?.outputUrl).toBeDefined();
  
  // Verify the content of the built JS file
  const componentKey = `custom-components/${syntaxErrorJobId}.js`;
  const builtContent = mockUploadedContent[componentKey];
  expect(builtContent).toBeDefined();
  
  console.log(`Pre-processed component built successfully. Output URL: ${updatedComponent?.outputUrl}`);
}, 30000);
```

## Testing Enhanced Prompts

To test our enhanced prompts, we'll create a mechanism to compare prompt outputs without requiring actual LLM calls:

```typescript
// src/tests/unit/componentPrompt.test.ts
import { describe, it, expect } from 'vitest';
import { generateEnhancedComponentPrompt } from '~/server/workers/generateComponentPrompts';

describe('Component Generation Prompts', () => {
  it('should include all critical sections in the enhanced prompt', () => {
    // Arrange
    const componentName = 'TestComponent';
    const componentObjective = 'Create a test animation';
    const briefDetails = {
      dimensions: { width: 1920, height: 1080 },
      durationInFrames: 90,
      fps: 30,
      elements: []
    };
    const boilerplate = 'const frame = useCurrentFrame();';
    
    // Act
    const prompt = generateEnhancedComponentPrompt(
      componentName,
      componentObjective,
      briefDetails,
      boilerplate
    );
    
    // Assert
    expect(prompt).toContain('DO NOT REDECLARE VARIABLES FROM THE BOILERPLATE');
    expect(prompt).toContain('JSX SYNTAX REQUIREMENTS');
    expect(prompt).toContain('All JSX tags MUST be properly closed');
    expect(prompt).toContain('SELF-VERIFICATION');
    expect(prompt).toContain('BOILERPLATE CODE - DO NOT MODIFY OR REDECLARE THESE VARIABLES');
    expect(prompt).toContain('window.__REMOTION_COMPONENT = TestComponent');
  });
  
  it('should include specific examples for proper syntax', () => {
    // Arrange
    const componentName = 'TestComponent';
    const componentObjective = 'Create a test animation';
    const briefDetails = { 
      dimensions: { width: 1920, height: 1080 },
      durationInFrames: 90,
      fps: 30
    };
    const boilerplate = 'const frame = useCurrentFrame();';
    
    // Act
    const prompt = generateEnhancedComponentPrompt(
      componentName,
      componentObjective,
      briefDetails,
      boilerplate
    );
    
    // Assert
    expect(prompt).toContain('<circle cx="50" cy="50" r={radius} fill="blue" />');
    expect(prompt).toContain('String literals containing < or > characters MUST be properly escaped as &lt; and &gt;');
  });
});
```

## Manual Validation with Real Production Data

To validate our solution with real production data, we'll extract failing components from the logs and test them with our pre-processor:

```typescript
// src/scripts/validatePreprocessor.ts
import { promises as fs } from 'fs';
import { preprocessTsx } from '~/server/utils/tsxPreprocessor';
import path from 'path';

async function validateWithRealData() {
  try {
    // Define paths to actual failed component code
    // These would be extracted from production logs or database
    const failedComponentPaths = [
      './failed-components/closeup-scene.tsx',
      './failed-components/wave-ripple-scene.tsx',
      './failed-components/bubble-explosion-scene.tsx'
    ];
    
    console.log('Testing pre-processor with real failed components:');
    console.log('------------------------------------------------');
    
    for (const filePath of failedComponentPaths) {
      const fileName = path.basename(filePath);
      const componentName = fileName.replace('.tsx', '');
      
      try {
        console.log(`\nProcessing ${fileName}...`);
        
        // Read the failed component code
        const code = await fs.readFile(filePath, 'utf8');
        
        // Apply pre-processor
        const result = preprocessTsx(code, componentName);
        
        // Log the results
        console.log(`Issues found: ${result.issues.length}`);
        result.issues.forEach(issue => console.log(` - ${issue}`));
        console.log(`Fixed: ${result.fixed}`);
        
        if (result.fixed) {
          // Save the fixed version
          const fixedPath = filePath.replace('.tsx', '.fixed.tsx');
          await fs.writeFile(fixedPath, result.code, 'utf8');
          console.log(`Fixed version saved to ${fixedPath}`);
          
          // Attempt to parse the fixed code to verify it's syntactically valid
          try {
            require('@typescript-eslint/parser').parse(result.code, {
              sourceType: 'module',
              ecmaFeatures: { jsx: true }
            });
            console.log('✅ Fixed code is syntactically valid');
          } catch (parseError) {
            console.error('❌ Fixed code still has syntax errors:', parseError.message);
          }
        }
      } catch (error) {
        console.error(`Error processing ${fileName}:`, error);
      }
    }
  } catch (error) {
    console.error('Validation script error:', error);
  }
}

// Run the validation
validateWithRealData().catch(console.error);
```

## Metrics to Track

To quantify the impact of our improvements, we'll track:

1. **Component Build Success Rate**:
   - Pre-implementation: Current success rate
   - Post-implementation: New success rate
   - Target: >90% success rate

2. **Types of Issues Fixed**:
   - Track frequency of each issue type
   - Identify patterns for further prompt improvements

3. **User Experience Metrics**:
   - Reduce "black screen" preview panel occurrences
   - Reduce time from request to visible animation

## Expected Test Results

Based on our analysis of the issues and the proposed solutions, we expect:

1. The pre-processor will successfully fix:
   - 100% of variable redeclaration issues
   - ~80% of unclosed JSX tag issues
   - ~90% of missing export/window assignment issues
   - ~70% of unescaped HTML in string literals

2. The enhanced prompts will reduce the occurrence of these issues by:
   - ~50% for variable redeclarations
   - ~40% for unclosed JSX tags
   - ~60% for missing exports/window assignments

3. Overall, we expect the build success rate to improve from the current state (where all components failed) to at least 80% success.

## Next Steps After Testing

Based on test results, we'll:

1. Refine the pre-processor to address any edge cases
2. Adjust prompt enhancements based on their effectiveness
3. Consider additional tooling for monitoring component generation quality

This test-driven approach ensures that our solutions directly address the root causes identified in our analysis and can be validated against real-world examples.
