# Advanced Browser Fix for Custom Components

This advanced browser fix provides a more comprehensive solution for working with custom components in Bazaar-vid. It includes:

1. Enabling "Add" buttons for components with "Ready" status but missing outputUrl
2. Automatically triggering rebuilds for these components when needed
3. Adding diagnostics to help understand component status issues

## Advanced Console Fix

Copy and paste the following code into your browser console:

```javascript
// Advanced Bazaar-vid Component Fixer
console.log("🛠️ Initializing Advanced Bazaar-vid Component Fixer...");

// Helper function to extract component ID from its container
function getComponentId(container) {
  // Try to find ID in data attribute or through other means
  const idText = Array.from(container.querySelectorAll('.text-xs.text-slate-500'))
    .find(el => el.textContent?.includes('ID:'))?.textContent;
  
  if (idText) {
    const match = idText.match(/ID:\s*([a-f0-9-]+)/i);
    return match ? match[1] : null;
  }
  return null;
}

// Helper to find the Rebuild button for a component
function findRebuildButton(container) {
  return Array.from(container.querySelectorAll('button'))
    .find(btn => btn.textContent?.includes('Rebuild'));
}

// Helper to find the Fix button for a component
function findFixButton(container) {
  return Array.from(container.querySelectorAll('button'))
    .find(btn => btn.textContent?.includes('Fix'));
}

// Main function to enable Add buttons and handle missing outputUrl
async function fixComponents() {
  console.log("🔍 Scanning for components with disabled Add buttons...");
  
  // Track fixed components
  const fixedComponents = [];
  
  // First pass: Look for components with Ready status but disabled Add buttons
  const readyStatusCircles = Array.from(document.querySelectorAll('.text-green-500'))
    .filter(el => el.parentElement?.textContent?.includes('Ready'));
  
  console.log(`Found ${readyStatusCircles.length} components with Ready status`);
  
  // For each ready component, check if the Add button is disabled
  for (const statusCircle of readyStatusCircles) {
    const componentContainer = statusCircle.closest('div[class*="rounded-md bg-gray-50"]');
    if (!componentContainer) continue;
    
    const componentName = componentContainer.querySelector('.text-xs.font-medium')?.textContent || 'Unknown';
    const componentId = getComponentId(componentContainer);
    
    // Find the Add button
    const addButton = Array.from(componentContainer.querySelectorAll('button'))
      .find(btn => btn.textContent?.includes('Add'));
    
    // Find the Rebuild button if available
    const rebuildButton = findRebuildButton(componentContainer);
    
    // Check if we need to take action
    if (addButton && addButton.disabled) {
      console.log(`🔧 Component "${componentName}" (${componentId}) has disabled Add button`);
      
      // If there's a Rebuild button, click it first as this component might be missing outputUrl
      if (rebuildButton) {
        console.log(`🔄 Triggering rebuild for "${componentName}"`);
        rebuildButton.click();
        
        // Track that we've initiated a rebuild for this component
        fixedComponents.push({
          id: componentId,
          name: componentName,
          action: 'rebuild',
          container: componentContainer
        });
        
        // Wait for a short time before continuing to give UI time to respond
        await new Promise(resolve => setTimeout(resolve, 100));
      } else {
        // No Rebuild button, just try to enable the Add button directly
        console.log(`⚡ Enabling Add button for "${componentName}"`);
        addButton.disabled = false;
        
        // Add special click handler for debugging
        addButton.addEventListener('click', function(e) {
          console.log(`✅ Add button clicked for "${componentName}" via custom fix`);
        });
        
        // Track that we've enabled the Add button for this component
        fixedComponents.push({
          id: componentId,
          name: componentName,
          action: 'enable-add',
          container: componentContainer
        });
      }
    } else if (addButton && !addButton.disabled) {
      console.log(`✅ Component "${componentName}" already has enabled Add button`);
    }
  }
  
  // Second pass: Look for components with Error status that need fixing
  const errorStatusCircles = Array.from(document.querySelectorAll('.text-red-500'))
    .filter(el => el.parentElement?.textContent?.includes('Error'));
  
  console.log(`Found ${errorStatusCircles.length} components with Error status`);
  
  // For each error component, check if there's a Fix button available
  for (const statusCircle of errorStatusCircles) {
    const componentContainer = statusCircle.closest('div[class*="rounded-md bg-gray-50"]');
    if (!componentContainer) continue;
    
    const componentName = componentContainer.querySelector('.text-xs.font-medium')?.textContent || 'Unknown';
    const componentId = getComponentId(componentContainer);
    
    // Find the Fix button
    const fixButton = findFixButton(componentContainer);
    
    if (fixButton) {
      console.log(`🔧 Component "${componentName}" (${componentId}) has Fix button available`);
      
      // Add to the list of components we can fix, but don't auto-click to avoid unwanted fixes
      fixedComponents.push({
        id: componentId,
        name: componentName,
        action: 'has-fix-button',
        container: componentContainer,
        fixButton: fixButton
      });
    }
  }
  
  // Summary of what we've done
  console.log("\n🏁 Component Fixing Summary:");
  console.log(`- Found ${readyStatusCircles.length} components with Ready status`);
  console.log(`- Found ${errorStatusCircles.length} components with Error status`);
  console.log(`- Took action on ${fixedComponents.length} components`);
  
  // Return the list of fixed components for further inspection
  return fixedComponents;
}

// Set up to automatically reapply fix when the list refreshes
function setupAutoRefixOnRefresh() {
  const refreshButtons = Array.from(document.querySelectorAll('button'))
    .filter(btn => btn.textContent?.includes('Refresh List'));

  if (refreshButtons.length > 0) {
    refreshButtons.forEach(btn => {
      // Check if we've already added our handler
      if (!btn.hasAttribute('data-fix-handler-added')) {
        btn.setAttribute('data-fix-handler-added', 'true');
        
        btn.addEventListener('click', function() {
          console.log("🔄 Component list refresh detected, will reapply fix shortly...");
          // Wait for the refresh to complete - longer timeout to ensure data is loaded
          setTimeout(() => {
            console.log("⏱️ Applying component fix after refresh...");
            fixComponents();
          }, 2000);
        });
      }
    });
    console.log("🔄 Auto-refix enabled for component list refreshes");
  }
}

// Main execution
(async function() {
  try {
    // Run the initial fix
    const fixedComponents = await fixComponents();
    
    // Setup auto-refix on refresh
    setupAutoRefixOnRefresh();
    
    // Add a global function to manually rerun the fix
    window.rerunComponentFix = fixComponents;
    console.log("\n✅ Fix applied successfully!");
    console.log("To manually rerun the fix at any time, type: rerunComponentFix()");
    
    // Return fixed components for inspection
    return fixedComponents;
  } catch (error) {
    console.error("❌ Error applying component fix:", error);
  }
})();
```

