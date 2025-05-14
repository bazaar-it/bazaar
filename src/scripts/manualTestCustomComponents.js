/**
 * Manual Test Script for Custom Components in PreviewPanel
 * 
 * This script can be pasted in your browser console when viewing the
 * project edit page to test various aspects of custom component integration.
 * 
 * How to use:
 * 1. Open browser console in your project edit page
 * 2. Copy and paste this entire script
 * 3. Run the various test functions as needed
 */

// Store for our test helpers
window.bazaarTests = {
  // Current project ID from URL
  projectId: window.location.pathname.split('/').filter(Boolean)[1],
  
  // Track added component IDs
  addedComponentIds: [],
  
  // Get video state from window (if using Zustand with devtools)
  getVideoState() {
    // This assumes your store is exposed on window for debug purposes
    // You may need to adjust this based on your actual implementation
    return window.__ZUSTAND_STATE__?.videoState || 
           window.__ZUSTAND__.getState().videoState;
  },
  
  // Helper to log component statuses
  logComponentStatus() {
    const componentScripts = document.querySelectorAll('script[src*="custom-components"]');
    console.log(`Found ${componentScripts.length} component scripts in DOM:`, 
      Array.from(componentScripts).map(s => s.src)
    );
    
    console.log('window.__REMOTION_COMPONENT:', window.__REMOTION_COMPONENT);
  },
  
  // Create a simple custom component scene
  createSimpleComponentScene(componentId, startFrame = 0) {
    return {
      id: `scene-${Date.now()}`,
      type: 'custom',
      start: startFrame,
      duration: 150,
      data: {
        componentId,
        testParam: `test-value-${Date.now()}`
      }
    };
  },
  
  // Apply a JSON patch to add a custom component
  async addCustomComponent() {
    try {
      // Get current props
      const videoState = this.getVideoState();
      if (!videoState) {
        console.error('Could not access video state. Make sure store is accessible.');
        return;
      }
      
      const currentProps = videoState.getCurrentProps();
      if (!currentProps) {
        console.error('No current props in video state');
        return;
      }
      
      // Generate a fake component ID (in real app this would come from the database)
      const componentId = `test-component-${Date.now()}`;
      this.addedComponentIds.push(componentId);
      
      // Calculate appropriate start frame (after existing content)
      let startFrame = 0;
      if (currentProps.scenes && currentProps.scenes.length > 0) {
        const lastScene = currentProps.scenes[currentProps.scenes.length - 1];
        startFrame = lastScene.start + lastScene.duration;
      }
      
      // Create the scene object
      const newScene = this.createSimpleComponentScene(componentId, startFrame);
      
      // Apply the change (this simulates what your tRPC endpoint would do)
      const updatedProps = JSON.parse(JSON.stringify(currentProps));
      updatedProps.scenes.push(newScene);
      
      // Update meta duration if needed
      const requiredDuration = startFrame + newScene.duration;
      if (requiredDuration > updatedProps.meta.duration) {
        updatedProps.meta.duration = requiredDuration;
        console.log(`Increased video duration to ${requiredDuration} frames`);
      }
      
      // Force an update of the video state
      console.log('Adding custom component with patch:', newScene);
      videoState.setProject(this.projectId, updatedProps);
      videoState.forceRefresh(this.projectId);
      
      console.log(`Added component ${componentId} at frame ${startFrame}`);
      return componentId;
    } catch (error) {
      console.error('Error adding custom component:', error);
    }
  },
  
  // Mock custom component loaded event
  mockComponentLoaded(componentId) {
    if (!componentId) {
      console.error('Component ID is required');
      return;
    }
    
    // Create and dispatch a custom event similar to what CustomScene would do
    const event = new CustomEvent('remotion-component-status', {
      detail: {
        type: 'remotion-component-status',
        componentId,
        status: 'loaded'
      }
    });
    
    console.log(`Dispatching 'loaded' event for component ${componentId}`);
    window.dispatchEvent(event);
  },
  
  // Remove a component by ID
  removeComponent(componentId) {
    if (!componentId) {
      console.error('Component ID is required');
      return;
    }
    
    try {
      // Get current props
      const videoState = this.getVideoState();
      if (!videoState) {
        console.error('Could not access video state');
        return;
      }
      
      const currentProps = videoState.getCurrentProps();
      if (!currentProps || !currentProps.scenes) {
        console.error('No scenes in current props');
        return;
      }
      
      // Find the scene with this component ID
      const updatedProps = JSON.parse(JSON.stringify(currentProps));
      const sceneIndex = updatedProps.scenes.findIndex(
        scene => scene.type === 'custom' && scene.data.componentId === componentId
      );
      
      if (sceneIndex === -1) {
        console.error(`No scene found with component ID ${componentId}`);
        return;
      }
      
      // Remove the scene
      updatedProps.scenes.splice(sceneIndex, 1);
      
      // Update the store
      console.log(`Removing scene with component ID ${componentId}`);
      videoState.setProject(this.projectId, updatedProps);
      videoState.forceRefresh(this.projectId);
      
      // Remove from our tracking array
      this.addedComponentIds = this.addedComponentIds.filter(id => id !== componentId);
      
      return true;
    } catch (error) {
      console.error('Error removing component:', error);
    }
  },
  
  // Test adding and then triggering loaded status
  async testFullComponentFlow() {
    console.log('=== Starting full component flow test ===');
    
    // Add a component
    const componentId = await this.addCustomComponent();
    if (!componentId) {
      console.error('Failed to add component');
      return;
    }
    
    console.log('Added component, waiting 1 second before triggering loaded status...');
    
    // Wait a bit to simulate loading time
    setTimeout(() => {
      // Simulate component loaded event
      this.mockComponentLoaded(componentId);
      
      // Check status after a moment
      setTimeout(() => {
        this.logComponentStatus();
        console.log('=== Test complete ===');
      }, 500);
    }, 1000);
  },
  
  // Add multiple components in sequence
  async testMultipleComponents(count = 3) {
    console.log(`=== Starting test with ${count} components ===`);
    
    for (let i = 0; i < count; i++) {
      console.log(`Adding component ${i+1} of ${count}...`);
      const componentId = await this.addCustomComponent();
      
      // Wait a bit between additions
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Simulate component loaded
      this.mockComponentLoaded(componentId);
    }
    
    console.log('=== Multiple components test complete ===');
    console.log('Added component IDs:', this.addedComponentIds);
  },
  
  // Run all tests in sequence
  async runAllTests() {
    console.log('===== RUNNING ALL CUSTOM COMPONENT TESTS =====');
    
    // First get current state
    console.log('Current DOM state:');
    this.logComponentStatus();
    
    // Run full component flow test
    await this.testFullComponentFlow();
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Add multiple components
    await this.testMultipleComponents(2);
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Remove all added components
    console.log('Removing all test components...');
    for (const id of [...this.addedComponentIds]) {
      this.removeComponent(id);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('===== ALL TESTS COMPLETE =====');
  }
};

// Instructions for user
console.log(`
Custom Component Test Utilities loaded!

Available commands:
- bazaarTests.addCustomComponent() - Add a test component
- bazaarTests.testFullComponentFlow() - Test adding and loading a component
- bazaarTests.testMultipleComponents(count) - Add multiple components
- bazaarTests.removeComponent(componentId) - Remove a specific component
- bazaarTests.logComponentStatus() - Check current component status
- bazaarTests.runAllTests() - Run all tests in sequence

Example usage:
  bazaarTests.runAllTests()
`); 