# Bazaar-vid Custom Component Quick Start Guide

This guide provides a quick way to get custom components working in Bazaar-vid with minimal effort.

## The All-In-One Helper Script

We've created a comprehensive helper script that makes it easy to create, fix, and manage custom components in Bazaar-vid.

### Running the Helper Script

```bash
# From the project root directory
./src/scripts/bazaar-components-helper.sh
```

Or run it in batch mode to apply all fixes at once:

```bash
# From the project root directory
./src/scripts/bazaar-components-helper.sh --all YOUR_PROJECT_ID
```

## Step-by-Step Guide for Success

1. **Get Your Project ID**
   - Open your project in the Bazaar-vid UI
   - The project ID is in the URL: `/projects/{PROJECT_ID}/edit`

2. **Run the Helper Script in Batch Mode**
   ```bash
   ./src/scripts/bazaar-components-helper.sh --all YOUR_PROJECT_ID
   ```

3. **Wait for Components to Build**
   - The script creates a guaranteed working component
   - It then fixes any problematic components
   - Wait for the "Ready" status to appear in the UI

4. **Add the Component to Your Video**
   - In the Custom Components panel, look for "Guaranteed Working Component"
   - Click the "Add" button to add it to your video
   - The component should now play properly in the video preview

## What the Helper Script Does

The script performs several key functions:

1. **Creates a Known-Good Test Component**
   - Inserts a guaranteed working component into the database
   - This component follows all best practices and definitely works with Remotion

2. **Fixes Common Component Issues**
   - Fixes components with missing output URLs
   - Fixes inconsistent component states
   - Repairs components with improper window.__REMOTION_COMPONENT assignments
   - Updates the database to trigger rebuilds of fixed components

3. **Shows Component Status**
   - Provides a clear view of all components in your project
   - Shows which ones are ready to use and which need fixing

## Troubleshooting

If you still experience issues after running the helper script:

1. **Check the Console Logs**
   - Open the browser's developer tools console (F12)
   - Look for error messages related to component loading

2. **Check Component Status in Script Output**
   - Components should have "ready" status and "Yes" for Output URL
   - If not, try running the script again

3. **Try Individual Fix Options**
   - Run the script in interactive mode and choose specific fix options
   - Option 2 fixes individual components if you know their ID
   - Option 3 fixes all problematic components in a project

## Next Steps

Once you have working components, refer to our [Custom Components Guide](custom-components-guide.md) for:
- Creating your own components from scratch
- Understanding how the component system works
- Best practices for custom component development 