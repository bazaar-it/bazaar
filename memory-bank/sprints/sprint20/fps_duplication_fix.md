# FPS Variable Duplication Fix

## Problem

A common error in LLM-generated components is the redeclaration of the `fps` variable. This happens in multiple ways:

1. Through destructuring assignment from `useVideoConfig()`:
   ```typescript
   // First declaration
   const { width, height, fps, durationInFrames } = useVideoConfig();
   
   // Later in the code (duplicate declaration)
   const { fps } = useVideoConfig();
   ```

2. Through direct property access:
   ```typescript
   // First declaration via destructuring
   const { width, height, fps, durationInFrames } = useVideoConfig();
   
   // Later in the code (duplicate declaration via property access)
   const fps = useVideoConfig().fps;
   ```

3. Through secondary variable access:
   ```typescript
   // First declaration
   const videoConfig = useVideoConfig();
   
   // Later in the code (duplicate via secondary variable)
   const fps = videoConfig.fps;
   ```

These errors cause component generation to fail with the error: `Identifier 'fps' has already been declared`.

## Implementation

We've implemented a two-pronged solution:

### 1. Enhanced Component Template

We've modified the component template (`componentTemplate.ts`) to comment out all hook declarations, making them opt-in rather than automatic:

```typescript
const {{COMPONENT_NAME}} = (props) => {
  // IMPORTANT: The following hook calls are uncommented based on your needs
  // Uncomment ONLY if you don't declare these variables in your component implementation
  // const frame = useCurrentFrame();
  // const { width, height, fps, durationInFrames } = useVideoConfig();
  
  // Animation Design Brief data is available in props.brief
  {{COMPONENT_IMPLEMENTATION}}
  
  // ...
};
```

### 2. Enhanced Repair Function

We've enhanced the `repairComponentSyntax.ts` function to handle more patterns of fps variable redeclaration:

```typescript
// Match all patterns for fps extraction from useVideoConfig
const fpsDeclarationsPatterns = [
  // Destructuring patterns
  /const\s+\{\s*[^}]*fps[^}]*\}\s*=\s*useVideoConfig\(\);/g,
  // Direct property access
  /const\s+fps\s*=\s*useVideoConfig\(\)\.fps;/g,
  // Property access from a variable
  /const\s+fps\s*=\s*(?:config|videoConfig)\.fps;/g
];

// Find all occurrences of fps declarations
let fpsDeclarations: string[] = [];
for (const pattern of fpsDeclarationsPatterns) {
  const matches = fixedCode.match(pattern) || [];
  fpsDeclarations = [...fpsDeclarations, ...matches];
}

if (fpsDeclarations.length > 1) {
  // Keep the first declaration, comment out the rest
  // Implementation details...
}
```

## Benefits

1. **Preventative Approach**: The template no longer includes fps variable declarations by default
2. **Comprehensive Repair**: When fps is still redeclared, our repair function now handles all common patterns
3. **Enhanced Pattern Matching**: Multiple regex patterns to catch all variants of the fps variable declaration
4. **Incremental Repair**: Each pattern is applied separately to ensure thorough replacement

## Testing

We've verified this solution against various fps redeclaration patterns:

- ✅ Standard destructuring with fps among other variables
- ✅ Destructuring fps alone
- ✅ Direct property access (useVideoConfig().fps)
- ✅ Secondary variable property access (videoConfig.fps)

## Related Files

- `src/server/workers/componentTemplate.ts` - Modified template to comment out hook declarations
- `src/server/workers/repairComponentSyntax.ts` - Enhanced fps variable redeclaration detection
- `src/server/workers/__tests__/repairComponentSyntax.test.ts` - Tests verifying the fix effectiveness

## Next Steps

- Continue monitoring component generation success rates
- Consider adding more patterns if new variants of this issue are discovered
- Update LLM prompts to emphasize avoiding variable redeclaration
