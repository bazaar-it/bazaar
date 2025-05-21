//src/hooks/useRemoteComponent.tsx
import React, { useState, useEffect, useMemo, Suspense } from 'react';
import * as Remotion from 'remotion';

// Declare the global __REMOTION_COMPONENT for TypeScript
// This should be the single, authoritative declaration for its type in this scope.
// Removed as it's a leftover from the old system and not used by ESM/React.lazy

/**
 * Custom hook for loading remote Remotion components using React.lazy.
 * 
 * @param scriptSrc The direct URL to the component ESM module
 * @param databaseId The UUID of the custom component job in the database (for fallbacks and caching)
 * @returns A React component that renders the remote component, loading state, and error state
 */
export function useRemoteComponent(scriptSrc?: string, databaseId?: string) {
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [debugInfo, setDebugInfo] = useState<Record<string, any>>({});
  
  // Use databaseId for generating unique cache busting
  const baseComponentId = useMemo(() => {
    if (!databaseId) return undefined;
    return databaseId.split('?')[0]; 
  }, [databaseId]);
  
  // Generate a unique cache buster for the import
  const cacheBuster = useMemo(() => 
    `t=${Date.now()}-r=${retryCount}`, 
    [retryCount]
  );
  
  // Determine the final URL to load the component from
  const componentUrl = useMemo(() => {
    // Use a more descriptive identifier for logging
    const logIdentifier = databaseId || scriptSrc || 'unknown-component';
    
    if (!scriptSrc && !databaseId) {
      console.error(`[useRemoteComponent ${logIdentifier}] No script source or database ID.`);
      return null;
    }
    
    let finalUrl: string;
    
    if (scriptSrc && (scriptSrc.startsWith('http://') || scriptSrc.startsWith('https://'))) {
      finalUrl = scriptSrc.includes('?') 
        ? `${scriptSrc}&${cacheBuster}` 
        : `${scriptSrc}?${cacheBuster}`;
      console.log(`[useRemoteComponent ${logIdentifier}] Using provided script URL: ${finalUrl}`);
    } else if (databaseId) {
      const apiUrlPart = databaseId.includes('?') 
        ? `${databaseId}&${cacheBuster}` 
        : `${databaseId}?${cacheBuster}`;
      finalUrl = `/api/components/${apiUrlPart}`;
      console.log(`[useRemoteComponent ${logIdentifier}] Using API URL with databaseId: ${finalUrl}`);
    } else {
      console.error(`[useRemoteComponent ${logIdentifier}] Cannot determine component URL.`);
      return null;
    }
    
    return finalUrl;
  }, [scriptSrc, databaseId, cacheBuster]);
  
  // Create a dynamic import function that returns the default export
  const importComponent = useMemo(() => {
    if (!componentUrl) {
      return null;
    }
    
    // This function will be used by React.lazy to load the component
    return async () => {
      try {
        const logIdentifier = databaseId || scriptSrc || 'unknown-component';
        console.log(`[useRemoteComponent ${logIdentifier}] Loading component from: ${componentUrl}`);
        
        // Handle both ESM default exports and CommonJS modules
        const module = await import(/* @vite-ignore */ componentUrl);
        
        // Log debug info about the loaded module
        console.log(`[useRemoteComponent ${logIdentifier}] Module loaded:`, 
          Object.keys(module).length > 0 
            ? `Keys: ${Object.keys(module).join(', ')}` 
            : 'No exports found');
        
        // First try the default export
        if (module.default && typeof module.default === 'function') {
          console.log(`[useRemoteComponent ${logIdentifier}] Using default export`);
          return { default: module.default };
        }
        
        // If no default export, look for a named export
        // Prioritize ones with component-like names (starting with uppercase)
        const componentExport = Object.entries(module).find(([key, value]) => 
          typeof value === 'function' && /^[A-Z]/.test(key)
        );
        
        if (componentExport) {
          console.log(`[useRemoteComponent ${logIdentifier}] Using named export: ${componentExport[0]}`);
          return { default: componentExport[1] };
        }
        
        // Last resort: just use the first function export
        const firstFunctionExport = Object.entries(module).find(([_, value]) => 
          typeof value === 'function'
        );
        
        if (firstFunctionExport) {
          console.log(`[useRemoteComponent ${logIdentifier}] Using first function export: ${firstFunctionExport[0]}`);
          return { default: firstFunctionExport[1] };
        }
        
        throw new Error(`No valid React component found in module. Exports: ${Object.keys(module).join(', ')}`);
      } catch (err) {
        const logIdentifier = databaseId || scriptSrc || 'unknown-component';
        console.error(`[useRemoteComponent ${logIdentifier}] Error importing component:`, err);
        
        // Store error for debugging
        setDebugInfo(prev => ({
          ...prev,
          lastError: err instanceof Error ? err.message : String(err),
          lastErrorTime: new Date().toISOString()
        }));
        
        // Rethrow to be handled by React.lazy error boundary
        throw err;
      }
    };
  }, [componentUrl, databaseId, scriptSrc]);
  
  // Create a lazily loaded component
  const LazyComponent = useMemo(() => {
    if (!importComponent) {
      return null;
    }
    
    try {
      return React.lazy(importComponent);
    } catch (err) {
      const logIdentifier = databaseId || scriptSrc || 'unknown-component';
      console.error(`[useRemoteComponent ${logIdentifier}] Error creating lazy component:`, err);
      setError(err instanceof Error ? err.message : String(err));
      return null;
    }
  }, [importComponent, databaseId, scriptSrc]);
  
  // Create the component wrapper that handles Suspense and errors
  const Component = useMemo(() => {
    return function ComponentWrapper(props: any) {
      if (error) {
        return (
          <ErrorComponent 
            error={error} 
            onRetry={() => {
              setError(null);
              setRetryCount(prev => prev + 1);
            }} 
            {...props} 
          />
        );
      }
      
      if (!LazyComponent) {
        return <ErrorComponent error="No component URL available" {...props} />;
      }
      
      return (
        <Suspense fallback={<LoadingComponent {...props} />}>
          <ErrorBoundary
            onError={(err) => {
              console.error(`[ErrorBoundary] Caught error:`, err);
              setError(err instanceof Error ? err.message : String(err));
            }}
          >
            <LazyComponent {...props} />
          </ErrorBoundary>
        </Suspense>
      );
    };
  }, [LazyComponent, error]);
  
  // Provide a reload function to force component reloading
  const reloadComponent = () => {
    const logIdentifier = databaseId || scriptSrc || 'unknown-component';
    console.log(`[useRemoteComponent ${logIdentifier}] Forcing reload of component`);
    setError(null);
    setDebugInfo({}); // Reset debug info
    
    // Force a new import by incrementing the retry count
    setRetryCount(prev => prev + 1);
  };
  
  // Return an object with the component and state information
  return {
    Component,
    loading: !LazyComponent && !error,
    error,
    reload: reloadComponent,
    debugInfo,
    retryCount
  };
}

