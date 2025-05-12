//src/hooks/useRemoteComponent.tsx
import React, { useState, useEffect, useMemo } from 'react';
import * as Remotion from 'remotion';

// Declare the global __REMOTION_COMPONENT for TypeScript
// This should be the single, authoritative declaration for its type in this scope.
declare global {
  interface Window {
    __REMOTION_COMPONENT?: React.ComponentType<any> | null; // Made optional to align with initial undefined state
  }
}

/**
 * Custom hook for loading remote Remotion components from R2 storage
 * 
 * Uses a script tag approach to load components at runtime instead of dynamic imports
 * which avoids issues with ES module resolution in the browser.
 * 
 * @param componentId UUID of the custom component job
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
  
  // Generate a unique ID for the script element
  const scriptId = useMemo(() => `remote-component-${componentId}`, [componentId]);
  
  // Generate a timestamp for cache busting - CRITICAL: must be inside the effect
  // to get a new timestamp each time the component is loaded
  
  useEffect(() => {
    if (!componentId) {
      setLoading(false);
      setError("No component ID provided");
      return;
    }
    
    // Generate a NEW timestamp for each load attempt
    const timestamp = Date.now();
    console.log(`[useRemoteComponent] Loading component: ${componentId} with timestamp: ${timestamp}`);
    
    // Remove any existing script with this ID to prevent conflicts
    const existingScript = document.getElementById(scriptId);
    if (existingScript && existingScript.parentNode) {
      console.log(`[useRemoteComponent] Removing existing script for ${componentId}`);
      existingScript.parentNode.removeChild(existingScript);
    }
    
    // Clear any existing component from window
    window.__REMOTION_COMPONENT = undefined;
    
    // Use a script tag to load the component
    const script = document.createElement('script');
    script.id = scriptId; // Set an ID for easier removal
    
    // Add timestamp to URL to prevent browser caching
    script.src = `/api/components/${componentId}?t=${timestamp}`;
    
    // Log the actual script URL being used for debugging
    console.log(`[useRemoteComponent] Loading script from: ${script.src}`);
    
    script.async = true;
    script.type = 'text/javascript';
    
    const handleScriptLoad = () => {
      try {
        // Check if the component was loaded successfully 
        if (window.__REMOTION_COMPONENT) {
          console.log(`[useRemoteComponent] Successfully loaded component: ${componentId}`);
          // Store the component locally to prevent losing reference
          const loadedComponent = window.__REMOTION_COMPONENT;
          setComponent(loadedComponent);
          setLoading(false);
          setError(null);
        } else {
          console.error(`[useRemoteComponent] Component loaded but __REMOTION_COMPONENT not found: ${componentId}`);
          setError("Component loaded but not found in window.__REMOTION_COMPONENT");
          setLoading(false);
          
          // List all global variables to debug what might be available
          console.log('[useRemoteComponent] Available globals:', 
            Object.keys(window)
              .filter(key => key.includes('REMOTION') || key.includes('Component'))
          );
        }
      } catch (err) {
        console.error(`[useRemoteComponent] Error accessing component after load: ${err}`);
        setError(`Error accessing component: ${err}`);
        setLoading(false);
      }
    };
    
    const handleScriptError = (event: Event | string) => {
      const errorMessage = typeof event === 'string' 
        ? event 
        : 'Failed to load component script';
      
      console.error(`[useRemoteComponent] Script load error for ${componentId}: ${errorMessage}`);
      setError(errorMessage);
      setLoading(false);
    };
    
    script.onload = handleScriptLoad;
    script.onerror = handleScriptError;
    
    // Add the script to document
    document.body.appendChild(script);
    
    // Clean up by removing the script tag
    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
        console.log(`[useRemoteComponent] Cleanup: removed script for ${componentId}`);
      }
    };
  }, [componentId, scriptId]); // Remove timestamp from dependencies to avoid re-running on every render

  // Provide a reload function to force component reloading
  const reloadComponent = () => {
    console.log(`[useRemoteComponent] Forcing reload of component: ${componentId}`);
    setLoading(true);
    setError(null);
    setComponent(null);
    window.__REMOTION_COMPONENT = undefined;
    
    // Force removal of the script tag to ensure a fresh load
    const existingScript = document.getElementById(scriptId);
    if (existingScript && existingScript.parentNode) {
      console.log(`[useRemoteComponent] Removing script element during reload: ${scriptId}`);
      existingScript.parentNode.removeChild(existingScript);
    } else {
      console.log(`[useRemoteComponent] Script element not found during reload: ${scriptId}`);
    }
    
    // List all script tags to debug potential issues
    const allScripts = document.querySelectorAll('script');
    console.log(`[useRemoteComponent] All current script tags (${allScripts.length} total):`, 
      Array.from(allScripts)
        .filter(s => s.src && s.src.includes('custom-components'))
        .map(s => ({ id: s.id, src: s.src }))
    );
    
    // Create a new script with a fresh timestamp (will be added in useEffect)
    // This approach causes the useEffect to run again with a fresh timestamp
  };
  
  // Return a React component that renders the remote component
  const RenderedComponent = function WrappedRemoteComponent(props: any) {
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
            <p>Loading component {componentId?.substring(0, 8)}...</p>
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
            <p>Error loading component: {error}</p>
            <button 
              onClick={reloadComponent}
              style={{
                background: 'white',
                border: '1px solid red',
                borderRadius: '0.25rem',
                padding: '0.5rem 1rem',
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
          </div>
        </div>
      );
    }
    
    if (!component) {
      return (
        <div 
          style={{ 
            width: '100%', 
            height: '100%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.05)',
            color: 'black',
            fontFamily: 'sans-serif',
          }}
        >
          <button 
            onClick={reloadComponent}
            style={{
              background: 'white',
              border: '1px solid black',
              borderRadius: '0.25rem',
              padding: '0.5rem 1rem',
              cursor: 'pointer'
            }}
          >
            Load Component
          </button>
        </div>
      );
    }
    
    // Important: Create a fresh reference to the component to avoid stale closures
    const Component = component;
    return <Component {...props} />;
  };
  
  return {
    Component: RenderedComponent,
    loading,
    error,
    reload: reloadComponent
  };
}

/**
 * Helper component to render a remote component
 */
export function RemoteComponent({ 
  componentId, 
  ...props 
}: { 
  componentId: string; 
  [key: string]: any; 
}) {
  // Get the component renderer from the hook
  const remoteComponentData = useRemoteComponent(componentId);
  
  // If the component exists, render it, otherwise render the loading/error state
  if (remoteComponentData.Component) {
    return <remoteComponentData.Component {...props} />;
  }
  
  // This should never happen since Component always returns something
  return null;
}
