# Component Loading Technical Overview

## Architecture Overview

The custom component loading system follows a complex pipeline from generation to rendering:

```
LLM Generation → Database → Build Process → R2 Storage → Browser Loading → Dynamic Rendering
```

This document provides a technical overview of each stage and identifies potential failure points.

## Key Components

### 1. Database Layer (`customComponentJobs` table)

- **Schema**: Stores component metadata, code, status, and output URL
- **Critical Fields**:
  - `status`: Current stage in the lifecycle (`pending`, `generated`, `building`, `ready`, `complete`, `failed`)
  - `outputUrl`: URL to the built component bundle in R2 storage
  - `errorMessage`: Details about failures (when status is `failed`)

### 2. Component Generation (`generateComponentCode.ts`)

- Uses OpenAI's Tools API to generate component code
- Validates syntax before saving to database
- Sets status to `generated` after successful generation
- Failure Points:
  - Syntax validation errors not being properly captured
  - Transient network issues with OpenAI API

### 3. Build Pipeline (`buildComponentBundle.ts`)

- Takes generated code and builds a JavaScript bundle
- Uses esbuild or other bundlers to create browser-compatible modules
- Sets status to `ready` or `complete` after successful build
- Failure Points:
  - Build process failing silently
  - Status updated to `ready` before `outputUrl` is set

### 4. R2 Storage

- Contains the compiled JavaScript bundles for each component
- Accessed via the `outputUrl` stored in the database
- Failure Points:
  - Upload to R2 failing after status update
  - URL structure or permissions issues

### 5. Browser Loading (`useRemoteComponent` hook)

```typescript
export function useRemoteComponent(componentId: string) {
  const [component, setComponent] = useState<React.ComponentType | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Reset state when componentId changes
    setComponent(null);
    setError(null);
    setIsLoading(true);

    let isMounted = true;

    const loadComponent = async () => {
      try {
        console.log(`[useRemoteComponent] Loading component: ${componentId}`);
        
        // Dynamic import of the component bundle
        const module = await import(/* @vite-ignore */ componentId);
        
        // Extract the component from the module
        const Component = module.default || module.__REMOTION_COMPONENT || null;
        
        if (!Component) {
          throw new Error(`Component not found in module: ${componentId}`);
        }
        
        if (isMounted) {
          console.log(`[useRemoteComponent] Component loaded successfully: ${componentId}`);
          setComponent(() => Component);
          setError(null);
        }
      } catch (err) {
        console.error(`[useRemoteComponent] Error loading component: ${componentId}`, err);
        if (isMounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadComponent();

    return () => {
      isMounted = false;
    };
  }, [componentId]);

  return component;
}
```

- Dynamically imports the component bundle from R2
- Manages loading and error states
- Failure Points:
  - Missing or invalid `componentId` parameter
  - Browser CORS issues with R2 storage
  - Dynamic import failures
  - Bundle not exporting component correctly (missing default export)

### 6. Component Integration (`CustomScene.tsx`)

```typescript
export const CustomScene = ({ componentId, data, adbData }: CustomSceneProps) => {
  const [refreshKey, setRefreshKey] = useState(Date.now());
  
  const forceRefresh = useCallback(() => {
    setRefreshKey(Date.now());
  }, []);
  
  // Use the refreshKey to force component reloading when needed
  const RemoteComponentRenderer = useRemoteComponent(`${componentId}?t=${refreshKey}`);
  
  if (!RemoteComponentRenderer) {
    return <div>Loading component...</div>;
  }
  
  return <RemoteComponentRenderer brief={adbData} sceneData={data} onRefresh={forceRefresh} />;
};
```

- Integrates remote components into the Remotion timeline
- Uses a refresh key to trigger component reloading
- Failure Points:
  - Infinite "Loading component..." state
  - Component failing to render after successful import

## Loading Flow Sequence Diagram

```
┌─────────┐          ┌─────────────┐          ┌──────────┐          ┌────────────┐
│         │          │             │          │          │          │            │
│   UI    │          │  Database   │          │    R2    │          │  Browser   │
│         │          │             │          │          │          │            │
└────┬────┘          └──────┬──────┘          └────┬─────┘          └─────┬──────┘
     │                      │                      │                      │
     │    Add to Video      │                      │                      │
     │─────────────────────>│                      │                      │
     │                      │                      │                      │
     │                      │   Fetch outputUrl    │                      │
     │<─────────────────────│                      │                      │
     │                      │                      │                      │
     │                      │                      │                      │
     │                          Use outputUrl to fetch bundle             │
     │──────────────────────────────────────────────────────────────────>│
     │                      │                      │                      │
     │                      │                      │      Import Bundle   │
     │                      │                      │<─────────────────────│
     │                      │                      │                      │
     │                      │                      │  Return Bundle Data  │
     │                      │                      │─────────────────────>│
     │                      │                      │                      │
     │                      │                      │     Render Component │
     │<─────────────────────────────────────────────────────────────────│
     │                      │                      │                      │
```

