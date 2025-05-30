# Window.Remotion Safety Fix

## Issue
User reported error: "Error: Cannot destructure property 'AbsoluteFill' of 'window.Remotion' as it is undefined."

This error occurs when generated scene components try to destructure `AbsoluteFill` and other Remotion components from `window.Remotion` before the Remotion library is fully loaded.

## Root Cause
**Two-part problem:**

1. **Missing GlobalDependencyProvider**: The `GlobalDependencyProvider` component that sets up `window.Remotion` was not being used in the root layout, so `window.Remotion` was never available.

2. **Unsafe destructuring in sceneSpecGenerator**: The `sceneSpecGenerator.ts` was generating components that immediately destructured from `window.Remotion` without checking if it exists first.

## Solution

### 1. Added GlobalDependencyProvider to Root Layout
Added the missing `GlobalDependencyProvider` to `src/app/layout.tsx`:

```tsx
import { GlobalDependencyProvider } from "~/components/GlobalDependencyProvider";

// In the JSX:
<SessionProvider>
  <GlobalDependencyProvider>
    <div className="flex flex-col min-h-screen">
      {/* app content */}
    </div>
  </GlobalDependencyProvider>
</SessionProvider>
```

### 2. Added Safety Check in Component Generation
Added a safety check before destructuring in `src/lib/services/componentGenerator/sceneSpecGenerator.ts`:

```typescript
// Safety check for window.Remotion
if (!window.Remotion) {
  console.error('Remotion is not loaded yet');
  return null;
}

const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } = window.Remotion;
```

## Files Modified
- `src/app/layout.tsx` - Added GlobalDependencyProvider wrapper
- `src/lib/services/componentGenerator/sceneSpecGenerator.ts` - Added safety check for window.Remotion

## Result
✅ **Fixed** - The `window.Remotion` object is now properly set up before any components try to use it, preventing the undefined error.

## How It Works
1. `GlobalDependencyProvider` runs a `useEffect` on mount that sets up `window.Remotion`
2. Components generated after this setup can safely access `window.Remotion`
3. If components try to load before setup (race condition), the safety check prevents errors

## Notes
- The public component files already use the safe `globalThis.remotion?.` pattern
- This fix resolves both newly generated components and ensures proper global setup
- The generated components in `public/` were actually using the correct pattern - the issue was the missing global setup

## Testing
- Test by creating a new scene and ensuring no window.Remotion undefined errors occur
- Verify components load properly in the preview player
- Verify the beautiful welcome message displays correctly 