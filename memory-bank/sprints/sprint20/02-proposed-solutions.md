# Proposed Solutions for Component Generation Issues

## Solution Strategy Overview

Based on our problem analysis, we propose a two-pronged approach to resolve the component generation failures:

1. **TSX Pre-processor**: Implement syntax error detection and correction before validation
2. **Prompt Enhancements**: Refine the prompts to guide the LLM toward generating syntactically correct code

We intentionally avoid fallback components as requested, focusing instead on improving the generation process itself.

## 1. TSX Pre-processor Implementation

### Key Functionality

The TSX Pre-processor will:

1. Detect and fix common syntax errors in LLM-generated component code
2. Run before the standard validation step
3. Log the specific fixes applied for analytics and prompt improvement
4. Return both fixed code and a list of issues found

### Implementation Details

```typescript
// src/server/utils/tsxPreprocessor.ts

import * as ts from 'typescript';
import { parse as parseTs } from '@typescript-eslint/parser';
import logger from '~/lib/logger';

/**
 * Pre-process TSX code to fix common syntax errors before validation
 * 
 * @param tsxCode The original TSX code from the LLM
 * @param componentName The expected component name
 * @returns Object containing fixed code, list of issues found, and success flag
 */
export function preprocessTsx(
  tsxCode: string, 
  componentName: string = 'Component'
): {
  code: string;
  issues: string[];
  fixed: boolean;
} {
  let fixed = false;
  const issues: string[] = [];
  let code = tsxCode;

  try {
    // 1. Fix variable redeclarations
    const frameRegex = /const\s+frame\s*=\s*useCurrentFrame\(\);/g;
    const frameMatches = Array.from(code.matchAll(frameRegex));
    
    if (frameMatches.length > 1) {
      // Keep only the first declaration
      const firstMatch = frameMatches[0];
      code = code.slice(0, firstMatch.index) + 
             firstMatch[0] +
             code.slice(firstMatch.index! + firstMatch[0].length)
               .replace(frameRegex, '/* Removed duplicate frame declaration */');
      
      issues.push('Fixed duplicate frame declaration');
      fixed = true;
      logger.debug(`[TSX_PREPROCESS] Fixed duplicate frame declaration in ${componentName}`);
    }
    
    // 2. Fix unclosed JSX tags
    const jsxTagPairFixes = fixUnclosedJsxTags(code);
    if (jsxTagPairFixes.fixed) {
      code = jsxTagPairFixes.code;
      issues.push(...jsxTagPairFixes.issues);
      fixed = true;
    }
    
    // 3. Fix unescaped HTML/XML in string literals
    const stringLiteralFixes = fixUnescapedHtmlInStrings(code);
    if (stringLiteralFixes.fixed) {
      code = stringLiteralFixes.code;
      issues.push(...stringLiteralFixes.issues);
      fixed = true;
    }
    
    // 4. Ensure there's a default export for the component if missing
    const exportFixes = ensureComponentExport(code, componentName);
    if (exportFixes.fixed) {
      code = exportFixes.code;
      issues.push(...exportFixes.issues);
      fixed = true;
    }

    // 5. Validate the resulting code with a light parser
    try {
      parseTs(code, {
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true
        }
      });
    } catch (parseError) {
      issues.push(`Warning: Code may still have syntax errors: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      logger.warn(`[TSX_PREPROCESS] Possible remaining syntax errors in ${componentName}: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }
    
  } catch (error) {
    // Log any errors in the preprocessor itself
    logger.error(`[TSX_PREPROCESS] Error preprocessing TSX for ${componentName}: ${error instanceof Error ? error.message : String(error)}`);
    issues.push(`Error during preprocessing: ${error instanceof Error ? error.message : String(error)}`);
  }

  return { code, issues, fixed };
}

/**
 * Fix unclosed JSX tags
 */
function fixUnclosedJsxTags(code: string): { code: string; issues: string[]; fixed: boolean } {
  const issues: string[] = [];
  let fixed = false;
  let fixedCode = code;
  
  // Simple regex approach - this won't catch all cases but handles common patterns
  // For a production version, a proper JSX parser would be needed
  
  // Fix missing closing tags (e.g., <div> without </div>)
  const openTagRegex = /<([a-zA-Z][a-zA-Z0-9]*)([^>]*?)>/g;
  const openTags: {tag: string, index: number}[] = [];
  let match;
  
  while ((match = openTagRegex.exec(code)) !== null) {
    // Skip self-closing tags
    if (match[2].endsWith('/')) continue;
    
    const tagName = match[1];
    const closeTagRegex = new RegExp(`</${tagName}>`, 'g');
    closeTagRegex.lastIndex = match.index + match[0].length;
    
    // If we don't find a closing tag after this point, add it to the list
    const closeMatch = closeTagRegex.exec(code);
    if (!closeMatch) {
      openTags.push({tag: tagName, index: match.index});
    }
  }
  
  // Add missing closing tags from end to beginning (to maintain indices)
  if (openTags.length > 0) {
    fixedCode = code;
    for (let i = openTags.length - 1; i >= 0; i--) {
      const {tag, index} = openTags[i];
      // Find where to insert closing tag (end of code or before next tag)
      const insertPos = findCloseTagPosition(fixedCode, index);
      fixedCode = fixedCode.slice(0, insertPos) + `</${tag}>` + fixedCode.slice(insertPos);
      issues.push(`Fixed missing closing tag: </${tag}>`);
      fixed = true;
    }
  }
  
  // Helper to find insertion position for closing tags
  function findCloseTagPosition(text: string, startIndex: number): number {
    // Logic to find appropriate position to insert closing tag
    // For simplicity, we'll just use the end of the file
    // A real implementation would do proper tag balancing
    return text.length;
  }
  
  return { code: fixedCode, issues, fixed };
}

/**
 * Fix unescaped HTML/XML in string literals
 */
function fixUnescapedHtmlInStrings(code: string): { code: string; issues: string[]; fixed: boolean } {
  const issues: string[] = [];
  let fixed = false;
  let fixedCode = code;
  
  // Find string literals with unescaped < and > characters
  const stringLiteralRegex = /"([^"\\]*(\\.[^"\\]*)*)"|\`([^\`\\]*(\\.[^\`\\]*)*)\`/g;
  let match;
  let offset = 0;
  
  while ((match = stringLiteralRegex.exec(code)) !== null) {
    const stringContent = match[1] || match[3];
    // Only process if the string contains unescaped < or > characters
    // and it's not a JSX template (which can legitimately contain these characters)
    if ((stringContent.includes('<') || stringContent.includes('>')) && 
        !stringContent.includes('${') && !match[0].startsWith('`')) {
      
      // Replace < with &lt; and > with &gt;
      const escapedContent = stringContent
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      
      const originalString = match[0];
      const escapedString = originalString.replace(stringContent, escapedContent);
      
      // Skip if nothing changed
      if (escapedString === originalString) continue;
      
      // Replace in the code, accounting for previous changes
      fixedCode = fixedCode.substring(0, match.index + offset) + 
                 escapedString + 
                 fixedCode.substring(match.index + offset + originalString.length);
      
      // Update offset for future replacements
      offset += escapedString.length - originalString.length;
      
      issues.push(`Fixed unescaped HTML characters in string literal`);
      fixed = true;
    }
  }
  
  return { code: fixedCode, issues, fixed };
}

