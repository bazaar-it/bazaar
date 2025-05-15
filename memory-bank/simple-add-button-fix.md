# Simple Add Button Fix for Custom Components

This is a simplified version of the browser console fix that focuses solely on enabling the "Add" buttons for custom components. Use this if you just want to quickly add components to your video.

## Simple Console Fix

Copy and paste this code into your browser console:

```javascript
// Simple Add Button Fix for Bazaar-vid
console.log("🛠️ Running Simple Add Button Fix for Bazaar-vid");

// Find all Add buttons and enable them
const addButtons = Array.from(document.querySelectorAll('button'))
  .filter(btn => {
    // Find buttons that say "Add" and are disabled
    return btn.textContent.includes('Add') && btn.disabled;
  });

console.log(`Found ${addButtons.length} disabled Add buttons to fix`);

// Enable each button
addButtons.forEach((btn, index) => {
  // Get component name from parent container
  const container = btn.closest('div[class*="rounded-md bg-gray-50"]');
  const componentName = container ? 
    container.querySelector('.text-xs.font-medium')?.textContent || `Component ${index}` : 
    `Component ${index}`;
  
  console.log(`Enabling Add button for "${componentName}"`);
  
  // Enable the button
  btn.disabled = false;
  
  // Add click handler for debugging
  btn.addEventListener('click', function(e) {
    console.log(`Add button clicked for "${componentName}"`);
  });
});

console.log(`✅ Enabled ${addButtons.length} Add buttons`);

// Make function available globally for re-running
window.enableAddButtons = function() {
  // Find all Add buttons and enable them
  const buttons = Array.from(document.querySelectorAll('button'))
    .filter(btn => btn.textContent.includes('Add') && btn.disabled);
  
  console.log(`Found ${buttons.length} disabled Add buttons`);
  
  buttons.forEach(btn => btn.disabled = false);
  console.log(`✅ Enabled ${buttons.length} buttons`);
};

console.log("📢 To re-run this fix later, type: enableAddButtons()");
```

## How to Use

1. Open your project page (http://localhost:3000/projects/YOUR_PROJECT_ID/edit)
2. Open Developer Tools (F12 or right-click → Inspect)
3. Paste the code above into the Console tab and press Enter
4. All disabled "Add" buttons for components marked as "Ready" will be enabled
5. Click on an "Add" button to add the component to your video

## Re-running the Fix

If you refresh the page or load more components, you can re-run the fix by typing this in the console:

```javascript
enableAddButtons()
```

## Important Note

This fix only enables the Add buttons but doesn't fix any underlying issues with the components. If a component has a missing outputUrl, you may need to manually click the "Rebuild" button first before adding it to your video. 