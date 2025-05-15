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
 * Custom hook for loading remote Remotion components.
 * 
 * @param scriptSrc The direct URL to the component script (e.g., R2 URL).
 * @param databaseId The UUID of the custom component job in the database (for script element ID and fallbacks).
 * @returns A React component that renders the remote component, loading state, and error state.
 */
export function useRemoteComponent(scriptSrc?: string, databaseId?: string) {
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
  
  // Use databaseId for generating unique script element ID
  const baseComponentId = useMemo(() => {
    if (!databaseId) return undefined;
    return databaseId.split('?')[0]; 
  }, [databaseId]);
  
  // Generate a unique ID for the script element
  const scriptId = useMemo(() => 
    baseComponentId ? `remote-component-${baseComponentId}` : undefined, 
    [baseComponentId]
  );
  
  // Effect to load the remote component
  useEffect(() => {
    // Use a more descriptive identifier for logging, prioritizing databaseId
    const logIdentifier = databaseId || scriptSrc || 'unknown-component';

    if (!scriptSrc && !databaseId) {
      setLoading(false);
      setError("No script source or database ID provided");
      console.error(`[useRemoteComponent ${logIdentifier}] No script source or database ID.`);
      return;
    }
    if (!scriptSrc && databaseId) {
      // This case might indicate an issue, as we expect CustomScene to pass the R2 URL as scriptSrc
      console.warn(`[useRemoteComponent ${logIdentifier}] scriptSrc is missing, but databaseId is present. This might lead to issues if direct R2 URL is expected.`);
      // Proceeding with databaseId to attempt API fetch, but this might fetch the polling script if not careful
    }
    
    // Use a cleaner fetch approach with AbortController for better cleanup
    const abortController = new AbortController();
    const signal = abortController.signal;
    
    // Generate a NEW timestamp for each load attempt
    const timestamp = Date.now();
    console.log(`[useRemoteComponent ${logIdentifier}] Loading component with timestamp: ${timestamp} (retry: ${retryCount})`);
    
    // Begin loading state
    setLoading(true);
    setError(null);
    setDebugInfo({}); // Reset debug info
    
    // IMPROVED: More thorough cleanup of previous components
    const cleanupPreviousComponents = () => {
      // 1. Remove any existing script with this ID to prevent conflicts
      const existingScript = document.getElementById(scriptId as string);
      if (existingScript && existingScript.parentNode) {
        console.log(`[useRemoteComponent ${logIdentifier}] Removing existing script for ${baseComponentId}`);
        existingScript.parentNode.removeChild(existingScript);
      }
      
      // 2. Find any other scripts that might be loading the same component (with different cache busting)
      const relatedScripts = document.querySelectorAll(`script[src*="${baseComponentId}"]`);
      if (relatedScripts.length > 0) {
        console.log(`[useRemoteComponent ${logIdentifier}] Found ${relatedScripts.length} related scripts for ${baseComponentId}`);
        relatedScripts.forEach(script => {
          if (script.parentNode) {
            console.log(`[useRemoteComponent ${logIdentifier}] Removing related script: ${script.getAttribute('src')}`);
            script.parentNode.removeChild(script);
          }
        });
      }
      
      // 3. Clear window.__REMOTION_COMPONENT to prevent conflicts
      if (typeof window !== 'undefined' && window.__REMOTION_COMPONENT) {
        console.log(`[useRemoteComponent ${logIdentifier}] Clearing previous window.__REMOTION_COMPONENT`);
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
        
        let finalScriptUrl: string;
        if (scriptSrc && (scriptSrc.startsWith('http://') || scriptSrc.startsWith('https://'))) {
          finalScriptUrl = scriptSrc.includes('?') 
            ? `${scriptSrc}&t=${timestamp}&retry=${retryCount}` 
            : `${scriptSrc}?t=${timestamp}&retry=${retryCount}`;
          console.log(`[useRemoteComponent ${logIdentifier}] Fetching component directly from provided src: ${finalScriptUrl}`);
        } else if (databaseId) {
          // Fallback or primary if scriptSrc isn't a full URL
          const apiUrlPart = databaseId.includes('?') 
            ? `${databaseId}&t=${timestamp}&retry=${retryCount}` 
            : `${databaseId}?t=${timestamp}&retry=${retryCount}`;
          finalScriptUrl = `/api/components/${apiUrlPart}`;
          console.log(`[useRemoteComponent ${logIdentifier}] Constructing API URL with databaseId: ${finalScriptUrl}`);
        } else {
          throw new Error("Cannot determine script URL: scriptSrc is not a URL and databaseId is missing.");
        }
        
        // Add a timeout promise to avoid hanging fetch requests
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Component fetch timeout after 10 seconds')), 10000);
        });
        
        // Fetch the component code with timeout
        const response = await Promise.race([
          fetch(finalScriptUrl, { signal }), // Use finalScriptUrl
          timeoutPromise
        ]) as Response;
        
        if (!response.ok) {
          throw new Error(`API returned status ${response.status}: ${response.statusText}`);
        }
        
        // In a fetch response, we can only read the body once, so we need to be careful here
        // Get the response text first, then analyze it to see if it's JSON or JS
        const code = await response.text();
        
        // Check if the response appears to be JSON (common error case)
        if (code.trim().startsWith('{') || code.trim().startsWith('[')) {
          console.error(`[useRemoteComponent ${logIdentifier}] Response appears to be JSON, not JavaScript:`, code.substring(0, 200));
          
          // Try to parse it as JSON to get a better error message
          try {
            const errorData = JSON.parse(code);
            console.error(`[useRemoteComponent ${logIdentifier}] Parsed JSON error response:`, errorData);
            throw new Error(`Received JSON instead of JavaScript: ${JSON.stringify(errorData).substring(0, 100)}...`);
          } catch (jsonError) {
            // If we can't parse the JSON, just throw the original error
            throw new Error('Received JSON instead of JavaScript component code');
          }
        }
        
        // Log the first few characters of code for debugging
        console.log(`[useRemoteComponent ${logIdentifier}] Received code (first 100 chars):`, 
          code.substring(0, 100) + (code.length > 100 ? '...' : ''));
        
        // Verify code format
        if (code.trim().length === 0) {
          throw new Error('Received empty component code');
        }
        
        // Create a script element
        const script = document.createElement('script');
        script.id = scriptId as string;
        script.type = 'module';
        
        // Set up load handlers BEFORE adding to document
        script.onload = () => {
          handleComponentLoaded();
        };
        
        script.onerror = (event) => {
          console.error(`[useRemoteComponent ${logIdentifier}] Script error event:`, event);
          handleScriptError('Script failed to load after insertion');
        };
        
        // Wrap the code in a try-catch to catch syntax errors
        const wrappedCode = `
          try {
            ${code}
          } catch (error) {
            console.error('[REMOTION_COMPONENT_ERROR] Error evaluating component code:', error);
          }
        `;
        
        // Directly set the text content instead of src to avoid CORS/caching issues
        script.textContent = wrappedCode;
        
        // Add to document body
        document.body.appendChild(script);
        console.log(`[useRemoteComponent ${logIdentifier}] Added script element with inline code`);
      } catch (err) {
        if (signal?.aborted) {
          console.log(`[useRemoteComponent ${logIdentifier}] Fetch aborted for ${baseComponentId}`);
          return;
        }
        
        console.error(`[useRemoteComponent ${logIdentifier}] Error fetching component:`, err);
        setDebugInfo(prev => ({
          ...prev,
          lastError: err instanceof Error ? err.message : String(err),
          lastErrorTime: new Date().toISOString()
        }));
        handleScriptError(err instanceof Error ? err.message : String(err));
      }    
    };
    
    // Handler for successful component loading
    const handleComponentLoaded = () => {
      try {
        const logIdentifier = databaseId || scriptSrc || 'unknown-component'; // Ensure logIdentifier is available
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
        console.log(`[useRemoteComponent ${logIdentifier}] Script loaded, debug info:`, debugData);
        
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
              console.warn(`[useRemoteComponent ${logIdentifier}] Component validation warning (non-fatal):`, error);
              // Don't set isValidComponent to false here, as we caught the error
            }
            
            if (isValidComponent) {
              console.log(`[useRemoteComponent ${logIdentifier}] Successfully loaded component: ${baseComponentId}`);
              // Log the registered component's details
              if (window.__REMOTION_COMPONENT) {
                console.log(`[useRemoteComponent ${logIdentifier}] Registered component name: ${window.__REMOTION_COMPONENT.name}`);
                console.log(`[useRemoteComponent ${logIdentifier}] Registered component type: ${typeof window.__REMOTION_COMPONENT}`);
                try {
                  console.log(`[useRemoteComponent ${logIdentifier}] Registered component source (approx):`, window.__REMOTION_COMPONENT.toString().substring(0, 500) + "...");
                } catch (e) {
                  console.warn(`[useRemoteComponent ${logIdentifier}] Could not stringify registered component source.`);
                }
              }
              setComponent(loadedComponent);
              setLoading(false);
              setError(null);
              setRetryCount(0); // Reset retry count on success
            } else {
              handleRetry(`Component function exists but throws errors when invoked`);
            }
          } else {
            // Component exists but is not a function
            console.error(`[useRemoteComponent ${logIdentifier}] window.__REMOTION_COMPONENT exists but is not a function: ${typeof window.__REMOTION_COMPONENT}`);
            handleRetry(`Component is not a valid React component (got ${typeof window.__REMOTION_COMPONENT})`);
          }
        } else {
          console.error(`[useRemoteComponent ${logIdentifier}] Component loaded but __REMOTION_COMPONENT not found`);
          
          // Try to recover by looking for components in global scope before retrying
          tryFindComponentInGlobalScope();
        }
      } catch (err) {
        console.error(`[useRemoteComponent ${logIdentifier}] Error accessing component after load:`, err);
        handleRetry(`Error accessing component: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    
    // Function to try to find the component in the global scope
    const tryFindComponentInGlobalScope = () => {
      console.log(`[useRemoteComponent ${logIdentifier}] Trying to find component in global scope`);
      
      // Look for possible component functions in window
      const candidateKeys = Object.keys(window).filter(key => {
        if (key === 'React' || key === 'Remotion' || key === '__REMOTION_COMPONENT') return false;
        
        // Safe way to check window properties
        const value = window[key];
        return typeof value === 'function' && 
               !key.startsWith('__') && 
               /^[A-Z]/.test(key); // Component names typically start with uppercase
      });
      
      console.log(`[useRemoteComponent ${logIdentifier}] Found ${candidateKeys.length} potential components in global scope:`, candidateKeys);
      
      if (candidateKeys.length > 0) {
        // Prioritize components with 'Scene' or 'Component' in the name
        const sceneCandidate = candidateKeys.find(name => 
          name.includes('Scene') || name.includes('Component')
        );
        
        // Use the scene candidate if found, otherwise use the first candidate
        const candidateKey = sceneCandidate || candidateKeys[0];
        if (candidateKey) {
          const candidate = window[candidateKey] as React.ComponentType<any>;
          
          console.log(`[useRemoteComponent ${logIdentifier}] Trying candidate component: ${candidateKey}`);
          
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
        
        console.log(`[useRemoteComponent ${logIdentifier}] Will retry (${nextRetry}/3) in ${delay}ms. Reason: ${reason}`);
        
        // Mark as having an error, but keep loading true during retry wait
        setError(`Loading failed: ${reason}. Retrying...`);
        
        setTimeout(() => {
          setRetryCount(nextRetry);
          // Effect will re-run due to retryCount change
        }, delay);
      } else {
        console.error(`[useRemoteComponent ${logIdentifier}] Maximum retries reached (${retryCount}). Giving up.`);
        setError(`Failed to load component after ${retryCount} retries: ${reason}`);
        setLoading(false);
      }
    };
    
    // Error handler for script loading
    const handleScriptError = (errorMessage: string) => {
      console.error(`[useRemoteComponent ${logIdentifier}] Script load error for ${baseComponentId}: ${errorMessage}`);
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
        console.log(`[useRemoteComponent ${logIdentifier}] Cleanup: removed script for ${baseComponentId}`);
      }
    };
  }, [scriptSrc, databaseId, scriptId, baseComponentId, retryCount]); // Added scriptSrc and databaseId to dependencies, removed componentId

  // Provide a reload function to force component reloading
  const reloadComponent = () => {
    const logIdentifier = databaseId || scriptSrc || 'unknown-component';
    console.log(`[useRemoteComponent ${logIdentifier}] Forcing reload of component`);
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
      console.log(`[useRemoteComponent ${logIdentifier}] Removing script element during reload: ${scriptId}`);
      existingScript.parentNode.removeChild(existingScript);
    } else {
      console.log(`[useRemoteComponent ${logIdentifier}] Script element not found during reload: ${scriptId}`);
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
  scriptSrc, 
  databaseId, 
  ...props 
}: { 
  scriptSrc?: string; // Changed from componentId to scriptSrc, made optional
  databaseId?: string; // Added databaseId, made optional
  [key: string]: any; 
}) {
  const logIdentifier = databaseId || scriptSrc || 'unknown-component';
  console.log(`[RemoteComponent ${logIdentifier}] Received props:`, { scriptSrc, databaseId, ...props }); 
  
  // Pass both scriptSrc and databaseId to the hook
  const { Component, loading, error, reload } = useRemoteComponent(scriptSrc, databaseId);
  
  // Pass loading and error state to the component
  return <Component {...props} loading={loading} error={error} onRetry={reload} />;
}