/**
 * Ensure the component has a proper export statement
 */
function ensureComponentExport(code: string, componentName: string): { code: string; issues: string[]; fixed: boolean } {
  const issues: string[] = [];
  let fixed = false;
  
  // Check if there's an export statement for this component
  const hasDefaultExport = /export\s+default\s+(?:function\s+)?(\w+)/.test(code);
  const hasNamedExport = new RegExp(`export\\s+(?:const|function|class)\\s+${componentName}`).test(code);
  
  // If no export is found, add default export at the end
  if (!hasDefaultExport && !hasNamedExport) {
    // Try to find the component function/class/const declaration
    const componentDefRegex = new RegExp(`(?:function|class|const)\\s+${componentName}`);
    const hasComponentDef = componentDefRegex.test(code);
    
    if (hasComponentDef) {
      // Add default export at the end
      code += `\n\n// Added by pre-processor\nexport default ${componentName};\n`;
      issues.push(`Added missing default export for ${componentName}`);
      fixed = true;
    } else {
      // If we can't find the component definition, log an issue
      issues.push(`Could not find component declaration for ${componentName} to add export`);
    }
  }
  
  // Ensure window.__REMOTION_COMPONENT is set
  if (!code.includes('window.__REMOTION_COMPONENT')) {
    code += `\n\n// Added by pre-processor - required for Remotion
if (typeof window !== 'undefined') {
  window.__REMOTION_COMPONENT = ${componentName};
}\n`;
    issues.push('Added missing window.__REMOTION_COMPONENT assignment');
    fixed = true;
  }
  
  return { code, issues, fixed };
}
```

## 2. Prompt Enhancements

### Key Improvements

Based on our analysis of successful vs. failing components, we recommend the following prompt enhancements:

1. **Clear Variable Scoping Guidelines**
2. **Explicit JSX/SVG Syntax Examples**
3. **Boilerplate Code Clarification**
4. **Self-Verification Instructions**

### Implementation Details

Here's a revised prompt template focusing on these improvements:

```typescript
// src/server/workers/generateComponentPrompts.ts

