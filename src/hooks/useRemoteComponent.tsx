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
    
    // Generate a NEW timestamp for each load attempt
    const timestamp = Date.now();
    console.log(`[useRemoteComponent] Loading component: ${componentId} with timestamp: ${timestamp}`);
    
    // Clean up any previously loaded components
    const cleanupPreviousComponents = () => {
      // Remove any existing script with this ID to prevent conflicts
      const existingScript = document.getElementById(scriptId as string);
      if (existingScript && existingScript.parentNode) {
        console.log(`[useRemoteComponent] Removing existing script for ${baseComponentId}`);
        existingScript.parentNode.removeChild(existingScript);
      }
      
      // Find any other scripts that might be loading the same component (with different cache busting)
      const relatedScripts = document.querySelectorAll(`script[src*="${baseComponentId}"]`);
      if (relatedScripts.length > 0) {
        console.log(`[useRemoteComponent] Found ${relatedScripts.length} related scripts for ${baseComponentId}`);
        relatedScripts.forEach(script => {
          if (script.id !== scriptId && script.parentNode) {
            console.log(`[useRemoteComponent] Removing related script: ${script.getAttribute('src')}`);
            script.parentNode.removeChild(script);
          }
        });
      }
      
      // Clear any existing component from window
      if (window.__REMOTION_COMPONENT) {
        console.log(`[useRemoteComponent] Clearing previous window.__REMOTION_COMPONENT`);
        window.__REMOTION_COMPONENT = undefined;
      }
    };
    
    // Clean up previous components
    cleanupPreviousComponents();
    
    // Begin loading state
    setLoading(true);
    setError(null);
    
    // Use a script tag to load the component
    const script = document.createElement('script');
    script.id = scriptId as string; // Set an ID for easier removal
    
    // Add timestamp to URL to prevent browser caching - preserve any existing query params
    const urlWithTimestamp = componentId.includes('?') 
      ? `${componentId}&t=${timestamp}` 
      : `${componentId}?t=${timestamp}`;
    
    // Construct the full URL
    let scriptUrl = urlWithTimestamp;
    if (!scriptUrl.startsWith('/api/')) {
      scriptUrl = `/api/components/${urlWithTimestamp}`;
    }
    
    script.src = scriptUrl;
    
    // Log the actual script URL being used for debugging
    console.log(`[useRemoteComponent] Loading script from: ${script.src}`);
    
    script.async = true;
    script.type = 'text/javascript';
    
    const handleScriptLoad = () => {
      try {
        // Check if the component was loaded successfully 
        if (window.__REMOTION_COMPONENT) {
          console.log(`[useRemoteComponent] Successfully loaded component: ${baseComponentId}`);
          // Store the component locally to prevent losing reference
          const loadedComponent = window.__REMOTION_COMPONENT;
          setComponent(loadedComponent);
          setLoading(false);
          setError(null);
        } else {
          console.error(`[useRemoteComponent] Component loaded but __REMOTION_COMPONENT not found: ${baseComponentId}`);
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
      
      console.error(`[useRemoteComponent] Script load error for ${baseComponentId}: ${errorMessage}`);
      setError(errorMessage);
      setLoading(false);
    };
    
    script.onload = handleScriptLoad;
    script.onerror = handleScriptError;
    
    // Add the script to document
    document.body.appendChild(script);
    console.log(`[useRemoteComponent] Added script to document: ${script.src}`);
    
    // Clean up by removing the script tag
    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
        console.log(`[useRemoteComponent] Cleanup: removed script for ${baseComponentId}`);
      }
    };
  }, [componentId, scriptId, baseComponentId]); // Remove timestamp from dependencies

  // Provide a reload function to force component reloading
  const reloadComponent = () => {
    console.log(`[useRemoteComponent] Forcing reload of component: ${baseComponentId}`);
    setLoading(true);
    setError(null);
    setComponent(null);
    window.__REMOTION_COMPONENT = undefined;
    
    // Force removal of the script tag to ensure a fresh load
    const existingScript = document.getElementById(scriptId as string);
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
        .filter(s => s.src && s.src.includes('components'))
        .map(s => ({ id: s.id, src: s.src }))
    );
  };
  
  // Return an object with the component and state information
  return {
    Component: component ? component : LoadingErrorComponent,
    loading,
    error,
    reload: reloadComponent
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
