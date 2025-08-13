# GitHub Recursive Component Fetching

## Overview
Enhancement to fetch components with their dependencies (2-layer deep) for animating complex multi-file components like homepages.

## Current Limitation
- System only fetches single component file
- Imports are not resolved (Hero, Footer, etc. are unknown)
- Can't animate complex pages with multiple components

## Proposed Solution: 2-Layer Recursive Fetch

### Implementation Approach
```typescript
async function fetchComponentWithDependencies(
  componentName: string, 
  accessToken: string,
  depth = 2
) {
  const mainFile = await fetchFromGitHub(componentName, accessToken);
  
  if (depth <= 1) return { main: mainFile, dependencies: {} };
  
  // Extract local component imports
  const importRegex = /import\s+(?:{[^}]+}|\w+)\s+from\s+['"](\.[^'"]+)['"]/g;
  const imports = [];
  let match;
  
  while ((match = importRegex.exec(mainFile.content)) !== null) {
    imports.push(match[1]);
  }
  
  // Fetch each dependency
  const dependencies = {};
  for (const importPath of imports) {
    try {
      const depName = path.basename(importPath, '.tsx');
      const depContent = await fetchFromGitHub(depName, accessToken);
      dependencies[depName] = depContent;
    } catch (e) {
      console.log(`Dependency ${importPath} not found, skipping`);
    }
  }
  
  return {
    main: mainFile,
    dependencies,
    combinedCode: combineForContext(mainFile, dependencies)
  };
}
```

### Context Size Calculation
- Average component: 500-2000 tokens
- Homepage + 10 components: ~20k tokens
- Well within GPT-4 (128k) and Claude (200k) limits

### What to Include/Exclude

**Include:**
- Main component code
- Direct child components
- Styling information
- Component structure

**Exclude:**
- Node modules/external packages
- Type definitions (unless critical)
- Utility functions (unless visual)
- API calls and business logic

### Enhanced Prompt Structure
```typescript
const enhancedPrompt = `
MAIN COMPONENT (${componentName}):
\`\`\`tsx
${mainComponent}
\`\`\`

CHILD COMPONENTS:
${Object.entries(dependencies).map(([name, code]) => `
${name}:
\`\`\`tsx
${code}
\`\`\`
`).join('\n')}

INSTRUCTIONS:
1. Recreate the full page structure
2. Inline all child components (no imports in Remotion)
3. Preserve visual hierarchy and styling
4. Add section-by-section animations
5. Simplify for Remotion (remove routing, API calls, etc.)
`;
```

### Implementation Steps
1. Modify `GitHubComponentSearchService` to support dependency fetching
2. Update `GitHubComponentAnalyzerTool` to handle multiple files
3. Enhance prompt to include dependency context
4. Add smart filtering for relevant visual components

### Estimated Effort
- 2-3 hours to implement
- 50-100 lines of additional code
- No new dependencies required

### Use Cases Enabled
- "Animate my homepage"
- "Create video of my dashboard"
- "Animate my pricing page"
- "Show my entire checkout flow"

---

## Next Steps
1. Implement recursive fetching in search service
2. Test with real multi-component pages
3. Add smart import resolution
4. Handle edge cases (circular deps, missing files)