/**
 * Generate an improved prompt for LLM component generation
 */
export function generateEnhancedComponentPrompt(
  componentName: string,
  componentObjective: string,
  briefDetails: any, // Animation design brief
  boilerplate: string // Existing boilerplate code
): string {
  return `### ROLE: You are an Expert Remotion Developer and React Animation Specialist

### TASK: Create a single, self-contained Remotion component named "${componentName}" that implements: "${componentObjective}"

### VIDEO CONFIG
- Dimensions: ${briefDetails.dimensions.width}x${briefDetails.dimensions.height}
- Duration: ${briefDetails.durationInFrames} frames
- FPS: ${briefDetails.fps}

### CRITICAL INSTRUCTIONS - READ CAREFULLY:
1. DO NOT REDECLARE VARIABLES FROM THE BOILERPLATE. Pay special attention to:
   - \`frame\` from useCurrentFrame()
   - \`videoConfig\` from useVideoConfig()
   - Any other variables already declared

2. JSX SYNTAX REQUIREMENTS:
   - All JSX tags MUST be properly closed: <tag></tag> or <tag />
   - All SVG elements must be properly formatted with closing tags
   - String literals containing < or > characters MUST be properly escaped as &lt; and &gt;
   - Example correct SVG syntax:
     \`\`\`jsx
     <svg width="100" height="100" viewBox="0 0 100 100">
       <circle cx="50" cy="50" r={radius} fill="blue" />
     </svg>
     \`\`\`

3. EXPORTS:
   - Your component MUST have a default export: \`export default function ${componentName}() { ... }\`
   - Do NOT use named exports

4. WINDOW ASSIGNMENT:
   - Always include this code at the end of your component:
     \`\`\`js
     // Required for Remotion
     if (typeof window !== 'undefined') {
       window.__REMOTION_COMPONENT = ${componentName};
     }
     \`\`\`

### SELF-VERIFICATION:
Before returning your code, check:
1. Are there any duplicate variable declarations? (especially \`frame\`)
2. Are all JSX/SVG tags properly closed?
3. Is there a proper default export?
4. Is the window.__REMOTION_COMPONENT assignment included?

### BOILERPLATE CODE - DO NOT MODIFY OR REDECLARE THESE VARIABLES:
\`\`\`tsx
${boilerplate}
\`\`\`

### ANIMATION BRIEF:
${JSON.stringify(briefDetails, null, 2)}

### RESPONSE FORMAT:
Return ONLY the complete component code with no additional explanations or markdown.
`;
}
```

## Integration into the Workflow

### 1. Integrate the TSX Pre-processor

We'll add the pre-processor to the component generation pipeline in `src/server/workers/generateComponentCode.ts`:

```typescript
// Add to imports
import { preprocessTsx } from '~/server/utils/tsxPreprocessor';

// Inside the generateComponentCode function, before validation:
export async function generateComponentCode(
  jobId: string,
  // ... other parameters
): Promise<boolean> {
  // ... existing code

  // After receiving LLM response:
  if (tsxCode) {
    // Apply pre-processor before validation
    const preprocessResult = preprocessTsx(tsxCode, componentName);
    
    if (preprocessResult.fixed) {
      componentLogger.info(jobId, `Pre-processor applied ${preprocessResult.issues.length} fixes to component code`, {
        fixes: preprocessResult.issues
      });
      
      // Use the fixed code
      tsxCode = preprocessResult.code;
    }
    
    // Continue with existing validation and processing
    // ...
  }
  
  // ... rest of function
}
```

### 2. Implement New Prompt Template

We'll update the prompt generation in the relevant module:

```typescript
// In the appropriate module:
import { generateEnhancedComponentPrompt } from '~/server/workers/generateComponentPrompts';

// Replace the existing prompt generation with:
const prompt = generateEnhancedComponentPrompt(
  componentName,
  componentObjective,
  animationDesignBrief,
  boilerplateCode
);
```

## Expected Outcomes

With these improvements in place, we expect:

1. **Higher Success Rate**: More components will pass validation and reach the build phase
2. **Better Code Quality**: Components will have fewer fundamental issues
3. **Improved Maintainability**: Clear patterns and practices in generated code
4. **Reduced Processing Time**: Fewer retries and failures will improve overall efficiency

In the next document, we'll outline the test-driven approach to validate these solutions.
