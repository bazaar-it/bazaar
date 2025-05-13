//src/hooks/useRemoteComponent.tsx
import React, { useState, useEffect, useMemo } from 'react';
import * as Remotion from 'remotion';

// Declare the global __REMOTION_COMPONENT for TypeScript
// This should be the single, authoritative declaration for its type in this scope.
declare global {
  interface Window {
    __REMOTION_COMPONENT?: React.ComponentType<any> | null; // Made optional to align with initial undefined state
    [key: string]: any; // Allow indexing with string keys
  }
}

/**
 * Custom hook for loading remote Remotion components from R2 storage
 * 
 * Uses a script tag approach to load components at runtime instead of dynamic imports
 * which avoids issues with ES module resolution in the browser.
 * 
 * @param componentId UUID of the custom component job (can include cache busting params)
 * @returns A React component that renders the remote component
 */
export function useRemoteComponent(componentId: string | undefined) {
  // Add console log interceptor for debugging
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      // Store original console methods
      const originalConsoleLog = console.log;
      const originalConsoleError = console.error;
      const originalConsoleWarn = console.warn;
      
      // Intercept console.log
      console.log = function(...args) {
        // Add a marker to logs from custom components
        if (args[0] && typeof args[0] === 'string' && args[0].includes('REMOTION_COMPONENT')) {
          args.unshift('🟢 [INTERCEPTED]');
        }
        originalConsoleLog.apply(console, args);
      };
      
      // Intercept console.error
      console.error = function(...args) {
        // Add a marker to errors from custom components
        if (args[0] && typeof args[0] === 'string' && (args[0].includes('REMOTION_COMPONENT') || args[0].includes('component'))) {
          args.unshift('🔴 [INTERCEPTED]');
        }
        originalConsoleError.apply(console, args);
      };
      
      // Intercept console.warn
      console.warn = function(...args) {
        // Add a marker to warnings from custom components
        if (args[0] && typeof args[0] === 'string' && (args[0].includes('REMOTION_COMPONENT') || args[0].includes('component'))) {
          args.unshift('🟠 [INTERCEPTED]');
        }
        originalConsoleWarn.apply(console, args);
      };
      
      // Return cleanup function
      return () => {
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
        console.warn = originalConsoleWarn;
      };
    }
  }, []);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [component, setComponent] = useState<React.ComponentType<any> | null>(null);
  const [retryCount, setRetryCount] = useState(0); // Track retry attempts
  const [debugInfo, setDebugInfo] = useState<Record<string, any>>({}); // Store debug info
  
  // Extract the base component ID (without any cache busting params)
  const baseComponentId = useMemo(() => {
    if (!componentId) return undefined;
    // If componentId contains a query parameter, strip it
    return componentId.split('?')[0]; 
  }, [componentId]);
  
  // Generate a unique ID for the script element
  const scriptId = useMemo(() => 
    baseComponentId ? `remote-component-${baseComponentId}` : undefined, 
    [baseComponentId]
  );
  
  // Effect to load the remote component
  useEffect(() => {
    if (!componentId) {
      setLoading(false);
      setError("No component ID provided");
      return;
    }
    
    // Use a cleaner fetch approach with AbortController for better cleanup
    const abortController = new AbortController();
    const signal = abortController.signal;
    
    // Generate a NEW timestamp for each load attempt
    const timestamp = Date.now();
    console.log(`[useRemoteComponent] Loading component: ${componentId} with timestamp: ${timestamp} (retry: ${retryCount})`);
    
    // Begin loading state
    setLoading(true);
    setError(null);
    setDebugInfo({}); // Reset debug info
    
    // IMPROVED: More thorough cleanup of previous components
    const cleanupPreviousComponents = () => {
      // 1. Remove any existing script with this ID to prevent conflicts
      const existingScript = document.getElementById(scriptId as string);
      if (existingScript && existingScript.parentNode) {
        console.log(`[useRemoteComponent] Removing existing script for ${baseComponentId}`);
        existingScript.parentNode.removeChild(existingScript);
      }
      
      // 2. Find any other scripts that might be loading the same component (with different cache busting)
      const relatedScripts = document.querySelectorAll(`script[src*="${baseComponentId}"]`);
      if (relatedScripts.length > 0) {
        console.log(`[useRemoteComponent] Found ${relatedScripts.length} related scripts for ${baseComponentId}`);
        relatedScripts.forEach(script => {
          if (script.parentNode) {
            console.log(`[useRemoteComponent] Removing related script: ${script.getAttribute('src')}`);
            script.parentNode.removeChild(script);
          }
        });
      }
      
      // 3. Clear window.__REMOTION_COMPONENT to prevent conflicts
      if (typeof window !== 'undefined' && window.__REMOTION_COMPONENT) {
        console.log(`[useRemoteComponent] Clearing previous window.__REMOTION_COMPONENT`);
        window.__REMOTION_COMPONENT = undefined;
      }
      
      // 4. IMPROVED: Wait a small delay to allow for DOM updates
      return new Promise<void>(resolve => setTimeout(resolve, 50));
    };
    
    // Directly fetch the component code first instead of using script tag insertion
    // This gives us more control over the loading process
    const fetchAndLoadComponent = async () => {
      try {
        await cleanupPreviousComponents();
        
        // Construct the API URL with proper cache-busting
        const urlWithTimestamp = componentId.includes('?') 
          ? `${componentId}&t=${timestamp}&retry=${retryCount}` 
          : `${componentId}?t=${timestamp}&retry=${retryCount}`;
        
        let apiUrl = urlWithTimestamp;
        if (!apiUrl.startsWith('/api/')) {
          apiUrl = `/api/components/${urlWithTimestamp}`;
        }
        
        console.log(`[useRemoteComponent] Fetching component from: ${apiUrl}`);
        
        // Fetch the component code
        const response = await fetch(apiUrl, { signal });
        
        if (!response.ok) {
          throw new Error(`API returned status ${response.status}`);
        }
        
        // Get the JavaScript code as text
        const code = await response.text();
        
        // Create a script element
        const script = document.createElement('script');
        script.id = scriptId as string;
        script.type = 'text/javascript';
        
        // Set up load handlers BEFORE adding to document
        script.onload = () => {
          handleComponentLoaded();
        };
        
        script.onerror = (event) => {
          handleScriptError('Script failed to load after insertion');
        };
        
        // Directly set the text content instead of src to avoid CORS/caching issues
        script.textContent = code;
        
        // Add to document body
        document.body.appendChild(script);
        console.log(`[useRemoteComponent] Added script element with inline code`);
      } catch (err) {
        if (signal.aborted) {
          console.log(`[useRemoteComponent] Fetch aborted for ${componentId}`);
          return;
        }
        
        console.error(`[useRemoteComponent] Error fetching component:`, err);
        handleScriptError(err instanceof Error ? err.message : String(err));
      }
    };
    
    // Handler for successful component loading
    const handleComponentLoaded = () => {
      try {
        // Capture debug information
        const debugData = {
          timestamp: new Date().toISOString(),
          retryCount,
          hasRemotionComponent: !!window.__REMOTION_COMPONENT,
          componentType: window.__REMOTION_COMPONENT ? typeof window.__REMOTION_COMPONENT : 'undefined', 
          isFunction: window.__REMOTION_COMPONENT && typeof window.__REMOTION_COMPONENT === 'function',
          remotionGlobals: !!window.Remotion,
          reactGlobals: !!window.React
        };
        
        setDebugInfo(debugData);
        console.log(`[useRemoteComponent] Script loaded, debug info:`, debugData);
        
        // IMPROVED: More thorough component validation
        if (window.__REMOTION_COMPONENT) {
          if (typeof window.__REMOTION_COMPONENT === 'function') {
            // Store a local reference to avoid losing it if window.__REMOTION_COMPONENT changes
            const loadedComponent = window.__REMOTION_COMPONENT;
            
            // Do a basic test to see if it's a valid React component
            let isValidComponent = true;
            try {
              // Just check if it's a function, don't actually try to call it with empty props
              // as many components will throw when rendered without required props
              if (typeof loadedComponent !== 'function') {
                isValidComponent = false;
              }
            } catch (error) {
              console.warn(`[useRemoteComponent] Component validation warning (non-fatal):`, error);
              // Don't set isValidComponent to false here, as we caught the error
            }
            
            if (isValidComponent) {
              console.log(`[useRemoteComponent] Successfully loaded component: ${baseComponentId}`);
              setComponent(loadedComponent);
              setLoading(false);
              setError(null);
              setRetryCount(0); // Reset retry count on success
            } else {
              handleRetry(`Component function exists but throws errors when invoked`);
            }
          } else {
            // Component exists but is not a function
            console.error(`[useRemoteComponent] window.__REMOTION_COMPONENT exists but is not a function: ${typeof window.__REMOTION_COMPONENT}`);
            handleRetry(`Component is not a valid React component (got ${typeof window.__REMOTION_COMPONENT})`);
          }
        } else {
          console.error(`[useRemoteComponent] Component loaded but __REMOTION_COMPONENT not found`);
          
          // Try to recover by looking for components in global scope before retrying
          tryFindComponentInGlobalScope();
        }
      } catch (err) {
        console.error(`[useRemoteComponent] Error accessing component after load:`, err);
        handleRetry(`Error accessing component: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    
    // Function to try to find the component in the global scope
    const tryFindComponentInGlobalScope = () => {
      console.log('[useRemoteComponent] Trying to find component in global scope');
      
      // Look for possible component functions in window
      const candidateKeys = Object.keys(window).filter(key => {
        if (key === 'React' || key === 'Remotion' || key === '__REMOTION_COMPONENT') return false;
        
        // Safe way to check window properties
        const value = window[key];
        return typeof value === 'function' && 
               !key.startsWith('__') && 
               /^[A-Z]/.test(key); // Component names typically start with uppercase
      });
      
      console.log(`[useRemoteComponent] Found ${candidateKeys.length} potential components in global scope:`, candidateKeys);
      
      if (candidateKeys.length > 0) {
        // Prioritize components with 'Scene' or 'Component' in the name
        const sceneCandidate = candidateKeys.find(name => 
          name.includes('Scene') || name.includes('Component')
        );
        
        // Use the scene candidate if found, otherwise use the first candidate
        const candidateKey = sceneCandidate || candidateKeys[0];
        if (candidateKey) {
          const candidate = window[candidateKey] as React.ComponentType<any>;
          
          console.log(`[useRemoteComponent] Trying candidate component: ${candidateKey}`);
          
          // Set it as the official component for future use
          window.__REMOTION_COMPONENT = candidate;
          
          // Update our state
          setComponent(candidate);
          setLoading(false);
          setError(null);
        }
      } else {
        // No candidates found, try retry
        handleRetry('No components found in global scope');
      }
    };
    
    // Enhanced retry logic with backoff
    const handleRetry = (reason: string) => {
      if (retryCount < 3) {
        const nextRetry = retryCount + 1;
        const delay = nextRetry * 1000; // Increase delay with each retry
        
        console.log(`[useRemoteComponent] Will retry (${nextRetry}/3) in ${delay}ms. Reason: ${reason}`);
        
        // Mark as having an error, but keep loading true during retry wait
        setError(`Loading failed: ${reason}. Retrying...`);
        
        setTimeout(() => {
          setRetryCount(nextRetry);
          // Effect will re-run due to retryCount change
        }, delay);
      } else {
        console.error(`[useRemoteComponent] Maximum retries reached (${retryCount}). Giving up.`);
        setError(`Failed to load component after ${retryCount} retries: ${reason}`);
        setLoading(false);
      }
    };
    
    // Error handler for script loading
    const handleScriptError = (errorMessage: string) => {
      console.error(`[useRemoteComponent] Script load error for ${baseComponentId}: ${errorMessage}`);
      handleRetry(`Script load error: ${errorMessage}`);
    };
    
    // Start the loading process
    fetchAndLoadComponent();
    
    // Cleanup function
    return () => {
      // Abort any in-progress fetches
      abortController.abort();
      
      // Clean up any script elements
      const script = document.getElementById(scriptId as string);
      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
        console.log(`[useRemoteComponent] Cleanup: removed script for ${baseComponentId}`);
      }
    };
  }, [componentId, scriptId, baseComponentId, retryCount]); // Add retryCount to dependencies

  // Provide a reload function to force component reloading
  const reloadComponent = () => {
    console.log(`[useRemoteComponent] Forcing reload of component: ${baseComponentId}`);
    setLoading(true);
    setError(null);
    setComponent(null);
    setDebugInfo({}); // Reset debug info
    
    // Reset window.__REMOTION_COMPONENT to undefined
    if (typeof window !== 'undefined') {
      window.__REMOTION_COMPONENT = undefined;
    }
    
    // Force removal of the script tag to ensure a fresh load
    const existingScript = document.getElementById(scriptId as string);
    if (existingScript && existingScript.parentNode) {
      console.log(`[useRemoteComponent] Removing script element during reload: ${scriptId}`);
      existingScript.parentNode.removeChild(existingScript);
    } else {
      console.log(`[useRemoteComponent] Script element not found during reload: ${scriptId}`);
    }
    
    // Reset retry count and trigger a reload
    setRetryCount(0);
  };
  
  // Return an object with the component and state information
  return {
    Component: component ? component : LoadingErrorComponent,
    loading,
    error,
    reload: reloadComponent,
    debugInfo, // Expose debug info
    retryCount // Expose retry count
  };
}

// A component to handle loading and error states
const LoadingErrorComponent: React.FC<any> = (props) => {
  const { loading, error } = props;
  
  if (loading) {
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
  }
  
  if (error) {
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
          {props.onRetry && (
            <button 
              onClick={props.onRetry}
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
  }
  
  // This should never be reached if props are correctly passed
  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: 'rgba(255, 165, 0, 0.1)', 
      color: 'orange',
      fontFamily: 'sans-serif',
      padding: '1rem',
    }}>
      Component state error - neither loading nor error state set
    </div>
  );
};

/**
 * A component that uses useRemoteComponent to load and render a remote component
 */
export function RemoteComponent({ 
  componentId, 
  ...props 
}: { 
  componentId: string; 
  [key: string]: any; 
}) {
  const { Component, loading, error, reload } = useRemoteComponent(componentId);
  
  // Pass loading and error state to the component
  return <Component {...props} loading={loading} error={error} onRetry={reload} />;
}
