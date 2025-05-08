// instrumentation.ts
export async function register() {
  // Check if we are running on the server (this import won't run on client)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Load console log filtering first to reduce noise during initialization
    try {
      // This import will intercept and filter console methods
      const serverLogConfig = await import('./server-log-config.js');
      console.log('🔄 Next.js instrumentation - Initializing server (nodejs runtime)');
    } catch (error) {
      console.error('❌ Failed to load server-log-config.js:', error);
    }
    
    // Only register server initialization once, on actual server startup
    
    // Dynamically import the initializeServer function to avoid client-side imports
    const { initializeServer } = await import('./src/server/init');
    initializeServer();
  }
} 