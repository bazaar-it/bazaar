# BAZAAR-256: Modernize Component Loading Mechanism

## Current Implementation

### Component Loading Pattern
The current implementation in `useRemoteComponent` relies on script tag injection and global variable assignment:

1. The hook creates a script tag pointing to the component URL
2. The script is appended to the document head
3. When loaded, the script calls `window.__REMOTION_COMPONENT = ComponentName`
4. The hook reads from `window.__REMOTION_COMPONENT` to retrieve the component
5. When the component unmounts, the script is removed and global variable cleared

### Problems with Current Approach
1. **Global namespace pollution**: Only one component can be loaded at a time
2. **Race conditions**: Multiple components loading simultaneously can overwrite each other
3. **Cleanup issues**: If cleanup fails, the global variable may persist incorrectly
4. **Limited error handling**: Script load failures are difficult to capture and retry
5. **Non-standard**: Uses DOM manipulation rather than proper ES module imports
6. **State synchronization**: Requires complex logic to track script loading state

### Codebase Analysis Findings (`src/hooks/useRemoteComponent.tsx` & `src/remotion/components/scenes/CustomScene.tsx` - as of {{ TODAY_DATE }})

Our direct review of the codebase confirms and expands on the general loading pattern:

**`src/hooks/useRemoteComponent.tsx`:**
*   **Script Tag Injection**: The hook dynamically creates a `<script>` element.
*   **Code Fetching & Execution**: It fetches the component code (likely as text), and its content is set as the `textContent` of this script tag. The script is then appended to `document.body` to execute it.
*   **Global Variable Reliance**: After script execution, it retrieves the component from `window.__REMOTION_COMPONENT`.
*   **Manual Cleanup**: It includes logic to remove the script tag from the DOM when the hook unmounts or the `scriptSrc` changes.
*   **Internal State Management**: The hook manages its own `loading` and `error` states internally, rather than leveraging React Suspense.
*   **Cache Busting**: It uses URL parameters (e.g., `?version=${new Date().getTime()}`) on the `scriptSrc` for cache-busting when fetching the component code, which is a good practice for ensuring fresh code is loaded.

**`src/remotion/components/scenes/CustomScene.tsx`:**
*   **Consumes `useRemoteComponent`**: This scene imports `useRemoteComponent` (potentially aliased, e.g., as `RemoteComponent`).
*   **Props Forwarding**: It passes necessary props like `scriptSrc` (derived from `data.src`) and `databaseId` (or `componentId`) to the `useRemoteComponent` hook.
*   **Independent State Management**: `CustomScene` also often manages its own loading and error states, which might be redundant or complementary to those in `useRemoteComponent`.
*   **Manual Refresh Mechanism**: It implements a manual refresh mechanism. For example, a `refreshKey` (derived from an `externalRefreshToken` prop or similar) is appended to the `key` of the `RemoteComponent`. Changing this `refreshKey` forces React to unmount and remount the `RemoteComponent`, thereby triggering the `useRemoteComponent` hook to re-fetch and re-evaluate the script.

These specifics highlight the non-standard, imperative approach currently in place, reinforcing the need for modernization as outlined in the proposed changes.

## Proposed Changes

### 1. Replace script tag injection with React.lazy()

#### What and Why
Use React's built-in lazy loading mechanism to dynamically import the component as an ES module:

```typescript
// Current approach (simplified)
const useRemoteComponent = (url) => {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = url;
    document.head.appendChild(script);
    // ... cleanup code
  }, [url]);
  
  return window.__REMOTION_COMPONENT;
};

// New approach
const useRemoteComponent = (url) => {
  const LazyComponent = React.lazy(() => 
    import(/* webpackIgnore: true */ url)
      .then(module => ({ default: module.default }))
  );
  
  return LazyComponent;
};
```

#### Potential Effects
- Standard native browser module loading replaces custom script injection
- Components can be loaded in parallel without conflicts
- No global variable pollution
- Better error handling with structured promises
- Proper React integration with Suspense

#### Implementation Considerations
- Ensure URLs have proper CORS headers for cross-origin imports
- Add `webpackIgnore: true` comment to prevent webpack from trying to resolve the URL
- URLs must be absolute with proper protocol
- Additional module processing may be needed (e.g., `.then(module => ({ default: module.default }))`)

