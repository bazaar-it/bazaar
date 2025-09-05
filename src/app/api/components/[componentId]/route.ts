// src/app/api/components/[componentId]/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '~/server/db';
import { customComponentJobs } from '~/server/db/schema';
import { eq } from 'drizzle-orm';
import logger from '~/lib/utils/logger';

// Helper functions for component code processing

/**
 * Preprocess the component code to fix common issues before evaluation.
 * This handles import statements, export patterns, and other syntax issues.
 */
function preprocessComponentCode(code: string, componentId: string): string {
  // Track all fixes applied for logging
  const fixes: string[] = [];
  let processedCode = code;
  
  // REMOVED: All React import "fixing" that was corrupting valid code
  // The LLM generates code using window.React which works correctly in browser
  // We were breaking working code by trying to "fix" it
  
  // REMOVED: Import injection that causes browser crashes
  // Browsers cannot resolve bare module specifiers like 'remotion'
  // The bundled code already has everything it needs via window.Remotion
  // This was causing immediate crashes when browser tried GET /remotion → 404
  
  // DISABLED: createElement replacement that breaks non-React code
  // This was replacing ALL .createElement calls, even from other libraries
  // Example corruption: calculator.createElement() → React.createElement() = SYNTAX ERROR
  // Bundled code should already have correct references
  
  /* Commented out to prevent breaking valid code:
  if (processedCode.includes('.createElement') && processedCode.includes('import React')) {
    const creatorMatches = [...processedCode.matchAll(/([a-zA-Z0-9_$]+)\.createElement/g)];
    const creatorVariables = new Set<string>();
    
    creatorMatches.forEach(match => {
      const varName = match[1] || '';
      if (varName && varName !== 'React') {
        creatorVariables.add(varName);
      }
    });
    
    creatorVariables.forEach(varName => {
      if (varName) {
        const pattern = new RegExp(`${varName}\\.createElement`, 'g');
        processedCode = processedCode.replace(pattern, 'React.createElement');
      }
    });
    
    if (creatorVariables.size > 0) {
      fixes.push(`Fixed createElement calls (${Array.from(creatorVariables).join(', ')} → React)`);
    }
  }
  */
  
  // Strip any import assertions which might cause issues
  processedCode = processedCode.replace(/import\s+.*\s+assert\s+\{[^}]*\};?/g, '// Removed import assertion');
  fixes.push('Removed any import assertions');
  
  // Add a logging line at start of the file
  if (fixes.length > 0) {
    processedCode = `// Component ${componentId} - Preprocessed with ${fixes.length} fixes: ${fixes.join(', ')}\n${processedCode}`;
  }
  
  return processedCode;
}

/**
 * Analyze the component code to extract information about exports and component variables.
 */
function analyzeComponentCode(code: string, componentId: string): { mainComponent: string | null } {
  // Default result
  const result = { mainComponent: null as string | null };
  
  try {
    // Look for default exports (export default X)
    const defaultExportMatch = /export\s+default\s+(?:const\s+)?([A-Za-z0-9_$]+)/.exec(code);
    if (defaultExportMatch?.[1]) {
      result.mainComponent = defaultExportMatch[1];
      return result;
    }
    
    // Look for function declarations with export default (export default function X)
    const defaultFunctionMatch = /export\s+default\s+function\s+([A-Za-z0-9_$]+)/.exec(code);
    if (defaultFunctionMatch?.[1]) {
      result.mainComponent = defaultFunctionMatch[1];
      return result;
    }
    
    // Look for immediately exported arrow functions (export const X = () => {})
    const exportedArrowMatch = /export\s+const\s+([A-Za-z0-9_$]+)\s*=\s*(?:\([^)]*\)|[A-Za-z0-9_$]+)\s*=>/.exec(code);
    if (exportedArrowMatch?.[1]) {
      result.mainComponent = exportedArrowMatch[1];
      return result;
    }
    
    // Look for exported function declarations (export function X)
    const exportedFunctionMatch = /export\s+function\s+([A-Za-z0-9_$]+)/.exec(code);
    if (exportedFunctionMatch?.[1]) {
      result.mainComponent = exportedFunctionMatch[1];
      return result;
    }
    
    // Look for React component declarations (const X = () => {}, const X = React.FC<Props> = () => {})
    const componentMatches = [...code.matchAll(/(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*(?::\s*React\.FC(?:<[^>]*>)?)?\s*=\s*(?:\([^)]*\)|[A-Za-z0-9_$]+)\s*=>/g)];
    if (componentMatches.length > 0) {
      // Take the first component match as the main component
      const firstMatch = componentMatches[0];
      if (firstMatch?.[1]) {
        result.mainComponent = firstMatch[1];
        return result;
      }
    }
    
  } catch (error) {
    // Ignore errors in analysis, just return null for main component
    console.error(`[analyzeComponentCode] Error analyzing component ${componentId}:`, error);
  }
  
  return result;
}

