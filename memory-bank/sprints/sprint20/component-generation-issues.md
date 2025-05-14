# Sprint 20: Custom Component Generation Issues Analysis

## Overview

During Sprint 20, we identified critical issues in our custom component generation pipeline. When testing a new project with a "Squishy" glass bubble animation, all three components failed to generate properly. This document analyzes the issues, identifies root causes, and proposes solutions with a test-driven approach.

## Current Issues

### System Logs Analysis

Analysis of the `combined-2025-05-14.log` revealed consistent failures in component generation:

1. **Scene 1 (CloseupOfAScene)**: 
   - Error: `Identifier 'frame' has already been declared`
   - Component job ID: `e9fcbb32-2a9e-4553-becf-970e79afaea5`
   - Animation Design Brief (ADB) ID: `59990c9b-019d-4345-bf9b-14eb31f9eb0a`

2. **Scene 2 (WavelikeRippleEffectScene)**:
   - Error: `Unexpected token '<'`
   - Component job ID: `e6fa47a8-4549-4d0d-8791-bee5d44c53fc`
   - Animation Design Brief (ADB) ID: `9a10335e-528d-4531-a565-bba2acccb029`

3. **Scene 3 (DramaticBubbleExplosionScene)**:
   - Error: `Unexpected token '<'`
   - Component job ID: `bf518419-36b2-4344-8198-4914a0ef0e88`
   - Animation Design Brief (ADB) ID: `8988bb61-c3e5-48f3-95fd-fc59583c77d6`

### Pipeline Breakdown Analysis

1. The errors occur during pre-compilation validation in `generateComponentCode.ts`
2. Components never reach the database with "generated" status
3. The build system (`buildCustomComponent.ts`) never gets a chance to fix common issues
4. These are *syntax errors* that prevent valid JavaScript/TypeScript parsing

### Connection to Previous Testing Results

Our component verification script found that 22 out of 28 components in the database had static analysis issues, including:
- Missing export statements (most common)
- Direct React imports without using window.React
- Direct Remotion imports without using window.Remotion
- Missing window.__REMOTION_COMPONENT assignment

However, these production components at least had valid syntax that allowed them to reach the build phase. Our current issues are more severe, preventing components from even being stored.

## Root Causes

### 1. LLM-Generated Code Quality Issues

- The **o4-mini** model is struggling with complex Remotion component generation
- The model generates TSX code with basic syntax errors:
  - Variable redeclaration (`frame`)
  - Malformed JSX/SVG syntax (unescaped `<` characters)
- These errors occur despite detailed prompts (12,000-15,000 characters)

### 2. Prompt Engineering Problems

- Current prompts don't sufficiently emphasize syntax correctness
- Boilerplate code may be unclear about which variables are already declared
- Instructions for SVG/JSX handling may be insufficient
- Prompts may be too complex, causing the model to lose focus on basics

### 3. Validation Pipeline Limitations

- The current validation occurs too late in the process
- No intermediate repair step for common syntax issues
- No test compilation step before attempting full component generation

## Proposed Solutions

### 1. TSX Pre-processor Implementation

We'll create a syntax repair module to fix common LLM output issues before validation:

