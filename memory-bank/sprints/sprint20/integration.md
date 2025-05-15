# Integrating Syntax Repair into Component Generation Pipeline

## Overview

This document describes how to integrate the `repairComponentSyntax` module into the existing component generation pipeline. The repair function will be added between the LLM code generation step and the syntax validation step, allowing us to fix common syntax errors before they cause component generation failures.

## Integration Steps

### 1. Create the Repair Module

First, we need to create the syntax repair module in the server workers directory:

```bash
# Create the new module
touch src/server/workers/repairComponentSyntax.ts
# Create the test file
touch src/server/workers/__tests__/repairComponentSyntax.test.ts
```

### 2. Modify `generateComponentCode.ts`

We need to modify the `generateComponentCode.ts` file to include the repair step after LLM generation but before validation:

```typescript
// Import the repair function
import { repairComponentSyntax } from './repairComponentSyntax';

// In the generateComponentCode function, after applying the component template:
const componentCode = applyComponentTemplate(
  sanitizedComponentName,
  args.componentImplementation || '',
  args.componentRender || '<div>Empty component</div>'
);

// Apply syntax repairs before validation
const { code: repairedCode, fixes, fixedSyntaxErrors } = repairComponentSyntax(componentCode);

// Log any fixes that were applied
if (fixes.length > 0) {
  componentLogger.info(jobId, `Applied ${fixes.length} syntax repairs:`, { 
    fixes,
    jobId,
    fixedSyntaxErrors
  });
}

// Validate the repaired component (instead of the original)
const validation = validateComponentSyntax(repairedCode);
if (!validation.valid) {
  componentLogger.error(jobId, `Generated component has syntax errors (after repair): ${validation.error}`);
  throw new Error(`Generated component has syntax errors: ${validation.error}`);
}

// Continue with the repaired code
return {
  code: repairedCode,
  dependencies: {},
};
```

### 3. Update Prompt with Syntax Guidelines

Update the system prompt in `generateComponentCode.ts` to include syntax guidelines:

```typescript
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

// Add this section to the system prompt
const systemPrompt = `You are an expert React and Remotion developer. You build beautiful video components using Remotion and React.
  
When creating React components with Remotion, you will ONLY provide implementation details following a very strict template structure.

${syntaxGuidelinesSection}

You will NOT write complete component files. Instead:
1. ONLY provide the COMPONENT_NAME, COMPONENT_IMPLEMENTATION, and COMPONENT_RENDER parts.
...
`;
```

### 4. Add Error Category Classification

Enhance the error reporting to classify errors into categories, making it easier to identify patterns:

```typescript
// In the catch block for component generation errors
catch (error) {
  // Classify error type based on message
  let errorCategory = "UNKNOWN";
  
  if (error instanceof Error) {
    const errorMessage = error.message;
    
    if (errorMessage.includes("already been declared")) {
      errorCategory = "VARIABLE_REDECLARATION";
    } else if (errorMessage.includes("Unexpected token '<'")) {
      errorCategory = "MALFORMED_JSX";
    } else if (errorMessage.includes("is not defined")) {
      errorCategory = "UNDEFINED_REFERENCE";
    } else if (errorMessage.includes("export")) {
      errorCategory = "EXPORT_ISSUE";
    }
  }
  
  componentLogger.error(jobId, `Component generation failed: ${error instanceof Error ? error.message : String(error)}`, {
    type: "GENERATION_ERROR",
    category: errorCategory,
    stack: error instanceof Error ? error.stack : undefined,
    fixAttempted: fixes.length > 0
  });
  
  throw error;
}
```

## Testing the Integration

To test the syntax repair integration:

1. Run the unit tests for the repair module:

```bash
npx jest src/server/workers/__tests__/repairComponentSyntax.test.ts
```

2. Extend the E2E test to include problematic component examples:

```bash
npx jest src/tests/e2e/fullComponentPipeline.e2e.test.ts
```

3. Manual testing with previously failed component jobs:

```
// Use a previously failed component job to test the repair functionality
const failedJob = await db.query.customComponentJobs.findFirst({
  where: eq(customComponentJobs.status, "error"),
  orderBy: (jobs, { desc }) => [desc(jobs.updatedAt)],
});

if (failedJob && failedJob.tsxCode) {
  console.log("Testing repair on previously failed component:");
  const { code, fixes } = repairComponentSyntax(failedJob.tsxCode);
  console.log("Applied fixes:", fixes);
  
  // Validate the repaired code
  const validation = validateComponentSyntax(code);
  console.log("Validation result:", validation);
}
```

## Monitoring and Metrics

Add metrics to track repair effectiveness:

1. Add a new metric type for syntax repairs:

```typescript
// In lib/metrics.ts
export enum MetricType {
  // ...existing metrics
  COMPONENT_REPAIR_APPLIED = "component_repair_applied",
  COMPONENT_REPAIR_SUCCESS = "component_repair_success",
}
```