## Identified Failure Patterns

### 1. Database-R2 Mismatch

**Cause**: Component status is updated to `ready` before the bundle is successfully uploaded to R2.

**Solution**: Implement atomic updates to ensure both operations succeed or both fail.

```typescript
// Better implementation
try {
  // Upload to R2 first
  const outputUrl = await uploadToR2(componentId, bundleContent);
  
  // Only update database if upload succeeds
  await db.update(customComponentJobs)
    .set({
      status: 'ready',
      outputUrl: outputUrl,
      updatedAt: new Date()
    })
    .where(eq(customComponentJobs.id, componentId));
    
} catch (error) {
  // Handle error and keep status as 'building'
  await db.update(customComponentJobs)
    .set({
      status: 'failed',
      errorMessage: `Bundle upload failed: ${error.message}`,
      updatedAt: new Date()
    })
    .where(eq(customComponentJobs.id, componentId));
}
```

### 2. Build Process Failures

**Cause**: The build process may fail silently or after partial success.

**Solution**: Improve build failure handling and verification.

```typescript
// Before marking as 'ready', verify bundle content
const verifyBundle = async (bundleUrl, expectedExports) => {
  try {
    // Fetch and validate the bundle
    const response = await fetch(bundleUrl);
    const bundleText = await response.text();
    
    // Simple validation (could be more sophisticated)
    const hasDefaultExport = bundleText.includes('export default') || 
                             bundleText.includes('exports.default');
    const hasRequiredExports = expectedExports.every(exp => 
      bundleText.includes(`export ${exp}`) || bundleText.includes(`exports.${exp}`)
    );
    
    return hasDefaultExport && hasRequiredExports;
  } catch (e) {
    return false;
  }
};

// Only mark as ready if verification passes
const isValid = await verifyBundle(outputUrl, ['Component']);
if (isValid) {
  // Set to ready
} else {
  // Keep as building or mark as failed
}
```

### 3. Component Import Issues

**Cause**: The bundle might be valid but not export the component correctly.

**Solution**: Standardize component exports and add fallback mechanisms.

```typescript
// In useRemoteComponent.ts - Better component extraction logic
const getComponentFromModule = (module) => {
  // Try multiple ways to extract the component
  return module.default || 
         module.__REMOTION_COMPONENT || 
         module.Component ||
         Object.values(module).find(v => 
           typeof v === 'function' && 
           (v.name === 'Component' || v.displayName === 'Component')
         );
};

// Usage
const Component = getComponentFromModule(module);
if (!Component) {
  throw new Error(`Component not found in module: ${componentId}`);
}
```

## Health Check Recommendations

### 1. Regular Database Scans

Implement a scheduled task to scan for inconsistent component states:

```typescript
const scanForInconsistentComponents = async () => {
  // Find ready components without outputUrl
  const inconsistentComponents = await db.query.customComponentJobs.findMany({
    where: and(
      eq(customComponentJobs.status, 'ready'),
      isNull(customComponentJobs.outputUrl)
    )
  });
  
  // Reset or fix them
  for (const component of inconsistentComponents) {
    await resetComponentStatus(component.id);
  }
};
```

### 2. Component Build Verification

After building, verify that components meet all requirements:

```typescript
const verifyBuiltComponent = async (componentId) => {
  const component = await db.query.customComponentJobs.findFirst({
    where: eq(customComponentJobs.id, componentId)
  });
  
  if (!component || !component.outputUrl) return false;
  
  // Verify R2 object exists
  const exists = await checkR2ObjectExists(component.outputUrl);
  if (!exists) return false;
  
  // Verify bundle content
  const content = await fetchR2Object(component.outputUrl);
  
  // Verify export structure
  return validateBundle(content);
};
```

## Conclusion

The custom component loading system is complex with multiple points of potential failure. By implementing the recommendations in this document, the system can be made more robust and reliable. Regular health checks and proper error handling at each stage are essential for maintaining a smooth user experience.