// Error boundary component to catch runtime errors in the loaded component
class ErrorBoundary extends React.Component<{
  children: React.ReactNode;
  onError: (error: Error) => void;
}> {
  state = { hasError: false };
  
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  
  componentDidCatch(error: Error) {
    this.props.onError(error);
  }
  
  render() {
    if (this.state.hasError) {
      // The actual error UI will be rendered by the parent component
      return null;
    }
    
    return this.props.children;
  }
}

// Loading component
const LoadingComponent: React.FC<any> = (props) => {
  return (
    <div 
      style={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        color: 'white',
        fontFamily: 'sans-serif',
        fontSize: '1rem',
        padding: '1rem',
        borderRadius: '0.5rem',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <p>Loading component...</p>
        <div style={{ 
          display: 'inline-block',
          width: '1rem',
          height: '1rem', 
          borderRadius: '50%',
          borderTop: '2px solid white',
          borderRight: '2px solid transparent',
          animation: 'rotate 1s linear infinite',
        }} />
        <style>
          {`
            @keyframes rotate {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    </div>
  );
};

// Error component
const ErrorComponent: React.FC<{ error: string; onRetry?: () => void }> = ({ error, onRetry, ...props }) => {
  return (
    <div 
      style={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 0, 0, 0.1)',
        color: 'red',
        fontFamily: 'sans-serif',
        fontSize: '1rem',
        padding: '1rem',
        borderRadius: '0.5rem',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <p>Error loading component:</p>
        <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>{error}</p>
        {onRetry && (
          <button 
            onClick={onRetry}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              backgroundColor: 'red',
              color: 'white',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * A component that uses useRemoteComponent to load and render a remote component
 */
export function RemoteComponent({ 
  scriptSrc, 
  databaseId, 
  ...props 
}: { 
  scriptSrc?: string;
  databaseId?: string;
  [key: string]: any; 
}) {
  const logIdentifier = databaseId || scriptSrc || 'unknown-component';
  console.log(`[RemoteComponent ${logIdentifier}] Received props:`, { scriptSrc, databaseId, ...props }); 
  
  // Pass both scriptSrc and databaseId to the hook
  const { Component, error, reload } = useRemoteComponent(scriptSrc, databaseId);
  
  // Pass error state to the component
  return <Component {...props} error={error} onRetry={reload} />;
}
