# Critical Lambda Render Issue: React Error #130

**Date**: 2025-08-28  
**Status**: IDENTIFIED - Needs Fix  
**Severity**: Critical (Blocks video exports)  
**Sprint**: 101 - Render Fixes

## Problem Summary

Video exports are failing in production Lambda environment with React error #130: "Element type is invalid". Users cannot download their rendered videos when scenes contain Iconify icons.

## Error Details

```
Minified React error #130; visit https://react.dev/errors/130?args[]=undefined&args[]= for the full message
```

**React Error #130 means**: Invalid element type - React expected a string (built-in component) or class/function (composite component) but received `undefined`.

## Root Cause Analysis

### What's Happening
1. Scene code contains: `React.createElement(window.IconifyIcon, { icon: "simple-icons:airbnb", ... })`
2. Icon replacement process loads icons correctly but fails to replace all references
3. `window.IconifyIcon` is `undefined` in Lambda runtime environment
4. React throws error #130 when trying to create elements with undefined component type

### Evidence from Logs
```
[Icon Replace] Successfully loaded 1 of 1 icons
[Icon Replace] Successfully loaded 20 of 20 icons
[Icon Replace] Transformation complete. Icons inlined: false  // ← Problem!
```

The key indicator: `Icons inlined: false` - this means the AST transformation didn't replace the icon references.

### Working vs Failing Process
- ✅ **Icon Loading**: All icons load successfully from Iconify API
- ✅ **Icon Preprocessing**: Icons are detected and processed  
- ❌ **Icon Replacement**: AST transformation fails to replace `window.IconifyIcon` with inline SVGs
- ❌ **Runtime**: Lambda environment has undefined `window.IconifyIcon`

## Affected Scenes

From the logs, this affects scenes using:
- `simple-icons:airbnb` (Scene 0)
- 20 different `mdi:*` icons (Scene 1): plus, dots-vertical, home, school, fire, calendar, export, information-outline, trending-up, trending-down, paypal, bank-transfer, atlassian, dropbox, spotify, amazon, netflix, car, coffee, apple

## Technical Details

### Icon Replacement Process
Located in: `/src/server/services/render/replace-iconify-icons.ts`

The process should:
1. Parse code with Babel AST
2. Find `IconifyIcon` references 
3. Replace with inline SVG via `React.createElement('svg', ...)`
4. Set `Icons inlined: true`

### Current Failure Point
The AST transformation in `replace-iconify-icons.ts` is not finding/replacing all icon references, particularly those using `window.IconifyIcon` syntax.

## Impact

- **User Impact**: Cannot export videos with icons (very common)
- **Business Impact**: Export feature broken for significant portion of content
- **Scope**: Affects all scenes using Iconify icons in production

## Solutions

### Option 1: Fix Icon Replacement (Recommended)
- Debug AST transformation in `replace-iconify-icons.ts`
- Ensure it handles `window.IconifyIcon` references
- Test with both JSX and `createElement` patterns

### Option 2: Provide Runtime Fallback
- Add `window.IconifyIcon` component to Lambda runtime
- Less ideal as it requires runtime icon loading

### Option 3: Preprocessing Validation
- Validate that all icons are successfully replaced before Lambda
- Fail fast with better error message if replacement incomplete

## Next Steps

1. **Debug AST transformation** - Why is `Icons inlined: false`?
2. **Test icon replacement** with actual failing scene code
3. **Fix transformation logic** to handle all icon reference patterns
4. **Add validation** to ensure complete replacement before Lambda
5. **Test with both simple and complex icon usage patterns**

## Related Files

- `/src/server/services/render/replace-iconify-icons.ts` - Main transformation logic
- `/src/server/services/render/icon-loader.ts` - Icon loading (working)
- `/src/server/services/render/render.service.ts` - Calls icon replacement
- `/src/server/api/routers/render.ts` - Entry point for renders

## Test Cases Needed

1. Scene with single icon (`simple-icons:airbnb`)
2. Scene with multiple different icon sets (`mdi:*`)
3. JSX syntax: `<IconifyIcon icon="mdi:heart" />`
4. createElement syntax: `React.createElement(window.IconifyIcon, { icon: "..." })`
5. Verify `Icons inlined: true` in logs after fix