2. Record metrics for repairs:

```typescript
import { recordMetric } from "~/lib/metrics";

// After applying repairs
if (fixes.length > 0) {
  await recordMetric("component_repair_applied", fixes.length, {
    jobId,
    fixTypes: fixes.join(",")
  });
  
  if (!validation.valid) {
    // Repair attempted but validation still failed
    await recordMetric("component_repair_success", 0, {
      jobId,
      error: validation.error
    });
  } else {
    // Repair successful
    await recordMetric("component_repair_success", 1, {
      jobId,
      fixCount: fixes.length
    });
  }
}
```

## Fallback Handling

As a last resort for components that cannot be automatically repaired, implement a fallback mechanism:

```typescript
// In case all repair attempts fail, create a simple fallback component
function createFallbackComponent(componentName: string, error: string): string {
  return `
// Fallback component due to generation error: ${error}
export default function ${componentName}({ brief }) {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  
  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#191919',
        color: 'white',
        fontFamily: 'Arial, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        textAlign: 'center',
      }}
    >
      <h1 style={{ fontSize: 40 }}>Component Error</h1>
      <p style={{ fontSize: 24, marginTop: 20 }}>
        This is a fallback component.
      </p>
      <div style={{ 
        padding: 20, 
        backgroundColor: '#333', 
        borderRadius: 8,
        marginTop: 20,
        maxWidth: '80%',
        overflowWrap: 'break-word'
      }}>
        <p style={{ fontSize: 18 }}>{brief?.title || 'Custom Component'}</p>
      </div>
    </AbsoluteFill>
  );
}`;
}
```

## Conclusion

By implementing these integration steps, we can significantly improve the component generation pipeline's robustness. The syntax repair module will:

1. Fix common syntax issues before validation
2. Provide detailed error reporting and classification
3. Improve the success rate of component generation
4. Reduce the need for manual intervention

The next step is to implement and test these changes in a development environment before deploying to production.

# Integration Guide: TSX Preprocessor

This guide details how to integrate the TSX preprocessor into the existing component generation pipeline to fix syntax errors before validation.

## 1. Integration Points

The primary integration point is in `src/server/workers/generateComponentCode.ts`, where we'll add the preprocessor before the validation step.

## 2. Implementation Steps

### 2.1. Import the Preprocessor

```typescript
// In src/server/workers/generateComponentCode.ts

// Add this import
import { preprocessTsx } from '~/server/utils/tsxPreprocessor';
```

### 2.2. Add Preprocessing Step

```typescript
// Inside the generateComponentCode function, locate the section after the LLM response 
// and before the validation step

// Find this code:
if (tsxCode) {
  // Validate the TSX code
  try {
    // Existing validation code
    // ...
  } catch (error) {
    // Error handling
    // ...
  }
}

// Replace with:
if (tsxCode) {
  // Apply preprocessor to fix common syntax errors
  const preprocessResult = preprocessTsx(tsxCode, componentName);
  
  if (preprocessResult.fixed) {
    componentLogger.info(jobId, `Pre-processor applied ${preprocessResult.issues.length} fixes to component code`, {
      componentName,
      fixes: preprocessResult.issues
    });
    
    // Use the fixed code
    tsxCode = preprocessResult.code;
  }
  
  // Validate the (potentially fixed) TSX code
  try {
    // Existing validation code
    // ...
  } catch (error) {
    // Add details about preprocessing to error logs
    if (preprocessResult.fixed) {
      componentLogger.warn(jobId, `Component validation failed despite preprocessing fixes`, {
        componentName,
        appliedFixes: preprocessResult.issues,
        error: error instanceof Error ? error.message : String(error)
      });
    }
    
    // Existing error handling
    // ...
  }
}
```

### 2.3. Update Logging

Ensure logging captures the preprocessing actions for monitoring and analytics:

```typescript
// Inside the error handling section, add this to capture preprocessing state
componentLogger.error(jobId, `Component validation failed: ${error}`, {
  componentName,
  preprocessingApplied: preprocessResult.fixed,
  preprocessingFixes: preprocessResult.issues
});
```

## 3. Testing the Integration

### 3.1. Create Unit Test

Add a unit test to verify the integration:

