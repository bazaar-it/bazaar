// instrumentation.ts
export async function register() {
  // Check if we are running on the server (this import won't run on client)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Only register server initialization once, on actual server startup
    console.log('🔄 Next.js instrumentation - Register called');
    
    // Dynamically import the initializeServer function to avoid client-side imports
    const { initializeServer } = await import('./src/server/init');
    initializeServer();
  }
} 