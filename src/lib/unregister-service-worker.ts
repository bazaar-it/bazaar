/**
 * Unregisters all service workers associated with the application
 * to prevent caching issues and SSE connection problems.
 * 
 * This is particularly important when transitioning from a previous
 * PWA version with service workers to a Next.js app.
 */

/**
 * Helper function to unregister a single service worker
 */
const unregisterServiceWorker = async (registration: ServiceWorkerRegistration): Promise<boolean> => {
  try {
    const success = await registration.unregister();
    console.log(`Service worker unregistered: ${success ? 'success' : 'failed'}`);
    return success;
  } catch (error) {
    console.error('Error unregistering service worker:', error);
    return false;
  }
};

/**
 * Unregister all service workers for the current scope
 * This helps prevent API caching issues with service workers
 */
export const unregisterAllServiceWorkers = async (): Promise<void> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.log('Service workers not supported in this environment');
    return;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    
    if (registrations.length === 0) {
      console.log('No service workers to unregister');
      return;
    }
    
    console.log(`Found ${registrations.length} service worker(s) to unregister`);
    
    const results = await Promise.all(
      registrations.map(registration => unregisterServiceWorker(registration))
    );
    
    const successCount = results.filter(Boolean).length;
    console.log(`Successfully unregistered ${successCount} of ${registrations.length} service workers`);
  } catch (error) {
    console.error('Error during service worker unregistration:', error);
  }
};

/**
 * Check if there are any active service workers
 */
export const hasActiveServiceWorkers = async (): Promise<boolean> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }
  
  const registrations = await navigator.serviceWorker.getRegistrations();
  return registrations.length > 0;
};

/**
 * Creates a self-destructing service worker that removes any old service workers
 * Useful for transitioning from PWA to regular web app or fixing caching issues
 */
export function createSelfDestructingServiceWorker() {
  if (typeof window === 'undefined') return;

  // Create a blob with the service worker script
  const swScript = `
    // This service worker will unregister itself and any other service workers
    self.addEventListener('install', function() {
      self.skipWaiting();
    });
    
    self.addEventListener('activate', function() {
      // Get all the clients
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          // Send a message to each client to log the self-destruction
          client.postMessage({
            message: 'Service worker self-destruct sequence initiated'
          });
        });
        
        // Unregister itself
        self.registration.unregister();
      });
    });
  `;

  try {
    const blob = new Blob([swScript], { type: 'application/javascript' });
    const swUrl = URL.createObjectURL(blob);
    
    // Register the self-destructing service worker
    navigator.serviceWorker.register(swUrl).then(reg => {
      console.log('Self-destructing service worker registered.');
      URL.revokeObjectURL(swUrl);
    }).catch(error => {
      console.error('Error registering self-destructing service worker:', error);
      URL.revokeObjectURL(swUrl);
    });
  } catch (error) {
    console.error('Failed to create self-destructing service worker:', error);
  }
} 