```typescript
// In the appropriate test file

it('should preprocess and fix component code before validation', async () => {
  // Arrange
  const jobId = 'test-job-1';
  const componentName = 'TestComponent';
  const problematicCode = `
    import { AbsoluteFill, useCurrentFrame } from 'remotion';
    
    export default function TestComponent() {
      const frame = useCurrentFrame();
      const frame = useCurrentFrame(); // Duplicate declaration
      
      return (
        <AbsoluteFill>
          <div>{frame}</div>
        </AbsoluteFill>
      );
    }
  `;
  
  // Mock the LLM response
  mockLlmCall.mockResolvedValueOnce({
    content: problematicCode
  });
  
  // Act
  const result = await generateComponentCode(
    jobId,
    componentName,
    'Create a test component',
    { /* mock brief */ },
    mockLogger
  );
  
  // Assert
  expect(result).toBe(true);
  expect(mockLogger.info).toHaveBeenCalledWith(
    jobId,
    expect.stringContaining('Pre-processor applied'),
    expect.objectContaining({
      componentName,
      fixes: expect.arrayContaining(['Fixed duplicate frame declaration'])
    })
  );
  
  // Verify the component was saved with fixed code
  expect(mockDb.customComponentJobs.update).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      tsxCode: expect.not.stringContaining('const frame = useCurrentFrame(); // Duplicate declaration')
    })
  );
});
```

### 3.2. Manual Testing Workflow

1. Create a test project
2. Request a component that would normally fail
3. Check logs to confirm preprocessing was applied
4. Verify component renders correctly in the preview panel

## 4. Monitoring and Analytics

### 4.1. Add Metrics Collection

```typescript
// In src/server/workers/generateComponentCode.ts

// After preprocessing
if (preprocessResult.fixed) {
  // Log existing message
  
  // Add metrics
  metrics.increment('component.preprocessor.applied');
  
  // Track specific fix types
  for (const issue of preprocessResult.issues) {
    if (issue.includes('frame declaration')) {
      metrics.increment('component.preprocessor.fixes.variable_redeclaration');
    } else if (issue.includes('tag')) {
      metrics.increment('component.preprocessor.fixes.unclosed_tags');
    } else if (issue.includes('HTML')) {
      metrics.increment('component.preprocessor.fixes.unescaped_html');
    } else if (issue.includes('export')) {
      metrics.increment('component.preprocessor.fixes.missing_export');
    } else if (issue.includes('window')) {
      metrics.increment('component.preprocessor.fixes.missing_window_assignment');
    }
  }
}
```

### 4.2. Dashboard Updates

Add a new section to the component generation dashboard showing:

- Total components processed
- Components requiring preprocessing
- Fix types applied
- Success rate before vs. after preprocessing

## 5. Rollback Plan

If issues are encountered with the preprocessor, you can quickly disable it:

```typescript
// In src/server/workers/generateComponentCode.ts

// Replace the preprocessing block with:
if (tsxCode) {
  // Temporarily disable preprocessing
  // const preprocessResult = preprocessTsx(tsxCode, componentName);
  // if (preprocessResult.fixed) {
  //   tsxCode = preprocessResult.code;
  // }
  
  // Continue with existing validation code
  // ...
}
```

## Component Syntax Fix Integration

### Fixing 'fps' Variable Redeclaration Issue

We've identified and fixed a critical issue with component generation where duplicated 'fps' variable declarations were causing TypeScript compilation errors. This was a common pattern in LLM-generated components, where the variable would be destructured from useVideoConfig() multiple times, like this:

```typescript
const { width, height, fps, durationInFrames } = useVideoConfig();

// Later in the code...
const { fps } = useVideoConfig(); // Error: Identifier 'fps' has already been declared
```

#### Implementation

1. Updated the `tsxPreprocessor.ts` file to detect and fix duplicate fps declarations:

```typescript
// Check for duplicate fps declarations
// Common patterns:
// 1. const { width, height, fps, durationInFrames } = useVideoConfig();
// 2. const fps = useVideoConfig().fps;
const fpsRegex = /const\s+{\s*[^}]*fps[^}]*}\s*=\s*useVideoConfig\(\);|const\s+fps\s*=\s*useVideoConfig\(\)\.fps;/g;
const fpsMatches = Array.from(result.matchAll(fpsRegex));

if (fpsMatches.length > 1) {
  // Find the first match with fps
  const firstFpsIndex = fpsMatches[0]?.index ?? 0;
  result = result.replace(fpsRegex, (match, offset) => {
    // Keep the first occurrence, remove others
    if (offset === firstFpsIndex) {
      return match;
    }
    return `/* Removed duplicate fps declaration: ${match.trim()} */`;
  });
  
  issues.push('Fixed duplicate fps variable declarations (useVideoConfig)');
  fixed = true;
}
```

2. Developed and ran comprehensive tests to verify the solution works with different variable patterns

This solution will allow components to continue generating successfully even when the LLM includes duplicate fps variable declarations.

### Expected Results

Components that previously failed with "Identifier 'fps' has already been declared" errors will now be automatically repaired by the preprocessor, which:

1. Detects duplicate fps variable declarations
2. Keeps the first occurrence intact
3. Comments out subsequent declarations
4. Includes helpful comments about what was removed

This fix should resolve the majority of component generation failures we've been seeing in the logs without requiring changes to the LLM prompts. 