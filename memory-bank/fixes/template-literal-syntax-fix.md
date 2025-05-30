# Template Literal Syntax Fix

## Date: January 28, 2025

## Problem Description

Multiple compilation errors in `src/server/api/routers/generation.ts` around lines 703-740:

```
× 'import', and 'export' cannot be used outside of module code
× Expected a semicolon  
× Expression expected
```

**Root Cause**: Template literal containing unescaped `${...}` expressions within a JavaScript template literal, causing parser confusion.

## Problematic Code

```typescript
// BEFORE (lines 709-730) - BROKEN
code: `// Fallback component due to generation error
const { useCurrentFrame, useVideoConfig, AbsoluteFill, interpolate } = window.Remotion;

export default function ${scene.template}() {
  return (
    <AbsoluteFill style={{
      backgroundColor: '${style.colorPalette[3] || '#FFFFFF'}',  // ❌ Unescaped ${}
      color: '${style.colorPalette[4] || '#1F2937'}',           // ❌ Unescaped ${}
      fontFamily: '${style.fontPrimary || 'Inter'}'             // ❌ Unescaped ${}
    }}>
      <h1>Error: ${scene.props.title || scene.name}</h1>        // ❌ Unescaped ${}
    </AbsoluteFill>
  );
}`,
```

**Issue**: JavaScript parser interpreted `${...}` as template expressions instead of literal text.

## Solution Applied

Replaced template literal with string concatenation:

```typescript
// AFTER - FIXED  
code: '// Fallback component due to generation error\n' +
      'const { useCurrentFrame, useVideoConfig, AbsoluteFill, interpolate } = window.Remotion;\n\n' +
      'export default function ' + scene.template + '() {\n' +
      '  return (\n' +
      '    <AbsoluteFill style={{\n' +
      '      backgroundColor: "#FFFFFF",\n' +        // ✅ Plain strings
      '      color: "#1F2937",\n' +                  // ✅ Plain strings  
      '      fontFamily: "Inter"\n' +                // ✅ Plain strings
      '    }}>\n' +
      '      <h1>Error: ' + (scene.props?.title || scene.name || 'Unknown') + '</h1>\n' +
      '    </AbsoluteFill>\n' +
      '  );\n' +
      '}',
```

## Additional Actions

1. **Build cache cleared**: `rm -rf .next`
2. **Build verified**: `npm run build` - successful
3. **Development server tested**: `npm run dev` - working

## Verification

- ✅ Syntax errors eliminated
- ✅ Build compiles cleanly 
- ✅ TypeScript validation passes
- ✅ Two-stage scene generation still functional

## Lesson Learned

When generating code strings in TypeScript/JavaScript:
- **Avoid**: Template literals containing unescaped `${...}` 
- **Use**: String concatenation or properly escaped template literals
- **Always**: Clear build cache after fixing syntax errors

## Files Modified

- `src/server/api/routers/generation.ts` (lines 709-730)

## Related Issues

This fix also resolved:
- Module resolution errors: "Cannot find module './vendor-chunks/next.js'"
- Build cache corruption symptoms
- TRPCClientError intermittent issues (secondary effect) 