// Create a specialized logger for component API requests
const apiRouteLogger = {
  request(componentId: string, message: string, meta: Record<string, any> = {}) {
    logger.info(`[ComponentAPI:${componentId}] ${message}`, meta);
  },
  redirect(componentId: string, message: string, meta: Record<string, any> = {}) {
    logger.info(`[ComponentAPI:${componentId}] REDIRECT: ${message}`, meta);
  },
  error(componentId: string, message: string, meta: Record<string, any> = {}) {
    logger.error(`[ComponentAPI:${componentId}] ERROR: ${message}`, meta);
  },
  debug(componentId: string, message: string, meta: Record<string, any> = {}) {
    logger.debug(`[ComponentAPI:${componentId}] ${message}`, meta);
  }
};

export async function GET(request: NextRequest) {
  // Extract componentId directly from the URL path to avoid params issues
  const pathname = request.nextUrl.pathname;
  const pathParts = pathname.split('/');
  const componentId = pathParts[pathParts.length - 1] || '';
  
  // Validate componentId
  if (!componentId) {
    // Return JavaScript error instead of JSON
    const errorScript = `
      console.error("[Component Error] Invalid component ID");
      // Set a descriptive error component
      if (typeof window !== 'undefined') {
        window.__REMOTION_COMPONENT = (props) => {
          if (typeof React === 'undefined') return null;
          return React.createElement(
            'div',
            { style: { background: '#f44336', color: 'white', padding: '20px', borderRadius: '4px' } },
            [
              React.createElement('h3', { key: 'title' }, 'Error'),
              React.createElement('p', { key: 'message' }, 'Invalid component ID')
            ]
          );
        };
      }
    `;
    
    return new NextResponse(errorScript, { 
      status: 200, // Return 200 to allow the error component to render
      headers: {
        'Content-Type': 'application/javascript',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
      }
    });
  }
  
  apiRouteLogger.request(componentId, "Component request received", {
    url: request.url,
    headers: Object.fromEntries(request.headers.entries()),
  });
  
  try {
    // Get the component job from the database
    const job = await db.query.customComponentJobs.findFirst({
      where: eq(customComponentJobs.id, componentId),
      columns: {
        status: true,
        outputUrl: true,
        errorMessage: true,
        effect: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    // Handle not found case
    if (!job) {
      apiRouteLogger.error(componentId, "Component job not found");
      
      // Return JavaScript error instead of JSON
      const errorScript = `
        console.error("[Component Error] Component not found: ${componentId}");
        // Set a descriptive error component
        if (typeof window !== 'undefined') {
          window.__REMOTION_COMPONENT = (props) => {
            if (typeof React === 'undefined') return null;
            return React.createElement(
              'div',
              { style: { background: '#f44336', color: 'white', padding: '20px', borderRadius: '4px' } },
              [
                React.createElement('h3', { key: 'title' }, 'Component Not Found'),
                React.createElement('p', { key: 'message' }, 'The requested component could not be found'),
                React.createElement('pre', { key: 'id' }, '${componentId}')
              ]
            );
          };
        }
      `;
      
      return new NextResponse(errorScript, { 
        status: 200, // Return 200 to allow the error component to render
        headers: {
          'Content-Type': 'application/javascript',
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
        }
      });
    }
    
    // Check if the component is ready - we treat both "ready" and "complete" as valid,
    // but handle missing outputUrl separately
    const isReady = job.status === "ready" || job.status === "complete";
    
    if (!isReady) {
      // Handle error case first
      if (job.status === "error") {
        const errorMessage = job.errorMessage || "Unknown error";
        apiRouteLogger.error(componentId, "Component job failed", { error: errorMessage });
        
        // Return JavaScript error instead of JSON
        const errorScript = `
          console.error("[Component Error] Component build failed: ${errorMessage.replace(/"/g, '\\"')}");
          // Set a descriptive error component
          if (typeof window !== 'undefined') {
            window.__REMOTION_COMPONENT = (props) => {
              if (typeof React === 'undefined') return null;
              return React.createElement(
                'div',
                { style: { background: '#f44336', color: 'white', padding: '20px', borderRadius: '4px' } },
                [
                  React.createElement('h3', { key: 'title' }, 'Component Build Failed'),
                  React.createElement('p', { key: 'message' }, "${errorMessage.replace(/"/g, '\\"')}"),
                  React.createElement('pre', { key: 'id' }, '${componentId}')
                ]
              );
            };
          }
        `;
        
        return new NextResponse(errorScript, { 
          status: 200, // Return 200 to allow the error component to render
          headers: {
            'Content-Type': 'application/javascript',
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
          }
        });
      }
      
      // Handle not ready case (pending, building, etc.)
      apiRouteLogger.debug(componentId, "Component job not ready", { status: job.status });
      
      // Return JavaScript with loading component instead of JSON
      const loadingScript = `
        console.log("[Component] Component is still being processed: ${job.status}");
        // Set a loading component
        if (typeof window !== 'undefined') {
          window.__REMOTION_COMPONENT = (props) => {
            if (typeof React === 'undefined') return null;
            
            // Create a simple loading animation
            const useCurrentFrame = window.Remotion?.useCurrentFrame || (() => 0);
            const frame = useCurrentFrame();
            const dots = '.'.repeat(Math.floor(frame / 15) % 4);
            
            return React.createElement(
              'div',
              { style: { 
                background: '#2196f3', 
                color: 'white', 
                padding: '20px', 
                borderRadius: '4px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                width: '100%'
              }},
              [
                React.createElement('h3', { key: 'title' }, 'Component Loading'),
                React.createElement('p', { key: 'message' }, 'Status: ${job.status}' + dots),
                React.createElement('pre', { key: 'id', style: { fontSize: '10px' } }, '${componentId}')
              ]
            );
          };
        }
      `;
      
      return new NextResponse(loadingScript, { 
        status: 200, // Return 200 to allow the loading component to render
        headers: {
          'Content-Type': 'application/javascript',
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
        }
      });
    }
    
    // CRITICAL FIX: Handle component with ready status but no output URL
    if (!job.outputUrl) {
      apiRouteLogger.error(componentId, "Missing output URL for component with 'ready/complete' status");
      
      // Auto-fix: Update the component to error status so it can be fixed
      try {
        await db.update(customComponentJobs)
          .set({
            status: 'error',
            errorMessage: `Component was marked as ${job.status} but has no output URL`,
            updatedAt: new Date()
          })
          .where(eq(customComponentJobs.id, componentId));
        
        apiRouteLogger.debug(componentId, "Updated component status to 'error' so it can be rebuilt");
      } catch (dbError) {
        apiRouteLogger.error(componentId, "Failed to update component status", { error: dbError });
      }
      
      // Return a fallback component with error UI
      const fallbackScript = `
        console.error("[Component Error] Component has ${job.status} status but no output URL");
        console.info("[Component Info] Component has been marked as 'error' and can now be rebuilt");
        // Set a descriptive error component
        if (typeof window !== 'undefined') {
          window.__REMOTION_COMPONENT = (props) => {
            if (typeof React === 'undefined') return null;
            return React.createElement(
              'div',
              { style: { 
                background: '#ff9800', 
                color: 'white', 
                padding: '20px', 
                borderRadius: '4px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                width: '100%' 
              } },
              [
                React.createElement('h3', { key: 'title' }, 'Component Error: Missing Output URL'),
                React.createElement('p', { key: 'message' }, 'This component is marked as "${job.status}" but has no compiled JavaScript output URL.'),
                React.createElement('p', { key: 'info' }, 'The component has been automatically marked as "error" so it can be fixed.'),
                React.createElement('p', { key: 'action' }, 'Please rebuild the component using the "Fix" button.'),
                React.createElement('pre', { key: 'id', style: { fontSize: '10px' } }, '${componentId}')
              ]
            );
          };
        }
      `;
      
      return new NextResponse(fallbackScript, { 
        status: 200, // Return 200 to allow the error component to render
        headers: {
          'Content-Type': 'application/javascript',
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
        }
      });
    }
    
    // Fetch the JS content from the bundle URL
    apiRouteLogger.debug(componentId, `Fetching component code from ${job.outputUrl}`);
    
    // Attempt to fetch the component code
    const response = await fetch(job.outputUrl);
    
    if (!response.ok) {
      const statusText = response.statusText || `HTTP ${response.status}`;
      const errorMessage = `Failed to fetch component: ${statusText}`;
      apiRouteLogger.error(componentId, errorMessage, { status: response.status });
      
      // Return JavaScript error instead of JSON
      const errorScript = `
        console.error("[Component Error] ${errorMessage.replace(/"/g, '\\"')}");
        // Set a descriptive error component
        if (typeof window !== 'undefined') {
          window.__REMOTION_COMPONENT = (props) => {
            if (typeof React === 'undefined') return null;
            return React.createElement(
              'div',
              { style: { background: '#f44336', color: 'white', padding: '20px', borderRadius: '4px' } },
              [
                React.createElement('h3', { key: 'title' }, 'Component Fetch Error'),
                React.createElement('p', { key: 'message' }, "${errorMessage.replace(/"/g, '\\"')}"),
                React.createElement('pre', { key: 'id' }, '${componentId}')
              ]
            );
          };
        }
      `;
      
      return new NextResponse(errorScript, { 
        status: 200, // Return 200 to allow the error component to render
        headers: {
          'Content-Type': 'application/javascript',
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
        }
      });
    }
    
    // Re-process the component code
    let jsContent;
    try {
      jsContent = await response.text();
    } catch (fetchError) {
      apiRouteLogger.error(componentId, "Error fetching component code", { error: fetchError });
      
      // Return an error component
      const errorScript = `
        console.error("[Component Error] Failed to fetch component code: ${componentId}");
        // Set a descriptive error component
        if (typeof window !== 'undefined') {
          window.__REMOTION_COMPONENT = (props) => {
            if (typeof React === 'undefined') return null;
            return React.createElement(
              'div',
              { style: { background: '#f44336', color: 'white', padding: '20px', borderRadius: '4px' } },
              [
                React.createElement('h3', { key: 'title' }, 'Error Fetching Component'),
                React.createElement('p', { key: 'message' }, 'Unable to fetch the component code.'),
                React.createElement('pre', { key: 'id' }, '${componentId}')
              ]
            );
          };
        }
      `;
      
      return new NextResponse(errorScript, { 
        status: 200, // Return 200 to allow the error component to render
        headers: {
          'Content-Type': 'application/javascript',
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
        }
      });
    }

    // Check if the response is valid JavaScript or potentially an error JSON
    if (jsContent.trim().startsWith('{') || jsContent.trim().startsWith('[')) {
      apiRouteLogger.error(componentId, "Component outputUrl returned JSON instead of JavaScript", { content: jsContent.substring(0, 200) });
      
      // Attempt to parse the JSON to see if it contains an error message
      let errorMessage = "Component URL returned JSON instead of JavaScript";
      try {
        const jsonResponse = JSON.parse(jsContent);
        if (jsonResponse.error || jsonResponse.message) {
          errorMessage = jsonResponse.error || jsonResponse.message;
        }
      } catch (parseError) {
        // Ignore parse errors, stick with default message
      }
      
      // Return an error component
      const errorScript = `
        console.error("[Component Error] ${errorMessage.replace(/"/g, '\\"')}");
        // Set a descriptive error component
        if (typeof window !== 'undefined') {
          window.__REMOTION_COMPONENT = (props) => {
            if (typeof React === 'undefined') return null;
            return React.createElement(
              'div',
              { style: { background: '#f44336', color: 'white', padding: '20px', borderRadius: '4px' } },
              [
                React.createElement('h3', { key: 'title' }, 'Component Error'),
                React.createElement('p', { key: 'message' }, "${errorMessage.replace(/"/g, '\\"')}"),
                React.createElement('pre', { key: 'id' }, '${componentId}')
              ]
            );
          };
        }
      `;
      
      return new NextResponse(errorScript, { 
        status: 200, // Return 200 to allow the error component to render
        headers: {
          'Content-Type': 'application/javascript',
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
        }
      });
    }
    
    // 1. Remove any "use client" directives
    jsContent = jsContent.replace(/^\s*["']use client["'];?\s*/m, '// "use client" directive removed for browser compatibility\n');
    
    // 2. Process the code for common issues
    jsContent = preprocessComponentCode(jsContent, componentId);
    
    // 3. Extract information about exports and component variables
    const codeInfo = analyzeComponentCode(jsContent, componentId);
    
    // 4. Check for Remotion registration
    const hasRemotionRegistration = jsContent.includes('window.__REMOTION_COMPONENT') || jsContent.includes('global.__REMOTION_COMPONENT');
    
    // 5. Add component registration code if needed
    if (!hasRemotionRegistration && codeInfo.mainComponent) {
      // Add registration code to the end of the file
      const mainComponentName = codeInfo.mainComponent;
      const registrationCode = `
// Auto-registered component for Remotion
if (typeof window !== 'undefined') {
  console.log('[Component ${componentId}] Auto-registering component ${mainComponentName} to window.__REMOTION_COMPONENT');
  window.__REMOTION_COMPONENT = ${mainComponentName};
} else if (typeof global !== 'undefined') {
  console.log('[Component ${componentId}] Auto-registering component ${mainComponentName} to global.__REMOTION_COMPONENT');
  global.__REMOTION_COMPONENT = ${mainComponentName};
}
`;
      jsContent += registrationCode;
      apiRouteLogger.debug(componentId, `Added auto-registration for component: ${mainComponentName}`);
    }
    
    // REMOVED: Dangerous window scanning that could grab wrong globals
    // This was causing Date, Array, and other built-ins to be treated as components
    // If a component doesn't export properly, it should fail clearly rather than guess
    
    // 7. Add ESM export for compatibility with useRemoteComponent
    // This allows both side-effect registration AND module import patterns to work
    const finalJs = jsContent + `
      
      // Export for ESM consumers (useRemoteComponent)
      export default (typeof window !== 'undefined' && window.__REMOTION_COMPONENT) ? 
        window.__REMOTION_COMPONENT : 
        ((typeof global !== 'undefined' && global.__REMOTION_COMPONENT) ? 
          global.__REMOTION_COMPONENT : 
          undefined);
    `;
    
    // 8. Return the enhanced component code with proper content type
    // Cache successful components for better performance
    const headers: Record<string, string> = {
      'Content-Type': 'application/javascript'
    };
    
    // Cache successful components with valid outputUrl
    if (job.status === 'complete' && job.outputUrl) {
      headers['Cache-Control'] = 'public, max-age=300, stale-while-revalidate=600'; // Cache for 5 min, stale for 10 min
    } else {
      headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'; // Don't cache errors/pending
    }
    
    return new NextResponse(finalJs, { status: 200, headers });
    
  } catch (error) {
    // Handle any unexpected errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    apiRouteLogger.error(componentId, `Unexpected error processing component request: ${errorMessage}`, { error });
    
    // Return JavaScript error instead of JSON so it loads in the component
    const errorScript = `
      console.error("[Component Error] Internal server error: ${errorMessage.replace(/"/g, '\\"')}");
      // Set a descriptive error component
      if (typeof window !== 'undefined') {
        window.__REMOTION_COMPONENT = (props) => {
          if (typeof React === 'undefined') return null;
          return React.createElement(
            'div',
            { style: { background: '#f44336', color: 'white', padding: '20px', borderRadius: '4px' } },
            [
              React.createElement('h3', { key: 'title' }, 'Internal Server Error'),
              React.createElement('p', { key: 'message' }, "${errorMessage.replace(/"/g, '\\"')}"),
              React.createElement('pre', { key: 'id' }, '${componentId}')
            ]
          );
        };
      }
    `;
    
    return new NextResponse(errorScript, { 
      status: 200, // Return 200 to allow the error component to render
      headers: {
        'Content-Type': 'application/javascript',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
      }
    });
  }
}