### 2. Implementing proper Suspense boundaries for loading states

#### What and Why
Use React's Suspense to handle loading states elegantly:

```tsx
// In component that uses the lazy component:
const MyComponent = () => {
  const LazyRemoteComponent = useRemoteComponent('https://example.com/component.js');
  
  return (
    <Suspense fallback={<LoadingIndicator />}>
      <LazyRemoteComponent {...props} />
    </Suspense>
  );
};
```

#### Potential Effects
- Consistent loading UI across all dynamic components
- Better error boundaries with React.ErrorBoundary
- More predictable loading behavior
- Component tree can suspend while module loads

#### Implementation Considerations
- Place Suspense boundaries at appropriate component level
- Consider cascading loading states for complex UIs
- Add error boundaries to handle load failures gracefully
- Configure timeout behavior for slow-loading components

### 3. Managing component refreshing with URL params instead of DOM manipulation

#### What and Why
Instead of manually removing/re-adding script tags to refresh components, use URL parameters to force React to treat it as a new component:

```typescript
// Current refresh approach
const refreshComponent = () => {
  // Remove old script
  document.querySelector(`script[src="${url}"]`)?.remove();
  // Clear global
  window.__REMOTION_COMPONENT = undefined;
  // Create new script tag
  // ...
};

// New refresh approach
const useRemoteComponent = (url, refreshToken) => {
  const urlWithRefresh = `${url}?v=${refreshToken}`;
  
  return React.lazy(() => import(/* webpackIgnore: true */ urlWithRefresh));
};
```

#### Potential Effects
- Clean component refreshing without DOM manipulation
- React will properly unmount and remount components
- No manual cleanup needed
- Proper cache busting for updated components

#### Implementation Considerations
- Generate a unique refresh token (timestamp, UUID, etc.)
- Ensure R2/CDN doesn't aggressively cache despite URL parameters
- Add proper cache headers to component responses
- Consider using a state management approach for refresh tokens

## Integration Points

### CustomScene Component

Update the CustomScene component to use the new lazy loading pattern:

```tsx
const CustomScene: React.FC<CustomSceneProps> = ({ data }) => {
  const { refreshToken } = useRefreshState();
  const LazyComponent = useRemoteComponent(data.src, refreshToken);
  
  return (
    <Suspense fallback={<LoadingPlaceholder />}>
      <ErrorBoundary fallback={<ErrorDisplay />}>
        <LazyComponent data={data} />
      </ErrorBoundary>
    </Suspense>
  );
};
```

### Preview Panel

Update any preview components to handle the new loading pattern:

```tsx
// PreviewPanel.tsx or similar
const Preview = () => {
  // ...
  return (
    <Suspense fallback={<PreviewLoading />}>
      {scenes.map(scene => 
        scene.type === 'customComponent' ? (
          <CustomScene key={scene.id} data={scene.data} />
        ) : (
          <OtherSceneType key={scene.id} data={scene.data} />
        )
      )}
    </Suspense>
  );
};
```

## Testing Strategy

1. **Unit Tests**: Test the `useRemoteComponent` hook with mock imports
2. **Integration Tests**: Test the full component loading cycle
3. **Error Handling**: Verify error boundaries catch load failures
4. **Refresh Behavior**: Test that components properly refresh with new tokens
5. **Performance Testing**: Measure load times compared to previous approach

## Implementation Checklist

- [ ] Reimplement `useRemoteComponent` to use React.lazy
- [ ] Add proper Suspense boundaries in CustomScene and Preview
- [ ] Implement refresh token mechanism
- [ ] Add appropriate error boundaries
- [ ] Update tests to match new loading pattern
- [ ] Add CORS headers to R2 component storage if needed

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Browser compatibility issues | Medium | Add feature detection and fallback |
| CORS issues with dynamic imports | High | Configure proper R2/CDN CORS headers |
| Import failures with large components | Medium | Add timeout and retry logic |
| Cache issues preventing updates | Medium | Add proper cache control headers |
| Multiple Suspense boundaries causing UI flicker | Low | Optimize Suspense boundary placement |