## How to Use This Fix

1. Open your project page in the browser (e.g., `http://localhost:3000/projects/YOUR_PROJECT_ID/edit`)
2. Open your browser's Developer Tools (F12 or right-click → Inspect)
3. Go to the Console tab
4. Copy and paste the entire script above into the console
5. Press Enter to run the script

## What This Fix Does

1. **Component Analysis**: Scans for components marked as "Ready" but with disabled Add buttons
2. **Rebuild Triggering**: Automatically clicks the Rebuild button for components that need it
3. **Add Button Enabling**: Enables Add buttons that should be clickable
4. **Error Detection**: Identifies components with errors that could be fixed
5. **Auto-Reapplication**: Automatically re-runs the fix when you refresh the component list

## Diagnosing Components After Fixing

After running the fix, you can check if components are properly showing in your video:

1. Click the "Add" button on a component to add it to your timeline
2. Check if the component appears in the preview panel
3. If the component doesn't appear, check the browser console for error messages

For components that still don't work properly, you can try:

1. Click the "Rebuild" button if available
2. Wait for the component status to change to "Ready" 
3. Try adding the component again

## Manually Re-running the Fix

If you need to run the fix again after making changes:

```javascript
rerunComponentFix();
```

This global function is added by the script and is available at any time in the console. 