```typescript
// src/server/workers/repairComponentSyntax.ts
import { logger } from "~/lib/logger";

/**
 * Repairs common syntax errors in LLM-generated TSX code
 * @param tsxCode The TSX code to repair
 * @returns The repaired TSX code and a list of applied fixes
 */
export function repairComponentSyntax(tsxCode: string): { 
  code: string; 
  fixes: string[];
  fixedSyntaxErrors: boolean;
} {
  const fixes: string[] = [];
  let fixedCode = tsxCode;
  let fixedSyntaxErrors = false;
  
  // Fix 1: Prevent redeclaring 'frame' variable
  const frameDeclarations = (fixedCode.match(/const\s+frame\s*=\s*useCurrentFrame\(\);/g) || []);
  if (frameDeclarations.length > 1) {
    // Keep only the first declaration, remove others
    let replaced = false;
    fixedCode = fixedCode.replace(/const\s+frame\s*=\s*useCurrentFrame\(\);/g, (match) => {
      if (!replaced) {
        replaced = true;
        return match; // Keep the first one
      }
      return '// Removed duplicate: const frame = useCurrentFrame();';
    });
    fixes.push("Removed duplicate frame declarations");
    fixedSyntaxErrors = true;
  }
  
  // Fix 2: Fix unescaped < in string literals
  // This is a simplified approach - a real implementation would be more robust
  const potentialStringLiterals = fixedCode.match(/(['"])(?:(?!\1).)*\1/g) || [];
  for (const literal of potentialStringLiterals) {
    if (literal.includes('<') && !literal.includes('&lt;')) {
      const fixed = literal.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      fixedCode = fixedCode.replace(literal, fixed);
      fixes.push("Escaped < and > characters in string literals");
      fixedSyntaxErrors = true;
    }
  }
  
  // Fix 3: Fix malformed JSX by adding missing closing tags
  // This is a simplified demonstration - real JSX parsing would be more complex
  const openTags = fixedCode.match(/<([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g) || [];
  const closeTags = fixedCode.match(/<\/([a-zA-Z][a-zA-Z0-9]*)>/g) || [];
  
  const openTagNames = openTags.map(tag => tag.match(/<([a-zA-Z][a-zA-Z0-9]*)/)?.[1] || '');
  const closeTagNames = closeTags.map(tag => tag.match(/<\/([a-zA-Z][a-zA-Z0-9]*)>/)?.[1] || '');
  
  // Simple check for mismatched tags
  for (const name of openTagNames) {
    const openCount = openTagNames.filter(n => n === name).length;
    const closeCount = closeTagNames.filter(n => n === name).length;
    
    if (openCount > closeCount) {
      logger.warn(`Potential missing closing tag for <${name}>`);
      // Real implementation would attempt to add the closing tag in the right place
      // This is just a demonstration
      fixes.push(`Detected potential missing closing tag for <${name}>`);
    }
  }
  
  // Fix 4: Ensure component is properly exported
  if (!fixedCode.includes('export default') && !fixedCode.includes('export function')) {
    // Look for a component function declaration
    const componentMatch = fixedCode.match(/function\s+([A-Za-z0-9_]+)\s*\(/);
    if (componentMatch && componentMatch[1]) {
      const componentName = componentMatch[1];
      fixedCode += `\n\n// Added missing export\nexport default ${componentName};\n`;
      fixes.push(`Added missing export default for ${componentName}`);
      fixedSyntaxErrors = true;
    }
  }
  
  return {
    code: fixedCode,
    fixes,
    fixedSyntaxErrors
  };
}
```

### 2. Prompt Enhancement Strategy

We'll improve the prompts sent to the LLM with specific syntax guidelines:

```typescript
// Addition to the component generation prompt
const syntaxGuidelinesSection = `
CRITICAL SYNTAX GUIDELINES:
1. DO NOT redeclare variables that are provided in the boilerplate:
   - 'frame' is already declared with 'const frame = useCurrentFrame()'
   - 'config' is already declared with 'const config = useVideoConfig()'
   - DO NOT declare these variables again anywhere in your code

2. For SVG content:
   - When using SVG inside JSX, all tags must be properly closed (<path /> not <path>)
   - If you need to include literal < or > characters in text or attributes, use &lt; and &gt;
   - Always include proper namespace attributes (xmlns="http://www.w3.org/2000/svg")

3. Export requirements:
   - Your component MUST have an export default statement
   - Format: 'export default YourComponentName;' or 'export default function YourComponentName() {...}'
   - DO NOT use multiple export statements

4. Final verification:
   - Review your code for correct bracket pairing and syntax
   - Count opening and closing tags to ensure they match
   - Verify that all JSX expressions use {curly braces} for JavaScript expressions
`;

// Add this section to the prompt before the component generation instructions
```

### 3. Integration with Component Generation Pipeline

We'll modify the component generation pipeline to include the syntax repair step:

```typescript
// Modification to src/server/workers/generateComponentCode.ts
// After LLM generation but before validation

// Generate component code using LLM
const componentCode = await generateComponentWithLLM(prompt);

// Apply syntax repairs before validation
const { code: repairedCode, fixes, fixedSyntaxErrors } = repairComponentSyntax(componentCode);

// Log any fixes that were applied
if (fixes.length > 0) {
  logger.info(`[COMPONENT:REPAIR][JOB:${jobId}] Applied ${fixes.length} syntax repairs:`, { 
    fixes,
    jobId,
    fixedSyntaxErrors
  });
}

// Continue with validation using the repaired code
const validationResult = validateTsxCode(repairedCode);
```

## Testing Strategy

### 1. Unit Tests for Syntax Repair

We'll create unit tests to validate the repair functions:

```typescript
// src/server/workers/__tests__/repairComponentSyntax.test.ts
import { describe, it, expect } from '@jest/globals';
import { repairComponentSyntax } from '../repairComponentSyntax';

