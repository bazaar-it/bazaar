// src/instrumentation.ts
// This file is processed by Next.js automatically to register
// server-side lifecycle hooks

/**
 * Next.js instrumentation hook to initialize server background processes
 * This is called once when the Next.js server starts, preventing duplicate initialization
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('🔄 Next.js instrumentation - Initializing server (nodejs runtime)');
    
    // Dynamic import to avoid code being included in client bundles
    const { initializeServer } = await import('./server/init');
    
    // Initialize the server only once when the Next.js server starts
    initializeServer();
  }
} 