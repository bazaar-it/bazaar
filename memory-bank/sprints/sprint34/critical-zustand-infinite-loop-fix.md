# Critical Zustand Infinite Loop Fix

**Date**: January 16, 2025  
**Issue**: "Maximum update depth exceeded" error in PreviewPanelG  
**Severity**: Critical - Application unusable  

## Problem

User reported critical infinite loop error with stack trace:
```
Error: Maximum update depth exceeded. This can happen when a component repeatedly calls setState inside componentWillUpdate or componentDidUpdate. React limits the number of nested updates to prevent infinite loops.

src/app/projects/[id]/generate/workspace/panels/PreviewPanelG.tsx (33:63) @ PreviewPanelG
```

**Root Cause**: The Zustand selector in PreviewPanelG was creating a new object reference on every render:

```tsx
// ❌ PROBLEMATIC CODE
const { currentProps, globalRefreshCounter } = useVideoState((state) => {
  const project = state.projects[projectId];
  return {
    currentProps: project?.props || initial,  // New object every render!
    globalRefreshCounter: state.globalRefreshCounter
  };
});
```

## Solution

**Fixed by splitting into separate selectors** to avoid object creation:

```tsx
// ✅ FIXED CODE  
const currentProps = useVideoState((state) => {
  const project = state.projects[projectId];
  return project?.props || initial;
});

const globalRefreshCounter = useVideoState((state) => state.globalRefreshCounter);
```

## Why This Works

1. **No Object Creation**: Each selector returns a primitive or direct reference, not a new object
2. **Proper Memoization**: Zustand only triggers re-renders when the specific selected value changes
3. **Clean Separation**: Each selector has a single responsibility

## Impact

- ✅ **Application Usable Again**: Infinite loop eliminated
- ✅ **Better Performance**: No unnecessary re-renders
- ✅ **Type Safety**: No TypeScript complications
- ✅ **Maintainable**: Clear, explicit selectors

## Files Modified

- `src/app/projects/[id]/generate/workspace/panels/PreviewPanelG.tsx`

## Status

🎯 **COMPLETE** - Fix deployed and tested

## Testing

- [x] Application loads without infinite loops
- [x] PreviewPanelG renders correctly
- [x] State updates work as expected
- [x] No TypeScript errors

This fix restores the application to full functionality and improves the state management pattern. 