describe('repairComponentSyntax', () => {
  it('should fix duplicate frame declarations', () => {
    const input = `
      const frame = useCurrentFrame();
      // Some code
      const frame = useCurrentFrame(); // Duplicate
    `;
    
    const { code, fixes, fixedSyntaxErrors } = repairComponentSyntax(input);
    
    expect(fixes).toContain("Removed duplicate frame declarations");
    expect(fixedSyntaxErrors).toBe(true);
    expect(code).toContain("// Removed duplicate: const frame = useCurrentFrame();");
    expect(code.match(/const\s+frame\s*=\s*useCurrentFrame\(\);/g)?.length).toBe(1);
  });
  
  it('should fix unescaped characters in string literals', () => {
    const input = `
      const svgContent = "<svg><path d='M10 10'></path></svg>";
    `;
    
    const { code, fixes, fixedSyntaxErrors } = repairComponentSyntax(input);
    
    expect(fixes).toContain("Escaped < and > characters in string literals");
    expect(fixedSyntaxErrors).toBe(true);
    expect(code).toContain("&lt;svg&gt;");
  });
  
  it('should add missing exports', () => {
    const input = `
      function MyComponent() {
        return <div>Hello</div>;
      }
    `;
    
    const { code, fixes, fixedSyntaxErrors } = repairComponentSyntax(input);
    
    expect(fixes).toContain("Added missing export default for MyComponent");
    expect(fixedSyntaxErrors).toBe(true);
    expect(code).toContain("export default MyComponent;");
  });
});
```

### 2. Integration Tests with Real Component Examples

We'll expand our `fullComponentPipeline.e2e.test.ts` file to test the repair functionality with real-world problematic components:

```typescript
// Addition to src/tests/e2e/fullComponentPipeline.e2e.test.ts

it('should repair and build a component with duplicate frame declarations', async () => {
  const duplicateFrameComponent = `
    // This component has a duplicate frame declaration
    // import React from 'react';
    // import { AbsoluteFill, useCurrentFrame } from 'remotion';
    
    export default function DuplicateFrameComponent() {
      const frame = useCurrentFrame(); // First declaration
      
      // Later in the code, by mistake:
      const frame = useCurrentFrame(); // Duplicate declaration!
      
      return (
        <AbsoluteFill style={{ backgroundColor: 'blue' }}>
          <div style={{ color: 'white', fontSize: 32 }}>
            Frame: {frame}
          </div>
        </AbsoluteFill>
      );
    }
  `;
  
  const duplicateFrameJobId = uuidv4();
  
  // Create component in database
  await db.insert(customComponentJobs).values({
    id: duplicateFrameJobId,
    projectId: testProjectId,
    tsxCode: duplicateFrameComponent,
    effect: JSON.stringify({ type: 'fadeIn', duration: 1000 }),
    status: 'generated',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  
  // Build should succeed despite the duplicate frame issue
  const buildResult = await buildCustomComponent(duplicateFrameJobId);
  expect(buildResult).toBe(true);
  
  // Verify component was built successfully
  const updatedComponent = await db.query.customComponentJobs.findFirst({
    where: eq(customComponentJobs.id, duplicateFrameJobId),
  });
  
  expect(updatedComponent?.status).toBe('complete');
  
  // Cleanup
  await db.delete(customComponentJobs)
    .where(eq(customComponentJobs.id, duplicateFrameJobId));
});

it('should repair and build a component with unescaped SVG in string literals', async () => {
  const unescapedSvgComponent = `
    export default function UnescapedSvgComponent() {
      const frame = useCurrentFrame();
      
      // Unescaped SVG in string literal
      const svgString = "<svg><path d='M10,10 L20,20'></path></svg>";
      
      return (
        <AbsoluteFill style={{ backgroundColor: 'green' }}>
          <div dangerouslySetInnerHTML={{ __html: svgString }} />
          <div style={{ color: 'white', fontSize: 32 }}>
            Frame: {frame}
          </div>
        </AbsoluteFill>
      );
    }
  `;
  
  // Similar implementation as above to test this component
});
```

## Expected Outcomes

By implementing the proposed solutions:

1. **Increased Component Generation Success Rate**: 
   - Expected improvement from current ~0% to >80% success rate
   - Remaining errors will likely be more complex logic issues, not syntax errors

2. **Improved Build Pipeline Robustness**:
   - Components that would previously fail immediately will reach the build phase
   - The build system can apply additional transformations to fix non-syntax issues

3. **Better Error Diagnostics**:
   - More specific error reporting about syntax issues
   - Clear differentiation between syntax errors and logical errors

4. **Reduced LLM Prompt Requirements**:
   - Less need for extremely detailed prompts
   - Focus more on creative aspects rather than syntax correctness

## Next Steps

1. Implement the TSX pre-processor
2. Update component generation prompts
3. Add the repair step to the generation pipeline
4. Create unit tests for the repair functionality
5. Expand integration tests with real-world examples
6. Monitor and measure improvement in component generation success rate

This test-driven approach will allow us to methodically address the component generation issues and provide a more robust pipeline for future development. 